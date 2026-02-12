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
    AlertTriangle,
    Loader2
} from 'lucide-react';
import { useAuth } from '../../providers/AuthContext';
import { api } from '@/lib/api';

const EnvoyConsole = () => {
    const { userId, jwt } = useAuth();

    // --- STATE ---
    const [activePersona, setActivePersona] = useState('Builder');
    const [optimizationMode, setOptimizationMode] = useState('stability');
    
    // UI State für Modals & Loading
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState<{id: string, name: string} | null>(null);
    const [newPersonaName, setNewPersonaName] = useState('');
    const [isSimulatingProcess, setIsSimulatingProcess] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [personalInterventions, setPersonalInterventions] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
        }
    ]);

    // --- FETCH LOGIC ---
    const fetchPersonas = async () => {
        if (!jwt || !userId) return;
        
        try {
            // FIXED: This now only returns the current user's personas from the backend
            const data = await api.get('/renderPersona', jwt);
            
            // Map the personas from the database
            const dbPersonas = data.map((p: any) => ({
                id: p.id, 
                name: p.name,
                label: 'Custom Context',
                load: Math.floor(Math.random() * 30),
                icon: <Circle className="w-5 h-5" />,
                locked: false,
                delta: '0%'
            }));

            // Merge with static personas
            setPersonas(prev => {
                const staticPersonas = prev.filter(p => p.locked || ['Builder', 'Architect', 'Operator', 'Scout'].includes(p.id));
                const existingIds = new Set(staticPersonas.map(x => x.id));
                const uniqueNew = dbPersonas.filter((x: any) => !existingIds.has(x.id));
                return [...staticPersonas, ...uniqueNew];
            });
        } catch (error) {
            console.warn("Failed to fetch personas:", error);
        }
    };

    const fetchTasks = async () => {
        if (!jwt || !userId) return;
        
        try {
            const data = await api.get('/renderTask', jwt);
            // FIXED: Filter to only show tasks owned by the current user
            setTasks(data.filter((t: any) => t.ownerId === userId));
        } catch (e) {
            console.error("Failed to fetch tasks:", e);
        }
    };

    const fetchInterventions = async () => {
        if (!jwt || !userId) return;
        
        try {
            const data = await api.get(`/envoy/interventions?userId=${userId}`, jwt);
            setPersonalInterventions(data.filter((i: any) => i.scope === 'personal'));
        } catch (e) {
            console.error("Failed to fetch interventions:", e);
        }
    };
    
    const fetchSuggestions = async () => {
        if (!jwt || !userId) return;

        try {
            const data = await api.post('/envoy/suggest', {
                all: true,
                context_text: "optimize my workflow"
            }, jwt);

            setSuggestions(Array.isArray(data.proposals) ? data.proposals : []);
        } catch (err) {
            console.error("Failed to load envoy suggestions:", err);
            setSuggestions([]);
        }
    };



    useEffect(() => {
        if (!userId || !jwt) return;
        
        const loadData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                await Promise.all([
                    fetchPersonas(),
                    fetchTasks(),
                    fetchInterventions()
                ]);
            } catch (err) {
                console.error("Error loading data:", err);
                setError("Failed to load data. Please refresh the page.");
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [userId, jwt]);

    // Fetch suggestions after tasks are loaded
    useEffect(() => {
        if (tasks.length > 0 && userId && jwt) {
            fetchSuggestions();
        }
    }, [tasks, userId, jwt]);

    // --- SESSION STORAGE HELPERS ---
    const addToSession = (name: string) => {
        if (typeof window === 'undefined') return;
        const raw = sessionStorage.getItem('recent_personas') || '[]';
        const recent = JSON.parse(raw);
        if (!recent.includes(name)) {
            recent.unshift(name);
            sessionStorage.setItem('recent_personas', JSON.stringify(recent.slice(0, 5)));
        }
    };

    const getRecentFromSession = (): string[] => {
        if (typeof window === 'undefined') return [];
        const raw = sessionStorage.getItem('recent_personas') || '[]';
        return JSON.parse(raw);
    };

    const handlePersonaClick = (name: string) => {
        setActivePersona(name);
        addToSession(name);
    };

    // --- CREATE / DELETE PERSONAS ---
    const handleCreatePersona = async () => {
        if (!newPersonaName.trim() || !jwt || !userId) return;

        try {
            await api.post('/createPersona', {
                userId: userId,
                name: newPersonaName.trim(),
                weeklyCapacityHours: 40,
                role: 'Member'
            }, jwt);

            await fetchPersonas();
            setShowCreateModal(false);
            setNewPersonaName('');
        } catch (err) {
            console.error('Failed to create persona:', err);
            alert('Failed to create persona');
        }
    };

    const handleDeletePersona = async () => {
        if (!showDeleteModal || !jwt) return;

        try {
            await api.delete(`/deletePersona/${showDeleteModal.id}`, jwt);
            await fetchPersonas();
            setShowDeleteModal(null);
        } catch (err) {
            console.error('Failed to delete persona:', err);
            alert('Failed to delete persona');
        }
    };

    // --- SIMULATION / DECOMPOSITION ---
    const runDecomposer = async () => {
        setIsSimulatingProcess(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsSimulatingProcess(false);
        alert('Decomposer ran successfully! (Simulated)');
    };

    const handleAcceptSuggestion = async (suggestion: any, idx: number) => {
        console.log('Accepting suggestion:', suggestion);
        setSuggestions(prev => prev.filter((_, i) => i !== idx));
        alert('Suggestion accepted! Changes will be applied.');
    };

    const handleDismissSuggestion = (idx: number) => {
        setSuggestions(prev => prev.filter((_, i) => i !== idx));
    };

    const recentPersonaNames = getRecentFromSession();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 text-sm font-mono">Loading Envoy Console...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-y-auto bg-[#0c0c0e] text-white font-mono">
            {/* Create Persona Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#121214] border border-gray-800 rounded-[12px] p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4 uppercase">Create New Persona</h3>
                        <input
                            type="text"
                            value={newPersonaName}
                            onChange={(e) => setNewPersonaName(e.target.value)}
                            placeholder="Persona name..."
                            className="w-full bg-[#0c0c0e] border border-gray-800 text-gray-300 p-3 rounded-[12px] mb-4 focus:border-violet-700 focus:outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreatePersona()}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={handleCreatePersona}
                                className="flex-1 bg-violet-700 hover:bg-violet-600 text-white py-2 px-4 rounded-[12px] font-bold uppercase text-sm"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewPersonaName('');
                                }}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-4 rounded-[12px] font-bold uppercase text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#121214] border border-red-900/50 rounded-[12px] p-6 w-full max-w-md">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                            <h3 className="text-lg font-bold text-white uppercase">Delete Persona</h3>
                        </div>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to delete <span className="text-white font-bold">{showDeleteModal.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDeletePersona}
                                className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 px-4 rounded-[12px] font-bold uppercase text-sm"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(null)}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-4 rounded-[12px] font-bold uppercase text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <header className="mb-8 pb-6 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tight mb-2">
                                Envoy Console
                            </h1>
                            <p className="text-sm text-gray-500 font-sans">
                                AI-powered context management and task orchestration
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-[#121214] px-4 py-2 rounded-[12px] border border-gray-800">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-xs text-gray-400 uppercase">System Active</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 bg-red-900/20 border border-red-900/50 p-4 rounded-[12px]">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Persona Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* LEFT: Active Persona Workbench */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Active Context Display */}
                        <section className="bg-[#121214] border border-gray-800 p-6 rounded-[12px]">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-violet-700" />
                                    Active Context
                                </h2>
                                <button className="text-xs text-gray-500 hover:text-gray-300 font-mono transition-colors">
                                    Switch
                                </button>
                            </div>

                            <div className="bg-[#0c0c0e] border border-violet-900/50 p-6 rounded-[12px] flex items-center gap-6">
                                <div className="w-16 h-16 bg-violet-700/20 border border-violet-700/50 rounded-[12px] flex items-center justify-center">
                                    {personas.find(p => p.id === activePersona)?.icon || <Square className="w-8 h-8 text-violet-500" />}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-white uppercase mb-1">{activePersona}</h3>
                                    <p className="text-xs text-gray-500 uppercase">
                                        {personas.find(p => p.id === activePersona)?.label || 'Context Layer'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-violet-400">
                                        {personas.find(p => p.id === activePersona)?.load || 0}%
                                    </div>
                                    <p className="text-xs text-gray-500">Cognitive Load</p>
                                </div>
                            </div>
                        </section>

                        {/* Recent Activity */}
                        <section className="bg-[#121214] border border-gray-800 p-6 rounded-[12px]">
                            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-violet-700" />
                                Recent Context Switches
                            </h2>
                            <div className="space-y-2">
                                {recentPersonaNames.slice(0, 3).map((name, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-[#0c0c0e] border border-gray-800 p-3 rounded flex items-center justify-between hover:border-violet-900/50 transition-colors cursor-pointer"
                                        onClick={() => handlePersonaClick(name)}
                                    >
                                        <span className="text-sm text-gray-300 font-medium">{name}</span>
                                        <ArrowRight className="w-4 h-4 text-gray-600" />
                                    </div>
                                ))}
                                {recentPersonaNames.length === 0 && (
                                    <p className="text-gray-600 text-sm italic">No recent activity</p>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT: Persona Registry */}
                    <div>
                        <section className="bg-[#121214] border border-gray-800 p-6 rounded-[12px] sticky top-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-violet-700" />
                                    Persona Registry ({personas.length})
                                </h2>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="text-violet-400 hover:text-violet-300 transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {personas.map(persona => (
                                    <div
                                        key={persona.id}
                                        onClick={() => !persona.locked && handlePersonaClick(persona.name)}
                                        className={`bg-[#0c0c0e] border p-3 rounded-[12px] transition-all cursor-pointer flex items-center justify-between group
                                            ${activePersona === persona.name
                                                ? 'border-violet-700 shadow-[0_0_20px_rgba(109,40,217,0.3)]'
                                                : 'border-gray-800 hover:border-violet-900/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className={`w-10 h-10 flex items-center justify-center rounded-[12px] border
                                                ${activePersona === persona.name
                                                    ? 'bg-violet-700/20 border-violet-700/50'
                                                    : 'bg-gray-800/50 border-gray-800'
                                                }`}>
                                                {persona.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-white uppercase truncate">
                                                        {persona.name}
                                                    </p>
                                                    {persona.locked && (
                                                        <Lock className="w-3 h-3 text-gray-600 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">{persona.label}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-violet-400">{persona.load}%</div>
                                                {persona.delta && (
                                                    <div className="text-xs text-emerald-500">{persona.delta}</div>
                                                )}
                                            </div>
                                            {!persona.locked && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowDeleteModal({ id: persona.id, name: persona.name });
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-all p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Bottom Sections */}
                <div className="space-y-8">
                    {/* SECTION 1: Task Inventory */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-violet-700" />
                                Task Inventory ({tasks.length} tasks)
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
                                <div className="text-gray-500 text-sm italic p-4">No tasks found.</div>
                            )}
                        </div>
                    </section>

                    {/* SECTION 2: Envoy Proposals */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                <Zap className="w-4 h-4 text-violet-700" />
                                AI Optimization Proposals
                            </h2>
                            <button 
                                onClick={fetchSuggestions}
                                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                            >
                                <Activity className="w-3 h-3" /> Refresh
                            </button>
                        </div>

                        <div className="space-y-4">
                            {suggestions.map((suggestion, idx) => (
                                <div key={idx} className="border border-violet-900/50 bg-[#121214] p-0 rounded-[12px] flex relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                    <div className="w-1 bg-violet-500"></div>
                                    <div className="p-5 flex-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="text-white font-medium font-mono text-sm uppercase">
                                                {suggestion.type || 'ENVOY_PROPOSAL'}
                                            </h3>
                                            <span className="text-xs bg-violet-900/30 text-violet-300 px-2 py-1 rounded font-mono border border-violet-900/50">
                                                {suggestion.priority || 'MEDIUM'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                                            {suggestion.message || suggestion.rationale || 'Optimize task workflow'}
                                        </p>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => handleAcceptSuggestion(suggestion, idx)}
                                                className="flex items-center gap-2 px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white text-xs font-bold uppercase tracking-wide rounded-[12px] transition-colors"
                                            >
                                                <CheckCircle className="w-3 h-3" /> Accept
                                            </button>
                                            <button 
                                                onClick={() => handleDismissSuggestion(idx)}
                                                className="text-xs text-gray-500 hover:text-gray-300 font-mono transition-colors"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {suggestions.length === 0 && (
                                <div className="border border-gray-800 bg-[#121214] p-8 rounded-[12px] text-center">
                                    <Zap className="w-12 h-12 mx-auto mb-4 text-gray-700" />
                                    <p className="text-gray-500 text-sm">No AI suggestions available</p>
                                    <p className="text-gray-600 text-xs mt-2">Complete more tasks to get personalized recommendations</p>
                                </div>
                            )}
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
                                                : 'bg-violet-700 hover:bg-violet-600 text-white shadow-[0_0_20px_rgba(109,40,217,0.4)] hover:shadow-[0_0_25px_rgba(109,40,217,0.6)]'
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