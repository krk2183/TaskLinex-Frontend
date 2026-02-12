"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
    User, Shield, Users, Bot, Bell, Layout, Beaker, 
    Save, CheckCircle, AlertCircle, Plus, Trash2, 
    Activity, Lock, RefreshCw, Smartphone, Monitor
} from 'lucide-react';
import { useAuth } from '../../providers/AuthContext';
import { api } from '@/lib/api';

// ==========================================
// 1. DATA MODELS (Backend Schema)
// ==========================================

// --- Account & Identity ---
interface AccountSettings {
    displayName: string;
    email: string;
    avatarUrl: string;
    accountType: 'Individual' | 'Team' | 'Enterprise';
    language: string;
    twoFactorEnabled: boolean;
}

// --- Persona System ---
interface PersonaDefinition {
    id: string;
    name: string;
    role: string;
    color: string;
    capacityLimit: number;
    allowOverload: boolean;
}

interface PersonaSettings {
    activePersonas: PersonaDefinition[];
    enableVirtualTeammates: boolean;
}

// --- Envoy AI ---
interface EnvoySettings {
    suggestionsEnabled: boolean;
    autoDetectDependencies: boolean;
    communicationStyle: 'Concise' | 'Elaborate';
    sensitivityLevel: number;
    permissions: {
        canDraftNotes: boolean;
        canProposeHandoffs: boolean;
        canModifyDates: boolean;
    };
}

// --- Visualization ---
interface VisualSettings {
    defaultTimelineScale: 'Week' | 'Month' | 'Quarter';
    showGhostBars: boolean;
    showDependencyLines: boolean;
    uiDensity: 'Compact' | 'Comfortable';
}

// --- Root Settings Object ---
interface UserSettings {
    account: AccountSettings;
    personas: PersonaSettings;
    envoy: EnvoySettings;
    visuals: VisualSettings;
    experimental: {
        enableJQL: boolean;
        usegpuAcceleration: boolean;
    };
}

// ==========================================
// 2. UI COMPONENTS
// ==========================================

