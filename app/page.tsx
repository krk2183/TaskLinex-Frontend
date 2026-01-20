"use client";

import { useRef, useState, useEffect } from "react";
import { 
  motion, 
  useScroll, 
  useTransform, 
  useSpring, 
  AnimatePresence 
} from "framer-motion";
import { 
  Zap, Activity, Layers, ArrowRight, CheckCircle, 
  AlertTriangle, Clock, Code, Cpu, Shield, 
  GitCommit, ChevronRight, Terminal
} from "lucide-react";

// --- VISUAL ASSETS (Mocking your PulsePage styles) ---

const MOCK_CODE = `{
  "policy": "strict_dependency",
  "resolution": "auto_cascade",
  "threshold": {
    "latency": "200ms",
    "blocker_propagation": true
  }
}`;

const FloatingBadge = ({ icon: Icon, label, color }: { icon: any, label: string, color: string }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-slate-950/80 backdrop-blur-md shadow-xl ${color}`}>
    <Icon className="w-3.5 h-3.5" />
    <span className="text-xs font-bold tracking-wide">{label}</span>
  </div>
);

// --- SECTIONS ---

function Header() {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5 bg-slate-950/80 backdrop-blur-md"
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-indigo-500 rounded-sm" />
        <span className="text-sm font-bold tracking-tight text-slate-100">TaskLinex</span>
      </div>
      <nav className="hidden md:flex gap-8 text-xs font-semibold uppercase tracking-widest text-slate-400">
        <a href="#features" className="hover:text-white transition-colors">Platform</a>
        <a href="#intelligence" className="hover:text-white transition-colors">Engine</a>
        <a href="#enterprise" className="hover:text-white transition-colors">Enterprise</a>
      </nav>
      <div className="flex items-center gap-4">
        <a href="#" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Log in</a>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
          Get Access
        </button>
      </div>
    </motion.header>
  );
}

function Hero() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden bg-slate-950">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Floating Elements (Parallax) */}
      <motion.div style={{ y: y1, x: -100 }} className="absolute top-1/4 left-10 hidden lg:block opacity-60">
        <FloatingBadge icon={Activity} label="Velocity: 94%" color="border-emerald-500/30 text-emerald-400" />
      </motion.div>
      <motion.div style={{ y: y2, x: 100 }} className="absolute bottom-1/3 right-10 hidden lg:block opacity-60">
        <FloatingBadge icon={AlertTriangle} label="Blockers: 0" color="border-rose-500/30 text-rose-400" />
      </motion.div>

      <div className="relative z-10 text-center max-w-4xl px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/50 mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="text-xs font-medium text-indigo-300">System v2.4 Live</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 mb-8"
        >
          Orchestrate <br />
          The Signal.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12"
        >
          Stop managing chat. Start managing state. <br/>
          TaskLinex provides deterministic visibility into complex engineering workflows.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button className="h-12 px-8 rounded-xl bg-slate-100 text-slate-950 font-bold hover:bg-white transition-colors flex items-center gap-2">
            Initialize Workspace <ArrowRight className="w-4 h-4" />
          </button>
          <button className="h-12 px-8 rounded-xl border border-slate-700 text-slate-300 font-medium hover:bg-slate-900 transition-colors">
            View Documentation
          </button>
        </motion.div>
      </div>
      
      {/* Visual Anchor for scroll */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-widest text-slate-600">System Architecture</span>
        <div className="w-px h-12 bg-gradient-to-b from-slate-600 to-transparent" />
      </motion.div>
    </section>
  );
}

function LiveDashboardPreview() {
  return (
    <section className="py-24 px-4 md:px-12 bg-slate-950 border-t border-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-3">Live Environment</h2>
          <h3 className="text-3xl md:text-5xl font-bold text-slate-100 tracking-tight">Visibility is not optional.</h3>
        </div>

        {/* MOCK DASHBOARD CONTAINER */}
        <div className="relative rounded-xl border border-slate-800 bg-[#0B0F17] shadow-2xl overflow-hidden group">
            {/* Header Mock */}
            <div className="h-12 border-b border-slate-800 bg-slate-900/50 flex items-center px-4 gap-4">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                </div>
                <div className="h-6 w-64 bg-slate-800 rounded text-[10px] flex items-center px-3 text-slate-500 font-mono">
                    tasklinex.app/engine/v1/dashboard
                </div>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* WIDGET 1: VELOCITY (Matches your Pulse Code style) */}
                <div className="md:col-span-4 bg-slate-900/50 border border-slate-800 p-5 rounded-xl hover:border-indigo-500/50 transition-colors cursor-default">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Sprint Velocity</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-2xl font-black text-slate-200">High</span>
                                <Activity className="w-5 h-5 text-emerald-500" />
                            </div>
                        </div>
                        <div className="h-8 w-8 bg-emerald-900/20 rounded flex items-center justify-center">
                            <Zap className="w-4 h-4 text-emerald-500" />
                        </div>
                    </div>
                    {/* Simulated Graph Bars */}
                    <div className="flex items-end gap-1 h-16 opacity-80">
                        {[40, 60, 45, 70, 85, 60, 95, 80].map((h, i) => (
                            <div key={i} style={{ height: `${h}%` }} className={`flex-1 rounded-t-sm ${i === 6 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                        ))}
                    </div>
                </div>

                {/* WIDGET 2: BLOCKERS */}
                <div className="md:col-span-4 bg-slate-900/50 border border-rose-900/30 p-5 rounded-xl hover:bg-rose-900/10 transition-colors relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                    <div className="flex justify-between items-center mb-6">
                         <p className="text-xs text-rose-200 uppercase tracking-widest font-semibold">Critical Path</p>
                         <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                    </div>
                    <div className="text-3xl font-black text-slate-200 mb-1">2 Active</div>
                    <p className="text-sm text-slate-400 mb-4">Dependencies stalled on API Gateway.</p>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full w-[85%]" />
                    </div>
                </div>

                {/* WIDGET 3: FOCUS */}
                <div className="md:col-span-4 bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-4">Current Focus</p>
                        <h4 className="text-lg font-bold text-white mb-2">Q3 Infrastructure</h4>
                        <div className="space-y-2">
                             <div className="flex items-center gap-2 text-sm text-slate-400">
                                <CheckCircle className="w-4 h-4 text-indigo-500" />
                                <span>Database Sharding</span>
                             </div>
                             <div className="flex items-center gap-2 text-sm text-slate-400">
                                <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-indigo-500 animate-spin" />
                                <span className="text-slate-200">Replica Sets</span>
                             </div>
                        </div>
                    </div>
                    <div className="flex -space-x-2 mt-4">
                         {[1,2,3].map(i => (
                             <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900" />
                         ))}
                    </div>
                </div>

                {/* BOTTOM ROW: Timeline Abstraction */}
                <div className="md:col-span-12 bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
                     <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Dependency Graph</p>
                        <span className="text-xs font-mono text-slate-500">Live Updating...</span>
                     </div>
                     <div className="h-px bg-slate-800 w-full my-4" />
                     <div className="flex gap-2 overflow-hidden opacity-60">
                         {/* Abstract Gantt Bars */}
                         <div className="w-1/4 h-3 rounded-full bg-indigo-500/20" />
                         <div className="w-1/6 h-3 rounded-full bg-indigo-500/40" />
                         <div className="w-1/3 h-3 rounded-full bg-indigo-500 ml-4" />
                         <div className="w-1/5 h-3 rounded-full bg-slate-700" />
                     </div>
                </div>
            </div>
            
            {/* Gradient Overlay at bottom of Dashboard to hint at more */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0B0F17] to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
}

