"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { useAuth, supabase } from "@/app/providers/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

// --- COMPONENTS ---

const Logo = () => (
  <div className="flex items-center gap-2 mb-12">
    <span className="text-3xl font-bold tracking-tight select-none">
      <span className="text-white">Task</span>
      <span className="text-violet-500">Linex</span>
    </span>
  </div>
);

const InputField = ({
  label,
  type,
  placeholder,
  icon: Icon,
  name,
  value,
  onChange,
}: {
  label: string;
  type: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
      {label}
    </label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Icon className="h-4 w-4 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
      </div>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg block pl-10 p-3 placeholder-slate-600 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all shadow-sm"
        placeholder={placeholder}
      />
    </div>
  </div>
);

const BackButton = () => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.2, duration: 0.5 }}
    className="absolute left-8 md:left-24 xl:left-32 top-8 z-50"
  >
    <Link
      href="/"
      className="flex items-center gap-2 px-5 py-3 rounded-full bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 hover:text-white transition-all border border-violet-400/50 text-sm font-medium group backdrop-blur-sm"
    >
      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
      Back
    </Link>
  </motion.div>
);

// --- PAGE ---

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [data, setData] = React.useState({
    emailOrUsername: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setData({ ...data, [name]: type === "checkbox" ? checked : value });
    setError("");
  };

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${SITE_URL}/callback`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google");
      setOauthLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setOauthLoading(true);
    setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: `${SITE_URL}/callback` },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with GitHub");
      setOauthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const identifier = data.emailOrUsername.trim();
      if (!identifier) throw new Error("Please enter your email or username");
      if (!data.password) throw new Error("Please enter your password");

      const isEmail = identifier.includes("@");
      let emailToUse = identifier;

      // Username → resolve to email via backend (bypasses Supabase RLS)
      if (!isEmail) {
        console.log("🔍 Resolving username via backend:", identifier);
        const res = await fetch(`${API_BASE_URL}/auth/login-username`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: identifier, password: data.password }),
        });

        if (!res.ok) {
          let detail = "Username not found. Please check your credentials.";
          try { detail = (await res.json()).detail || detail; } catch (_) {}
          throw new Error(detail);
        }

        emailToUse = (await res.json()).email;
        console.log("✅ Resolved email for username");
      }

      console.log("🔐 Signing in...");
      await login(emailToUse, data.password);

      // Redirect to roadmap on successful login
      router.push("/roadmap");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err instanceof Error ? err.message : "Invalid credentials. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-200 font-sans selection:bg-violet-500/30 relative">
      {/* LEFT: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-24 xl:px-32 relative z-10">
        <BackButton />

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Logo />

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              Resume Context
            </h1>
            <p className="text-slate-400">Authenticate to access your workspace.</p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {loading && (
              <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center gap-2 text-violet-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-400" />
                Signing in...
              </div>
            )}

            <InputField
              label="Email or Username"
              type="text"
              placeholder="name@company.com or username"
              icon={Mail}
              name="emailOrUsername"
              value={data.emailOrUsername}
              onChange={handleChange}
            />

            <InputField
              label="Password"
              type="password"
              placeholder="••••••••••••"
              icon={Lock}
              name="password"
              value={data.password}
              onChange={handleChange}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="rememberMe"
                  id="rememberMe"
                  checked={data.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-violet-600 focus:ring-violet-500/50 focus:ring-offset-0 accent-violet-600"
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm text-slate-400 select-none cursor-pointer hover:text-slate-300 transition-colors"
                >
                  Remember me
                </label>
              </div>
              <Link
                href="#"
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || oauthLoading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                "Signing In..."
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* OAUTH DIVIDER */}
          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-950 text-slate-500 text-xs uppercase tracking-widest font-semibold">
                Or continue with
              </span>
            </div>
          </div>

          {/* OAUTH BUTTONS */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading || oauthLoading}
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:border-slate-700 transition-all text-sm font-medium text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              onClick={handleGithubLogin}
              disabled={loading || oauthLoading}
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:border-slate-700 transition-all text-sm font-medium text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </button>
          </div>

          <div className="mt-5 flex justify-center w-full">
            <div className="mt-0.5 text-sm">Don&apos;t have an account?</div>
            <Link
              href="/register"
              className="ml-1 text-violet-400 hover:text-violet-300 font-medium"
            >
              Initialize Workspace
            </Link>
          </div>
        </motion.div>
      </div>

      {/* RIGHT: Visual */}
      <div className="hidden lg:block w-1/2 relative bg-[#0B0F17] overflow-hidden border-l border-slate-800">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20" />

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-[400px] h-[300px] bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 relative shadow-2xl"
          >
            <div className="flex gap-2 mb-6 border-b border-slate-800 pb-4">
              {[
                { color: "bg-rose-500", shadow: "#f43f5e" },
                { color: "bg-amber-500", shadow: "#f59e0b" },
                { color: "bg-emerald-500", shadow: "#10b981" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9, boxShadow: `0 0 20px ${item.shadow}` }}
                  className={`w-3 h-3 rounded-full ${item.color} cursor-pointer`}
                />
              ))}
            </div>

            <div className="space-y-3 font-mono text-xs">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-between text-slate-500"
              >
                <span>status</span>
                <span className="text-emerald-500">active</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex justify-between text-slate-500"
              >
                <span>encryption</span>
                <span className="text-violet-400">TLS 1.3 / AES-256</span>
              </motion.div>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.4 }}
                className="h-px bg-slate-800 my-2 origin-left"
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-slate-400"
              >
                <span className="text-violet-500">➜</span> verifying_handshake...
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-slate-400"
              >
                <span className="text-violet-500">➜</span> establishing_secure_tunnel...
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-slate-200 animate-pulse"
              >
                <span className="text-emerald-500">✓</span> ready_for_auth
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 1.1, type: "spring" }}
              className="absolute -bottom-6 -right-6 bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-300">SOC2 Compliant</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
