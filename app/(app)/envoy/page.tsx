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
        if (!jwt) return;
        
        try {
            const data = await api.get('/renderPersona', jwt);
            
            const dbPersonas = data.map((p: any) => ({
                id: p.id, 
                name: p.name,
                label: 'Custom Context',
                load: Math.floor(Math.random() * 30),
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
        } catch (error) {
            console.warn("Failed to fetch personas:", error);
        }
    };

    const fetchTasks = async () => {
        if (!jwt || !userId) return;
        
        try {
            const data = await api.get('/renderTask', jwt);
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
            // Changed from GET to POST with proper body
            const data = await api.post('/envoy/suggest', {
                userId,
                tasks: tasks.length > 0 ? tasks : [],
                context: "optimize my workflow"
            }, jwt);
            
            setSuggestions(Array.isArray(data) ? data : []);
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
        if (!newPersonaName || !userId || !jwt) return;
        const nameToCreate = newPersonaName.trim();

        try {
            const createdPersona = await api.post('/personas', {
                name: nameToCreate,
                weekly_capacity_hours: 40,
                user_id: userId,
                role: 'Member',
                color: '#6366f1'
            }, jwt);

            const newLocal = {
                id: createdPersona.id,
                name: nameToCreate,
                label: 'Custom Context',
                load: 0,
                icon: <Circle className="w-5 h-5" />,
                locked: false,
                delta: '0%'
            };

            setPersonas(prev => [...prev, newLocal]);
            addToSession(nameToCreate);
            setNewPersonaName('');
            setShowCreateModal(false);
        } catch (err) {
            console.error("Failed to create persona:", err);
            alert("Failed to create persona. Please try again.");
        }
    };

    const handleDeleteConfirm = async () => {
        if (!showDeleteModal || !jwt) return;
        const { id, name } = showDeleteModal;

        try {
            await api.delete(`/personas/${id}`, jwt);
            
            setPersonas(prev => prev.filter(p => p.id !== id));
            removeFromSession(name);
            setShowDeleteModal(null);
        } catch (err) {
            console.error("Failed to delete persona:", err);
            alert("Failed to delete persona. Please try again.");
        }
    };

    const runDecomposer = () => {
        setIsSimulatingProcess(true);
        setTimeout(() => {
            setIsSimulatingProcess(false);
            alert("Decomposer simulation complete! (This is a demo)");
        }, 2000);
    };

    const handleAcceptSuggestion = async (suggestion: any, index: number) => {
        if (!jwt || !userId) return;
        
        try {
            // Apply the suggestion (update task in backend)
            if (suggestion.task_id && suggestion.field) {
                const updateData: any = {};
                updateData[suggestion.field] = suggestion.proposed_value;
                
                await api.patch(`/tasks/${suggestion.task_id}`, updateData, jwt);
                
                // Remove suggestion from UI
                setSuggestions(prev => prev.filter((_, i) => i !== index));
                
                // Refresh tasks to show updated data
                await fetchTasks();
            }
        } catch (err) {
            console.error("Failed to apply suggestion:", err);
            alert("Failed to apply suggestion. Please try again.");
        }
    };

    const handleDismissSuggestion = (index: number) => {
        setSuggestions(prev => prev.filter((_, i) => i !== index));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading Envoy Console...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-4" />
                    <p className="text-slate-400">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0E17] text-slate-200 p-4 md:p-8 font-mono">
            {/* CREATE MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#121214] border border-violet-900/50 p-6 rounded-[12px] w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-violet-500" /> Create New Persona
                        </h3>
                        <input
                            type="text"
                            value={newPersonaName}
                            onChange={(e) => setNewPersonaName(e.target.value)}
                            placeholder="Enter persona name..."
                            className="w-full bg-[#0c0c0e] border border-gray-700 rounded-[12px] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4"
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateSubmit()}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={handleCreateSubmit}
                                disabled={!newPersonaName.trim()}
                                className="flex-1 bg-violet-700 hover:bg-violet-600 text-white py-2 rounded-[12px] font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => { setShowCreateModal(false); setNewPersonaName(''); }}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-[12px] font-bold text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#121214] border border-rose-900/50 p-6 rounded-[12px] w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-rose-500" /> Delete Persona
                        </h3>
                        <p className="text-sm text-gray-400 mb-6">
                            Are you sure you want to delete <strong className="text-white">{showDeleteModal.name}</strong>?
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-[12px] font-bold text-sm transition-colors"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(null)}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-[12px] font-bold text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <header className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Cpu className="w-8 h-8 text-violet-500" />
                            Envoy Console
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 font-sans">AI-Powered Workflow Orchestration</p>
                    </div>
                    <div className="flex items-center gap-2 bg-[#121214] px-4 py-2 rounded-[12px] border border-gray-800">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">ACTIVE</span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto">
                <div className="space-y-8">
                    {/* SECTION 1: Personas */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                <Hexagon className="w-4 h-4 text-violet-700" />
                                Active Personas ({personas.length})
                            </h2>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="text-xs bg-violet-700 hover:bg-violet-600 px-3 py-1.5 rounded-[12px] flex items-center gap-1 font-bold transition-colors"
                            >
                                <Plus className="w-3 h-3" /> New Persona
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {personas.map((persona) => (
                                <div
                                    key={persona.id}
                                    onClick={() => !persona.locked && setActivePersona(persona.id)}
                                    className={`bg-[#121214] border rounded-[12px] p-5 transition-all duration-200 cursor-pointer ${
                                        activePersona === persona.id
                                            ? 'border-violet-500 shadow-[0_0_15px_rgba(109,40,217,0.3)]'
                                            : 'border-gray-800 hover:border-gray-700'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-[12px] ${activePersona === persona.id ? 'bg-violet-900/40' : 'bg-gray-800'}`}>
                                                {persona.icon}
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                                    {persona.name}
                                                    {persona.locked && <Lock className="w-3 h-3 text-gray-600" />}
                                                </h3>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{persona.label}</p>
                                            </div>
                                        </div>
                                        {!persona.locked && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDeleteModal({ id: persona.id, name: persona.name });
                                                }}
                                                className="text-gray-600 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500 font-mono">LOAD</span>
                                            <span className="text-white font-bold">{persona.load}%</span>
                                        </div>
                                        <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${
                                                    persona.load > 80 ? 'bg-rose-500' : persona.load > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${persona.load}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] text-gray-600 uppercase">Δ from baseline</span>
                                            <span className={`text-xs font-bold ${persona.delta.startsWith('+') ? 'text-emerald-500' : 'text-gray-500'}`}>
                                                {persona.delta}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-900/50 rounded-[12px]">
                            <p className="text-xs text-amber-400 font-mono">
                                ⚠️ WARNING: {personas.length} active personas detected.
                                EFFICIENCY PENALTY: {personas.length > 5 ? '-15%' : '-2%'}
                            </p>
                        </div>
                    </section>

                    {/* SECTION: Task Inventory */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                <Layers className="w-4 h-4 text-violet-700" />
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