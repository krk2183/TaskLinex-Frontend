"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    User, Shield, Users, Bot, Bell, Layout, Beaker,
    Save, CheckCircle, AlertCircle, Plus, Trash2,
    Activity, Lock, RefreshCw, Smartphone, Monitor,
    Globe, Mail, Clock, Zap, Database, Eye, EyeOff,
    LogOut, UserX, Download, Upload, Palette, Code, Sparkles
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
    username: string;
    accountType: 'Individual' | 'Team' | 'Enterprise';
    language: string;
    timezone: string;
    companyName?: string;
}

// --- Security ---
interface SecuritySettings {
    twoFactorEnabled: boolean;
    sessionTimeout: number; // minutes
    loginNotifications: boolean;
    trustedDevices: Array<{
        id: string;
        name: string;
        lastUsed: string;
        location: string;
    }>;
}

// --- Notifications ---
interface NotificationSettings {
    email: {
        taskAssigned: boolean;
        taskCompleted: boolean;
        deadlineReminder: boolean;
        weeklyDigest: boolean;
    };
    push: {
        taskAssigned: boolean;
        taskCompleted: boolean;
        deadlineReminder: boolean;
        mentionInComment: boolean;
    };
    inApp: {
        taskUpdates: boolean;
        dependencyChanges: boolean;
        teamActivity: boolean;
        aiSuggestions: boolean;
    };
    digestFrequency: 'daily' | 'weekly' | 'never';
    quietHours: {
        enabled: boolean;
        start: string; // HH:MM format
        end: string; // HH:MM format
    };
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
    preferredEngine: 'Envoy Mega' | 'Envoy Pulse' | 'Envoy Nano';
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
    uiDensity: 'Compact' | 'Comfortable' | 'Spacious';
    theme: 'light' | 'dark' | 'auto';
    accentColor: string;
}

// --- Experimental ---
interface ExperimentalSettings {
    enableJQL: boolean;
    usegpuAcceleration: boolean;
    betaFeatures: {
        advancedAnalytics: boolean;
        aiTaskDecomposition: boolean;
        realTimeCollaboration: boolean;
        voiceCommands: boolean;
    };
}

// --- Root Settings Object ---
interface UserSettings {
    account: AccountSettings;
    security: SecuritySettings;
    notifications: NotificationSettings;
    personas: PersonaSettings;
    envoy: EnvoySettings;
    visuals: VisualSettings;
    experimental: ExperimentalSettings;
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
    <div className={`flex items-start justify-between py-4 border-b border-slate-100 dark:border-slate-800 last:border-0 ${disabled ? 'opacity-50' : ''}`}>
    <div className="pr-8">
    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</h4>
    {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
    </div>
    <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
    </div>
);
// 3. SECTION COMPONENTS
// ==========================================

// --- Section: Account ---
const AccountSection = ({
    data,
    onUpdate,
    userId,
    jwt
}: {
    data: AccountSettings;
    onUpdate: (d: AccountSettings) => void;
    userId: string;
    jwt: string;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localData, setLocalData] = useState(data);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.post(`/users/${userId}/profile`, localData, jwt);
            onUpdate(localData);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to save account settings:', error);
            alert('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            alert('Please type DELETE to confirm');
            return;
        }

        try {
            await api.post('/deleteAccount', { userId }, jwt);
            // Redirect to logout or login page
            window.location.href = '/login';
        } catch (error) {
            console.error('Failed to delete account:', error);
            alert('Failed to delete account. Please contact support.');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Profile Information */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
        <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Profile Information</h3>
        <p className="text-sm text-slate-500 mt-1">Manage your account details and preferences</p>
        </div>
        {!isEditing && (
            <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
            Edit Profile
            </button>
        )}
        </div>

        <div className="space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <img
        src={localData.avatarUrl || 'https://via.placeholder.com/80'}
        alt="Avatar"
        className="w-20 h-20 rounded-full border-2 border-slate-200 dark:border-slate-700"
        />
        {isEditing && (
            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Change Avatar
            </button>
        )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Display Name</label>
        <input
        type="text"
        value={localData.displayName}
        onChange={(e) => setLocalData({ ...localData, displayName: e.target.value })}
        disabled={!isEditing}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
        />
        </div>
        <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Username</label>
        <input
        type="text"
        value={localData.username}
        onChange={(e) => setLocalData({ ...localData, username: e.target.value })}
        disabled={!isEditing}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
        />
        </div>
        <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
        <input
        type="email"
        value={localData.email}
        disabled
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm opacity-50"
        />
        </div>
        <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Type</label>
        <select
        value={localData.accountType}
        onChange={(e) => setLocalData({ ...localData, accountType: e.target.value as any })}
        disabled={!isEditing}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
        >
        <option value="Individual">Individual</option>
        <option value="Team">Team</option>
        <option value="Enterprise">Enterprise</option>
        </select>
        </div>
        </div>

        {isEditing && (
            <div className="flex items-center gap-3 pt-4">
            <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
            >
            {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
            onClick={() => {
                setIsEditing(false);
                setLocalData(data);
            }}
            className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
            >
            Cancel
            </button>
            </div>
        )}
        </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl p-6">
        <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200 mb-2">Danger Zone</h3>
        <p className="text-sm text-rose-700 dark:text-rose-300 mb-4">
        Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        {!showDeleteConfirm ? (
            <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
            >
            Delete Account
            </button>
        ) : (
            <div className="space-y-3">
            <input
            type="text"
            placeholder="Type DELETE to confirm"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
            <div className="flex gap-3">
            <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirmText !== 'DELETE'}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium disabled:opacity-50"
            >
            Confirm Delete
            </button>
            <button
            onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText('');
            }}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
            >
            Cancel
            </button>
            </div>
            </div>
        )}
        </div>
        </div>
    );
};

