'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  Layers, 
  Lock, 
  Zap, 
  Sliders, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  Hexagon, 
  Triangle, 
  Circle, 
  Square,
  ArrowRight,
  Plus
} from 'lucide-react';

const EnvoyConsole = () => {
  const [activePersona, setActivePersona] = useState('Builder');
  const [optimizationMode, setOptimizationMode] = useState('stability');

  // Data: Personas (Internal Focus Modes)
  const [personas, setPersonas] = useState([
    { 
      id: 'Builder', 
      label: 'Deep Work', 
      load: 85, 
      icon: <Square className="w-5 h-5" />, 
      locked: true,
      delta: '+12%'
    },
    { 
      id: 'Architect', 
      label: 'Planning', 
      load: 40, 
      icon: <Hexagon className="w-5 h-5" />, 
      locked: false,
      delta: '-5%'
    },
    { 
      id: 'Operator', 
      label: 'Maintenance', 
      load: 62, 
      icon: <Circle className="w-5 h-5" />, 
      locked: false,
      delta: '+2%'
    },
    { 
      id: 'Scout', 
      label: 'Exploration', 
      load: 20, 
      icon: <Triangle className="w-5 h-5" />, 
      locked: false,
      delta: '0%'
    }
  ]);

  const fetchPersonas = async () => {
    try {
      const response = await fetch(`http://localhost:${process.env.NEXT_PUBLIC_SERVER_PORT || 8000}/renderPersona`);
      if (response.ok) {
        const data = await response.json();
        // Map DB personas to UI format
        const dbPersonas = data.map((p: any) => ({
          id: p.name,
          label: 'Custom Context',
          load: 0,
          icon: <Circle className="w-5 h-5" />,
          locked: false,
          delta: '0%'
        }));
        
        // Merge with default static personas, avoiding duplicates by ID
        setPersonas(prev => {
          const existingIds = new Set(prev.map(x => x.id));
          const newOnes = dbPersonas.filter((x: any) => !existingIds.has(x.id));
          return [...prev, ...newOnes];
        });
      }
    } catch (error) {
      console.error("Failed to fetch personas", error);
    }
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const handleCreatePersona = async () => {
    const name = prompt("Enter name for new Persona:");
    if (!name) return;

    await fetch(`http://localhost:${process.env.NEXT_PUBLIC_SERVER_PORT || 8000}/createPersona`, {
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body: JSON.stringify({ name, weekly_capacity_hours: 40, user_id: 'current_user' })
    });
    
    fetchPersonas();
  };

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-gray-300 font-sans overflow-hidden selection:bg-violet-900 selection:text-white">
      
      {/* LEFT PANEL: Personas / Compartments */}
      <aside className="w-[320px] flex flex-col border-r border-gray-800 bg-[#0c0c0e]">
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-violet-700 rounded-[12px] animate-pulse"></div>
            <span className="text-sm font-bold tracking-widest text-white uppercase font-mono">Envoy // Monitor</span>
          </div>
        </div>

        {/* Persona List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="text-xs font-mono text-gray-500 uppercase tracking-wider">
              Attention Compartments
            </div>
            <button onClick={handleCreatePersona} className="text-gray-500 hover:text-violet-400 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {personas.map((p) => (
            <div 
              key={p.id}
              onClick={() => setActivePersona(p.id)}
              className={`group relative p-4 border rounded-md cursor-pointer transition-all duration-200
                ${activePersona === p.id 
                  ? 'bg-gray-900 border-violet-700/50 shadow-[0_0_15px_rgba(109,40,217,0.1)]' 
                  : 'bg-[#121214] border-gray-800 hover:border-gray-700 hover:bg-[#18181b]'
                }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${activePersona === p.id ? 'text-violet-400 bg-violet-950/30' : 'text-gray-500 bg-gray-900'}`}>
                    {p.icon}
                  </div>
                  <div>
                    <h3 className={`font-medium ${activePersona === p.id ? 'text-white' : 'text-gray-400'}`}>
                      {p.id}
                    </h3>
                    <p className="text-xs text-gray-600 font-mono">{p.label}</p>
                  </div>
                </div>
                {p.locked && <Lock className="w-3 h-3 text-gray-600" />}
              </div>

              {/* Technical Metrics */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-500">LOAD</span>
                  <span className={`${p.load > 80 ? 'text-violet-400' : 'text-gray-400'}`}>
                    {p.load}%
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${p.load > 80 ? 'bg-violet-700' : 'bg-gray-600'}`} 
                    style={{ width: `${p.load}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-gray-800 bg-[#09090b]">
          <div className="flex justify-between items-center text-xs font-mono text-gray-500">
            <span>TOTAL CAPACITY</span>
            <span className="text-white">82%</span>
          </div>
        </div>
      </aside>

      {/* RIGHT PANEL: Envoy Control Console */}
      <main className="flex-1 flex flex-col bg-[#09090b] overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-[#0c0c0e]">
          <div className="flex items-center gap-4">
            <Activity className="w-4 h-4 text-violet-700" />
            <span className="text-sm font-mono text-gray-400">SYSTEM_STATUS: <span className="text-white">REBALANCING_REQUIRED</span></span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
            <span>UPTIME: 04:12:00</span>
            <span className="px-2 py-1 bg-gray-800 rounded text-gray-300">v2.4.0</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* SECTION 1: System Load Overview */}
          <section className="grid grid-cols-3 gap-6">
            <div className="col-span-1 p-5 border border-gray-800 bg-[#121214] rounded-[12px]">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-violet-700" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Cognitive Load</h4>
              </div>
              <div className="text-3xl font-mono text-white mb-1">82<span className="text-base text-gray-500">/100</span></div>
              <p className="text-xs text-violet-400 font-mono mt-2">CRITICAL THRESHOLD NEAR</p>
            </div>

            <div className="col-span-1 p-5 border border-gray-800 bg-[#121214] rounded-[12px]">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-gray-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Active Threads</h4>
              </div>
              <div className="text-3xl font-mono text-white mb-1">14</div>
              <p className="text-xs text-gray-500 font-mono mt-2">ACROSS 4 COMPARTMENTS</p>
            </div>

            <div className="col-span-1 p-5 border border-gray-800 bg-[#121214] rounded-[12px] relative overflow-hidden">
              <div className="absolute right-0 top-0 p-2 opacity-10">
                <Cpu className="w-24 h-24 text-violet-700" />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-gray-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Context Switching</h4>
              </div>
              <div className="text-3xl font-mono text-white mb-1">HIGH</div>
              <p className="text-xs text-gray-500 font-mono mt-2">EFFICIENCY PENALTY: -15%</p>
            </div>
          </section>

          {/* SECTION 2: Envoy Proposals */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-700" />
                Optimization Proposals
              </h2>
              <span className="text-xs font-mono text-gray-600">Generated 2m ago</span>
            </div>

            <div className="space-y-4">
              {/* Proposal Card 1 */}
              <div className="border border-gray-700 bg-[#18181b] p-0 rounded-[12px] flex">
                <div className="w-1 bg-violet-700"></div>
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-white font-medium font-mono text-sm">
                      OFFLOAD :: [Builder] &rarr; [Operator]
                    </h3>
                    <span className="text-xs bg-violet-900/30 text-violet-300 px-2 py-1 rounded font-mono border border-violet-900/50">
                      HIGH PRIORITY
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                    Detected fragmentation in deep work blocks. Routine maintenance tasks are interrupting 'Builder' flow state. Proposal: Batch administrative tasks to 'Operator' compartment.
                  </p>
                  
                  {/* Visual Preview of Change */}
                  <div className="bg-[#0c0c0e] p-3 rounded mb-4 border border-gray-800 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">BUILDER LOAD</span>
                      <div className="flex items-center gap-2 text-sm font-mono text-gray-300">
                        85% <ArrowRight className="w-3 h-3 text-gray-600" /> <span className="text-violet-400">65%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">OPERATOR LOAD</span>
                      <div className="flex items-center gap-2 text-sm font-mono text-gray-300">
                        62% <ArrowRight className="w-3 h-3 text-gray-600" /> <span className="text-white">78%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white text-xs font-bold uppercase tracking-wide rounded-[12px] transition-colors">
                      <CheckCircle className="w-3 h-3" /> Commit
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-700 hover:bg-gray-800 text-gray-400 text-xs font-bold uppercase tracking-wide rounded-[12px] transition-colors">
                      <Sliders className="w-3 h-3" /> Modify
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-transparent hover:text-gray-300 text-gray-500 text-xs font-bold uppercase tracking-wide transition-colors">
                      Ignore
                    </button>
                  </div>
                </div>
              </div>

               {/* Proposal Card 2 (Passive) */}
               <div className="border border-gray-800 bg-[#121214] p-0 rounded-[12px] flex opacity-60 hover:opacity-100 transition-opacity">
                <div className="w-1 bg-gray-700"></div>
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-gray-300 font-medium font-mono text-sm">
                      SCHEDULE_LOCK :: [Scout]
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Exploration capacity is underutilized. Reserve 2h block for R&D to prevent stagnation.
                  </p>
                  <div className="flex gap-3">
                    <button className="text-xs text-gray-400 hover:text-white font-mono underline decoration-gray-600">Review Details</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: Assignment Engine */}
          <section className="border-t border-gray-800 pt-8 mt-4">
             <div className="flex items-center gap-2 mb-6">
                <Sliders className="w-4 h-4 text-violet-700" />
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                  Assignment Engine
                </h2>
              </div>

              <div className="bg-[#121214] border border-gray-800 p-6 rounded-[12px]">
                <div className="grid grid-cols-2 gap-8">
                  {/* Left Controls */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-mono text-gray-500 mb-2">OPTIMIZATION GOAL</label>
                      <div className="flex bg-[#0c0c0e] p-1 rounded-[12px] border border-gray-800">
                        {['Velocity', 'Stability', 'Quality'].map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setOptimizationMode(mode.toLowerCase())}
                            className={`flex-1 py-1.5 text-xs font-medium uppercase tracking-wide rounded-[12px] transition-all
                              ${optimizationMode === mode.toLowerCase() 
                                ? 'bg-gray-700 text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-300'
                              }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                       <label className="block text-xs font-mono text-gray-500 mb-2">TARGET SCOPE</label>
                       <select className="w-full bg-[#0c0c0e] border border-gray-800 text-gray-300 text-sm p-2 font-mono focus:border-violet-700 focus:outline-none">
                         <option>Q3_Milestone_Alpha</option>
                         <option>Weekly_Backlog</option>
                       </select>
                    </div>
                  </div>

                  {/* Right Preview/Action */}
                  <div className="flex flex-col justify-end">
                    <div className="mb-4 text-right">
                       <span className="block text-xs font-mono text-gray-500">ESTIMATED REALLOCATION TIME</span>
                       <span className="text-xl text-white font-mono">140ms</span>
                    </div>
                    <button className="w-full bg-violet-700 hover:bg-violet hover:bg-violet-600 text-black py-3 text-sm rounded-[12px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                      <Zap className="w-4 h-4" /> Run Decomposer
                    </button>
                  </div>
                </div>
              </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default EnvoyConsole;