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
    Loader2,
    Split,
    GitBranch
} from 'lucide-react';
import { useAuth } from '../../providers/AuthContext';
import { api } from '@/lib/api';

// Types
interface DecompositionSuggestion {
    id: string;
    parentTaskId: string;
    parentTaskTitle: string;
    subtasks: Array<{
        title: string;
        duration: number;
        priority: 'High' | 'Medium' | 'Low';
        reason: string;
    }>;
    reason: string;
}

const EnvoyConsole = () => {
    const { userId, jwt } = useAuth();

    // --- STATE ---
    const [activePersona, setActivePersona] = useState('Builder');
    const [optimizationMode, setOptimizationMode] = useState('stability');
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
    const [lastEngineUsed, setLastEngineUsed] = useState<string | null>(null);

    // NEW: Decomposition state
    const [decompositionSuggestions, setDecompositionSuggestions] = useState<DecompositionSuggestion[]>([]);
    const [showDecompositionModal, setShowDecompositionModal] = useState(false);
    const [isProcessingDecomposition, setIsProcessingDecomposition] = useState(false);

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
            const data = await api.post('/envoy/suggest', {
                all: true,
                context_text: `optimize my workflow with ${optimizationMode} mode`,
                preferred_engine: assignmentEngine
            }, jwt);

            setSuggestions(Array.isArray(data.proposals) ? data.proposals : []);

            if (data.engine_used) {
                setLastEngineUsed(data.engine_used);
            }
        } catch (err: any) {
            console.error("Failed to load envoy suggestions:", err);
            setSuggestions([]);
        }
    }, [jwt, userId, optimizationMode, assignmentEngine]);

    // Save model preference
    useEffect(() => {
        const saveModelPreference = async () => {
            if (!jwt || !userId || !assignmentEngine) return;

            try {
                await api.post('/users/update-preferred-model', {
                    userId,
                    preferred_model: assignmentEngine
                }, jwt);
                console.log(`✅ Saved preferred model: ${assignmentEngine}`);
            } catch (err: any) {
                console.error("Failed to save model preference:", err);
            }
        };

        saveModelPreference();
    }, [assignmentEngine, userId, jwt]);

    // Load user's preferred model
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

    // NEW: Run Decomposer - Gets AI suggestions for breaking down tasks
    const runDecomposer = async () => {
        if (!jwt || !userId || tasks.length === 0) return;

        setIsSimulatingProcess(true);
        setLastEngineUsed(null);

        try {
            // Get friction points and task details
            const frictionData = await Promise.all(
                tasks.map(async (task) => {
                    try {
                        const friction = await api.get(`/envoy/task/${task.id}/friction`, jwt);
                        return {
                            taskId: task.id,
                            taskTitle: task.title,
                            friction
                        };
                    } catch (e) {
                        return null;
                    }
                })
            );

            // Call decomposition endpoint with optimization mode and engine preference
            const result = await api.post('/envoy/decompose-tasks', {
                userId,
                tasks: tasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    duration: t.duration,
                    plannedDuration: t.plannedDuration,
                    dependencyIds: t.dependencyIds || []
                })),
                frictionPoints: frictionData.filter(Boolean),
                                          optimizationMode,
                                          preferredEngine: assignmentEngine
            }, jwt);

            // Track which engine was used
            if (result.engine_used) {
                setLastEngineUsed(result.engine_used);
            }

            // Show decomposition suggestions
            if (result.suggestions && result.suggestions.length > 0) {
                setDecompositionSuggestions(result.suggestions);
                setShowDecompositionModal(true);
            } else {
                alert('✅ No decomposition suggestions at this time.\n\nYour tasks are already well-structured.');
            }

        } catch (error: any) {
            console.error("Decomposition failed:", error);
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

    // NEW: Accept a decomposition suggestion
    const handleAcceptDecomposition = async (suggestion: DecompositionSuggestion) => {
        if (!jwt || !userId) return;

        setIsProcessingDecomposition(true);

        try {
            // Create subtasks and link them as dependencies
            const result = await api.post('/envoy/apply-decomposition', {
                userId,
                parentTaskId: suggestion.parentTaskId,
                subtasks: suggestion.subtasks
            }, jwt);

            // Remove from suggestions
            setDecompositionSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

            // Refresh tasks
            await fetchTasks();

            alert(`✅ Decomposition applied!\n\n${result.created_count} subtasks created for "${suggestion.parentTaskTitle}"`);

            // Close modal if no more suggestions
            if (decompositionSuggestions.length <= 1) {
                setShowDecompositionModal(false);
            }

        } catch (error: any) {
            console.error("Failed to apply decomposition:", error);
            alert(`❌ Failed to apply decomposition: ${error.message || 'Unknown error'}`);
        } finally {
            setIsProcessingDecomposition(false);
        }
    };

    // NEW: Decline a decomposition suggestion
    const handleDeclineDecomposition = (suggestionId: string) => {
        setDecompositionSuggestions(prev => prev.filter(s => s.id !== suggestionId));

        // Close modal if no more suggestions
        if (decompositionSuggestions.length <= 1) {
            setShowDecompositionModal(false);
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
        Task Decomposer
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
        <p className="text-xs text-gray-600 mt-2 font-mono">
        {optimizationMode === 'velocity' && '• Fast parallel execution • Quick wins'}
        {optimizationMode === 'stability' && '• Reliable workflows • Tested approaches'}
        {optimizationMode === 'quality' && '• Thorough execution • Attention to detail'}
        </p>
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
                {engine.split(' ')[1]}
                </button>
        ))}
        </div>
        <p className="text-xs text-gray-600 mt-2 font-mono">
        {assignmentEngine === 'Envoy Mega' && 'Gemini • Most powerful • Best for complex analysis'}
        {assignmentEngine === 'Envoy Pulse' && 'ASUS Local • Balanced • Fast & intelligent'}
        {assignmentEngine === 'Envoy Nano' && 'Mini • Quickest • Ideal for simple tasks'}
        </p>
        </div>

        <div className="bg-blue-900/10 border border-blue-900/50 rounded-lg p-3">
        <div className="flex items-start gap-2">
        <GitBranch className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
        <p className="text-xs text-blue-300 font-medium">Task Decomposition</p>
        <p className="text-xs text-blue-400/70 mt-1">
        Breaks complex tasks into smaller, manageable subtasks with automatic dependency linking
        </p>
        </div>
        </div>
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
        <span className="text-xs font-mono text-gray-500">TASKS TO ANALYZE</span>
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
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing
                </>
            ) : (
                <>
                <Split className="w-4 h-4" /> Run Decomposer
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

            {/* NEW: Decomposition Suggestions Modal */}
            {showDecompositionModal && decompositionSuggestions.length > 0 && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-[#0c0c0e] border border-violet-900/50 rounded-[12px] w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                <GitBranch className="w-6 h-6 text-violet-500" />
                <div>
                <h3 className="text-lg font-bold">Task Decomposition Suggestions</h3>
                <p className="text-sm text-gray-500 mt-1">
                Review and apply AI-suggested task breakdowns
                </p>
                </div>
                </div>
                <button
                onClick={() => setShowDecompositionModal(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                <XCircle className="w-5 h-5" />
                </button>
                </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {decompositionSuggestions.map((suggestion) => (
                    <div key={suggestion.id} className="bg-[#121214] border border-gray-800 rounded-lg p-5">
                    <div className="mb-4">
                    <h4 className="text-white font-semibold mb-2">{suggestion.parentTaskTitle}</h4>
                    <p className="text-sm text-gray-400 mb-4">{suggestion.reason}</p>

                    <div className="bg-violet-900/10 border border-violet-900/30 rounded-lg p-4">
                    <p className="text-xs font-mono text-violet-300 mb-3 uppercase font-bold">
                    Proposed Subtasks ({suggestion.subtasks.length})
                    </p>
                    <div className="space-y-3">
                    {suggestion.subtasks.map((subtask, idx) => (
                        <div key={idx} className="bg-[#0c0c0e] border border-gray-800 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                        <p className="text-sm text-white font-medium">{subtask.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{subtask.reason}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded font-mono ${
                            subtask.priority === 'High' ? 'bg-red-900/30 text-red-300 border border-red-900/50' :
                            subtask.priority === 'Medium' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-900/50' :
                            'bg-green-900/30 text-green-300 border border-green-900/50'
                        }`}>
                        {subtask.priority}
                        </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="font-mono">{Math.floor(subtask.duration / 3600)}h duration</span>
                        </div>
                        </div>
                    ))}
                    </div>
                    </div>
                    </div>

                    <div className="flex gap-3">
                    <button
                    onClick={() => handleAcceptDecomposition(suggestion)}
                    disabled={isProcessingDecomposition}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-700 hover:bg-violet-600 disabled:bg-violet-900/50 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-wide rounded-[12px] transition-colors"
                    >
                    {isProcessingDecomposition ? (
                        <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing
                        </>
                    ) : (
                        <>
                        <CheckCircle className="w-4 h-4" />
                        Accept
                        </>
                    )}
                    </button>
                    <button
                    onClick={() => handleDeclineDecomposition(suggestion.id)}
                    disabled={isProcessingDecomposition}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900/50 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-wide rounded-[12px] transition-colors"
                    >
                    <XCircle className="w-4 h-4" />
                    Decline
                    </button>
                    </div>
                    </div>
                ))}
                </div>
                </div>
                </div>
            )}
            </div>
    );
};

export default EnvoyConsole;
