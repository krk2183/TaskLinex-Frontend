"use client";

import React, { useState,useMemo, useEffect, useRef } from "react";

import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import {
    Server,Send, Calculator,
  Zap, Layers, ArrowRight, CheckCircle,
  AlertTriangle, Clock, GitCommit, Sparkles,
  User, Search, GitPullRequest,
  Workflow, MessageSquare, BrainCircuit,
  ChevronRight, Activity
  ,CornerDownRight,
 X, ChevronLeft, BarChart3, Lock, RefreshCw
} from "lucide-react";

// --- UTILS & CONSTANTS ---

const GLASS_PANEL = "bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]";
const HIGHLIGHT_TEXT = "text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-violet-300";

// --- REUSABLE COMPONENTS FROM YOUR APP (ADAPTED FOR LANDING) ---

// 1. From analytics.tsx: Heatmap Cell
const HeatmapCell = ({ load, delay }: { load: number, delay: number }) => {
  let bgClass = "bg-white/[0.05]";
  if (load > 40) bgClass = "bg-indigo-500/40";
  if (load > 80) bgClass = "bg-indigo-500";
  if (load > 100) bgClass = "bg-rose-500";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.02 }}
      className={`h-8 w-full rounded-sm border border-white/[0.05] ${bgClass} relative group`}
    >
        {load > 100 && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-400 rounded-full animate-pulse" />
        )}
    </motion.div>
  );
};

// 2. From roadmap.tsx: Task Item Visualization
const TaskItem = ({ title, width, start, status, avatar, delay }: any) => {
    const statusColor = {
        'On Track': 'bg-indigo-500',
        'At Risk': 'bg-amber-500',
        'Blocked': 'bg-rose-500',
        'Completed': 'bg-emerald-500'
    }[status as string] || 'bg-slate-700';

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.5 }}
            className={`absolute top-2 h-10 rounded-lg shadow-lg flex items-center px-3 gap-2 overflow-hidden border border-white/10 ${statusColor}`}
            style={{ left: `${start}%`, width: `${width}%` }}
        >
            <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-black/20 to-transparent w-full" />
            <span className="relative z-10 text-xs font-bold text-white truncate">{title}</span>
            {avatar && (
                <div className="absolute right-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-bold text-white">
                    {avatar}
                </div>
            )}
        </motion.div>
    );
};

// 3. From analytics.tsx: Dependency Ripple (Simplified SVG)
const RippleGraph = () => (
    <div className="relative h-64 w-full flex items-center justify-center group">
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
        <defs>
          <marker id="head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
          </marker>
        </defs>
        <motion.path 
            d="M 100 128 C 200 128, 200 64, 300 64" 
            stroke="#6366f1" strokeWidth="1" fill="none" markerEnd="url(#head)" 
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
        />
        <motion.path 
            d="M 100 128 C 200 128, 200 192, 300 192" 
            stroke="#6366f1" strokeWidth="1" fill="none" markerEnd="url(#head)" 
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.7, ease: "easeInOut" }}
        />
        <motion.path 
            d="M 340 64 C 400 64, 400 128, 460 128" 
            stroke="#6366f1" strokeWidth="1" fill="none" markerEnd="url(#head)" 
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.9, ease: "easeInOut" }}
        />
      </svg>

      {/* Nodes */}
      <div className="absolute left-[80px] top-[108px]">
         <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-500 animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.4)]">
             <AlertTriangle size={16} />
         </div>
      </div>

      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} className="absolute left-[300px] top-[44px]">
         <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center text-indigo-400">
             <span className="text-xs font-bold">FE</span>
         </div>
      </motion.div>

      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }} className="absolute left-[300px] top-[172px]">
         <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center text-indigo-400">
             <span className="text-xs font-bold">API</span>
         </div>
      </motion.div>
      
       <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 }} className="absolute left-[460px] top-[108px]">
         <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400 opacity-50">
             <span className="text-xs font-bold">QA</span>
         </div>
      </motion.div>
    </div>
);

// 4. New Component: Chat Bubble for Communication Feature
const ChatBubble = ({ user, text, delay, align = "left" }: any) => (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className={`flex gap-3 max-w-[90%] ${align === "right" ? "ml-auto flex-row-reverse" : ""}`}
    >
        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/5 flex items-center justify-center text-[10px] text-white/60 shrink-0">
            {user}
        </div>
        <div className={`p-3 rounded-2xl border border-white/5 text-xs text-white/70 ${align === "right" ? "bg-violet-500/10 border-violet-500/20 text-violet-100" : "bg-white/5"}`}>
            {text}
        </div>
    </motion.div>
);

// --- SECTIONS ---

function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-0.5 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl"
    >
    <div className="flex items-center gap-2 mb-5 mt-[1vw]">
        <span className="text-sm font-bold tracking-tight select-none">
        <span className="text-white text-3xl">Task</span>
        <span className="text-violet-500 text-3xl">Linex</span>
        </span>
    </div>

      <nav className="hidden md:flex gap-7 text-[13px] font-medium text-white/50">
        <a href="#envoy" className="hover:text-white          transition-colors">Envoy</a>
        <a href="#roadmap" className="hover:text-white transition-colors">Roadmap</a>
        <a href="#pulse" className="hover:text-white     transition-colors">Pulse</a>
        <a href="#personas" className="hover:text-white     transition-colors">Personas</a>

      </nav>
      <div className="flex items-center gap-1">
        <a href="/login" className="text-[13px] mr-2 font-medium text-white/70 hover:text-white transition-colors">Log in</a>
        <a href="/register" className="bg-white text-black text-[13px] font-semibold px-3 py-1.5 rounded-lg hover:bg-white/90 transition-all">
          Get Access
        </a>    
      </div>
    </motion.header>
  );
}

