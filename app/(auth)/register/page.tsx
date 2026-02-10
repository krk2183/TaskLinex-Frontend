"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Mail, User, Briefcase, ChevronRight, Lock, AlertCircle } from "lucide-react";

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
  required = false
}: { 
  label: string, 
  type: string, 
  placeholder: string,
  icon: any,
  name: string,
  value: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  required?: boolean
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
    rememberMe: false
  });
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setData({ ...Data, [e.target.name]: value });
    setError(""); 
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && Data.password !== Data.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    
    try {
      const endpoint = isLogin ? "login" : "signup";
      const body = isLogin 
        ? { email: Data.email, password: Data.password, rememberMe: Data.rememberMe }
        : (() => {
            const { confirmPassword, ...rest } = Data;
            return rest;
          })();
      
      const response = await fetch(`http://192.168.0.${process.env.NEXT_PUBLIC_NPM_PORT}:8000/${endpoint}`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `${isLogin ? "Login" : "Signup"} failed. Please try again.`);
      }
      
      const data = await response.json();
      if (data && data.id) {
        // THIS FIXES THE LOGIN ISSUE: Setting localStorage on both Login and Signup
        localStorage.setItem("userId", data.id);
        localStorage.setItem("access_token", data.access_token);
        if (data.role) localStorage.setItem("user_role", data.role);
        
        window.location.href = "/roadmap";
      } else {
        window.location.href = "/login";
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-200 font-sans selection:bg-violet-500/30">
      
      <div className="hidden lg:flex w-5/12 relative bg-[#0B0F17] overflow-hidden border-r border-slate-800 flex-col p-12">
           <div className="flex items-center gap-2 mb-12">
            <span className="text-4xl font-bold tracking-tight select-none">
              <span className="text-white">Task</span>
              <span className="text-violet-500">Linex</span>
            </span>
          </div>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-violet-900/20 via-slate-950 to-slate-950" />
         <div className="relative z-10">
             <h2 className="text-4xl font-bold text-white tracking-tight mb-6">
                 Built for <br/> 
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Deterministic</span> <br/>
                 Workflows.
             </h2>
             
             <div className="space-y-6">
                 {['Isolate dependencies.', 'Visualize critical paths.', 'Eliminate status meetings.'].map((item, i) => (
                     <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
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
                     {[1,2,3].map(i => (
                         <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950" />
                     ))}
                 </div>
                 <p className="text-xs text-slate-500 font-medium">Join 4,000+ engineering leaders</p>
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
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">{isLogin ? "Welcome Back" : "Initialize Workspace"}</h1>
            <p className="text-slate-400">{isLogin ? "Enter your credentials to access your workspace." : "Begin your 14-day trial. No credit card required."}</p>
          </div>

          <form className="space-y-5" onSubmit={handleSignup}>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
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
              label="Work Email" 
              type="email" 
              name="email"
              value={Data.email}
              onChange={handleChange}
              placeholder="jane@company.com" 
              icon={Mail}
              required
            />

            <InputField 
              label="Password" 
              type="password" 
              name="password"
              value={Data.password}
              onChange={handleChange}
              placeholder="Password" 
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
              placeholder="Confirm Password" 
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
                        onClick={() => setData({...Data, role: 'user'})}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${Data.role === 'user' ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                    >
                        <User className="w-4 h-4" /> User
                    </button>
                    <button
                        type="button"
                        onClick={() => setData({...Data, role: 'admin'})}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${Data.role === 'admin' ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                    >
                        <Briefcase className="w-4 h-4" /> Admin
                    </button>
                </div>
            </div>
            )}

            {!isLogin && (
            <InputField 
              label="Company Name" 
              type="text" 
              name="companyName"
              value={Data.companyName}
              onChange={handleChange}
              placeholder="Acme Inc." 
              icon={Briefcase} 
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
              <label htmlFor="rememberMe" className="text-sm text-slate-400 select-none  cursor-pointer hover:text-slate-300 transition-colors">
                Remember me
              </label>
            </div>
            

            <div className="pt-2">
                <button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all flex items-center justify-center gap-2 group">
                {loading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")} {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>
            </div>

          <div className="mt-5 flex justify-center w-full">
           
             <div className="mt-0.5 text-sm">{isLogin ? "Don't have an account?" : "Already have an account?"}</div>  
             <a onClick={() => { setIsLogin(!isLogin); setError(""); }} className="ml-2 text-violet-400 hover:text-violet-300 font-medium cursor-pointer">
              {isLogin ? "Create one" : "Sign in"}
            </a>
          </div>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed max-w-sm mx-auto">
                By clicking "Create Account", you agree to our <a href="#" className="text-slate-400 underline hover:text-white">Terms of Service</a> and <a href="#" className="text-slate-400 underline hover:text-white">Privacy Policy</a>.
            </p>
          </form>


        </motion.div>
      </div>

    </div>
  );
}