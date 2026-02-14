"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    User, Shield, Users, Bot, Bell, Layout, Beaker,
    Save, CheckCircle, AlertCircle, Plus, Trash2,
    Activity, Lock, RefreshCw, Smartphone, Monitor,
    Globe, Mail, Clock, Zap, Database, Eye, EyeOff,
    LogOut, UserX, Download, Upload, Palette, Code
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
    <div className={`flex items-start justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 ${disabled ? 'opacity-50' : ''}`}>
    <div className="pr-8">
    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</h4>
    {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
    <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
    </div>
);

// ==========================================
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
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Profile Information */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
        <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Profile Information</h3>
        <p className="text-sm text-gray-500 mt-1">Update your personal details</p>
        </div>
        {!isEditing ? (
            <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
            Edit Profile
            </button>
        ) : (
            <div className="flex gap-2">
            <button
            onClick={() => {
                setLocalData(data);
                setIsEditing(false);
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
            Cancel
            </button>
            <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            </div>
        )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Display Name</label>
        <input
        type="text"
        value={isEditing ? localData.displayName : data.displayName}
        onChange={(e) => setLocalData({ ...localData, displayName: e.target.value })}
        disabled={!isEditing}
        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
        />
        </div>

        <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Username</label>
        <input
        type="text"
        value={isEditing ? localData.username : data.username}
        onChange={(e) => setLocalData({ ...localData, username: e.target.value })}
        disabled={!isEditing}
        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
        />
        </div>

        <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
        <input
        type="email"
        value={isEditing ? localData.email : data.email}
        onChange={(e) => setLocalData({ ...localData, email: e.target.value })}
        disabled={!isEditing}
        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
        />
        </div>

        <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Timezone</label>
        <select
        value={isEditing ? localData.timezone : data.timezone}
        onChange={(e) => setLocalData({ ...localData, timezone: e.target.value })}
        disabled={!isEditing}
        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
        >
        <option value="UTC">UTC</option>
        <option value="America/New_York">Eastern Time</option>
        <option value="America/Chicago">Central Time</option>
        <option value="America/Denver">Mountain Time</option>
        <option value="America/Los_Angeles">Pacific Time</option>
        <option value="Europe/London">London</option>
        <option value="Europe/Paris">Paris</option>
        <option value="Asia/Tokyo">Tokyo</option>
        <option value="Asia/Shanghai">Shanghai</option>
        <option value="Australia/Sydney">Sydney</option>
        </select>
        </div>

        <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Language</label>
        <select
        value={isEditing ? localData.language : data.language}
        onChange={(e) => setLocalData({ ...localData, language: e.target.value })}
        disabled={!isEditing}
        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
        >
        <option value="en-US">English (US)</option>
        <option value="en-GB">English (UK)</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
        <option value="de">Deutsch</option>
        <option value="ja">日本語</option>
        <option value="zh">中文</option>
        </select>
        </div>

        {data.companyName && (
            <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Company</label>
            <input
            type="text"
            value={data.companyName}
            disabled
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2.5 text-sm outline-none opacity-50"
            />
            </div>
        )}
        </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-xl p-6">
        <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-2">Danger Zone</h3>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">
        Once you delete your account, there is no going back. All your data will be permanently deleted.
        </p>

        {!showDeleteConfirm ? (
            <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
            <UserX className="w-4 h-4" />
            Delete Account
            </button>
        ) : (
            <div className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-red-900 dark:text-red-200 mb-2">
            Type <span className="font-mono bg-red-200 dark:bg-red-900 px-2 py-1 rounded">DELETE</span> to confirm
            </label>
            <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-red-300 dark:border-red-700 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="Type DELETE"
            />
            </div>
            <div className="flex gap-2">
            <button
            onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText('');
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
            Cancel
            </button>
            <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirmText !== 'DELETE'}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
            Permanently Delete Account
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
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }

        setIsChangingPassword(true);
        try {
            await api.post(`/users/${userId}/change-password`, {
                currentPassword,
                newPassword
            }, jwt);
            alert('Password changed successfully');
            setShowPasswordChange(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Failed to change password:', error);
            alert('Failed to change password. Please check your current password.');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleLogoutAllDevices = async () => {
        if (!confirm('Are you sure you want to log out from all devices?')) return;

        try {
            await api.post('/auth/logout-all-sessions', { userId }, jwt);
            alert('Logged out from all devices successfully');
        } catch (error) {
            console.error('Failed to logout all devices:', error);
            alert('Failed to logout from all devices');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Password */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
        <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Password</h3>
        <p className="text-sm text-gray-500 mt-1">Change your account password</p>
        </div>
        <button
        onClick={() => setShowPasswordChange(!showPasswordChange)}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
        {showPasswordChange ? 'Cancel' : 'Change Password'}
        </button>
        </div>

        {showPasswordChange && (
            <div className="space-y-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Current Password</label>
            <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            </div>
            <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">New Password</label>
            <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            </div>
            <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Confirm New Password</label>
            <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            </div>
            <button
            onClick={handlePasswordChange}
            disabled={isChangingPassword}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
            {isChangingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {isChangingPassword ? 'Updating...' : 'Update Password'}
            </button>
            </div>
        )}
        </div>

        {/* Session Management */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Session Management</h3>

        <div className="space-y-4">
        <div className="py-4 border-b border-gray-100 dark:border-gray-800">
        <h4 className="text-sm font-medium mb-2">Session Timeout</h4>
        <select
        value={data.sessionTimeout}
        onChange={(e) => onUpdate({ ...data, sessionTimeout: parseInt(e.target.value) })}
        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
        <option value={15}>15 minutes</option>
        <option value={30}>30 minutes</option>
        <option value={60}>1 hour</option>
        <option value={120}>2 hours</option>
        <option value={480}>8 hours</option>
        <option value={1440}>24 hours</option>
        </select>
        </div>

        <Toggle
        label="Login Notifications"
        description="Get notified when someone logs into your account"
        checked={data.loginNotifications}
        onChange={(v) => onUpdate({ ...data, loginNotifications: v })}
        />

        <div className="pt-4">
        <button
        onClick={handleLogoutAllDevices}
        className="w-full px-4 py-2.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
        >
        <LogOut className="w-4 h-4" />
        Log Out All Devices
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">
        This will sign you out on all browsers and devices
        </p>
        </div>
        </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Two-Factor Authentication</h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 mb-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
        Two-factor authentication is currently under development and will be available soon.
        </p>
        </div>
        <Toggle
        label="Enable 2FA"
        description="Add an extra layer of security to your account"
        checked={data.twoFactorEnabled}
        onChange={(v) => onUpdate({ ...data, twoFactorEnabled: v })}
        disabled={true}
        />
        </div>
        </div>
    );
};

// --- Section: Notifications ---
const NotificationSection = ({ data, onUpdate }: { data: NotificationSettings; onUpdate: (d: NotificationSettings) => void }) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Email Notifications */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
        <Mail className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Email Notifications</h3>
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
        description="Reminders before task deadlines"
        checked={data.email.deadlineReminder}
        onChange={(v) => onUpdate({ ...data, email: { ...data.email, deadlineReminder: v } })}
        />
        <Toggle
        label="Weekly Digest"
        description="Summary of your weekly activity"
        checked={data.email.weeklyDigest}
        onChange={(v) => onUpdate({ ...data, email: { ...data.email, weeklyDigest: v } })}
        />
        </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
        <Smartphone className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Push Notifications</h3>
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
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
        <Bell className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">In-App Notifications</h3>
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
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Quiet Hours</h3>
        <Toggle
        label="Enable Quiet Hours"
        description="Pause notifications during specified hours"
        checked={data.quietHours.enabled}
        onChange={(v) => onUpdate({ ...data, quietHours: { ...data.quietHours, enabled: v } })}
        />

        {data.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Start Time</label>
            <input
            type="time"
            value={data.quietHours.start}
            onChange={(e) => onUpdate({ ...data, quietHours: { ...data.quietHours, start: e.target.value } })}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            </div>
            <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">End Time</label>
            <input
            type="time"
            value={data.quietHours.end}
            onChange={(e) => onUpdate({ ...data, quietHours: { ...data.quietHours, end: e.target.value } })}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            </div>
            </div>
        )}
        </div>

        {/* Digest Frequency */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Digest Frequency</h3>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {(['daily', 'weekly', 'never'] as const).map((freq) => (
            <button
            key={freq}
            onClick={() => onUpdate({ ...data, digestFrequency: freq })}
            className={`px-4 py-2 text-sm rounded-md transition-all capitalize ${
                data.digestFrequency === freq
                ? 'bg-white dark:bg-gray-700 shadow-sm font-bold'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
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

// --- Section: Personas ---
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

        <Toggle
        label="Enable Virtual Teammates"
        description="Allow AI-powered personas to help manage your workload"
        checked={data.enableVirtualTeammates}
        onChange={(v) => onUpdate({ ...data, enableVirtualTeammates: v })}
        />

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
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900">
        <div className="flex items-start gap-3">
        <Bot className="w-5 h-5 text-indigo-600 mt-0.5" />
        <div>
        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Envoy AI Assistant</h4>
        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
        Configure how Envoy helps you manage tasks and make decisions.
        </p>
        </div>
        </div>
        </div>

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

        <div className="py-4 border-b border-gray-100 dark:border-gray-800">
        <h4 className="text-sm font-medium mb-3">AI Engine</h4>
        <div className="space-y-2">
        {(['Envoy Mega', 'Envoy Pulse', 'Envoy Nano'] as const).map((engine) => (
            <label key={engine} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <input
            type="radio"
            name="aiEngine"
            checked={data.preferredEngine === engine}
            onChange={() => onUpdate({ ...data, preferredEngine: engine })}
            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{engine}</div>
            <div className="text-xs text-gray-500">
            {engine === 'Envoy Mega' && 'Most powerful, best for complex analysis (Gemini)'}
            {engine === 'Envoy Pulse' && 'Balanced speed and intelligence (Local ASUS)'}
            {engine === 'Envoy Nano' && 'Fast responses, ideal for quick tasks (Mini)'}
            </div>
            </div>
            </label>
        ))}
        </div>
        </div>

        <div className="py-4 border-b border-gray-100 dark:border-gray-800">
        <h4 className="text-sm font-medium mb-2">Communication Style</h4>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {(['Concise', 'Elaborate'] as const).map((style) => (
            <button
            key={style}
            onClick={() => onUpdate({ ...data, communicationStyle: style })}
            className={`px-4 py-2 text-xs rounded-md transition-all ${
                data.communicationStyle === style
                ? 'bg-white dark:bg-gray-700 shadow-sm font-bold'
                : 'text-gray-500'
            }`}
            >
            {style}
            </button>
        ))}
        </div>
        </div>

        <div className="py-4 border-b border-gray-100 dark:border-gray-800">
        <h4 className="text-sm font-medium mb-3">Intervention Sensitivity: {data.sensitivityLevel}%</h4>
        <input
        type="range"
        min="0"
        max="100"
        value={data.sensitivityLevel}
        onChange={(e) => onUpdate({ ...data, sensitivityLevel: parseInt(e.target.value) })}
        className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>Conservative (fewer suggestions)</span>
        <span>Aggressive (more interventions)</span>
        </div>
        </div>

        <div className="space-y-3">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">AI Permissions</h4>
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
    );
};

// --- Section: Visuals ---
const VisualSection = ({ data, onUpdate }: { data: VisualSettings; onUpdate: (d: VisualSettings) => void }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        {/* Theme */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
        <Palette className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Appearance</h3>
        </div>

        <div className="space-y-4">
        <div>
        <h4 className="text-sm font-medium mb-3">Theme</h4>
        <div className="grid grid-cols-3 gap-3">
        {(['light', 'dark', 'auto'] as const).map((theme) => (
            <button
            key={theme}
            onClick={() => onUpdate({ ...data, theme })}
            className={`p-4 rounded-lg border-2 transition-all capitalize ${
                data.theme === theme
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            >
            <div className="text-sm font-medium">{theme}</div>
            </button>
        ))}
        </div>
        </div>

        <div>
        <h4 className="text-sm font-medium mb-2">Accent Color</h4>
        <div className="flex items-center gap-3">
        <input
        type="color"
        value={data.accentColor}
        onChange={(e) => onUpdate({ ...data, accentColor: e.target.value })}
        className="w-16 h-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">{data.accentColor}</span>
        </div>
        </div>
        </div>
        </div>

        {/* Timeline & Layout */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
        <Layout className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Timeline & Layout</h3>
        </div>

        <div className="space-y-4">
        <div>
        <h4 className="text-sm font-medium mb-2">Default Timeline Scale</h4>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {(['Week', 'Month', 'Quarter'] as const).map((scale) => (
            <button
            type="button"
            key={scale}
            onClick={() => onUpdate({ ...data, defaultTimelineScale: scale })}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
                data.defaultTimelineScale === scale
                ? 'bg-white dark:bg-gray-700 shadow-sm font-bold'
                : 'text-gray-500'
            }`}
            >
            {scale}
            </button>
        ))}
        </div>
        </div>

        <div>
        <h4 className="text-sm font-medium mb-2">UI Density</h4>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {(['Compact', 'Comfortable', 'Spacious'] as const).map((density) => (
            <button
            type="button"
            key={density}
            onClick={() => onUpdate({ ...data, uiDensity: density })}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
                data.uiDensity === density
                ? 'bg-white dark:bg-gray-700 shadow-sm font-bold'
                : 'text-gray-500'
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
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Visual Features</h3>
        <div className="space-y-2">
        <Toggle
        label="Show Ghost Bars"
        description="Visualize planned duration vs actual to identify slippage"
        checked={data.showGhostBars}
        onChange={(v: boolean) => onUpdate({ ...data, showGhostBars: v })}
        />
        <Toggle
        label="Show Dependency Lines"
        description="Display visual connections between related tasks"
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
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200 dark:border-amber-900">
        <div className="flex items-start gap-3">
        <Beaker className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Experimental Features</h4>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
        These features are in beta and may not work as expected. Use at your own risk.
        </p>
        </div>
        </div>
        </div>

        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Core Features</h3>
        <div className="space-y-2">
        <Toggle
        label="JQL Query Language"
        description="Use advanced queries to filter and search tasks (Jira-like syntax)"
        checked={data.enableJQL}
        onChange={(v) => onUpdate({ ...data, enableJQL: v })}
        />
        <Toggle
        label="GPU Acceleration"
        description="Use hardware acceleration for faster rendering"
        checked={data.usegpuAcceleration}
        onChange={(v) => onUpdate({ ...data, usegpuAcceleration: v })}
        />
        </div>
        </div>

        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Beta Features</h3>
        <div className="space-y-2">
        <Toggle
        label="Advanced Analytics"
        description="Deep insights into task patterns, bottlenecks, and team velocity"
        checked={data.betaFeatures.advancedAnalytics}
        onChange={(v) => onUpdate({ ...data, betaFeatures: { ...data.betaFeatures, advancedAnalytics: v } })}
        />
        <Toggle
        label="AI Task Decomposition"
        description="Automatically break down complex tasks into subtasks"
        checked={data.betaFeatures.aiTaskDecomposition}
        onChange={(v) => onUpdate({ ...data, betaFeatures: { ...data.betaFeatures, aiTaskDecomposition: v } })}
        />
        <Toggle
        label="Real-Time Collaboration"
        description="See team members' cursors and live edits"
        checked={data.betaFeatures.realTimeCollaboration}
        onChange={(v) => onUpdate({ ...data, betaFeatures: { ...data.betaFeatures, realTimeCollaboration: v } })}
        />
        <Toggle
        label="Voice Commands"
        description="Control TaskLinex with voice (experimental)"
        checked={data.betaFeatures.voiceCommands}
        onChange={(v) => onUpdate({ ...data, betaFeatures: { ...data.betaFeatures, voiceCommands: v } })}
        />
        </div>
        </div>

        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Data Management</h3>
        <div className="space-y-3">
        <button className="w-full px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-center gap-2 font-medium">
        <Download className="w-4 h-4" />
        Export All Data (JSON)
        </button>
        <button className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-medium">
        <Upload className="w-4 h-4" />
        Import Data
        </button>
        </div>
        </div>
        </div>
    );
};

// ==========================================
// 4. MAIN PAGE
// ==========================================

type TabId = 'account' | 'security' | 'notifications' | 'personas' | 'envoy' | 'visuals' | 'experimental';
type SyncState = 'idle' | 'saving' | 'saved' | 'error';

export default function SettingsPage() {
    const { userId, jwt } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('account');
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncState, setSyncState] = useState<SyncState>('idle');

    useEffect(() => {
        if (!userId || !jwt) return;

        const loadSettings = async () => {
            setLoading(true);
            try {
                const data = await api.get(`/settings/${userId}`, jwt);

                // Merge with default settings to ensure all fields exist
                const defaultSettings: UserSettings = {
                    account: {
                        displayName: data.account?.displayName || '',
                        email: data.account?.email || '',
                        avatarUrl: data.account?.avatarUrl || '',
                        username: data.account?.username || '',
                        accountType: data.account?.accountType || 'Individual',
                        language: data.account?.language || 'en-US',
                        timezone: data.account?.timezone || 'UTC',
                        companyName: data.account?.companyName
                    },
                    security: {
                        twoFactorEnabled: data.security?.twoFactorEnabled || false,
                        sessionTimeout: data.security?.sessionTimeout || 60,
                        loginNotifications: data.security?.loginNotifications || true,
                        trustedDevices: data.security?.trustedDevices || []
                    },
                    notifications: {
                        email: {
                            taskAssigned: data.notifications?.email?.taskAssigned ?? true,
                            taskCompleted: data.notifications?.email?.taskCompleted ?? true,
                            deadlineReminder: data.notifications?.email?.deadlineReminder ?? true,
                            weeklyDigest: data.notifications?.email?.weeklyDigest ?? false
                        },
                        push: {
                            taskAssigned: data.notifications?.push?.taskAssigned ?? true,
                            taskCompleted: data.notifications?.push?.taskCompleted ?? false,
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
                            enabled: data.notifications?.quietHours?.enabled || false,
                            start: data.notifications?.quietHours?.start || '22:00',
                            end: data.notifications?.quietHours?.end || '08:00'
                        }
                    },
                    personas: data.personas || { activePersonas: [], enableVirtualTeammates: true },
                    envoy: {
                        suggestionsEnabled: data.envoy?.suggestionsEnabled ?? true,
                        autoDetectDependencies: data.envoy?.autoDetectDependencies ?? true,
                        communicationStyle: data.envoy?.communicationStyle || 'Concise',
                        sensitivityLevel: data.envoy?.sensitivityLevel || 70,
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
        { id: 'account' as const, label: 'Account', icon: User },
        { id: 'security' as const, label: 'Security', icon: Shield },
        { id: 'notifications' as const, label: 'Notifications', icon: Bell },
        { id: 'personas' as const, label: 'Personas', icon: Users },
        { id: 'envoy' as const, label: 'Envoy AI', icon: Bot },
        { id: 'visuals' as const, label: 'Visuals', icon: Monitor },
        { id: 'experimental' as const, label: 'Experimental', icon: Beaker },
    ];

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
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-6 md:px-12">
        <div className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
        <h2 className="text-2xl font-bold">
        {tabs.find(t => t.id === activeTab)?.label}
        </h2>
        <div className="flex items-center gap-2 text-xs font-medium">
        {syncState === 'saving' && (
            <span className="text-gray-400 flex items-center gap-1">
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