function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 800], [0, 100]);

  return (
    <section className="relative flex flex-col items-center pt-32 pb-20 overflow-hidden bg-[#050505]">
      {/* Background Glow */}
      <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }} className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 12, repeat: Infinity, repeatType: "mirror", delay: 1 }} className="absolute top-[10%] left-[20%] w-[600px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />

      <div className="relative z-10 text-center max-w-5xl px-4 mb-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-md mb-8 shadow-[0_0_20px_rgba(139,92,246,0.1)]"
        >
          <Sparkles className="w-3 h-3 text-violet-400" />
          <span className="text-xs font-medium text-violet-200">Envoy 2.0 is now live</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-7xl md:text-9xl font-semibold tracking-tighter text-white mb-8"
        >
          Clarity in <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white/60 to-white/20">Complex Systems.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-12 font-light"
        >
          The task engine for high-velocity engineering.
          Plan with <span className="text-violet-400 font-medium">Roadmaps</span>.
          Predict with <span className="text-violet-400 font-medium">Envoy</span>.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button className="h-12 px-8 rounded-full bg-white text-black font-semibold hover:bg-violet-50 transition-colors flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            Start Workspace <ArrowRight className="w-4 h-4" />
          </button>
          <button className="h-12 px-8 rounded-full border border-white/20 text-white/80 font-medium hover:bg-white/10 transition-colors">
            View the Roadmap
          </button>
        </motion.div>
      </div>

      {/* HERO VISUAL: Relative positioning */}
      <motion.div 
        style={{ y }} 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.4 }}
        className="relative w-full max-w-6xl px-4 z-20"
      >
         {/* Glow Effect */}
         <div className="absolute -inset-1 bg-gradient-to-b from-violet-500/30 to-transparent blur-2xl -z-10 rounded-[2rem] opacity-50" />
         
         <div className="w-full h-[600px] rounded-xl border border-white/10 bg-[#0B1120] shadow-2xl relative overflow-hidden flex flex-col">
            
            {/* Browser/App Header */}
            <div id='roadmap' className="h-10 border-b border-white/5 bg-[#0F172A] flex items-center px-4 justify-between">
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                </div>
                <div  className="flex items-center gap-2 px-3 py-1 rounded bg-black/40 border border-white/5 text-[10px] text-white/40 font-mono">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                    app.tasklinex.com/roadmap
                </div>
                <div className="w-16" /> {/* Spacer for centering */}
            </div>
            
            {/* App Header (Roadmap Style) */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0B1120]">
                <div className="flex items-center gap-4">
                    <div className="p-1.5 bg-violet-500/10 rounded">
                        <Layers className="w-4 h-4 text-violet-400" />
                    </div>
                    <span className="text-sm font-semibold text-white">Q3 Engineering Roadmap</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                         <div className="w-6 h-6 rounded-full bg-emerald-500 border border-[#0F172A]" />
                         <div className="w-6 h-6 rounded-full bg-violet-500 border border-[#0F172A]" />
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <button className="bg-violet-600 text-white px-3 py-1 text-xs font-bold rounded shadow-lg shadow-violet-500/20">Auto-Balance</button>
                </div>
            </div>

            {/* Main Gantt Area (Simulating roadmap.tsx) */}
            <div className="flex-1 relative bg-[#0B1120] p-8 overflow-hidden">
                {/* Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-6 pointer-events-none">
                     {[...Array(6)].map((_, i) => (
                         <div key={i} className="border-r border-dashed border-white/5 h-full" />
                     ))}
                </div>

                {/* Project Group 1 */}
                <div className="relative mb-12">
                     <div className="flex items-center gap-3 mb-4">
                         <ChevronRight className="w-4 h-4 text-white/40 rotate-90" />
                         <h3 className="text-sm font-bold text-white">Core Infrastructure</h3>
                     </div>
                     <div className="relative h-32 w-full">
                         {/* Dependency Line SVG Layer */}
                         <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                             <path d="M 25% 40px C 28% 40px, 30% 80px, 33% 80px" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="4" className="opacity-40" />
                         </svg>

                         <TaskItem title="Auth Migration" start={5} width={20} status="Completed" avatar="AC" delay={0.3} />
                         <TaskItem title="API Gateway Config" start={33} width={15} status="At Risk" avatar="SJ" delay={0.5} />
                         <TaskItem title="DB Sharding" start={55} width={25} status="On Track" avatar="MR" delay={0.7} />
                         
                         {/* Floating Envoy Popup Simulation */}
                         <motion.div 
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 1.5, duration: 0.5 }}
                            className="absolute top-14 left-[38%] z-50 bg-slate-800 border border-violet-500/30 p-3 rounded-xl shadow-2xl w-48"
                         >
                             <div className="flex items-center gap-2 mb-2 text-violet-400">
                                 <BrainCircuit size={12} />
                                 <span className="text-[10px] font-bold uppercase">Envoy Detected Risk</span>
                             </div>
                             <p className="text-[10px] text-slate-300 leading-tight">Dependency delay detected. Shift 'DB Sharding' to next sprint?</p>
                         </motion.div>
                     </div>
                </div>

                {/* Project Group 2 */}
                <div className="relative">
                     <div className="flex items-center gap-3 mb-4">
                         <ChevronRight className="w-4 h-4 text-white/40 rotate-90" />
                         <h3 className="text-sm font-bold text-white">Frontend Refresh</h3>
                     </div>
                     <div className="relative h-24 w-full">
                         <TaskItem title="Component Library" start={10} width={30} status="On Track" avatar="SJ" delay={0.9} />
                         <TaskItem title="User Dashboard" start={45} width={20} status="Blocked" avatar="AC" delay={1.1} />
                     </div>
                </div>
            </div>
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10" />
         </div>
      </motion.div>
    </section>
  );
}

// --- CALCULATOR & DASHBOARD VISUALIZATION COMPONENTS ---

// Simplified Mock Data for the Visual
const MINI_TASKS = [
  { id: "t1", title: "Auth Migration", status: "Blocked", leakageHours: 12 },
  { id: "t2", title: "API Gateway", status: "Stalled", leakageHours: 2 },
  { id: "t3", title: "Dashboard UI", status: "In Progress", leakageHours: 1 },
];

const MiniRippleGraph = () => (
    <div className="relative h-40 w-full flex items-center justify-center scale-75 origin-center">
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
        <defs>
          <marker id="head-mini" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
        </defs>
        <path d="M 100 80 C 200 80, 200 50, 300 50" stroke="#64748b" strokeWidth="1" fill="none" markerEnd="url(#head-mini)" />
        <path d="M 100 80 C 200 80, 200 110, 300 110" stroke="#64748b" strokeWidth="1" fill="none" markerEnd="url(#head-mini)" />
      </svg>
      <div className="absolute left-[80px]">
         <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-500 animate-pulse">
             <AlertTriangle size={14} />
         </div>
      </div>
      <div className="absolute right-[80px] top-[40px]">
         <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center text-indigo-400">
             <span className="text-[8px] font-bold">API</span>
         </div>
      </div>
      <div className="absolute right-[80px] top-[100px]">
         <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400">
             <span className="text-[8px] font-bold">UI</span>
         </div>
      </div>
    </div>
);