// --- Section: Security ---
const SecuritySection = ({
    data,
    onUpdate,
    userId,
    jwt
}: {
    data: SecuritySettings;
    onUpdate: (d: SecuritySettings) => void;
    userId: string;
    jwt: string;
}) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Two-Factor Authentication */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Authentication</h3>
        <Toggle
        label="Two-Factor Authentication"
        description="Add an extra layer of security to your account"
        checked={data.twoFactorEnabled}
        onChange={(v) => onUpdate({ ...data, twoFactorEnabled: v })}
        />
        <Toggle
        label="Login Notifications"
        description="Get notified when someone logs into your account"
        checked={data.loginNotifications}
        onChange={(v) => onUpdate({ ...data, loginNotifications: v })}
        />
        </div>

        {/* Session Management */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Session Management</h3>
        <div className="space-y-4">
        <div>
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
        Session Timeout (minutes)
        </label>
        <input
        type="number"
        value={data.sessionTimeout}
        onChange={(e) => onUpdate({ ...data, sessionTimeout: parseInt(e.target.value) })}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        </div>
        </div>
        </div>

        {/* Trusted Devices */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Trusted Devices</h3>
        <div className="space-y-3">
        {data.trustedDevices.map((device) => (
            <div key={device.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-slate-400" />
            <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{device.name}</p>
            <p className="text-xs text-slate-500">
            {device.location} • Last used {device.lastUsed}
            </p>
            </div>
            </div>
            <button className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-2 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
            </button>
            </div>
        ))}
        </div>
        </div>
        </div>
    );
};

// --- Section: Notifications ---
const NotificationSection = ({ data, onUpdate }: { data: NotificationSettings; onUpdate: (d: NotificationSettings) => void }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Email Notifications */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
        <Mail className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Email Notifications</h3>
        </div>
        <div className="space-y-2">
        <Toggle
        label="Task Assigned"
        description="When a task is assigned to you"
        checked={data.email.taskAssigned}
        onChange={(v) => onUpdate({ ...data, email: { ...data.email, taskAssigned: v } })}
        />
        <Toggle
        label="Task Completed"
        description="When a task you're watching is completed"
        checked={data.email.taskCompleted}
        onChange={(v) => onUpdate({ ...data, email: { ...data.email, taskCompleted: v } })}
        />
        <Toggle
        label="Deadline Reminder"
        description="Get reminded about upcoming deadlines"
        checked={data.email.deadlineReminder}
        onChange={(v) => onUpdate({ ...data, email: { ...data.email, deadlineReminder: v } })}
        />
        <Toggle
        label="Weekly Digest"
        description="Summary of your tasks and activity"
        checked={data.email.weeklyDigest}
        onChange={(v) => onUpdate({ ...data, email: { ...data.email, weeklyDigest: v } })}
        />
        </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
        <Bell className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Push Notifications</h3>
        </div>
        <div className="space-y-2">
        <Toggle
        label="Task Assigned"
        checked={data.push.taskAssigned}
        onChange={(v) => onUpdate({ ...data, push: { ...data.push, taskAssigned: v } })}
        />
        <Toggle
        label="Task Completed"
        checked={data.push.taskCompleted}
        onChange={(v) => onUpdate({ ...data, push: { ...data.push, taskCompleted: v } })}
        />
        <Toggle
        label="Deadline Reminder"
        checked={data.push.deadlineReminder}
        onChange={(v) => onUpdate({ ...data, push: { ...data.push, deadlineReminder: v } })}
        />
        <Toggle
        label="Mention in Comment"
        checked={data.push.mentionInComment}
        onChange={(v) => onUpdate({ ...data, push: { ...data.push, mentionInComment: v } })}
        />
        </div>
        </div>

        {/* In-App Notifications */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
        <Activity className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">In-App Notifications</h3>
        </div>
        <div className="space-y-2">
        <Toggle
        label="Task Updates"
        checked={data.inApp.taskUpdates}
        onChange={(v) => onUpdate({ ...data, inApp: { ...data.inApp, taskUpdates: v } })}
        />
        <Toggle
        label="Dependency Changes"
        checked={data.inApp.dependencyChanges}
        onChange={(v) => onUpdate({ ...data, inApp: { ...data.inApp, dependencyChanges: v } })}
        />
        <Toggle
        label="Team Activity"
        checked={data.inApp.teamActivity}
        onChange={(v) => onUpdate({ ...data, inApp: { ...data.inApp, teamActivity: v } })}
        />
        <Toggle
        label="AI Suggestions"
        checked={data.inApp.aiSuggestions}
        onChange={(v) => onUpdate({ ...data, inApp: { ...data.inApp, aiSuggestions: v } })}
        />
        </div>
        </div>

        {/* Quiet Hours */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
        <Clock className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Quiet Hours</h3>
        </div>
        <Toggle
        label="Enable Quiet Hours"
        description="Pause non-urgent notifications during specific times"
        checked={data.quietHours.enabled}
        onChange={(v) => onUpdate({ ...data, quietHours: { ...data.quietHours, enabled: v } })}
        />
        {data.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Start Time</label>
            <input
            type="time"
            value={data.quietHours.start}
            onChange={(e) => onUpdate({ ...data, quietHours: { ...data.quietHours, start: e.target.value } })}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            </div>
            <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">End Time</label>
            <input
            type="time"
            value={data.quietHours.end}
            onChange={(e) => onUpdate({ ...data, quietHours: { ...data.quietHours, end: e.target.value } })}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            </div>
            </div>
        )}
        </div>

        {/* Digest Frequency */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Digest Frequency</h3>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        {(['daily', 'weekly', 'never'] as const).map((freq) => (
            <button
            key={freq}
            onClick={() => onUpdate({ ...data, digestFrequency: freq })}
            className={`px-4 py-2 text-sm rounded-md transition-all capitalize ${
                data.digestFrequency === freq
                ? 'bg-white dark:bg-slate-700 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
            >
            {freq}
            </button>
        ))}
        </div>
        </div>
        </div>
    );
};

// --- Section: Personas (REDESIGNED TO MATCH ROADMAP) ---
const PersonaSection = ({
    data,
    onUpdate,
    userId,
    jwt
}: {
    data: PersonaSettings;
    onUpdate: (d: PersonaSettings) => void;
    userId: string;
    jwt: string;
}) => {
    const updatePersona = (id: string, field: string, value: string | number | boolean) => {
        const updatedPersonas = data.activePersonas.map(p => p.id === id ? { ...p, [field]: value } : p);
        onUpdate({ ...data, activePersonas: updatedPersonas });
    };

    const addPersona = async () => {
        try {
            const response = await api.post('/createPersona', {
                name: 'New Persona',
                weekly_capacity_hours: 40,
                user_id: userId
            }, jwt);

            const newPersona: PersonaDefinition = {
                id: response.id,
                name: response.name,
                role: response.role || 'Member',
                color: response.color || '#6366f1',
                capacityLimit: response.weekly_capacity_hours,
                allowOverload: response.allow_overload || false
            };

            onUpdate({ ...data, activePersonas: [...data.activePersonas, newPersona] });
        } catch (error) {
            console.error('Failed to create persona:', error);
            alert('Failed to create persona');
        }
    };

    const removePersona = async (id: string) => {
        if (!confirm('Are you sure you want to delete this persona?')) return;

        try {
            await api.post('/deletePersona', { id }, jwt);
            onUpdate({ ...data, activePersonas: data.activePersonas.filter(p => p.id !== id) });
        } catch (error) {
            console.error('Failed to delete persona:', error);
            alert('Failed to delete persona');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-900 rounded-xl p-6">
        <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
        <div className="p-3 bg-indigo-600 rounded-lg">
        <Users className="w-6 h-6 text-white" />
        </div>
        <div>
        <h4 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">Persona System</h4>
        <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1 max-w-xl">
        Create virtual identities representing different work modes or team roles. Perfect for managing multiple responsibilities.
        </p>
        </div>
        </div>
        <button
        onClick={addPersona}
        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all hover:scale-105 shadow-sm"
        >
        <Plus className="w-4 h-4" />
        Add Persona
        </button>
        </div>
        </div>

        {/* Virtual Teammates Toggle */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <Toggle
        label="Enable Virtual Teammates"
        description="Allow AI-powered personas to help manage your workload"
        checked={data.enableVirtualTeammates}
        onChange={(v) => onUpdate({ ...data, enableVirtualTeammates: v })}
        />
        </div>

        {/* Personas Grid */}
        <div className="grid grid-cols-1 gap-4">
        {data.activePersonas.length === 0 ? (
            <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">No personas yet. Create your first one!</p>
            <button
            onClick={addPersona}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
            Create Persona
            </button>
            </div>
        ) : (
            data.activePersonas.map((persona) => (
                <div
                key={persona.id}
                className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                {/* Persona Header */}
                <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: persona.color }}
                >
                {persona.name.charAt(0).toUpperCase()}
                </div>
                <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{persona.name}</h4>
                <p className="text-sm text-slate-500">{persona.role}</p>
                </div>
                </div>
                <button
                onClick={() => removePersona(persona.id)}
                className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-2 rounded-lg transition-colors"
                >
                <Trash2 className="w-4 h-4" />
                </button>
                </div>

                {/* Persona Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Name</label>
                <input
                type="text"
                value={persona.name}
                onChange={(e) => updatePersona(persona.id, 'name', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                </div>
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role</label>
                <select
                value={persona.role}
                onChange={(e) => updatePersona(persona.id, 'role', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                <option>Lead</option>
                <option>Member</option>
                <option>Contributor</option>
                <option>Reviewer</option>
                </select>
                </div>
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Color</label>
                <div className="flex items-center gap-3">
                <input
                type="color"
                value={persona.color}
                onChange={(e) => updatePersona(persona.id, 'color', e.target.value)}
                className="w-16 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                />
                <span className="text-sm text-slate-500">{persona.color}</span>
                </div>
                </div>
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Weekly Capacity (hrs)</label>
                <input
                type="number"
                value={persona.capacityLimit}
                onChange={(e) => updatePersona(persona.id, 'capacityLimit', parseInt(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                </div>
                </div>

                {/* Allow Overload Toggle */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Toggle
                label="Allow Overload"
                description="Permit tasks beyond capacity limit"
                checked={persona.allowOverload}
                onChange={(v: boolean) => updatePersona(persona.id, 'allowOverload', v)}
                />
                </div>
                </div>
            ))
        )}
        </div>
        </div>
    );
};

// --- Section: Envoy AI (FIXED ERROR) ---
const EnvoySection = ({ data, onUpdate }: { data: EnvoySettings; onUpdate: (d: EnvoySettings) => void }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border border-violet-200 dark:border-violet-900 rounded-xl p-6">
        <div className="flex items-start gap-4">
        <div className="p-3 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg">
        <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
        <h4 className="text-lg font-bold text-violet-900 dark:text-violet-100">Envoy AI Assistant</h4>
        <p className="text-sm text-violet-700 dark:text-violet-300 mt-1">
        Configure how Envoy helps you manage tasks, detect dependencies, and optimize workflows.
        </p>
        </div>
        </div>
        </div>

        {/* AI Suggestions */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">AI Capabilities</h3>
        <div className="space-y-2">
        <Toggle
        label="Enable AI Suggestions"
        description="Let Envoy proactively suggest task optimizations and improvements"
        checked={data.suggestionsEnabled}
        onChange={(v: boolean) => onUpdate({ ...data, suggestionsEnabled: v })}
        />
        <Toggle
        label="Auto-Detect Dependencies"
        description="Automatically identify and suggest task relationships"
        checked={data.autoDetectDependencies}
        onChange={(v: boolean) => onUpdate({ ...data, autoDetectDependencies: v })}
        />
        </div>
        </div>

        {/* AI Engine Selection */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">AI Engine</h3>
        <div className="space-y-3">
        {(['Envoy Mega', 'Envoy Pulse', 'Envoy Nano'] as const).map((engine) => (
            <label
            key={engine}
            className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border-2 ${
                data.preferredEngine === engine
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            >
            <input
            type="radio"
            name="aiEngine"
            checked={data.preferredEngine === engine}
            onChange={() => onUpdate({ ...data, preferredEngine: engine })}
            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{engine}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {engine === 'Envoy Mega' && 'Most powerful, best for complex analysis (Gemini)'}
            {engine === 'Envoy Pulse' && 'Balanced speed and intelligence (Local ASUS)'}
            {engine === 'Envoy Nano' && 'Fast responses, ideal for quick tasks (Mini)'}
            </div>
            </div>
            </label>
        ))}
        </div>
        </div>

        {/* Communication Style */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Communication Style</h3>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        {(['Concise', 'Elaborate'] as const).map((style) => (
            <button
            key={style}
            onClick={() => onUpdate({ ...data, communicationStyle: style })}
            className={`px-6 py-2.5 text-sm rounded-lg transition-all font-medium ${
                data.communicationStyle === style
                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
            >
            {style}
            </button>
        ))}
        </div>
        </div>

        {/* Intervention Sensitivity */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Intervention Sensitivity</h3>
        <p className="text-sm text-slate-500 mb-4">Control how often Envoy makes suggestions</p>
        <div className="space-y-4">
        <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-indigo-600">{data.sensitivityLevel}%</span>
        <span className="text-xs text-slate-500">
        {data.sensitivityLevel < 33 ? 'Conservative' : data.sensitivityLevel < 66 ? 'Balanced' : 'Aggressive'}
        </span>
        </div>
        <input
        type="range"
        min="0"
        max="100"
        value={data.sensitivityLevel}
        onChange={(e) => onUpdate({ ...data, sensitivityLevel: parseInt(e.target.value) })}
        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-slate-500">
        <span>Fewer suggestions</span>
        <span>More interventions</span>
        </div>
        </div>
        </div>

        {/* AI Permissions */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">AI Permissions</h3>
        <div className="space-y-2">
        <Toggle
        label="Can Draft Notes"
        description="Allow Envoy to create draft notes and summaries"
        checked={data.permissions.canDraftNotes}
        onChange={(v: boolean) => onUpdate({ ...data, permissions: { ...data.permissions, canDraftNotes: v } })}
        />
        <Toggle
        label="Can Propose Handoffs"
        description="Let Envoy suggest task reassignments"
        checked={data.permissions.canProposeHandoffs}
        onChange={(v: boolean) => onUpdate({ ...data, permissions: { ...data.permissions, canProposeHandoffs: v } })}
        />
        <Toggle
        label="Can Modify Dates"
        description="Allow Envoy to adjust task timelines"
        checked={data.permissions.canModifyDates}
        onChange={(v: boolean) => onUpdate({ ...data, permissions: { ...data.permissions, canModifyDates: v } })}
        />
        </div>
        </div>
        </div>
    );
};

// --- Section: Visuals (FIXED) ---
const VisualSection = ({ data, onUpdate }: { data: VisualSettings; onUpdate: (d: VisualSettings) => void }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Theme */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
        <Palette className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Appearance</h3>
        </div>

        <div className="space-y-6">
        <div>
        <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Theme</label>
        <div className="grid grid-cols-3 gap-3">
        {(['light', 'dark', 'auto'] as const).map((theme) => (
            <button
            key={theme}
            onClick={() => onUpdate({ ...data, theme })}
            className={`p-4 rounded-lg border-2 transition-all capitalize font-medium ${
                data.theme === theme
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
            }`}
            >
            {theme}
            </button>
        ))}
        </div>
        </div>

        <div>
        <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Accent Color</label>
        <div className="flex items-center gap-3">
        <input
        type="color"
        value={data.accentColor}
        onChange={(e) => onUpdate({ ...data, accentColor: e.target.value })}
        className="w-20 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
        />
        <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{data.accentColor}</p>
        <p className="text-xs text-slate-500">Click to change</p>
        </div>
        </div>
        </div>
        </div>
        </div>

        {/* Timeline & Layout */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
        <Layout className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Timeline & Layout</h3>
        </div>

        <div className="space-y-6">
        <div>
        <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Default Timeline Scale</label>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        {(['Week', 'Month', 'Quarter'] as const).map((scale) => (
            <button
            key={scale}
            onClick={() => onUpdate({ ...data, defaultTimelineScale: scale })}
            className={`px-4 py-2.5 text-sm rounded-lg transition-all font-medium ${
                data.defaultTimelineScale === scale
                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
            >
            {scale}
            </button>
        ))}
        </div>
        </div>

        <div>
        <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">UI Density</label>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        {(['Compact', 'Comfortable', 'Spacious'] as const).map((density) => (
            <button
            key={density}
            onClick={() => onUpdate({ ...data, uiDensity: density })}
            className={`px-4 py-2.5 text-sm rounded-lg transition-all font-medium ${
                data.uiDensity === density
                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
            >
            {density}
            </button>
        ))}
        </div>
        </div>
        </div>
        </div>

        {/* Visual Features */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Visual Features</h3>
        <div className="space-y-2">
        <Toggle
        label="Show Ghost Bars"
        description="Visualize planned duration vs actual to identify slippage"
        checked={data.showGhostBars}
        onChange={(v: boolean) => onUpdate({ ...data, showGhostBars: v })}
        />
        <Toggle
        label="Show Dependency Lines"
        description="Draw lines between related tasks on the timeline"
        checked={data.showDependencyLines}
        onChange={(v: boolean) => onUpdate({ ...data, showDependencyLines: v })}
        />
        </div>
        </div>
        </div>
    );
};

// --- Section: Experimental ---
const ExperimentalSection = ({ data, onUpdate }: { data: ExperimentalSettings; onUpdate: (d: ExperimentalSettings) => void }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Warning Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-6">
        <div className="flex items-start gap-3">
        <Beaker className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Experimental Features</h4>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
        These features are in development and may be unstable. Use at your own risk.
        </p>
        </div>
        </div>
        </div>

        {/* Core Experimental Features */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Advanced Features</h3>
        <div className="space-y-2">
        <Toggle
        label="Enable JQL (TaskLinex Query Language)"
        description="Use advanced queries to filter and search tasks"
        checked={data.enableJQL}
        onChange={(v) => onUpdate({ ...data, enableJQL: v })}
        />
        <Toggle
        label="GPU Acceleration"
        description="Use GPU for faster rendering of large timelines"
        checked={data.usegpuAcceleration}
        onChange={(v) => onUpdate({ ...data, usegpuAcceleration: v })}
        />
        </div>
        </div>

        {/* Beta Features */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Beta Features</h3>
        <div className="space-y-2">
        <Toggle
        label="Advanced Analytics"
        description="Detailed insights and performance metrics"
        checked={data.betaFeatures.advancedAnalytics}
        onChange={(v) => onUpdate({ ...data, betaFeatures: { ...data.betaFeatures, advancedAnalytics: v } })}
        />
        <Toggle
        label="AI Task Decomposition"
        description="Let AI break down complex tasks automatically"
        checked={data.betaFeatures.aiTaskDecomposition}
        onChange={(v) => onUpdate({ ...data, betaFeatures: { ...data.betaFeatures, aiTaskDecomposition: v } })}
        />
        <Toggle
        label="Real-Time Collaboration"
        description="See team changes as they happen"
        checked={data.betaFeatures.realTimeCollaboration}
        onChange={(v) => onUpdate({ ...data, betaFeatures: { ...data.betaFeatures, realTimeCollaboration: v } })}
        />
        <Toggle
        label="Voice Commands"
        description="Control TaskLinex with your voice"
        checked={data.betaFeatures.voiceCommands}
        onChange={(v) => onUpdate({ ...data, betaFeatures: { ...data.betaFeatures, voiceCommands: v } })}
        />
        </div>
        </div>
        </div>
    );
};

// ==========================================
// 4. MAIN SETTINGS COMPONENT
// ==========================================


export default function Settings() {
    const { user, jwt } = useAuth();
    const userId = user?.id;

    const [activeTab, setActiveTab] = useState<'account' | 'security' | 'notifications' | 'personas' | 'envoy' | 'visuals' | 'experimental'>('account');
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncState, setSyncState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        if (!userId || !jwt) return;

        const loadSettings = async () => {
            try {
                const response = await api.get(`/settings/${userId}`, jwt);
                const data = response.data || {};

                // Initialize with defaults if missing
                const defaultSettings: UserSettings = {
                    account: {
                        displayName: data.account?.displayName || '',
                        email: data.account?.email || '',
                        avatarUrl: data.account?.avatarUrl || '',
                        username: data.account?.username || '',
                        accountType: data.account?.accountType || 'Individual',
                        language: data.account?.language || 'en',
                        timezone: data.account?.timezone || 'UTC',
                        companyName: data.account?.companyName
                    },
                    security: {
                        twoFactorEnabled: data.security?.twoFactorEnabled || false,
                        sessionTimeout: data.security?.sessionTimeout || 30,
                        loginNotifications: data.security?.loginNotifications || true,
                        trustedDevices: data.security?.trustedDevices || []
                    },
                    notifications: {
                        email: {
                            taskAssigned: data.notifications?.email?.taskAssigned ?? true,
                            taskCompleted: data.notifications?.email?.taskCompleted ?? true,
                            deadlineReminder: data.notifications?.email?.deadlineReminder ?? true,
                            weeklyDigest: data.notifications?.email?.weeklyDigest ?? true
                        },
                        push: {
                            taskAssigned: data.notifications?.push?.taskAssigned ?? true,
                            taskCompleted: data.notifications?.push?.taskCompleted ?? true,
                            deadlineReminder: data.notifications?.push?.deadlineReminder ?? true,
                            mentionInComment: data.notifications?.push?.mentionInComment ?? true
                        },
                        inApp: {
                            taskUpdates: data.notifications?.inApp?.taskUpdates ?? true,
                            dependencyChanges: data.notifications?.inApp?.dependencyChanges ?? true,
                            teamActivity: data.notifications?.inApp?.teamActivity ?? true,
                            aiSuggestions: data.notifications?.inApp?.aiSuggestions ?? true
                        },
                        digestFrequency: data.notifications?.digestFrequency || 'weekly',
                        quietHours: {
                            enabled: data.notifications?.quietHours?.enabled ?? false,
                            start: data.notifications?.quietHours?.start || '22:00',
                            end: data.notifications?.quietHours?.end || '08:00'
                        }
                    },
                    personas: data.personas || { activePersonas: [], enableVirtualTeammates: true },
                    envoy: {
                        suggestionsEnabled: data.envoy?.suggestionsEnabled ?? true,
                        autoDetectDependencies: data.envoy?.autoDetectDependencies ?? true,
                        communicationStyle: data.envoy?.communicationStyle || 'Concise',
                        sensitivityLevel: data.envoy?.sensitivityLevel ?? 70,
                        preferredEngine: data.envoy?.preferredEngine || 'Envoy Mega',
                        permissions: {
                            canDraftNotes: data.envoy?.permissions?.canDraftNotes ?? true,
                            canProposeHandoffs: data.envoy?.permissions?.canProposeHandoffs ?? true,
                            canModifyDates: data.envoy?.permissions?.canModifyDates ?? false
                        }
                    },
                    visuals: {
                        defaultTimelineScale: data.visuals?.defaultTimelineScale || 'Week',
                            showGhostBars: data.visuals?.showGhostBars ?? true,
                            showDependencyLines: data.visuals?.showDependencyLines ?? true,
                            uiDensity: data.visuals?.uiDensity || 'Comfortable',
                            theme: data.visuals?.theme || 'auto',
                            accentColor: data.visuals?.accentColor || '#6366f1'
                    },
                    experimental: {
                        enableJQL: data.experimental?.enableJQL || false,
                        usegpuAcceleration: data.experimental?.usegpuAcceleration ?? true,
                        betaFeatures: {
                            advancedAnalytics: data.experimental?.betaFeatures?.advancedAnalytics || false,
                            aiTaskDecomposition: data.experimental?.betaFeatures?.aiTaskDecomposition || false,
                            realTimeCollaboration: data.experimental?.betaFeatures?.realTimeCollaboration || false,
                            voiceCommands: data.experimental?.betaFeatures?.voiceCommands || false
                        }
                    }
                };

                setSettings(defaultSettings);
            } catch (err) {
                console.error("Failed to load settings:", err);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [userId, jwt]);

    const handleUpdate = useCallback(async (
        section: keyof UserSettings,
        newData: AccountSettings | SecuritySettings | NotificationSettings | PersonaSettings | EnvoySettings | VisualSettings | ExperimentalSettings
    ) => {
        if (!settings || !userId || !jwt) return;

        const previousData = settings[section];

        // Optimistic update
        setSettings(prev => prev ? ({ ...prev, [section]: newData }) : null);
        setSyncState('saving');

        try {
            // Save to backend
            await api.post(`/settings/${userId}/${section}`, newData, jwt);

            setSyncState('saved');
            setTimeout(() => setSyncState('idle'), 2000);
        } catch (err) {
            console.error("Failed to save settings:", err);
            // Revert on error
            setSettings(prev => prev ? ({ ...prev, [section]: previousData }) : null);
            setSyncState('error');
            setTimeout(() => setSyncState('idle'), 3000);
        }
    }, [settings, userId, jwt]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0A0E17]">
        <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Loading settings...</p>
        </div>
        </div>
    );

    if (!settings) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0A0E17]">
        <div className="text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Failed to load settings</p>
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
        { id: 'account' as const, label: 'Account', icon: User },
        { id: 'security' as const, label: 'Security', icon: Shield },
        { id: 'notifications' as const, label: 'Notifications', icon: Bell },
        { id: 'personas' as const, label: 'Personas', icon: Users },
        { id: 'envoy' as const, label: 'Envoy AI', icon: Bot },
        { id: 'visuals' as const, label: 'Visuals', icon: Monitor },
        { id: 'experimental' as const, label: 'Experimental', icon: Beaker },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0A0E17] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
        {/* SIDEBAR */}
        <aside className="w-full md:w-64 bg-white dark:bg-[#0F172A] border-r border-slate-200 dark:border-slate-800 flex-shrink-0 z-20">
        <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight mb-1">Settings</h1>
        <p className="text-xs text-slate-500">TaskLinex Configuration</p>
        </div>

        <nav className="px-3 space-y-1 pb-6">
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
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
                >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                {tab.label}
                </button>
            );
        })}
        </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-6 md:px-12">
        <div className="flex justify-between items-center mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-2xl font-bold">
        {tabs.find(t => t.id === activeTab)?.label}
        </h2>
        <div className="flex items-center gap-2 text-xs font-medium">
        {syncState === 'saving' && (
            <span className="text-slate-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
            </span>
        )}
        {syncState === 'saved' && (
            <span className="text-emerald-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Saved
            </span>
        )}
        {syncState === 'error' && (
            <span className="text-rose-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Failed to save
            </span>
        )}
        </div>
        </div>

        {/* Dynamic Content */}
        <div className="min-h-[400px]">
        {activeTab === 'account' && (
            <AccountSection
            data={settings.account}
            onUpdate={(d) => handleUpdate('account', d)}
            userId={userId!}
            jwt={jwt!}
            />
        )}
        {activeTab === 'security' && (
            <SecuritySection
            data={settings.security}
            onUpdate={(d) => handleUpdate('security', d)}
            userId={userId!}
            jwt={jwt!}
            />
        )}
        {activeTab === 'notifications' && (
            <NotificationSection
            data={settings.notifications}
            onUpdate={(d) => handleUpdate('notifications', d)}
            />
        )}
        {activeTab === 'personas' && (
            <PersonaSection
            data={settings.personas}
            onUpdate={(d) => handleUpdate('personas', d)}
            userId={userId!}
            jwt={jwt!}
            />
        )}
        {activeTab === 'envoy' && (
            <EnvoySection
            data={settings.envoy}
            onUpdate={(d) => handleUpdate('envoy', d)}
            />
        )}
        {activeTab === 'visuals' && (
            <VisualSection
            data={settings.visuals}
            onUpdate={(d) => handleUpdate('visuals', d)}
            />
        )}
        {activeTab === 'experimental' && (
            <ExperimentalSection
            data={settings.experimental}
            onUpdate={(d) => handleUpdate('experimental', d)}
            />
        )}
        </div>
        </div>
        </main>
        </div>
    );
}