function SystemArchitecture() {
  return (
    <section className="py-32 bg-slate-950 px-4 md:px-12 border-t border-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-20">
          <h2 className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-4">System Design</h2>
          <h3 className="text-4xl md:text-5xl font-bold text-slate-100 tracking-tight mb-6">
            Tasks are not isolated units.
          </h3>
          <p className="text-lg text-slate-400 leading-relaxed">
            TaskLinex understands work as a network of dependencies. Each task exists within context—blocked by predecessors, 
            blocking successors, consuming capacity, and influencing timelines. The system continuously analyzes these relationships 
            to surface what matters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Code className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-2">Dependency Mapping</h4>
                <p className="text-slate-400 leading-relaxed">
                  Every task declares what it requires and what requires it. The graph is explicit, 
                  traversable, and queryable. Circular dependencies are detected at creation.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-2">Capacity Analysis</h4>
                <p className="text-slate-400 leading-relaxed">
                  Work is distributed across finite resources. TaskLinex tracks allocation in real time, 
                  identifying overload conditions before they cascade into delays.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-2">Flow Observation</h4>
                <p className="text-slate-400 leading-relaxed">
                  Movement is measured continuously. Stalled work is detected through state transitions, 
                  not subjective estimates. The system knows when progress has stopped.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <GitCommit className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-2">Critical Path Detection</h4>
                <p className="text-slate-400 leading-relaxed">
                  The longest sequence of dependent tasks defines project duration. TaskLinex highlights 
                  this path and alerts when items on it risk delay.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntelligenceLayer() {
  return (
    <section id="intelligence" className="py-32 bg-slate-950 px-4 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-4">Analysis Engine</h2>
            <h3 className="text-4xl md:text-5xl font-bold text-slate-100 tracking-tight mb-8">
              Structured insight, not notifications.
            </h3>
            <div className="space-y-6 text-slate-400 leading-relaxed">
              <p>
                TaskLinex applies deterministic analysis to your workflow graph. It identifies patterns invisible 
                to manual oversight: hidden bottlenecks, resource contention, and propagation risks.
              </p>
              <p>
                The intelligence layer does not generate suggestions arbitrarily. It operates on defined rules, 
                applied consistently across your entire dependency network. Every recommendation is traceable 
                to a specific structural condition.
              </p>
              <p>
                When the system detects an issue, it provides context: which tasks are affected, why the condition 
                arose, and what resolution options exist. No mystery. No black box.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
            <div className="space-y-6">
              <div className="border-l-2 border-amber-500 pl-6 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Detected</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Resource Contention</h4>
                <p className="text-sm text-slate-400">
                  Engineer A is assigned to 4 concurrent critical path items. Estimated completion dates 
                  exceed available capacity by 40 hours.
                </p>
              </div>

              <div className="border-l-2 border-indigo-500 pl-6 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Suggestion</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Rebalance Load</h4>
                <p className="text-sm text-slate-400">
                  Task #847 has no dependency on Engineer A's specialized knowledge. Reassignment to 
                  Engineer C reduces critical path by 3 days.
                </p>
              </div>

              <div className="border-l-2 border-slate-700 pl-6 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Rationale</span>
                </div>
                <p className="text-sm text-slate-400 font-mono">
                  Analysis based on: task dependencies (12), capacity allocation (4 resources), 
                  historical velocity (14d avg), current state (8 active items).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


function BentoFeatures() {
  return (
    <section id="features" className="py-24 bg-slate-950 px-4 md:px-12 border-t border-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1: Large */}
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-colors group">
                <div className="w-12 h-12 bg-indigo-900/30 rounded-lg flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:border-indigo-500/50">
                    <Layers className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Context-Aware Pipelines</h3>
                <p className="text-slate-400 leading-relaxed max-w-lg">
                    Traditional project management treats tasks as islands. TaskLinex treats them as a directed acyclic graph (DAG). 
                    We identify bottlenecks mathematically before they delay the sprint.
                </p>
            </div>

            {/* Feature 2: Tall */}
            <div className="md:col-span-1 bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-colors group">
                <div className="w-12 h-12 bg-emerald-900/30 rounded-lg flex items-center justify-center mb-6 border border-emerald-500/20">
                    <Cpu className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Automated Handoffs</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    When code deploys, the design task auto-archives. Connect Jira, GitHub, and Figma into a single truth source.
                </p>
                <div className="h-px w-full bg-slate-800 my-4" />
                <div className="flex gap-2 items-center text-xs font-mono text-slate-500">
                    <GitCommit className="w-3 h-3" />
                    <span>sha256:e4...9f</span>
                </div>
            </div>

             {/* Feature 3: Wide Code */}
             <div className="md:col-span-3 bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-colors flex flex-col md:flex-row gap-8 items-center">
                 <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <Terminal className="w-5 h-5 text-slate-500" />
                        <h3 className="text-xl font-bold text-white">Programmable Logic</h3>
                    </div>
                    <p className="text-slate-400 leading-relaxed max-w-xl">
                        Define how your team works using JSON-based policies. Enforce code reviews, 
                        require QA sign-offs, or block merges based on external dependencies.
                    </p>
                 </div>
                 <div className="w-full md:w-96 bg-slate-950 rounded-lg border border-slate-800 p-4 font-mono text-xs text-slate-300 shadow-inner">
                     <div className="flex gap-1.5 mb-3 opacity-50">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                     </div>
                     <pre className="overflow-x-auto">
                        <code className="language-json text-indigo-300">{MOCK_CODE}</code>
                     </pre>
                 </div>
            </div>

        </div>
      </div>
    </section>
  );
}

function StatsTicker() {
  return (
    <div className="w-full border-y border-slate-800 bg-slate-950 overflow-hidden py-4">
        <div className="flex gap-12 animate-scroll whitespace-nowrap md:justify-center">
            {[
                { label: "Uptime", val: "99.99%" },
                { label: "Tasks Processed", val: "2.4M+" },
                { label: "Active Nodes", val: "840" },
                { label: "Avg Resolution", val: "1.2h" },
                { label: "Security", val: "SOC2 Type II" },
            ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-slate-500 uppercase text-xs font-bold tracking-widest">{stat.label}</span>
                    <span className="text-slate-200 font-mono font-medium">{stat.val}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-800 ml-8" />
                </div>
            ))}
        </div>
    </div>
  );
}

function CTA() {
    return (
        <section className="py-32 px-6 bg-slate-950 text-center">
            <div className="max-w-3xl mx-auto">
                <div className="inline-block p-3 rounded-2xl bg-slate-900 mb-8 border border-slate-800">
                    <Shield className="w-8 h-8 text-slate-200" />
                </div>
                <h2 className="text-5xl font-bold text-white tracking-tight mb-6">Ready to stabilize?</h2>
                <p className="text-xl text-slate-400 mb-10">
                    Join high-performance teams at Stripe, Vercel, and Linear who use structure to move faster.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button className="h-14 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-all shadow-lg shadow-indigo-900/20">
                        Start Free Trial
                    </button>
                    <button className="h-14 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium transition-colors">
                        Contact Sales
                    </button>
                </div>
                <p className="mt-8 text-xs text-slate-600 uppercase tracking-widest">
                    No credit card required • SOC2 Compliant
                </p>
            </div>
        </section>
    )
}

function Footer() {
    return (
        <footer className="border-t border-slate-900 bg-slate-950 py-12 px-6 md:px-12">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-slate-800 rounded-sm" />
                    <span className="text-sm font-bold text-slate-500">TaskLinex Inc.</span>
                </div>
                <div className="text-slate-600 text-sm">
                    © 2026 TaskLinex. Built for scale.
                </div>
            </div>
        </footer>
    )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 font-sans">
      <Header />
      <Hero />
      <StatsTicker />
      <LiveDashboardPreview />
      <SystemArchitecture/>
      <IntelligenceLayer />
      <BentoFeatures />
      <CTA />
      <Footer />
    </div>
  );
}