const Toggle = ({ label, description, checked, onChange, disabled }: any) => (
    <div className={`flex items-start justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 ${disabled ? 'opacity-50' : ''}`}>
        <div className="pr-8">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</h4>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </div>
        <button 
            onClick={() => !disabled && onChange(!checked)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
    </div>
);

// --- Section: Personas ---
const PersonaSection = ({ data, onUpdate }: { data: PersonaSettings, onUpdate: (d: PersonaSettings) => void }) => {
    const updatePersona = (id: string, field: string, value: any) => {
        const updatedPersonas = data.activePersonas.map(p => p.id === id ? { ...p, [field]: value } : p);
        onUpdate({ ...data, activePersonas: updatedPersonas });
    };

    const addPersona = () => {
        const newPersona: PersonaDefinition = {
            id: `temp_${Date.now()}`, 
            name: 'New Persona', 
            role: 'Member', 
            color: '#6366f1', 
            capacityLimit: 40, 
            allowOverload: false
        };
        onUpdate({ ...data, activePersonas: [...data.activePersonas, newPersona] });
    };

    const removePersona = (id: string) => {
        onUpdate({ ...data, activePersonas: data.activePersonas.filter(p => p.id !== id) });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">Persona System</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            Personas are virtual identities representing different work modes or team roles.
                        </p>
                    </div>
                    <button
                        onClick={addPersona}
                        className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-md font-medium transition-colors"
                    >
                        <Plus className="w-3 h-3" /> Add Persona
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {data.activePersonas.map((persona) => (
                    <div key={persona.id} className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={persona.name}
                                        onChange={(e) => updatePersona(persona.id, 'name', e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                                    <select
                                        value={persona.role}
                                        onChange={(e) => updatePersona(persona.id, 'role', e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option>Lead</option>
                                        <option>Member</option>
                                        <option>Contributor</option>
                                        <option>Reviewer</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={() => removePersona(persona.id)}
                                className="ml-4 text-red-400 hover:text-red-600 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-500 font-bold uppercase">Weekly Capacity</span>
                                    <span className="text-gray-700 dark:text-gray-300">{persona.capacityLimit}h</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={persona.capacityLimit}
                                    onChange={(e) => updatePersona(persona.id, 'capacityLimit', parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                            
                            <Toggle
                                label="Allow Overload"
                                description="Permit task assignments beyond capacity limit"
                                checked={persona.allowOverload}
                                onChange={(v: boolean) => updatePersona(persona.id, 'allowOverload', v)}
                            />
                        </div>
                    </div>
                ))}

                {data.activePersonas.length === 0 && (
                    <div className="text-center py-8 text-gray-400 italic">
                        No personas configured. Click "Add Persona" to get started.
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <Toggle
                    label="Enable Virtual Teammates"
                    description="Treat each persona as a separate user in team views"
                    checked={data.enableVirtualTeammates}
                    onChange={(v: boolean) => onUpdate({ ...data, enableVirtualTeammates: v })}
                />
            </div>
        </div>
    );
};

// --- Section: Envoy AI ---
const EnvoySection = ({ data, onUpdate }: { data: EnvoySettings, onUpdate: (d: EnvoySettings) => void }) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="bg-violet-50 dark:bg-violet-900/10 p-4 rounded-lg border border-violet-100 dark:border-violet-900">
            <h4 className="text-sm font-bold text-violet-900 dark:text-violet-200">Envoy AI Assistant</h4>
            <p className="text-xs text-violet-700 dark:text-violet-300 mt-1">
                Configure how Envoy analyzes and assists with your workflow.
            </p>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 px-4">
            <Toggle
                label="Enable AI Suggestions"
                description="Allow Envoy to propose workflow optimizations"
                checked={data.suggestionsEnabled}
                onChange={(v: boolean) => onUpdate({ ...data, suggestionsEnabled: v })}
            />
            <Toggle
                label="Auto-Detect Dependencies"
                description="Automatically identify task relationships"
                checked={data.autoDetectDependencies}
                onChange={(v: boolean) => onUpdate({ ...data, autoDetectDependencies: v })}
            />
        </div>

        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Communication Style</label>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
                {(['Concise', 'Elaborate'] as const).map((style) => (
                    <button
                        key={style}
                        onClick={() => onUpdate({ ...data, communicationStyle: style })}
                        className={`px-4 py-2 text-xs rounded-md transition-all ${data.communicationStyle === style ? 'bg-white dark:bg-gray-700 shadow-sm font-bold' : 'text-gray-500'}`}
                    >
                        {style}
                    </button>
                ))}
            </div>
        </div>

        <div>
            <div className="flex justify-between text-xs mb-2">
                <span className="font-bold text-gray-500 uppercase">Proactiveness Level</span>
                <span className="text-gray-700 dark:text-gray-300">{data.sensitivityLevel}/10</span>
            </div>
            <input
                type="range"
                min="1"
                max="10"
                value={data.sensitivityLevel}
                onChange={(e) => onUpdate({ ...data, sensitivityLevel: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-[10px] text-gray-400 mt-1">1 = Conservative | 10 = Highly Proactive</p>
        </div>

        <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Permissions</h4>
            <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 px-4">
                <Toggle
                    label="Can Draft Notes"
                    description="Allow Envoy to write task descriptions"
                    checked={data.permissions.canDraftNotes}
                    onChange={(v: boolean) => onUpdate({ ...data, permissions: { ...data.permissions, canDraftNotes: v } })}
                />
                <Toggle
                    label="Can Propose Handoffs"
                    description="Suggest task reassignments"
                    checked={data.permissions.canProposeHandoffs}
                    onChange={(v: boolean) => onUpdate({ ...data, permissions: { ...data.permissions, canProposeHandoffs: v } })}
                />
                <Toggle
                    label="Can Modify Dates"
                    description="Adjust task timelines automatically"
                    checked={data.permissions.canModifyDates}
                    onChange={(v: boolean) => onUpdate({ ...data, permissions: { ...data.permissions, canModifyDates: v } })}
                />
            </div>
        </div>
    </div>
);

// ==========================================
// 4. MAIN PAGE CONTROLLER
// ==========================================

export default function SettingsPage() {
    const { userId, jwt } = useAuth();

    const [activeTab, setActiveTab] = useState<'personas' | 'envoy' | 'visuals'>('personas');
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncState, setSyncState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Initial Fetch
    useEffect(() => {
        if (!userId || !jwt) return;
        
        const loadSettings = async () => {
            setLoading(true);
            
            try {
                // Load user data
                const user = await api.get(`/users/${userId}`, jwt);
                
                // Initialize settings with defaults
                const defaultSettings: UserSettings = {
                    account: {
                        displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                        email: user.email,
                        avatarUrl: `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`,
                        accountType: user.role === 'admin' ? 'Team' : 'Individual',
                        language: 'English (US)',
                        twoFactorEnabled: false
                    },
                    personas: {
                        activePersonas: [],
                        enableVirtualTeammates: false
                    },
                    envoy: {
                        suggestionsEnabled: true,
                        autoDetectDependencies: true,
                        communicationStyle: 'Concise',
                        sensitivityLevel: 5,
                        permissions: {
                            canDraftNotes: true,
                            canProposeHandoffs: true,
                            canModifyDates: false
                        }
                    },
                    visuals: {
                        defaultTimelineScale: 'Week',
                        showGhostBars: true,
                        showDependencyLines: true,
                        uiDensity: 'Comfortable'
                    },
                    experimental: {
                        enableJQL: false,
                        usegpuAcceleration: false
                    }
                };

                // Load personas from backend
                try {
                    const personas = await api.get('/renderPersona', jwt);
                    defaultSettings.personas.activePersonas = personas.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        role: p.role || 'Member',
                        color: p.color || '#6366f1',
                        capacityLimit: p.weekly_capacity_hours || 40,
                        allowOverload: p.allow_overload || false
                    }));
                } catch (err) {
                    console.warn("Could not load personas:", err);
                }

                setSettings(defaultSettings);
            } catch (err) {
                console.error("Failed to load settings:", err);
                setSyncState('error');
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [userId, jwt]);

    const handleUpdate = useCallback(async (section: keyof UserSettings, newData: any) => {
        if (!settings || !userId || !jwt) return;
        
        const previousData = settings[section];
        
        // Optimistic update
        setSettings(prev => prev ? ({ ...prev, [section]: newData }) : null);
        setSyncState('saving');

        try {
            // For personas, update each one individually in the backend
            if (section === 'personas') {
                // This is a simplified example - you may want more sophisticated sync logic
                console.log("Personas updated:", newData);
            }
            
            setSyncState('saved');
            setTimeout(() => setSyncState('idle'), 2000);
        } catch (err) {
            console.error("Failed to save settings:", err);
            setSettings(prev => prev ? ({ ...prev, [section]: previousData }) : null);
            setSyncState('error');
            setTimeout(() => setSyncState('idle'), 3000);
        }
    }, [settings, userId, jwt]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
            </div>
        </div>
    );

    if (!settings) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Failed to load settings</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        </div>
    );

    const tabs = [
        { id: 'personas', label: 'Persona System', icon: Users },
        { id: 'envoy', label: 'Envoy AI', icon: Bot },
        { id: 'visuals', label: 'Visualization', icon: Monitor },
    ] as const;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0A0E17] text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
            
            {/* SIDEBAR */}
            <aside className="w-full md:w-64 bg-white dark:bg-[#0F172A] border-r border-gray-200 dark:border-gray-800 flex-shrink-0 z-20">
                <div className="p-6">
                    <h1 className="text-xl font-bold tracking-tight mb-1">Settings</h1>
                    <p className="text-xs text-gray-500">TaskLinex Configuration</p>
                </div>
                
                <nav className="px-3 space-y-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                                    isActive 
                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="mt-8 px-6">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Experimental</h4>
                    <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors">
                        <Beaker className="w-3 h-3" />
                        Feature Flags
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto py-8 px-6 md:px-12">                    
                    <div className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
                        <h2 className="text-2xl font-bold">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h2>
                        <div className="flex items-center gap-2 text-xs font-medium">
                            {syncState === 'saving' && <span className="text-gray-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Saving...</span>}
                            {syncState === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Saved</span>}
                            {syncState === 'error' && <span className="text-rose-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed to save</span>}
                        </div>
                    </div>

                    {/* Dynamic Content */}
                    <div className="min-h-[400px]">
                        {activeTab === 'personas' && (
                            <PersonaSection 
                                data={settings.personas} 
                                onUpdate={(d) => handleUpdate('personas', d)} 
                            />
                        )}
                        {activeTab === 'envoy' && (
                            <EnvoySection 
                                data={settings.envoy} 
                                onUpdate={(d) => handleUpdate('envoy', d)} 
                            />
                        )}
                        {activeTab === 'visuals' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <Toggle 
                                    label="Show Ghost Bars" 
                                    description="Visualize planned duration vs actual to identify slippage."
                                    checked={settings.visuals.showGhostBars}
                                    onChange={(v: boolean) => handleUpdate('visuals', { ...settings.visuals, showGhostBars: v })}
                                />
                                <div className="py-4 border-b border-gray-100 dark:border-gray-800">
                                    <h4 className="text-sm font-medium mb-2">Default Timeline Scale</h4>
                                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
                                        {(['Week', 'Month', 'Quarter'] as const).map((scale) => (
                                            <button 
                                                type="button"
                                                key={scale}
                                                onClick={() => handleUpdate('visuals', { ...settings.visuals, defaultTimelineScale: scale })}
                                                className={`px-3 py-1 text-xs rounded-md transition-all ${settings.visuals.defaultTimelineScale === scale ? 'bg-white dark:bg-gray-700 shadow-sm font-bold' : 'text-gray-500'}`}
                                            >
                                                {scale}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Toggle 
                                    label="Show Dependency Lines" 
                                    description="Display visual connections between related tasks."
                                    checked={settings.visuals.showDependencyLines}
                                    onChange={(v: boolean) => handleUpdate('visuals', { ...settings.visuals, showDependencyLines: v })}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}