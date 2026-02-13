'use client';

import React, { useState, useEffect } from 'react';
import { useCallback } from 'react';
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
    
    // UPDATED: Map UI names to backend engine names
    const [assignmentEngine, setAssignmentEngine] = useState<'Envoy Mega' | 'Envoy Pulse' | 'Envoy Nano'>('Envoy Mega');
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState<{id: string, name: string} | null>(null);
    const [newPersonaName, setNewPersonaName] = useState('');
    const [isSimulatingProcess, setIsSimulatingProcess] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [personalInterventions, setPersonalInterventions] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // NEW: Track which engine was actually used (for feedback)
    const [lastEngineUsed, setLastEngineUsed] = useState<string | null>(null);

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
        } catch (error: any) {
            console.error("Failed to fetch personas:", error);
            setError(`Failed to load personas: ${error.message || 'Unknown error'}`);
        }
    };

    const fetchTasks = async () => {
        if (!jwt || !userId) return;
        
        try {
            const data = await api.get('/renderTask', jwt);
            setTasks(data.filter((t: any) => t.ownerId === userId));
        } catch (e: any) {
            console.error("Failed to fetch tasks:", e);
            setError(`Failed to load tasks: ${e.message || 'Unknown error'}`);
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
    
    const fetchSuggestions = useCallback(async () => {
        if (!jwt || !userId) return;

        try {
            // UPDATED: Pass preferred engine to backend
            const data = await api.post('/envoy/suggest', {
                all: true,
                context_text: `optimize my workflow with ${optimizationMode} mode and ${assignmentEngine} engine`,
                preferred_engine: assignmentEngine  // NEW: Send user preference
            }, jwt);

            setSuggestions(Array.isArray(data.proposals) ? data.proposals : []);
            
            // Track which engine was used if returned by backend
            if (data.engine_used) {
                setLastEngineUsed(data.engine_used);
            }
        } catch (err: any) {
            console.error("Failed to load envoy suggestions:", err);
            setSuggestions([]);
        }
    }, [jwt, userId, optimizationMode, assignmentEngine]); 

    // NEW: Save model preference whenever it changes
    useEffect(() => {
        const saveModelPreference = async () => {
            if (!jwt || !userId || !assignmentEngine) return;
            
            try {
                const result = await api.post('/users/update-preferred-model', {
                    userId,
                    preferred_model: assignmentEngine
                }, jwt);
                console.log(`✅ Saved preferred model: ${assignmentEngine}`);
                
                // Check if there's a warning about schema
                if (result.warning) {
                    console.warn(`⚠️ ${result.warning}`);
                }
            } catch (err: any) {
                console.error("Failed to save model preference:", err);
                // Don't break the UI - preference will be used for this session
                console.log("⚠️ Model preference not persisted, but will be used for current session");
            }
        };
        
        saveModelPreference();
    }, [assignmentEngine, userId, jwt]);

    // NEW: Load user's preferred model on mount
    useEffect(() => {
        const loadModelPreference = async () => {
            if (!jwt || !userId) return;
            
            try {
                const data = await api.get(`/users/${userId}/preferred-model`, jwt);
                if (data.preferred_model) {
                    setAssignmentEngine(data.preferred_model as 'Envoy Mega' | 'Envoy Pulse' | 'Envoy Nano');
                    console.log(`✅ Loaded preferred model: ${data.preferred_model}`);
                }
            } catch (err: any) {
                console.error("Failed to load model preference:", err);
                // Don't break the UI - just use the default already set in state
                console.log("⚠️ Using default model: Envoy Mega");
            }
        };
        
        loadModelPreference();
    }, [userId, jwt]); 



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
            } catch (err: any) {
                console.error("Error loading data:", err);
                setError("Failed to load data. Please refresh the page.");
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [userId, jwt]);

    const handleCreatePersona = async () => {
        if (!newPersonaName.trim() || !userId) return;
        
        try {
            const newPersona = await api.post('/createPersona', {
                name: newPersonaName,
                weekly_capacity_hours: 40,
                user_id: userId
            }, jwt);

            setPersonas(prev => [...prev, {
                id: newPersona.id,
                name: newPersona.name,
                label: 'Custom Context',
                load: 0,
                icon: <Circle className="w-5 h-5" />,
                locked: false,
                delta: '0%'
            }]);

            setNewPersonaName('');
            setShowCreateModal(false);
        } catch (error: any) {
            console.error("Failed to create persona:", error);
            alert(`Failed to create persona: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDeletePersona = async (personaId: string) => {
        if (!userId) return;

        try {
            await api.post('/deletePersona', { id: personaId }, jwt);
            setPersonas(prev => prev.filter(p => p.id !== personaId));
            setShowDeleteModal(null);
        } catch (error: any) {
            console.error("Failed to delete persona:", error);
            alert(`Failed to delete persona: ${error.message || 'Unknown error'}`);
        }
    };

    const handleAcceptSuggestion = async (suggestion: any, index: number) => {
        if (!jwt) return;

        try {
            await api.post('/envoy/apply', {
                task_id: suggestion.task_id,
                proposals: [
                    {
                        field: suggestion.field,
                        suggested: suggestion.suggested,
                        reason: suggestion.reason
                    }
                ]
            }, jwt);

            setSuggestions(prev => prev.filter((_, i) => i !== index));
            await fetchTasks();
        } catch (error: any) {
            console.error("Failed to apply suggestion:", error);
            alert(`Failed to apply suggestion: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDismissSuggestion = (index: number) => {
        setSuggestions(prev => prev.filter((_, i) => i !== index));
    };

    const runDecomposer = async () => {
        if (!jwt || !userId || tasks.length === 0) return;

        setIsSimulatingProcess(true);
        setLastEngineUsed(null);  // Reset engine tracking
        
        try {
            // UPDATED: Pass user's preferred engine to backend
            const result = await api.post('/envoy/decompose', {
                optimizationMode,
                assignmentEngine,  // Send UI name, backend will map it
                tasks: tasks.map(t => t.id)
            }, jwt);

            // Track which engine was actually used
            if (result.engine_used) {
                setLastEngineUsed(result.engine_used);
            }

            await fetchTasks();
            await fetchSuggestions();

            alert(`✅ Decomposition complete!\n\nReassigned: ${result.reassigned}/${result.total_tasks} tasks\nEngine used: ${result.engine_used || assignmentEngine}\nMode: ${result.mode}`);
        } catch (error: any) {
            console.error("Decomposition failed:", error);
            
            // Better error message showing fallback info
            const errorMsg = error.message || 'Unknown error';
            if (errorMsg.includes('All AI')) {
                alert(`❌ All AI models failed. Please check:\n\n1. ASUS local model (http://127.0.0.1:8001)\n2. Gemini API key\n3. Mini online model\n\nError: ${errorMsg}`);
            } else {
                alert(`❌ Decomposition failed: ${errorMsg}`);
            }
        } finally {
            setIsSimulatingProcess(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white overflow-auto">
            {/* Header */}
            <header className="border-b border-gray-800 bg-[#0c0c0e]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Layers className="w-6 h-6 text-violet-500" />
                        <h1 className="text-xl font-bold">Envoy Console</h1>
                    </div>
                    {lastEngineUsed && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-violet-900/30 border border-violet-700/50 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-mono text-violet-300">
                                Last used: {lastEngineUsed.toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-red-300 font-medium">Error</p>
                            <p className="text-sm text-red-400 mt-1">{error}</p>
                        </div>
                    </div>
                )}

                <div className="space-y-12">
                    {/* SECTION 1: Persona Management */}
                    <section>
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-4 h-4 text-violet-700" />
                            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                                Persona Management
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {personas.map((persona) => (
                                <div
                                    key={persona.id}
                                    onClick={() => !persona.locked && setActivePersona(persona.id)}
                                    className={`border rounded-[12px] p-5 cursor-pointer transition-all relative group
                                        ${activePersona === persona.id
                                            ? 'bg-violet-900/30 border-violet-700 shadow-[0_0_20px_rgba(109,40,217,0.3)]'
                                            : 'bg-[#121214] border-gray-800 hover:border-gray-700'
                                        }`}
                                >
                                    {persona.locked && (
                                        <div className="absolute top-3 right-3">
                                            <Lock className="w-3 h-3 text-gray-600" />
                                        </div>
                                    )}
                                    
                                    {!persona.locked && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDeleteModal({ id: persona.id, name: persona.name });
                                            }}
                                            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3 text-red-500 hover:text-red-400" />
                                        </button>
                                    )}

                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="text-violet-500">{persona.icon}</div>
                                        <div>
                                            <h3 className="text-white font-semibold text-sm">{persona.name}</h3>
                                            <p className="text-xs text-gray-500 font-mono">{persona.label}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-500 font-mono">LOAD</span>
                                            <span className="text-xs font-bold text-white">{persona.load}%</span>
                                        </div>
                                        <div className="w-full bg-gray-800 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all ${
                                                    persona.load > 80 ? 'bg-red-500' :
                                                    persona.load > 60 ? 'bg-yellow-500' :
                                                    'bg-violet-500'
                                                }`}
                                                style={{ width: `${persona.load}%` }}
                                            />
                                        </div>
                                        {persona.delta && (
                                            <p className="text-xs text-gray-600 font-mono">{persona.delta} this week</p>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Add Persona Card */}
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="border-2 border-dashed border-gray-800 rounded-[12px] p-5 flex flex-col items-center justify-center gap-3 hover:border-violet-700 hover:bg-violet-900/10 transition-all group"
                            >
                                <Plus className="w-8 h-8 text-gray-700 group-hover:text-violet-500 transition-colors" />
                                <span className="text-sm text-gray-600 group-hover:text-gray-400 font-medium">
                                    Add Persona
                                </span>
                            </button>
                        </div>
                    </section>

                    {/* SECTION 2: AI Suggestions */}
                    <section className="border-t border-gray-800 pt-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-violet-700" />
                                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                                    AI Suggestions
                                </h2>
                            </div>
                            <button
                                onClick={fetchSuggestions}
                                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded font-mono transition-colors"
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="space-y-4">
                            {suggestions.map((suggestion, idx) => (
                                <div key={idx} className="border border-violet-900/50 bg-[#121214] p-0 rounded-[12px] flex relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                    <div className="w-1 bg-violet-500"></div>
                                    <div className="p-5 flex-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="text-white font-medium font-mono text-sm uppercase">
                                                {suggestion.field || 'ENVOY_PROPOSAL'}
                                            </h3>
                                            <span className="text-xs bg-violet-900/30 text-violet-300 px-2 py-1 rounded font-mono border border-violet-900/50">
                                                {suggestion.priority || 'MEDIUM'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-2 leading-relaxed">
                                            <span className="font-bold text-violet-300">Suggested:</span> {suggestion.suggested || 'N/A'}
                                        </p>
                                        <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                                            {suggestion.reason || suggestion.message || suggestion.rationale || 'Optimize task workflow'}
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Controls */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-mono text-gray-500 mb-2">OPTIMIZATION GOAL</label>
                                        <div className="flex bg-[#0c0c0e] p-1 rounded-[12px] border border-gray-800">
                                            {['velocity', 'stability', 'quality'].map((mode) => (
                                                <button
                                                    key={mode}
                                                    onClick={() => setOptimizationMode(mode)}
                                                    className={`flex-1 py-1.5 text-xs font-medium uppercase tracking-wide rounded-[12px] transition-all
                                                    ${optimizationMode === mode
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
                                        <label className="block text-xs font-mono text-gray-500 mb-2">
                                            AI ENGINE (WITH FALLBACK)
                                        </label>
                                        <div className="flex bg-[#0c0c0e] p-1 rounded-[12px] border border-gray-800">
                                            {(['Envoy Mega', 'Envoy Pulse', 'Envoy Nano'] as const).map((engine) => (
                                                <button
                                                    key={engine}
                                                    onClick={() => setAssignmentEngine(engine)}
                                                    className={`flex-1 py-1.5 text-xs font-medium uppercase tracking-wide rounded-[12px] transition-all
                                                    ${assignmentEngine === engine
                                                            ? 'bg-violet-700 text-white shadow-sm'
                                                            : 'text-gray-500 hover:text-gray-300'
                                                        }`}
                                                >
                                                    {engine}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-600 mt-2 font-mono">
                                            Mega=Gemini, Pulse=ASUS, Nano=Mini • Auto-fallback enabled
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-mono text-gray-500 mb-2">TARGET SCOPE</label>
                                        <select className="w-full bg-[#0c0c0e] border border-gray-800 text-gray-300 text-sm p-2 font-mono focus:border-violet-700 focus:outline-none rounded">
                                            <option>All Tasks</option>
                                            <option>Active Projects</option>
                                            <option>High Priority</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Right Preview/Action */}
                                <div className="flex flex-col justify-end">
                                    <div className="mb-4 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-mono text-gray-500">PREFERRED ENGINE</span>
                                            <span className="text-sm text-violet-400 font-mono uppercase">{assignmentEngine}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-mono text-gray-500">OPTIMIZATION MODE</span>
                                            <span className="text-sm text-white font-mono uppercase">{optimizationMode}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-mono text-gray-500">TASKS TO PROCESS</span>
                                            <span className="text-xl text-white font-mono">{tasks.length}</span>
                                        </div>
                                        {lastEngineUsed && (
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                                                <span className="text-xs font-mono text-gray-500">LAST ENGINE USED</span>
                                                <span className="text-xs text-green-400 font-mono uppercase">{lastEngineUsed}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={runDecomposer}
                                        disabled={isSimulatingProcess || tasks.length === 0}
                                        className={`w-full py-3 text-sm rounded-[12px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                                            ${isSimulatingProcess || tasks.length === 0
                                                ? 'bg-violet-900/50 text-white/50 cursor-not-allowed' 
                                                : 'bg-violet-700 hover:bg-violet-600 text-white shadow-[0_0_20px_rgba(109,40,217,0.4)] hover:shadow-[0_0_25px_rgba(109,40,217,0.6)]'
                                            }`}
                                    >   
                                        {isSimulatingProcess ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Processing
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

            {/* Create Persona Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#0c0c0e] border border-gray-800 rounded-[12px] p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Create New Persona</h3>
                        <input
                            type="text"
                            value={newPersonaName}
                            onChange={(e) => setNewPersonaName(e.target.value)}
                            placeholder="Persona name..."
                            className="w-full bg-[#121214] border border-gray-800 text-white p-3 rounded-lg mb-4 focus:border-violet-700 focus:outline-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreatePersona();
                            }}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={handleCreatePersona}
                                className="flex-1 bg-violet-700 hover:bg-violet-600 text-white py-2 rounded-lg font-bold transition-colors"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewPersonaName('');
                                }}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Persona Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#0c0c0e] border border-red-900/50 rounded-[12px] p-6 w-full max-w-md">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                            <h3 className="text-lg font-bold">Delete Persona</h3>
                        </div>
                        <p className="text-gray-400 mb-4">
                            Are you sure you want to delete <strong className="text-white">"{showDeleteModal.name}"</strong>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleDeletePersona(showDeleteModal.id)}
                                className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg font-bold transition-colors"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(null)}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnvoyConsole;