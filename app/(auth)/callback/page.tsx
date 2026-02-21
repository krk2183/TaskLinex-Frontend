"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/providers/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing sign-in...");

  useEffect(() => {
    // Let Supabase handle the PKCE exchange automatically via its internal listener.
    // DO NOT manually call exchangeCodeForSession — it loses the code verifier.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        await ensureUserAndRedirect(session);
      }
    });

    // Safety net: if onAuthStateChange never fires within 10s, check manually
    const timeout = setTimeout(async () => {
      subscription.unsubscribe();
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await ensureUserAndRedirect(data.session);
      } else {
        setStatus("Authentication timed out. Redirecting to login...");
        router.push("/login");
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  const ensureUserAndRedirect = async (session: any) => {
    const userId = session.user.id;
    const token = session.access_token;
    const email = session.user.email || "";
    const meta = session.user.user_metadata || {};

    setStatus("Setting up your workspace...");

    // Wait briefly for the Supabase DB trigger to fire
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // One check attempt — mirrors the old register's lean approach
    let userExists = false;
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) userExists = true;
    } catch (_) {}

    // Fallback: create user manually if trigger didn't fire
    if (!userExists) {
      setStatus("Finalizing account...");

      const rawName: string = meta.full_name || meta.name || "";
      const parts = rawName.trim().split(" ");
      const firstName = parts[0] || email.split("@")[0];
      const lastName = parts.slice(1).join(" ") || "";
      const baseUsername = (
        meta.user_name ||
        meta.preferred_username ||
        email.split("@")[0]
      )
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .toLowerCase();
      const username = `${baseUsername}_${Math.random().toString(36).slice(2, 6)}`;

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
        console.log("✅ User created via fallback");
      } catch (err) {
        console.error("Fallback user creation failed:", err);
      }
    }

    setStatus("Redirecting to your workspace...");
    // OAuth always lands on roadmap
    router.push("/roadmap");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-200">
      <div className="flex flex-col items-center gap-6">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin" />
        </div>

        {/* Logo */}
        <span className="text-2xl font-bold tracking-tight select-none">
          <span className="text-white">Task</span>
          <span className="text-violet-500">Linex</span>
        </span>

        <p className="text-slate-400 text-sm">{status}</p>
      </div>
    </div>
  );
}
