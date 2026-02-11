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
    Plus,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../providers/AuthContext';

const EnvoyConsole = () => {
    // --- STATE ---
    const { userId } = useAuth();
    const [activePersona, setActivePersona] = useState('Builder');
    const [optimizationMode, setOptimizationMode] = useState('stability');
    
    // UI State für Modals & Loading
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState<{id: string, name: string} | null>(null);
    const [newPersonaName, setNewPersonaName] = useState('');
    const [isSimulatingProcess, setIsSimulatingProcess] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [personalInterventions, setPersonalInterventions] = useState<any[]>([]);

    // Initial Data: Default Static Personas
    const [personas, setPersonas] = useState([
        {
            id: 'Builder',
            name: 'Builder',
            label: 'Deep Work',
            load: 85,
            icon: <Square className="w-5 h-5" />,
            locked: true,
            delta: '+12%'
        }]);

    // --- FETCH LOGIC ---
    const fetchPersonas = async () => {
        try {
            const response = await fetch(`http://192.168.0.${process.env.NEXT_PUBLIC_NPM_PORT}:8000/renderPersona`);
            if (response.ok) {
                const data = await response.json();
                
                const dbPersonas = data.map((p: any) => ({
                    id: p.id, 
                    name: p.name,
                    label: 'Custom Context',
                    load: Math.floor(Math.random() * 30), // Simulation of Load
                    icon: <Circle className="w-5 h-5" />,
                    locked: false,
                    delta: '0%'
                }));

                setPersonas(prev => {
                    const staticPersonas = prev.filter(p => p.locked || ['Builder', 'Architect', 'Operator', 'Scout'].includes(p.id));
                    const existingIds = new Set(staticPersonas.map(x => x.id));
                    const uniqueNew = dbPersonas.filter((x: any) => !existingIds.has(x.id));
                    return [...staticPersonas, ...uniqueNew];
                });
            }
        } catch (error) {
            console.warn("Backend connection failed. Running in offline/demo mode.");
        }
    };

    const fetchTasks = async () => {
        try {
            const response = await fetch(`http://192.168.0.${process.env.NEXT_PUBLIC_NPM_PORT}:8000/renderTask`);
            if (response.ok) {
                const data = await response.json();
                // Filter for current user 'u1' to match Roadmap mock user
                setTasks(data.filter((t: any) => t.ownerId === userId));
            }
        } catch (e) { console.error(e); }
    };

    const fetchInterventions = async () => {
        try {
            const response = await fetch(`http://192.168.0.${process.env.NEXT_PUBLIC_NPM_PORT}:8000/envoy/interventions?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setPersonalInterventions(data.filter((i: any) => i.scope === 'personal'));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (!userId) return;
        fetchPersonas();
        fetchTasks();
        fetchInterventions();
    }, [userId]);

    // --- SESSION STORAGE HELPERS ---
    const addToSession = (name: string) => {
        if (typeof window === 'undefined') return;
        const raw = sessionStorage.getItem('recent_personas') || '[]';
        const recent = JSON.parse(raw);
        if (!recent.includes(name)) {
            const updated = [name, ...recent].slice(0, 10);
            sessionStorage.setItem('recent_personas', JSON.stringify(updated));
        }
    };

    const removeFromSession = (name: string) => {
        if (typeof window === 'undefined') return;
        const raw = sessionStorage.getItem('recent_personas') || '[]';
        const recent = JSON.parse(raw);
        const updated = recent.filter((n: string) => n !== name);
        sessionStorage.setItem('recent_personas', JSON.stringify(updated));
    };

    // --- ACTIONS ---

    const handleCreateSubmit = async () => {
        if (!newPersonaName || !userId) return;
        const nameToCreate = newPersonaName.trim();

                try {
            const response = await fetch(`http://192.168.0.${process.env.NEXT_PUBLIC_NPM_PORT}:8000/createPersona`, {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ name: nameToCreate, weekly_capacity_hours: 40, user_id: userId })
            });

            if (response.ok) {
                const createdPersona = await response.json();
                
                const SelectedIcon = [Hexagon, Triangle, Circle, Square][Math.floor(Math.random() * 4)];

                const newPersonaObj = {
                    id: createdPersona.id,
                    name: createdPersona.name,
                    label: 'Custom Context',
                    load: 0,
                    icon: <SelectedIcon className="w-5 h-5" />,
                    locked: false,
                    delta: '0%'
                };

                setPersonas(prev => [...prev, newPersonaObj]);
                setActivePersona(createdPersona.id);
                addToSession(createdPersona.name);
            }
        } catch (e) {
            console.error("Create failed", e);
        }

        setNewPersonaName('');
        setShowCreateModal(false);
    };

    const openDeleteConfirmation = (id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation(); 
        setShowDeleteModal({ id, name });
    };

    const confirmDelete = async () => {
        if (!showDeleteModal) return;

        const { id, name } = showDeleteModal;

        // 1. Backend Call
        try {
            await fetch(`http://192.168.0.${process.env.NEXT_PUBLIC_NPM_PORT}:8000/deletePersona`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id }) 
            });
        } catch (e) {
            console.error("Delete request failed", e);
        }

        // 2. State Cleanup
        setPersonas(prev => prev.filter(p => p.id !== id));
        
        // 3. Session Cleanup 
        removeFromSession(name);

        // 4. Reset Active Persona
        if (activePersona === id) {
            setActivePersona('Builder');
        }

        setShowDeleteModal(null);
    };

    const runDecomposer = () => {
        setIsSimulatingProcess(true);
        setTimeout(() => {
            setIsSimulatingProcess(false);
        }, 1500);
    };

    return (
        <div className="flex h-screen w-full bg-[#09090b] text-gray-300 font-sans overflow-hidden selection:bg-violet-900 selection:text-white relative">

            {/* --- MODALS --- */}
            
            {/* Create Persona Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#121214] border border-gray-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#0c0c0e]">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                                <Plus className="w-4 h-4 text-violet-500" /> Initialize Persona
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-mono text-gray-500 mb-2">DESIGNATION (NAME)</label>
                                <input 
                                    type="text" 
                                    value={newPersonaName}
                                    onChange={(e) => setNewPersonaName(e.target.value)}
                                    placeholder="e.g. Researcher, Auditor..."
                                    className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-violet-600 focus:outline-none font-mono text-sm"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSubmit()}
                                />
                            </div>
                            <div className="bg-violet-900/10 border border-violet-900/30 p-3 rounded text-xs text-violet-300 font-mono">
                                New compartments start with 0% load allocation.
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-800 bg-[#0c0c0e] flex justify-end gap-3">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs font-bold uppercase hover:text-white transition-colors">Cancel</button>
                            <button 
                                onClick={handleCreateSubmit}
                                disabled={!newPersonaName}
                                className="bg-violet-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded text-xs font-bold uppercase tracking-wide transition-colors"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#121214] border-[3px] border-violet-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-gray-800 flex items-center gap-3 bg-[#0c0c0e]">
                            <AlertTriangle className="w-5 h-5 text-violet-700" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Confirm Termination</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-400 text-sm mb-4">
                                Are you sure you want to delete persona <span className="text-white font-mono font-bold">{showDeleteModal.name}</span>?
                            </p>
                            <p className="text-xs text-red-400 font-mono bg-red-950/20 p-2 border border-red-900/30 rounded">
                                WARNING: All associated context threads and session data will be unlinked immediately.
                            </p>
                        </div>
                        <div className="p-4 border-t border-gray-800 bg-[#0c0c0e] flex justify-end gap-3">
                            <button onClick={() => setShowDeleteModal(null)} className="px-4 py-2 text-xs font-bold uppercase hover:text-white transition-colors">Cancel</button>
                            <button 
                                onClick={confirmDelete}
                                className="bg-red-800 border border-red-800 hover:bg-red-600 text-red-100 px-6 py-2 rounded-[12px] hover:rounded-[6px] text-xs font-bold uppercase tracking-wide transition-colors"
                            >
                                Terminate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LEFT PANEL: Personas / Compartments */}
            <aside className="w-[320px] flex flex-col border-r border-gray-800 bg-[#0c0c0e] flex-shrink-0">
                {/* Header */}
                <div className="h-16 flex items-center px-6 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-violet-700 rounded-[12px] animate-pulse"></div>
                        <span className="text-sm font-bold tracking-widest text-white uppercase font-mono">Envoy // Monitor</span>
                    </div>
                </div>

                {/* Persona List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                            Attention Compartments
                        </div>
                        <button 
                            onClick={() => setShowCreateModal(true)} 
                            className="text-gray-500 hover:text-violet-400 transition-colors p-1 hover:bg-gray-800 rounded"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {personas.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => setActivePersona(p.id)}
                            className={`group relative p-4 border rounded-md cursor-pointer transition-all duration-200 select-none
                                ${activePersona === p.id
                                    ? 'bg-gray-900 border-violet-700/50 shadow-[0_0_15px_rgba(109,40,217,0.1)]'
                                    : 'bg-[#121214] border-gray-800 hover:border-gray-700 hover:bg-[#18181b]'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-md transition-colors ${activePersona === p.id ? 'text-violet-400 bg-violet-950/30' : 'text-gray-500 bg-gray-900 group-hover:text-gray-300'}`}>
                                        {p.icon}
                                    </div>
                                    <div>
                                        <h3 className={`font-medium transition-colors ${activePersona === p.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                            {p.name || p.id}
                                        </h3>
                                        <p className="text-xs text-gray-600 font-mono">{p.label}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center">
                                    {p.locked ? (
                                        <Lock className="w-3 h-3 text-gray-600" />
                                    ) : (
                                        // Delete button (Trash Icon)
                                        <button 
                                            onClick={(e) => openDeleteConfirmation(p.id, p.name || p.id, e)}
                                            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1"
                                            title="Delete Compartment"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
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
                                        className={`h-full transition-all duration-500 ${p.load > 80 ? 'bg-violet-700' : 'bg-gray-600'}`}
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
                        <span className="text-white">
                            {personas.length > 0 
                                ? Math.min(100, Math.floor(personas.reduce((acc, curr) => acc + curr.load, 0) / personas.length * 1.2))
                                : 0
                            }%
                        </span>
                    </div>
                </div>
            </aside>

            {/* RIGHT PANEL: Envoy Control Console */}
            <main className="flex-1 flex flex-col bg-[#09090b] overflow-hidden relative">

                {/* Top Header */}
                <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-[#0c0c0e] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <Activity className="w-4 h-4 text-violet-700" />
                        <span className="text-sm font-mono text-gray-400">
                            SYSTEM_STATUS: <span className="text-white">
                                {activePersona === 'Builder' ? 'REBALANCING_REQUIRED' : 'NOMINAL'}
                            </span>
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                        <span>ACTIVE: <span className="text-violet-400 uppercase font-bold">
                            {personas.find(p => p.id === activePersona)?.name || activePersona}
                        </span></span>
                        <span className="h-4 w-[1px] bg-gray-700"></span>
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
                            <div className="text-3xl font-mono text-white mb-1">
                                {personas.find(p => p.id === activePersona)?.load || 0}
                                <span className="text-base text-gray-500">/100</span>
                            </div>
                            <p className="text-xs text-violet-400 font-mono mt-2">
                                {(personas.find(p => p.id === activePersona)?.load || 0) > 80 ? 'CRITICAL THRESHOLD NEAR' : 'WITHIN LIMITS'}
                            </p>
                        </div>

                        <div className="col-span-1 p-5 border border-gray-800 bg-[#121214] rounded-[12px]">
                            <div className="flex items-center gap-2 mb-4">
                                <Layers className="w-4 h-4 text-gray-500" />
                                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Active Threads</h4>
                            </div>
                            <div className="text-3xl font-mono text-white mb-1">14</div>
                            <p className="text-xs text-gray-500 font-mono mt-2">ACROSS {personas.length} COMPARTMENTS</p>
                        </div>

                        <div className="col-span-1 p-5 border border-gray-800 bg-[#121214] rounded-[12px] relative overflow-hidden">
                            <div className="absolute right-0 top-0 p-2 opacity-10">
                                <Cpu className="w-24 h-24 text-violet-700" />
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <Cpu className="w-4 h-4 text-gray-500" />
                                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Context Switching</h4>
                            </div>
                            <div className="text-3xl font-mono text-white mb-1">
                                {personas.length > 5 ? 'HIGH' : 'LOW'}
                            </div>
                            <p className="text-xs text-gray-500 font-mono mt-2">
                                EFFICIENCY PENALTY: {personas.length > 5 ? '-15%' : '-2%'}
                            </p>
                        </div>
                    </section>

                    {/* SECTION: Task Inventory */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                <Layers className="w-4 h-4 text-violet-700" />
                                Task Inventory (User: u1)
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tasks.map(task => {
                                const assignedPersona = personas.find(p => p.id === task.personaId);
                                return (
                                    <div key={task.id} className="bg-[#121214] border border-gray-800 p-3 rounded flex justify-between items-center">
                                        <div>
                                            <div className="text-sm text-white font-medium">{task.title}</div>
                                            <div className="text-xs text-gray-500 font-mono mt-1">{task.status}</div>
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded border ${assignedPersona ? 'bg-violet-900/20 border-violet-900/50 text-violet-300' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                                            {assignedPersona ? assignedPersona.name : 'Unassigned'}
                                        </div>
                                    </div>
                                );
                            })}
                            {tasks.length === 0 && (
                                <div className="text-gray-500 text-sm italic p-4">No tasks found for this user.</div>
                            )}
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
                            {/* Personal Interventions (Dynamic) */}
                            {personalInterventions.map((intervention, idx) => (
                                <div key={idx} className="border border-violet-900/50 bg-[#121214] p-0 rounded-[12px] flex relative overflow-hidden">
                                    <div className="w-1 bg-violet-500"></div>
                                    <div className="p-5 flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-white font-medium font-mono text-sm uppercase">
                                                ATTENTION_ALERT
                                            </h3>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-2">
                                            {intervention.message}
                                        </p>
                                    </div>
                                </div>
                            ))}


                            {/* Proposal Card 1 */}
                            <div className="border border-gray-700 bg-[#18181b] p-0 rounded-[12px] flex relative overflow-hidden">
                                <div className="w-1 bg-violet-700"></div>
                                <div className="p-5 flex-1 z-10">
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
                                        <select className="w-full bg-[#0c0c0e] border border-gray-800 text-gray-300 text-sm p-2 font-mono focus:border-violet-700 focus:outline-none rounded">
                                            <option>Q3_Milestone_Alpha</option>
                                            <option>Weekly_Backlog</option>
                                            <option>Hotfix_Deployment</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Right Preview/Action */}
                                <div className="flex flex-col justify-end">
                                    <div className="mb-4 text-right">
                                        <span className="block text-xs font-mono text-gray-500">ESTIMATED REALLOCATION TIME</span>
                                        <span className="text-xl text-white font-mono">
                                            {isSimulatingProcess ? 'CALCULATING...' : '140ms'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={runDecomposer}
                                        disabled={isSimulatingProcess}
                                        className={`w-full py-3 text-sm rounded-[12px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                                            ${isSimulatingProcess 
                                                ? 'bg-violet-900/50 text-white/50 cursor-wait' 
                                                : 'bg-violet-700 hover:bg-violet-600 text-black shadow-[0_0_20px_rgba(109,40,217,0.4)] hover:shadow-[0_0_25px_rgba(109,40,217,0.6)]'
                                            }`}
                                    >
                                        {isSimulatingProcess ? (
                                            <>
                                                <Activity className="w-4 h-4 animate-spin" /> Processing
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-4 h-4" /> Run Decomposer
                                            </>
                                        )}
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