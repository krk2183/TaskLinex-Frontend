"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/providers/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState("Completing sign-in...");

    useEffect(() => {
        let handled = false;

        const handle = async (session: any) => {
            if (handled) return;
            handled = true;

            const userId = session.user.id;
            const token = session.access_token;
            const email = session.user.email || "";
            const meta = session.user.user_metadata || {};

            setStatus("Setting up your workspace...");

            // Check if user exists in backend
            let userExists = false;
            try {
                const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) userExists = true;
            } catch (_) {}

            // Fallback create if trigger didn't fire
            if (!userExists) {
                setStatus("Finalizing account...");
                const rawName: string = meta.full_name || meta.name || "";
                const parts = rawName.trim().split(" ");
                const firstName = parts[0] || email.split("@")[0];
                const lastName = parts.slice(1).join(" ") || "";
                const base = (meta.user_name || meta.preferred_username || email.split("@")[0])
                    .replace(/[^a-zA-Z0-9_]/g, "_")
                    .toLowerCase();
                const username = `${base}_${Math.random().toString(36).slice(2, 6)}`;

                try {
                    await fetch(`${API_BASE_URL}/users/ensure`, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            userId,
                            email,
                            username,
                            firstName,
                            lastName,
                            companyName: null,
                            role: "user",
                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        }),
                    });
                } catch (err) {
                    console.error("Fallback user creation failed:", err);
                }
            }

            setStatus("Redirecting...");
            router.replace("/roadmap");
        };

        const init = async () => {
            // ── Strategy 1: Exchange the PKCE code from the URL (most reliable for OAuth)
            // Supabase JS v2 with PKCE flow puts `code` in the query string.
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");

            if (code) {
                try {
                    setStatus("Exchanging auth code...");
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) {
                        console.error("Code exchange error:", error);
                    } else if (data.session) {
                        await handle(data.session);
                        return;
                    }
                } catch (err) {
                    console.error("exchangeCodeForSession threw:", err);
                }
            }

            // ── Strategy 2: Hash-based (implicit flow) — check existing session
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
                await handle(sessionData.session);
                return;
            }

            // ── Strategy 3: Listen for auth state change (handles cases where Supabase
            // processes the hash/code asynchronously)
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                async (event, session) => {
                    if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
                        subscription.unsubscribe();
                        clearTimeout(timeout);
                        await handle(session);
                    }
                }
            );

            // ── Safety net: give up after 15s
            const timeout = setTimeout(() => {
                if (!handled) {
                    subscription.unsubscribe();
                    setStatus("Authentication timed out. Redirecting to login...");
                    setTimeout(() => router.replace("/login"), 1500);
                }
            }, 15000);
        };

        init();
    }, [router]);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-200">
            <div className="flex flex-col items-center gap-6">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin" />
                </div>
                <span className="text-2xl font-bold tracking-tight select-none">
                    <span className="text-white">Task</span>
                    <span className="text-violet-500">Linex</span>
                </span>
                <p className="text-slate-400 text-sm">{status}</p>
            </div>
        </div>
    );
}
