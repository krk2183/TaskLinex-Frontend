"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  User,
  Briefcase,
  ChevronRight,
  Lock,
  AlertCircle,
} from "lucide-react";
import { useAuth, supabase } from "@/app/providers/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

// --- COMPONENTS ---

const Logo = () => (
  <div className="flex items-center gap-2">
    <span className="text-4xl font-bold tracking-tight select-none">
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
  required = false,
}: {
  label: string;
  type: string;
  placeholder: string;
  icon: any;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
      {label} {required && <span className="text-violet-500">*</span>}
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
        required={required}
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
    className="absolute left-8 md:left-24 xl:left-40 top-8 z-50"
  >
    <Link
      href="/"
      className="flex items-center gap-2 px-5 py-3 rounded-full bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 hover:text-white transition-all border-2 border-violet-400/50 text-sm font-medium group backdrop-blur-xl"
    >
      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
      Back
    </Link>
  </motion.div>
);

// --- PAGE ---

export default function SignupPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = React.useState(false);
  const [Data, setData] = React.useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    role: "user",
    rememberMe: false,
  });
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setData({ ...Data, [e.target.name]: value });
    setError("");
  };

  // Google OAuth Handler
  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${SITE_URL}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      console.error("Google OAuth error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to sign in with Google"
      );
      setOauthLoading(false);
    }
  };

  // GitHub OAuth Handler
  const handleGithubLogin = async () => {
    setOauthLoading(true);
    setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${SITE_URL}/auth/callback`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      console.error("GitHub OAuth error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to sign in with GitHub"
      );
      setOauthLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      setLoading(true);
      setError("");
      try {
        const identifier = Data.email.trim();
        const isEmail = identifier.includes("@");
        let emailToUse = identifier;

        if (!isEmail) {
          // Use backend endpoint to resolve username → email (avoids RLS)
          const res = await fetch(`${API_BASE_URL}/auth/login-username`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: identifier,
              password: Data.password,
            }),
          });

          if (!res.ok) {
            let detail = "Username not found. Please check your credentials.";
            try {
              const json = await res.json();
              detail = json.detail || detail;
            } catch (_) {}
            throw new Error(detail);
          }

          const result = await res.json();
          emailToUse = result.email;
        }

        await login(emailToUse, Data.password);
        // Redirect to pulse — same as normal signup
        router.push("/pulse");
      } catch (err: any) {
        console.error("Login Error:", err);
        setError(err.message || "Login failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // --- SIGNUP ---
    if (Data.password !== Data.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!Data.username.trim()) {
      setError("Username is required");
      return;
    }
    if (Data.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🚀 Starting registration process...");

      const email =
        Data.email.trim() || `${Data.username.trim()}@tasklinex.local`;
      const companyNameValue = Data.companyName.trim() || null;

      // Step 1: Sign up with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: Data.password,
        options: {
          data: {
            username: Data.username.trim(),
            firstName: Data.firstName.trim(),
            lastName: Data.lastName.trim(),
            companyName: companyNameValue,
            role: Data.role,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned from signup");

      const userId = authData.user.id;
      const token = authData.session?.access_token;

      if (!token) throw new Error("No access token received");

      console.log("✅ Supabase auth created:", userId);

      // Step 2: Wait for Supabase trigger to process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Step 3: Verify user was created with retries
      console.log("🔍 Verifying user data...");
      let userExists = false;
      let retries = 5;

      while (retries > 0 && !userExists) {
        try {
          const userResponse = await fetch(`${API_BASE_URL}/users/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          if (userResponse.ok) {
            userExists = true;
            break;
          }
        } catch (_) {}

        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Step 4: If user doesn't exist, create manually via fallback endpoint
      if (!userExists) {
        console.log("🔧 Creating user via fallback endpoint...");
        const ensureResponse = await fetch(`${API_BASE_URL}/users/ensure`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            email,
            username: Data.username.trim(),
            firstName: Data.firstName.trim(),
            lastName: Data.lastName.trim(),
            companyName: companyNameValue,
            role: Data.role,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });

        if (!ensureResponse.ok) {
          const errorData = await ensureResponse.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to create user data");
        }
      }

      console.log("✅ Registration complete, logging in...");

      // Step 5: Log in, then redirect to /pulse
      await login(email, Data.password);
      router.push("/pulse");
    } catch (err: any) {
      console.error("❌ Registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-200 font-sans selection:bg-violet-500/30 relative overflow-hidden">
      {/* LEFT: Hero */}
      <div className="hidden lg:flex lg:w-5/12 relative bg-[#0B0F17] border-r border-slate-800 flex-col justify-between p-12 xl:p-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20" />

        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            Built for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
              Deterministic
            </span>{" "}
            <br />
            Workflows.
          </h2>

          <div className="space-y-6">
            {[
              "Isolate dependencies.",
              "Visualize critical paths.",
              "Eliminate status meetings.",
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                  <ChevronRight className="w-3 h-3 text-violet-400" />
                </div>
                <span className="text-slate-300 font-medium">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-auto">
          <div className="flex items-center gap-3 opacity-60">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950"
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Join 4,000+ engineering leaders
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-7/12 flex flex-col justify-center px-8 md:px-24 xl:px-40 relative z-10 bg-slate-950">
        <BackButton />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-10 lg:mt-24 mt-20">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
              {isLogin ? "Welcome Back" : "Initialize Workspace"}
            </h1>
            <p className="text-slate-400">
              {isLogin
                ? "Enter your credentials to access your workspace."
                : "Begin your 14-day trial. No credit card required."}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSignup}>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {loading && (
              <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center gap-2 text-violet-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-400" />
                {isLogin ? "Signing in..." : "Creating your workspace..."}
              </div>
            )}

            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="First Name"
                  type="text"
                  name="firstName"
                  value={Data.firstName}
                  onChange={handleChange}
                  placeholder="Jane"
                  icon={User}
                  required
                />
                <InputField
                  label="Last Name"
                  type="text"
                  name="lastName"
                  value={Data.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  icon={User}
                  required
                />
              </div>
            )}

            {!isLogin && (
              <InputField
                label="Username"
                type="text"
                name="username"
                value={Data.username}
                onChange={handleChange}
                placeholder="unique_username"
                icon={User}
                required
              />
            )}

            <InputField
              label={isLogin ? "Email or Username" : "Work Email (Optional)"}
              type={isLogin ? "text" : "email"}
              name="email"
              value={Data.email}
              onChange={handleChange}
              placeholder={
                isLogin
                  ? "email@company.com or username"
                  : "jane@company.com (optional)"
              }
              icon={Mail}
              required={isLogin}
            />

            <InputField
              label="Password"
              type="password"
              name="password"
              value={Data.password}
              onChange={handleChange}
              placeholder="••••••••••••"
              icon={Lock}
              required
            />

            {!isLogin && (
              <InputField
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={Data.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••••••"
                icon={Lock}
                required
              />
            )}

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setData({ ...Data, role: "user" })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      Data.role === "user"
                        ? "bg-violet-600 border-violet-500 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <User className="w-4 h-4" /> User
                  </button>
                  <button
                    type="button"
                    onClick={() => setData({ ...Data, role: "admin" })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      Data.role === "admin"
                        ? "bg-violet-600 border-violet-500 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Briefcase className="w-4 h-4" /> Admin
                  </button>
                </div>
              </div>
            )}

            {!isLogin && (
              <InputField
                label="Company Name (Optional)"
                type="text"
                name="companyName"
                value={Data.companyName}
                onChange={handleChange}
                placeholder="Leave blank for personal use"
                icon={Briefcase}
                required={false}
              />
            )}

            <div className="flex items-center justify-center gap-2">
              <input
                type="checkbox"
                name="rememberMe"
                id="rememberMe"
                checked={Data.rememberMe}
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || oauthLoading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  isLogin ? (
                    "Signing In..."
                  ) : (
                    "Creating Account..."
                  )
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"}{" "}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

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

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || oauthLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:border-slate-700 transition-all text-sm font-medium text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={handleGithubLogin}
                disabled={loading || oauthLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:border-slate-700 transition-all text-sm font-medium text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                GitHub
              </button>
            </div>

            <div className="mt-5 flex justify-center w-full">
              <div className="mt-0.5 text-sm">
                {isLogin
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </div>
              <a
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="ml-2 text-violet-400 hover:text-violet-300 font-medium cursor-pointer"
              >
                {isLogin ? "Create one" : "Sign in"}
              </a>
            </div>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed max-w-sm mx-auto">
              By clicking &quot;Create Account&quot;, you agree to our{" "}
              <a href="#" className="text-slate-400 underline hover:text-white">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-slate-400 underline hover:text-white">
                Privacy Policy
              </a>
              .
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