const MiniLeakage = () => (
    <div className="space-y-2 mt-4">
        {MINI_TASKS.map((task, i) => (
             <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{task.title}</span>
                    <span className={task.leakageHours > 5 ? "text-rose-400" : "text-slate-500"}>-{task.leakageHours}h</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(task.leakageHours / 15) * 100}%` }}
                        className={`h-full ${task.leakageHours > 5 ? 'bg-rose-500' : 'bg-slate-600'}`}
                    />
                </div>
             </div>
        ))}
    </div>
);

import { Users, Shield, Target, Cpu } from 'lucide-react';
const MacBookFrame = ({ step }: { step: number }) => {
    // Dynamic simulation based on the landing page calculator step
    const teamData = useMemo(() => ({
        debt: step > 3 ? "CRITICAL" : "STABLE",
        leakage: step > 2 ? 42 : 12,
        risk: step > 4 ? "SEVERE" : "MINIMAL",
        members: [
            { name: "Alex Chen", role: "Backend Lead", focus: 88, color: "text-violet-400" },
            { name: "Sarah J.", role: "Design Sys", focus: 42, color: "text-rose-400" },
            { name: "Mike Ross", role: "DevOps", focus: 95, color: "text-emerald-400" }
        ]
    }), [step]);

    return (
        <div className="relative w-full max-w-2xl ml-auto mr-0 px-4 group py-12 select-none">
            {/* 30% Horizontal Shift Container (Desktop Only) */}
            <div className="relative w-full transition-all duration-700 ease-out md:-translate-x-[15%]">
                
                {/* 1. THE LID: Space Black Aluminum Shell */}
                <div className="relative z-10 bg-[#080809] rounded-t-xl p-[0.6%] border-x border-t border-white/[0.12] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)]">
                    
                    {/* Micro-Bezel Glass Buffer */}
                    <div className="bg-black p-[0.4%] rounded-t-lg">
                        
                        {/* Precision Camera Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[12%] h-[3%] bg-black rounded-b-md z-30 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-violet-900/40 border border-violet-500/20" />
                        </div>

                        {/* SCREEN: Locked Aspect Ratio */}
                        <div className="relative w-full aspect-[16/10] bg-[#050505] rounded-md overflow-hidden flex flex-col shadow-[inset_0_0_120px_rgba(0,0,0,1)] border border-white/5">
                            
                            {/* OS Header - Violet-700 Themed */}
                            <div className="h-7 border-b border-white/[0.04] bg-black/60 backdrop-blur-xl flex items-center px-4 justify-between relative z-20">
                                <div className="flex gap-2 group/controls">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF5F56] border border-[#E0443E] relative flex items-center justify-center">
                                        <X className="w-1.5 h-1.5 text-black/30 opacity-0 group-hover/controls:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E] border border-[#DEA123] relative flex items-center justify-center">
                                        <div className="w-1.5 h-[1px] bg-black/30 opacity-0 group-hover/controls:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#27C93F] border border-[#1AAB29] relative flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 border-[0.5px] border-black/30 opacity-0 group-hover/controls:opacity-100 transition-opacity rotate-45" />
                                    </div>
                                </div>
                                <span className="text-[5px] text-white/30 tracking-[0.4em] font-black uppercase">
                                    Team Intelligence
                                </span>
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-10 bg-violet-950/40 rounded-full overflow-hidden">
                                        <motion.div 
                                            animate={{ x: [-30, 50] }} 
                                            transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }} 
                                            className="h-full w-6 bg-violet-600/50 blur-[2px]" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Internal Dashboard Content */}
                            <div className="p-8 flex-1 grid grid-cols-12 gap-6 relative z-20 overflow-hidden">
                                
                                {/* LEFT: Team Health & Capacity (Col Span 4) */}
                                <div className="col-span-4 space-y-4">
                                    {/* Coordination Debt Card */}
                                    <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl backdrop-blur-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Activity className="w-3 h-3 text-violet-600" />
                                            <span className="text-[6px] text-white/40 uppercase font-black tracking-widest">Health</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-[6px] text-white/20 uppercase mb-1 font-bold">Coordination Debt</div>
                                                <div className={`text-sm font-black font-mono tracking-tighter ${teamData.debt === 'CRITICAL' ? 'text-rose-600' : 'text-emerald-500'}`}>
                                                    {teamData.debt}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[6px] text-white/20 uppercase mb-1 font-bold">Leakage Score</div>
                                                <div className="text-sm font-black font-mono text-violet-500">{teamData.leakage}%</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Live Member Attention Map */}
                                    <div className="bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl">
                                        <div className="text-[6px] text-white/20 uppercase font-black mb-3 tracking-widest">Attention Map</div>
                                        <div className="space-y-3">
                                            {teamData.members.map((m, i) => (
                                                <div key={i} className="flex justify-between items-center border-b border-white/[0.02] pb-2">
                                                    <div>
                                                        <div className="text-[8px] text-white font-bold tracking-tight">{m.name}</div>
                                                        <div className="text-[6px] text-white/20 font-medium">{m.role}</div>
                                                    </div>
                                                    <div className={`text-[8px] font-mono font-black ${m.color}`}>{m.focus}%</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: Envoy Intelligence (Col Span 8) */}
                                <div className="col-span-8 h-full">
                                    <div className="bg-violet-950/10 border border-violet-700/20 rounded-2xl p-6 relative overflow-hidden h-full flex flex-col">
                                        {/* Background Violet Glow */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-700/5 blur-3xl rounded-full" />
                                        
                                        <div className="flex justify-between items-center mb-6 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <Shield className="w-3 h-3 text-violet-500 shadow-[0_0_10px_rgba(109,40,217,0.4)]" />
                                                <h3 className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Envoy Interventions</h3>
                                            </div>
                                            <div className="px-2 py-0.5 rounded-sm bg-violet-700 text-white text-[6px] font-black tracking-tighter">
                                                ACTIVE PROTOCOL
                                            </div>
                                        </div>

                                        {/* Interaction Logic simulation */}
                                        <div className="space-y-3 flex-1 relative z-10">
                                            <div className="bg-black/60 border border-white/[0.08] p-4 rounded-xl flex items-start gap-3 shadow-xl">
                                                <AlertTriangle className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-[9px] text-white/80 leading-relaxed font-medium">
                                                        High dependency risk: <span className="text-violet-400">Sarah</span> is currently a single point of failure for <span className="text-violet-400 tracking-tighter">Core.API.v2</span>.
                                                    </p>
                                                    <div className="flex gap-2 mt-3">
                                                        <div className="h-4 w-16 bg-violet-700/20 rounded-md border border-violet-700/40 flex items-center justify-center">
                                                            <div className="w-8 h-0.5 bg-violet-500/50 rounded-full" />
                                                        </div>
                                                        <div className="h-4 w-12 bg-white/5 rounded-md" />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-black/60 border border-white/[0.08] p-4 rounded-xl flex items-start gap-3 shadow-xl">
                                                <Zap className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-[9px] text-white/80 leading-relaxed font-medium">
                                                        Optimization: Envoy detected skill alignment. Suggesting cross-train for <span className="text-emerald-400">Kubernetes</span>.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer Visualization */}
                                        <div className="mt-auto pt-6 border-t border-white/[0.05] flex justify-between items-end relative z-10">
                                            <div className="flex gap-1.5 h-10 items-end">
                                                {[40, 75, 55, 100, 85, 60, 45, 90].map((h, i) => (
                                                    <motion.div 
                                                        key={i} 
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${h}%` }}
                                                        className={`w-1 rounded-t-full transition-colors duration-500 ${h === 100 ? 'bg-violet-600 shadow-[0_0_15px_rgba(109,40,217,0.6)]' : 'bg-violet-900/30'}`} 
                                                    />
                                                ))}
                                            </div>
                                            <div className="text-[6px] text-white/20 font-mono tracking-widest uppercase font-bold">
                                                Sync Status: Nominal
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Glass Reflection Layer */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] via-transparent to-transparent pointer-events-none z-30" />
                        </div>
                    </div>
                </div>

                {/* 2. THE CHASSIS: M4 Stealth Body */}
                <div className="relative -mt-px group-hover:translate-y-[1px] transition-transform duration-500">
                    <div className="h-2.5 bg-[#121214] rounded-b-xl -mx-[3%] shadow-[0_30px_70px_rgba(0,0,0,0.8)] border-t border-white/10 relative z-20 flex justify-center">
                        {/* Hinge/Touch Bar Notch */}
                        <div className="w-16 h-1 bg-black/60 rounded-b-md border-x border-b border-white/10 shadow-inner" />
                    </div>
                    
                    {/* Floor Reflection Underglow (Violet-700) */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[85%] h-12 bg-violet-700/15 blur-[60px] rounded-full opacity-60" />
                </div>
            </div>
        </div>
    );
};

