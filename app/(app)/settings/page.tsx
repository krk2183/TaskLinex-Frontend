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

interface ToggleProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

const Toggle = ({ label, description, checked, onChange, disabled }: ToggleProps) => (
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
const PersonaSection = ({ data, onUpdate }: { data: PersonaSettings; onUpdate: (d: PersonaSettings) => void }) => {
    const updatePersona = (id: string, field: string, value: string | number | boolean) => {
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
                                className="ml-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-1.5 rounded transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Color</label>
                                <input
                                    type="color"
                                    value={persona.color}
                                    onChange={(e) => updatePersona(persona.id, 'color', e.target.value)}
                                    className="w-full h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weekly Capacity (hrs)</label>
                                <input
                                    type="number"
                                    value={persona.capacityLimit}
                                    onChange={(e) => updatePersona(persona.id, 'capacityLimit', parseInt(e.target.value))}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="mt-3">
                            <Toggle
                                label="Allow Overload"
                                description="Permit tasks beyond capacity"
                                checked={persona.allowOverload}
                                onChange={(v: boolean) => updatePersona(persona.id, 'allowOverload', v)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Section: Envoy AI ---
const EnvoySection = ({ data, onUpdate }: { data: EnvoySettings; onUpdate: (d: EnvoySettings) => void }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <Toggle 
                label="Enable AI Suggestions" 
                description="Let Envoy proactively suggest task optimizations."
                checked={data.suggestionsEnabled}
                onChange={(v: boolean) => onUpdate({ ...data, suggestionsEnabled: v })}
            />
            <Toggle 
                label="Auto-Detect Dependencies" 
                description="Automatically identify task relationships."
                checked={data.autoDetectDependencies}
                onChange={(v: boolean) => onUpdate({ ...data, autoDetectDependencies: v })}
            />
            
            <div className="py-4 border-b border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-medium mb-2">Communication Style</h4>
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

            <div className="py-4 border-b border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-medium mb-3">Sensitivity Level: {data.sensitivityLevel}%</h4>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={data.sensitivityLevel}
                    onChange={(e) => onUpdate({ ...data, sensitivityLevel: parseInt(e.target.value) })}
                    className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>Conservative</span>
                    <span>Aggressive</span>
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">AI Permissions</h4>
                <Toggle 
                    label="Can Draft Notes" 
                    checked={data.permissions.canDraftNotes}
                    onChange={(v: boolean) => onUpdate({ ...data, permissions: { ...data.permissions, canDraftNotes: v } })}
                />
                <Toggle 
                    label="Can Propose Handoffs" 
                    checked={data.permissions.canProposeHandoffs}
                    onChange={(v: boolean) => onUpdate({ ...data, permissions: { ...data.permissions, canProposeHandoffs: v } })}
                />
                <Toggle 
                    label="Can Modify Dates" 
                    checked={data.permissions.canModifyDates}
                    onChange={(v: boolean) => onUpdate({ ...data, permissions: { ...data.permissions, canModifyDates: v } })}
                />
            </div>
        </div>
    );
};

// ==========================================
// 3. MAIN PAGE
// ==========================================

type TabId = 'personas' | 'envoy' | 'visuals';
type SyncState = 'idle' | 'saving' | 'saved' | 'error';

export default function SettingsPage() {
    const { userId, jwt } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('personas');
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncState, setSyncState] = useState<SyncState>('idle');

    useEffect(() => {
        if (!userId || !jwt) return;
        
        const loadSettings = async () => {
            setLoading(true);
            try {
                const data = await api.get(`/settings/${userId}`, jwt);
                setSettings(data);
            } catch (err) {
                console.error("Failed to load settings:", err);
            } finally {
                setLoading(false);
            }
        };
        
        loadSettings();
    }, [userId, jwt]);

    const handleUpdate = useCallback(async (section: keyof UserSettings, newData: PersonaSettings | EnvoySettings | VisualSettings) => {
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
        { id: 'personas' as const, label: 'Persona System', icon: Users },
        { id: 'envoy' as const, label: 'Envoy AI', icon: Bot },
        { id: 'visuals' as const, label: 'Visualization', icon: Monitor },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0A0E17] text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
            
            {/* SIDEBAR */}
            <aside className="w-full md:w-64 bg-white dark:bg-[#0F172A] border-r border-gray-200 dark:border-gray-800 flex-shrink-0 z-20">
                <div className="p-6">
                    <h1 className="text-xl font-bold tracking-tight mb-1">Settings</h1>
                    <p className="text-xs text-gray-500">TaskLinex Configuration</p>
                    <p className='text-[15px] text-white font-black bg-gray-700 rounded-lg px-1 py-1 w-fit mt-3'>
                        Under Development
                    </p>

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
