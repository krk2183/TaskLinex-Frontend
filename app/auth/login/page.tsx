"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Github, Chrome, ShieldCheck } from "lucide-react";

// --- COMPONENTS ---

const Logo = () => (
  <div className="flex items-center gap-2 mb-12">
    <div className="w-2 h-6 bg-violet-600 rounded-sm" />
    <span className="text-xl font-bold tracking-tight select-none">
      <span className="text-white">Task</span>
      <span className="text-violet-500">Linex</span>
    </span>
  </div>
);

const InputField = ({ 
  label, 
  type, 
  placeholder, 
  icon: Icon 
}: { 
  label: string, 
  type: string, 
  placeholder: string, 
  icon: any 
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
        className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg block pl-10 p-3 placeholder-slate-600 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all shadow-sm"
        placeholder={placeholder}
      />
    </div>
  </div>
);

// --- PAGE ---

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-200 font-sans selection:bg-violet-500/30">
      
      {/* LEFT SIDE: FORM */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-24 xl:px-32 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Logo />
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Resume Context</h1>
            <p className="text-slate-400">Authenticate to access your workspace.</p>
          </div>

          <form className="space-y-5">
            <InputField 
              label="Work Email" 
              type="email" 
              placeholder="name@company.com" 
              icon={Mail} 
            />
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                 <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Password
                 </label>
                 <Link href="#" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                    Reset credentials?
                 </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                </div>
                <input
                  type="password"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg block pl-10 p-3 placeholder-slate-600 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all shadow-sm"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-lg shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all flex items-center justify-center gap-2 group">
              Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-950 text-slate-500 text-xs uppercase tracking-widest font-semibold">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:border-slate-700 transition-all text-sm font-medium text-slate-300">
               <Chrome className="w-4 h-4" /> Google
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:border-slate-700 transition-all text-sm font-medium text-slate-300">
               <Github className="w-4 h-4" /> GitHub
            </button>
          </div>

          <p className="mt-10 text-center text-sm text-slate-500">
            No active session? <Link href="/signup" className="text-violet-400 hover:text-violet-300 font-medium">Initialize Workspace</Link>
          </p>
        </motion.div>
      </div>

      {/* RIGHT SIDE: VISUALIZATION */}
      <div className="hidden lg:block w-1/2 relative bg-[#0B0F17] overflow-hidden border-l border-slate-800">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20" />
        
        <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-[400px] h-[300px] bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 relative shadow-2xl">
                 {/* Decorative Header */}
                 <div className="flex gap-2 mb-6 border-b border-slate-800 pb-4">
                     <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50" />
                     <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                     <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                 </div>
                 
                 {/* Decorative Code/Status */}
                 <div className="space-y-3 font-mono text-xs">
                     <div className="flex justify-between text-slate-500">
                         <span>status</span>
                         <span className="text-emerald-500">active</span>
                     </div>
                     <div className="flex justify-between text-slate-500">
                         <span>encryption</span>
                         <span className="text-violet-400">TLS 1.3 / AES-256</span>
                     </div>
                     <div className="h-px bg-slate-800 my-2" />
                     <div className="text-slate-400">
                        <span className="text-violet-500">➜</span> verifying_handshake...
                     </div>
                     <div className="text-slate-400">
                        <span className="text-violet-500">➜</span> establishing_secure_tunnel...
                     </div>
                     <div className="text-slate-200 animate-pulse">
                        <span className="text-emerald-500">✔</span> ready_for_auth
                     </div>
                 </div>

                 {/* Secure Badge */}
                 <div className="absolute -bottom-6 -right-6 bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
                     <ShieldCheck className="w-4 h-4 text-emerald-500" />
                     <span className="text-xs font-bold text-slate-300">SOC2 Compliant</span>
                 </div>
             </div>
        </div>
      </div>

    </div>
  );
}