// --- SECTIONS: VALUE CALCULATOR ---

const QUESTIONS = [
    {
        id: "tool",
        q: "Which tool do you currently use?",
        options: ["Jira", "Trello", "ClickUp", "Linear", "Spreadsheets/None"]
    },
    {
        id: "frustration",
        q: "What frustrates you most?",
        options: ["Too much admin work", "Hard to see priorities", "Constant context switching", "Unclear dependencies", "Scattered information"]
    },
    {
        id: "blockers",
        q: "How often does unclear ownership block work?",
        options: ["Rarely", "Sometimes", "Often", "Constantly"]
    },
    {
        id: "decisions",
        q: "Where do most decisions actually happen?",
        options: ["In the task tool", "In Slack/Teams", "In Meetings", "Hallway/Random"]
    },
    {
        id: "role",
        q: "What best describes you?",
        options: ["Founder", "Engineer", "Product Manager", "Team Lead"]
    }
];

function ValueCalculator() {
    const [active, setActive] = useState(false);
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [showResult, setShowResult] = useState(false);
    const [calculating, setCalculating] = useState(false);

    // Dynamic Logic for Results
    const getResultData = () => {
        const tool = answers["tool"] || "Jira";
        let hoursLost = 5;
        let headline = "TaskLinex optimizes thinking.";

        // Simple Heuristic Logic
        if (tool === "Jira") {
            hoursLost += 3;
            headline = "Jira optimizes process. TaskLinex optimizes thinking.";
        } else if (tool === "Trello") {
            hoursLost += 4; // Chaos penalty
            headline = "Trello organizes cards. TaskLinex organizes work.";
        } else if (tool === "ClickUp") {
            hoursLost += 2.5;
            headline = "ClickUp gives features. TaskLinex gives clarity.";
        }

        if (answers["blockers"] === "Constantly") hoursLost += 5;
        if (answers["blockers"] === "Often") hoursLost += 3;
        if (answers["decisions"] === "In Slack/Teams") hoursLost += 2;

        return { hoursLost: Math.min(hoursLost, 20), headline };
    };

    const handleSelect = (option: string) => {
        setAnswers(prev => ({ ...prev, [QUESTIONS[step].id]: option }));

        if (step < QUESTIONS.length - 1) {
            setStep(prev => prev + 1);
        } else {
            // Finish
            setCalculating(true);
            setTimeout(() => {
                setCalculating(false);
                setShowResult(true);
            }, 1200);
        }
    };

    const reset = () => {
        setActive(false);
        setStep(0);
        setShowResult(false);
        setAnswers({});
    };

    const resultData = getResultData();

    return (
        <section className={`relative py-24 px-6 border-b border-white/5 transition-all duration-500 ease-in-out ${active ? "bg-[#080808]" : "bg-[#050505]"}`}>
            <div className="max-w-6xl mx-auto">

                <AnimatePresence mode="wait">
                    {!active ? (
                        /* TEASER STATE */
                        <motion.div
                            key="teaser"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
                        >
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                                    <Calculator size={14} className="text-violet-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Personal Estimate</span>
                                </div>
                                <h2 className="text-4xl font-semibold text-white tracking-tight">
                                    See how much coordination <br/>
                                    <span className="text-white/40">is costing you.</span>
                                </h2>
                                <p className="text-lg text-white/50 max-w-md">
                                    A 30-second estimate based on how you actually work.
                                    No marketing nonsense, just math.
                                </p>
                                <button
                                    onClick={() => setActive(true)}
                                    className="group flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold text-sm hover:bg-violet-50 transition-all"
                                >
                                    Calculate my overhead
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                            <div className="relative">
                                {/* Decor */}
                                <div className="absolute top-1/2 right-[10px] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-violet-500/10 blur-[100px] rounded-full pointer-events-none" />
                                <MacBookFrame step={0} />
                            </div>
                        </motion.div>
                    ) : (
                        /* ACTIVE CALCULATOR STATE */
                        <motion.div
                            key="active"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                                {/* Left Column: Questions or Results */}
                                <div className="lg:col-span-5 relative min-h-[400px] flex flex-col">
                                    
                                    {/* Header Controls */}
                                    <div className="flex justify-between items-center mb-8">
                                        <button onClick={reset} className="text-white/20 hover:text-white transition-colors flex items-center gap-2 text-xs">
                                            <X size={14} /> Cancel
                                        </button>
                                        {!showResult && !calculating && (
                                            <div className="text-xs font-mono text-violet-400">
                                                Step {step + 1} / {QUESTIONS.length}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col justify-center">
                                    {calculating ? (
                                        <div className="text-center space-y-4">
                                            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mx-auto" />
                                            <p className="text-white/50 text-sm">Crunching dependency chains...</p>
                                        </div>
                                    ) : showResult ? (
                                        /* RESULTS VIEW */
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="space-y-6"
                                        >
                                            <div className="inline-block px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold mb-2 border border-emerald-500/20">
                                                Analysis Complete
                                            </div>
                                            <h3 className="text-2xl font-bold text-white leading-tight">
                                                {resultData.headline}
                                            </h3>
                                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                                <div className="text-sm text-white/50 mb-1">Estimated overhead</div>
                                                <div className="flex items-end gap-2">
                                                    <span className="text-5xl font-bold text-violet-400">{resultData.hoursLost}h</span>
                                                    <span className="text-lg text-white/40 mb-1">/ week</span>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-2">
                                                    {["Context Switching", "Dependency Blindness", "Comm. Leakage"].map((tag, i) => (
                                                        <span key={i} className="text-[10px] px-2 py-1 rounded bg-black/40 border border-white/10 text-white/60">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex gap-4 pt-4">
                                                <a href='../register' className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-full font-bold text-sm transition-colors">
                                                    Get Early Access
                                                </a >
                                                <a href="#workflow" className="flex items-center gap-2 text-sm text-white/50 hover:text-white px-4 py-3">
                                                    See how it works <ArrowRight size={14} />
                                                </a>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        /* QUESTION VIEW */
                                        <div className="space-y-8">
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={step}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <h3 className="text-2xl font-medium text-white mb-8">
                                                        {QUESTIONS[step].q}
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {QUESTIONS[step].options.map((opt) => (
                                                            <button
                                                                key={opt}
                                                                onClick={() => handleSelect(opt)}
                                                                className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-violet-500/30 transition-all flex justify-between group"
                                                            >
                                                                <span className="text-white/70 group-hover:text-white transition-colors">{opt}</span>
                                                                <ChevronLeft className="w-4 h-4 text-white/20 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            </AnimatePresence>

                                            {step > 0 && (
                                                <button
                                                    onClick={() => setStep(prev => prev - 1)}
                                                    className="text-xs text-white/30 hover:text-white flex items-center gap-1"
                                                >
                                                    <ChevronLeft size={12} /> Back
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    </div>
                                </div>

                                {/* Right Column: Visual (MacBook) */}
                                <div className="lg:col-span-7 relative flex justify-center lg:justify-end">
                                    <div className={`transition-all duration-700 ${showResult ? "opacity-40 blur-sm scale-95" : "opacity-100"}`}>
                                        <MacBookFrame step={step} />
                                    </div>

                                    {/* Result Overlay Stats on top of laptop if result is shown */}
                                    {showResult && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-xl border border-violet-500/30 p-6 rounded-2xl shadow-2xl text-center w-64"
                                        >
                                            <div className="text-violet-400 mb-2">
                                                <Lock className="w-6 h-6 mx-auto" />
                                            </div>
                                            <div className="text-white font-bold mb-1">Value Unlocked</div>
                                            <div className="text-xs text-white/50">
                                                Potential to recover <br/>
                                                <span className="text-emerald-400 font-bold">~{resultData.hoursLost - 2} hours</span> / week
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </section>
    );
}

function EnvoySection() {
    const [step, setStep] = useState(0);

    // Auto-cycle through Envoy states
    useEffect(() => {
        const timer = setInterval(() => {
            setStep((prev) => (prev + 1) % 3);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    const content = [
        { icon: AlertTriangle, color: "text-rose-400", title: "Blocker Detected", text: "API Gateway latency is delaying 3 dependents." },
        { icon: GitPullRequest, color: "text-violet-400", title: "Context Ready", text: "Pull Request #892 matches 'Auth' context." },
        { icon: Activity, color: "text-emerald-400", title: "Velocity Check", text: "Team velocity is 15% above average. Burnout risk low." },
    ];

    return (
        <section id="envoy" className="py-32 px-6 bg-gradient-to-b from-[#050505] to-[#0c0512] relative overflow-hidden">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles className="w-5 h-5 text-violet-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-violet-500">Envoy Intelligence</span>
                    </div>
                    <h2 className={`text-5xl font-semibold tracking-tight mb-6 ${HIGHLIGHT_TEXT}`}>
                        Not a chatbot. <br/>
                        A co-pilot for state.
                    </h2>
                    <p className="text-lg text-white/50 leading-relaxed mb-8">
                        Envoy doesn't want to chat. It silently observes your dependency graph (based on our Ripple engine),
                        flagging circular blockers and slippage before they become fires.
                    </p>
                    <ul className="space-y-4">
                        {[
                            "Proactive blocker detection",
                            "One-click Gantt rescheduling",
                            "Context-aware PR filtering"
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-white/70">
                                <CheckCircle className="w-5 h-5 text-white/20" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* VISUAL: Envoy Analysis from Analytics.tsx */}
                <div className={`relative ${GLASS_PANEL} rounded-3xl p-8 min-h-[400px] flex flex-col justify-between overflow-hidden`}>
                     {/* Background Ripple Effect */}
                     <div className="absolute inset-0 opacity-30 pointer-events-none">
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500/20 blur-[80px] rounded-full animate-pulse" />
                     </div>

                     <div className="relative z-10">
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                             <h3 className="font-bold text-white flex items-center gap-2">
                                 <BrainCircuit className="w-4 h-4 text-violet-400" />
                                 Envoy Live Analysis
                             </h3>
                             <div className="flex gap-1">
                                 <div className="w-2 h-2 bg-violet-500 rounded-full animate-ping" />
                             </div>
                        </div>

                        {/* Graph Visualization */}
                        <RippleGraph />

                        {/* Dynamic Message Card */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="mt-6 bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-md"
                            >
                                <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0`}>
                                        {(() => {
                                            const Icon = content[step].icon;
                                            return <Icon className={`w-5 h-5 ${content[step].color}`} />;
                                        })()}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-medium mb-1 text-sm">{content[step].title}</h4>
                                        <p className="text-white/50 text-xs leading-relaxed">{content[step].text}</p>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                     </div>
                </div>
            </div>
        </section>
    );
}

function WorkflowEngine() {
    return (
        <section className="py-32 px-6 bg-[#050505] border-t border-white/5">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    
                    {/* Feature 1: Visual Task Flow */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-2">
                            <Workflow className="w-5 h-5 text-violet-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-violet-500">Visual Task Flow</span>
                        </div>
                        <h3 className="text-4xl font-semibold text-white">
                            See the work. <br/>
                            <span className="text-white/40">Not just the list.</span>
                        </h3>
                        <p className="text-white/50 leading-relaxed">
                            Kanban boards that actually understand dependencies. 
                            Switch views instantly between List, Board, and Timeline.
                            Spot bottlenecks before they block the sprint.
                        </p>
                        
                        {/* Visual: Mini Kanban/Task List */}
                        <div className={`${GLASS_PANEL} rounded-2xl p-6 h-[320px] relative overflow-hidden flex flex-col`}>
                             <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-4 rounded-t-lg mb-4">
                                 <div className="flex gap-1">
                                     <div className="w-2 h-2 rounded-full bg-rose-500" />
                                     <div className="w-2 h-2 rounded-full bg-amber-500" />
                                 </div>
                                 <div className="h-1 w-16 bg-white/10 rounded-full" />
                             </div>
                             <div className="flex-1 relative space-y-4">
                                 <div className="relative h-10 w-full">
                                     <TaskItem title="Backend API Refactor" start={0} width={70} status="On Track" avatar="MR" delay={0.2} />
                                 </div>
                                 <div className="relative h-10 w-full">
                                     <TaskItem title="Client Auth Hook" start={20} width={50} status="Blocked" avatar="SJ" delay={0.4} />
                                 </div>
                                 <div className="relative h-10 w-full">
                                     <TaskItem title="Design System Update" start={5} width={40} status="Completed" avatar="AC" delay={0.6} />
                                 </div>
                             </div>
                             
                             {/* Floating Status Pill */}
                             <motion.div 
                                initial={{ scale: 0 }}
                                whileInView={{ scale: 1 }}
                                transition={{ delay: 0.8 }}
                                className="absolute bottom-6 right-6 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400 text-xs font-bold flex items-center gap-2 shadow-lg"
                             >
                                 <AlertTriangle size={12} />
                                 Critical Path Blocked
                             </motion.div>
                        </div>
                    </div>


                    {/* /* Feature 2: Element-Linked Communication */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-violet-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-violet-500">Contextual Comms</span>
                        </div>
                        <h3 className="text-4xl font-semibold text-white">
                            Chat where <br/>
                            <span className="text-white/40">the work happens.</span>
                        </h3>
                        <p className="text-white/50 leading-relaxed">
                            Stop pasting links in Slack. Comments in TaskLinex are tied directly to the task, 
                            code snippet, or roadmap item. Context is preserved forever.
                        </p>

                        {/* Visual: Chat Interface */}
                        <div className={`${GLASS_PANEL} rounded-2xl p-6 h-[340px] relative flex flex-col`}>
                            {/* Header */}
                            <div className="border-b border-white/5 pb-4 mb-4 flex justify-between items-center">
                                <span className="text-xs font-bold text-white">Roadmap: Q3 Infrastructure</span>
                                <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">Live Thread</span>
                            </div>

                            <div className="flex-1 overflow-hidden relative flex flex-col">
                                
                                {/* The Element Being Replied To (Roadmap Item Representation) */}
                                <div className="relative group">
                                    {/* Visual connection line */}
                                    <div className="absolute left-4 top-10 bottom-[-20px] w-4 border-l-2 border-b-2 border-white/10 rounded-bl-xl z-0"></div>

                                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 relative z-10 backdrop-blur-md">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-violet-500/20 rounded text-violet-400">
                                                    <Server size={12} />
                                                </div>
                                                <span className="text-xs font-bold text-white">Database Migration</span>
                                            </div>
                                            <span className="text-[10px] text-white/40">Due: Oct 12</span>
                                        </div>
                                        {/* Tiny Roadmap Progress Bar Visual */}
                                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden flex">
                                            <div className="w-[65%] h-full bg-violet-500"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* The Chat Stream */}
                                <div className="mt-4 pl-8 space-y-3 relative z-10">
                                    {/* Reply Indicator Text */}
                                    <div className="flex items-center gap-1.5 text-[10px] text-white/30 mb-1 ml-1">
                                        <CornerDownRight size={10} />
                                        <span>Replying to roadmap item</span>
                                    </div>

                                    <ChatBubble 
                                        user="AC" 
                                        text="We need to pause the cron jobs before this runs." 
                                        delay={0.2} 
                                    />
                                    <ChatBubble 
                                        user="MR" 
                                        text="Agreed. I've updated the script to handle the pause automatically." 
                                        delay={0.4} 
                                        align="right" 
                                    />
                                </div>
                                
                                {/* Contextual Collumns */}
                                <div className="absolute bottom-0 left-0 right-0 h-10 bg-white/5 rounded-lg border border-white/10 flex items-center px-3 mt-auto">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="text-xs truncate mr-2">
                                            <span className="text-violet-400 font-medium">@MR</span> 
                                            <span className="text-white/60 ml-1">Looks good, proceed.</span>   
                                            <span className="w-[1.5px] h-3 bg-white-300 animate-pulse">|</span>             
                                        </div>
                                        <div className="h-7 w-7 flex items-center justify-center rounded-full bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/40 transition-all cursor-pointer group">
                                            <Send className="w-3.5 h-3.5 text-white/40 group-hover:text-violet-400 transition-colors -ml-0.5 mt-0.5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}

function SecondaryFeatures() {
    return (
        <section className="py-20 px-6 bg-[#0c0512] border-t border-white/5">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                    { icon: Search, label: "Smart Search", desc: "Query with natural language" },
                    { icon: GitCommit, label: "Git Integration", desc: "Two-way sync with GitHub" },
                    { icon: Clock, label: "Time Travel", desc: "Replay project history" },
                    { icon: CheckCircle, label: "Milestones", desc: "Track major release goals" }
                ].map((f, i) => (
                    <div key={i} className="flex flex-col items-center text-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-colors group cursor-default">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-violet-500/20 group-hover:text-violet-400 transition-all text-white/40 mb-2">
                            <f.icon size={20} />
                        </div>
                        <div>
                            <h4 className="text-white font-medium text-sm">{f.label}</h4>
                            <p className="text-white/40 text-xs mt-1">{f.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

function PersonasSection() {
    const [activePersona, setActivePersona] = useState<"builder" | "reviewer" | "architect">("builder");

    const personas = {
        builder: {
            color: "bg-emerald-500",
            items: [
                { id: 1, label: "Implement Auth Hook", status: "In Progress", time: "2h" },
                { id: 2, label: "Fix CSS Overflow", status: "Todo", time: "30m" },
            ]
        },
        reviewer: {
            color: "bg-amber-500",
            items: [
                { id: 3, label: "PR #892: Database Schema", status: "Reviewing", time: "15m" },
                { id: 4, label: "PR #888: Login Flow", status: "Approved", time: "-" },
            ]
        },
        architect: {
            color: "bg-violet-500",
            items: [
                { id: 5, label: "Q4 System Design", status: "Drafting", time: "2d" },
                { id: 6, label: "Review RFC: Scaling", status: "Pending", time: "1d" },
            ]
        }
    };

    return (
        <section id="personas" className="py-32 px-6 bg-[#0c0512] border-t border-white/5">
            <div className="max-w-4xl mx-auto text-center mb-16">
                 <h2 className={`text-4xl md:text-5xl font-semibold tracking-tight mb-6 ${HIGHLIGHT_TEXT}`}>
                    Fracture your focus. <br/> Intentionally.
                </h2>
                <p className="text-white/50 max-w-xl mx-auto">
                    You wear multiple hats. TaskLinex <span className="text-white">Personas</span> lets you split your account into distinct profiles.
                    Switch contexts instantly without losing state.
                </p> 
            </div>

            <div className="max-w-5xl mx-auto">
                {/* Persona Switcher UI */}
                <div className={`${GLASS_PANEL} rounded-3xl p-2 md:p-8 relative overflow-hidden`}>

                    {/* Switcher Controls */}
                    <div className="flex justify-center mb-8">
                        <div className="flex p-1 bg-black/40 rounded-full border border-white/10">
                            {(["builder", "reviewer", "architect"] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setActivePersona(p)}
                                    className={`relative px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activePersona === p ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                                >
                                    {activePersona === p && (
                                        <motion.div
                                            layoutId="activePill"
                                            className="absolute inset-0 bg-violet-600 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative capitalize z-10">{p}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Context View */}
                    <div className="relative min-h-[300px] bg-black/40 rounded-2xl border border-white/5 p-6 md:p-10 flex flex-col md:flex-row gap-8 items-start transition-colors duration-500">

                        {/* Profile Card */}
                        <div className="w-full md:w-64 shrink-0">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 mb-4 flex items-center justify-center">
                                <User className="w-8 h-8 text-white/70" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1 capitalize">{activePersona} Mode</h3>
                            <p className="text-xs text-white/40 mb-4">Filtering noise. Focusing on specific context.</p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-white/60">Strict Mode</span>
                            </div>
                        </div>

                        {/* Task List Transitioning */}
                        <div className="flex-1 w-full space-y-3">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activePersona}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-3"
                                >
                                    {personas[activePersona].items.map((item) => (
                                        <div key={item.id} className="group flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-2 rounded-full ${personas[activePersona].color}`} />
                                                <span className="text-sm font-medium text-white/90">{item.label}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-mono text-white/30">{item.status}</span>
                                                <div className="w-px h-4 bg-white/10" />
                                                <span className="text-xs font-mono text-white/30 w-8 text-right">{item.time}</span>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex items-center gap-3 px-4 py-2 opacity-30">
                                        <div className="w-full h-px bg-white/10" />
                                        <span className="text-[10px] uppercase whitespace-nowrap">Context Filter Active</span>
                                        <div className="w-full h-px bg-white/10" />
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function PulseDashboard() {
    return (
        <section id="pulse" className="py-32 px-6 bg-[#050505] border-t border-white/5 relative">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-900/10 blur-[120px] rounded-full pointer-events-none" />
             <div className="max-w-7xl mx-auto">
                <div className="mb-16 md:flex justify-between items-end">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 mb-6">
                            <Layers className="w-5 h-5 text-violet-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-violet-500">The Pulse</span>
                        </div>
                        <h2 className={`text-4xl md:text-5xl font-semibold tracking-tight ${HIGHLIGHT_TEXT}`}>
                            Your Morning Brief.
                        </h2>
                        <p className="text-lg text-white/50 mt-4">
                            Stop hunting for status. Pulse aggregates velocity, blockers, and capacity heatmaps into a single, high-fidelity view.
                        </p>
                    </div>
                    <div className="hidden md:block">
                        <span className="text-xs font-mono text-white/30">Live System Overview</span>
                    </div>
                </div>

                {/* BENTO GRID LAYOUT */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-auto md:h-[500px]">

                    {/* Card 1: Capacity Heatmap (From analytics.tsx) */}
                    <div className={`md:col-span-2 md:row-span-2 ${GLASS_PANEL} rounded-3xl p-8 relative group overflow-hidden flex flex-col transition-all duration-300 hover:border-violet-500/20 hover:bg-white/[0.05]`}>
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-lg font-medium text-white">Team Capacity Heatmap</h3>
                                <p className="text-sm text-white/40">Load balance across sprints</p>
                            </div>
                            <Activity className="w-5 h-5 text-white/20 group-hover:text-violet-400 transition-colors" />
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center gap-4">
                            {[1, 2, 3].map((row) => (
                                <div key={row} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/5 text-[10px] flex items-center justify-center text-white/50">
                                        {['AC', 'SJ', 'MR'][row-1]}
                                    </div>
                                    <div className="flex-1 grid grid-cols-10 gap-2">
                                        {[...Array(10)].map((_, i) => (
                                            <HeatmapCell key={i} load={((row * 31 + i * 17) % 120)} delay={row * 2 + i} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-between items-center text-xs text-white/30">
                            <span>Sprint 24</span>
                            <span>Sprint 34</span>
                        </div>
                    </div>

                    {/* Card 2: Comm Leakage (From analytics.tsx) */}
                    <div className={`md:col-span-2 md:row-span-1 ${GLASS_PANEL} rounded-3xl p-6 flex items-center justify-between group transition-all duration-300 hover:border-rose-500/20 hover:bg-white/[0.05]`}>
                         <div className="flex-1 pr-6">
                             <h3 className="text-lg font-medium text-white mb-2">Communication Leakage</h3>
                             <p className="text-sm text-white/40 mb-4">
                                 High slack volume detected on <span className="text-white">Auth Service</span>.
                             </p>
                             <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    whileInView={{ width: "70%" }}
                                    transition={{ duration: 1 }}
                                    className="h-full bg-gradient-to-r from-violet-500 to-rose-500" 
                                 />
                             </div>
                         </div>
                         <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                             <MessageSquare className="w-5 h-5 text-white/40" />
                         </div>
                    </div>

                    {/* Card 3: Velocity Trend */}
                    <div className={`md:col-span-1 md:row-span-1 ${GLASS_PANEL} rounded-3xl p-6 flex flex-col justify-between group hover:border-emerald-500/20 transition-all duration-300 hover:bg-white/[0.05]`}>
                        <div className="flex items-center gap-3 mb-2">
                             <Zap className="w-4 h-4 text-emerald-400" />
                             <span className="text-xs font-bold uppercase tracking-wider text-white/30">Velocity</span>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-white mb-1">124 pts</div>
                            <div className="text-xs text-emerald-400 font-mono">
                                +12% vs last sprint
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Roadmap Status */}
                    <div className={`md:col-span-1 md:row-span-1 ${GLASS_PANEL} rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:border-violet-500/20 hover:bg-white/[0.05]`}>
                        <div className="flex items-center gap-3">
                             <Workflow className="w-4 h-4 text-violet-400" />
                             <span className="text-xs font-bold uppercase tracking-wider text-white/30">Release</span>
                        </div>
                        <div className="space-y-2">
                             <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                 <div className="h-full w-[85%] bg-violet-500 rounded-full" />
                             </div>
                             <div className="flex justify-between text-xs text-white/50">
                                 <span>Q3 Launch</span>
                                 <span>85%</span>
                             </div>
                        </div>
                    </div>

                </div>
             </div>
        </section>
    )
}

function CTA() {
    return (
        <section 
            className="py-40 px-6 bg-[#050505] text-center border-t border-white/5 relative overflow-hidden"
            style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
                backgroundSize: "20px 20px"
            }}>
            <div className="absolute inset-0 bg-gradient-to-b from-violet-900/20 via-[#050505] to-[#050505] pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tighter mb-8">
                    Build with <br/> structure.
                </h2>
                <p className="text-xl text-white/50 mb-12 max-w-xl mx-auto">
                    Join high-performance engineering teams moving from chaos to clarity.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button className="h-14 px-8 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-100 transition-colors">
                        Start Free Trial
                    </button>
                    <button className="h-14 px-8 rounded-full bg-black border border-white/20 text-white font-medium hover:bg-white/10 transition-colors">
                        Book a Demo
                    </button>
                </div>

                <div className="mt-16 flex justify-center gap-8 opacity-30 grayscale">
                    {/* Mock Logos */}
                    <div className="h-6 w-20 bg-white/10 rounded" />
                    <div className="h-6 w-20 bg-white/10 rounded" />
                    <div className="h-6 w-20 bg-white/10 rounded" />
                    <div className="h-6 w-20 bg-white/10 rounded" />
                </div>
            </div>
        </section>
    )
}

function Footer() {
    return (
        <footer className="border-t border-white/5 bg-black py-20 px-6 md:px-12">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-lg font-semibold tracking-tight text-white">TaskLinex</span>
                    </div>
                    <p className="text-white/40 text-sm max-w-xs">The operating system for high-velocity engineering teams.</p>
                </div>

                <div>
                    <h3 className="font-semibold text-white/80 mb-4">Product</h3>
                    <ul className="space-y-3 text-sm text-white/40">
                        <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Envoy AI</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Pulse</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Personas</a></li>
                    </ul>
                </div>

                <div>
                    <h3 className="font-semibold text-white/80 mb-4">Resources</h3>
                    <ul className="space-y-3 text-sm text-white/40">
                        <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">API Status</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                    </ul>
                </div>

                <div>
                    <h3 className="font-semibold text-white/80 mb-4">Company</h3>
                    <ul className="space-y-3 text-sm text-white/40">
                        <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-white/30 text-xs">
                    © 2026 TaskLinex Inc.
                </p>
                <div className="flex gap-6 text-xs text-white/30 font-medium">
                    <a href="#" className="hover:text-white transition-colors">Twitter</a>
                    <a href="#" className="hover:text-white transition-colors">GitHub</a>
                    <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
                </div>
            </div>
        </footer>
    )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-violet-500/30 overflow-x-hidden">
      <Header />
      <Hero />
      <ValueCalculator /> 
      <EnvoySection />
      <WorkflowEngine />
      <PersonasSection />
      <SecondaryFeatures />
      <PulseDashboard />
      <CTA />
      <Footer />
    </div>
  );
}
