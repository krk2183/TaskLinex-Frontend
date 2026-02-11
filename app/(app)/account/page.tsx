"use client";

import { User, Shield, Globe, Clock, Monitor, LogOut, Download, Trash2, CheckCircle, Save, X, Loader2, Smartphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { useRouter } from 'next/navigation';

interface AccountSettings {
    displayName: string;
    username: string;
    email: string;
    avatarUrl: string;
    accountType: 'Individual' | 'Team' | 'Enterprise';
    language: string;
    timezone: string;
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
}

interface Session {
    id: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    deviceName: string;
    browser: string;
    location: string;
    lastActive: string;
    isCurrent: boolean;
}

const Toggle = ({ label, description, checked, onChange, disabled }: any) => (
    <div className={`flex items-start justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 ${disabled ? 'opacity-50' : ''}`}>
        <div className="pr-8">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{label}</h4>
            {description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{description}</p>}
        </div>
        <button 
            onClick={() => !disabled && onChange(!checked)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
    </div>
);

const SectionHeader = ({ title, icon: Icon }: any) => (
    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 mt-8 flex items-center gap-2 uppercase tracking-wider">
        <Icon className="w-4 h-4 text-gray-400 dark:text-slate-400" />
        {title}
    </h3>
);

export default function AccountPage() {
    const { userId } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);

    // Modal States
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [modalPassword, setModalPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [deleteError, setDeleteError] = useState("");

    const [sessions, setSessions] = useState<Session[]>([]);
    const [data, setData] = useState<AccountSettings>({
        displayName: '',
        username: '',
        email: '',
        avatarUrl: '',
        accountType: 'Individual',
        language: 'English (US)',
        timezone: 'UTC',
        twoFactorEnabled: false,
        lastPasswordChange: 'Unknown'
    });

    const PORT_SUFFIX = process.env.NEXT_PUBLIC_NPM_PORT;
    const API_URL = PORT_SUFFIX ? `http://192.168.0.${PORT_SUFFIX}:8000` : 'http://localhost:8000';

    useEffect(() => {
        if (!userId) return;
        
        fetch(`${API_URL}/users/${userId}`)
            .then(res => res.json())
            .then(user => {
                setData(prev => ({
                    ...prev,
                    displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                    username: user.username,
                    email: user.email,
                    timezone: user.timezone || 'UTC',
                    accountType: user.role === 'admin' ? 'Team' : 'Individual',
                    avatarUrl: `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`
                }));
                setIsLoading(false);
            })
            .catch(err => {
                console.error(err);
                setIsLoading(false);
            });

        // Fetch Sessions
        fetch(`${API_URL}/sessions?userId=${userId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setSessions(data);
            })
            .catch(err => console.error("Failed to load sessions", err));
    }, [userId]);

    const updateData = (updates: Partial<AccountSettings>) => {
        setData(prev => ({ ...prev, ...updates }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_URL}/updateAccount`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    displayName: data.displayName,
                    username: data.username,
                    email: data.email,
                    timezone: data.timezone
                })
            });
            
            if (!res.ok) throw new Error(await res.text());
            setMessage({ text: "Account updated successfully", type: 'success' });
        } catch (e: any) {
            setMessage({ text: "Failed to update account", type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        try {
            const res = await fetch(`${API_URL}/changePassword`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, currentPassword: modalPassword, newPassword })
            });
            if (!res.ok) throw new Error("Invalid current password");
            setShowPasswordModal(false);
            setModalPassword("");
            setNewPassword("");
            setMessage({ text: "Password changed successfully", type: 'success' });
        } catch (e) {
            alert("Failed to change password. Check your current password.");
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteError("");
        try {
            const res = await fetch(`${API_URL}/deleteAccount`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password: modalPassword })
            });
            if (!res.ok) throw new Error("Invalid password");
            router.push('/register'); // Redirect to login/signup
        } catch (e) {
            setDeleteError("Failed to delete account. Incorrect password.");
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        try {
            await fetch(`${API_URL}/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            setMessage({ text: "Session revoked", type: 'success' });
        } catch (e) {
            setMessage({ text: "Failed to revoke session", type: 'error' });
        }
    };

    const handleRevokeAllOtherSessions = async () => {
        if (!confirm("Are you sure you want to log out of all other devices?")) return;
        try {
            await fetch(`${API_URL}/sessions/revokeAll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            setSessions(prev => prev.filter(s => s.isCurrent));
            setMessage({ text: "All other sessions logged out", type: 'success' });
        } catch (e) {
            setMessage({ text: "Failed to log out other sessions", type: 'error' });
        }
    };

    if (isLoading) return <div className="p-8 flex items-center justify-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mr-2"/> Loading account...</div>;

    return (
        <div className="p-8 max-w-3xl mx-auto pb-24">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Account Settings</h1>
                <div className="flex items-center gap-4">
                    {message && <span className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{message.text}</span>}
                    <button onClick={() => { setShowDeleteModal(true); setDeleteError(""); }} className="text-red-500 hover:text-red-600 text-sm font-medium flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Account
                    </button>
                </div>
            </div>

            {/* 1. PROFILE SECTION */}
            <SectionHeader title="Profile" icon={User} />
            <div className="space-y-6">
                <div className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <img src={data.avatarUrl} className="w-20 h-20 rounded-full border-2 border-white dark:border-gray-700 shadow-sm" />
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <button className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-md font-medium hover:bg-gray-50 transition shadow-sm">Change Photo</button>
                            <button className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 rounded-md transition">Remove</button>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-slate-400">Recommended: Square JPG or PNG, min 400x400px.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-300 uppercase mb-1 ml-1">Full Name</label>
                        <input 
                            type="text" 
                            value={data.displayName} 
                            onChange={(e) => updateData({ displayName: e.target.value })}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition dark:text-white" 
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-300 uppercase mb-1 ml-1">Username</label>
                        <input 
                            type="text" 
                            value={data.username} 
                            onChange={(e) => updateData({ username: e.target.value })}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition dark:text-white" 
                        />
                    </div>
                </div>
            </div>

            {/* 2. LOCALIZATION */}
            <SectionHeader title="Localization" icon={Globe} />
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-300 uppercase mb-1 ml-1">Language</label>
                    <select 
                        value={data.language}
                        onChange={(e) => updateData({ language: e.target.value })}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none dark:text-white"
                    >
                        <option>English (US)</option>
                        <option>English (UK)</option>
                        <option>German</option>
                        <option>Japanese</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-300 uppercase mb-1 ml-1">Time Zone</label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-slate-500" />
                        <select 
                            value={data.timezone}
                            onChange={(e) => updateData({ timezone: e.target.value })}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm outline-none dark:text-white"
                        >
                            <option value="UTC">GMT +00:00 (UTC)</option>
                            <option value="EST">GMT -05:00 (EST)</option>
                            <option>GMT +01:00 (CET)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 3. SECURITY & LOGIN */}
            <div className="mt-8 flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />} Save Changes
                </button>
            </div>

            <SectionHeader title="Security" icon={Shield} />
            <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 px-4">
                <div className="py-4 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-medium dark:text-white">Email Address</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                            {data.email} <CheckCircle className="w-3 h-3 text-green-500" />
                        </p>
                    </div>
                    <button className="text-xs font-medium text-indigo-600 hover:underline">Change</button>
                </div>
                
                <div className="py-4 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-medium dark:text-white">Password</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Last changed: {data.lastPasswordChange}</p>
                    </div>
                    <button onClick={() => setShowPasswordModal(true)} className="text-xs font-medium text-indigo-600 hover:underline">Update</button>
                </div>

                <Toggle 
                    label="Two-Factor Authentication" 
                    description="Add an extra layer of security using TOTP apps like Google Authenticator."
                    checked={data.twoFactorEnabled}
                    onChange={(v: boolean) => updateData({ twoFactorEnabled: v })}
                />
            </div>

            {/* 4. ACTIVE SESSIONS */}
            <SectionHeader title="Active Sessions" icon={Monitor} />
            <div className="space-y-3">
                {sessions.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400 italic">No active sessions information available.</p>
                ) : (
                    sessions.map(session => {
                        const DeviceIcon = session.deviceType === 'mobile' ? Smartphone : Monitor;
                        return (
                            <div key={session.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                                        <DeviceIcon className="w-4 h-4 dark:text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium dark:text-white">{session.deviceName} — {session.browser}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-slate-400">
                                            {session.location} • {session.isCurrent ? <span className="text-green-500 font-bold">Active now</span> : `Last seen ${new Date(session.lastActive).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                </div>
                                {session.isCurrent ? (
                                    <span className="text-[10px] font-bold text-green-500 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded">THIS DEVICE</span>
                                ) : (
                                    <button 
                                        onClick={() => handleRevokeSession(session.id)}
                                        className="text-xs text-slate-400 hover:text-red-500 transition px-2 py-1"
                                    >
                                        Revoke
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
                
                {sessions.length > 1 && (
                    <button 
                        onClick={handleRevokeAllOtherSessions}
                        className="text-xs text-red-500 font-medium flex items-center gap-2 hover:opacity-80 transition ml-1 mt-2"
                    >
                        <LogOut className="w-3 h-3" /> Log out from all other sessions
                    </button>
                )}
            </div>

            {/* 5. DATA & ACCOUNT CONTROL */}
            <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-gray-200 dark:hover:border-gray-700 transition group">
                        <Download className="w-5 h-5 text-gray-400 dark:text-slate-400 mb-2 group-hover:text-indigo-500 transition" />
                        <h4 className="text-sm font-bold dark:text-white">Export Personal Data</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Download a JSON archive of your tasks, history, and profile data.</p>
                        <button className="mt-3 text-xs font-bold text-indigo-600">Request Export</button>
                    </div>
                    
                    <div className="p-4 border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10 rounded-xl">
                        <Trash2 className="w-5 h-5 text-red-400 mb-2" />
                        <h4 className="text-sm font-bold text-red-600">Delete Account</h4>
                        <p className="text-xs text-red-500/70 mt-1">This is permanent. All data will be wiped after a 14-day grace period.</p>
                        <button onClick={() => { setShowDeleteModal(true); setDeleteError(""); }} className="mt-3 text-xs font-bold text-red-600 hover:text-red-700">Begin Deletion</button>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-xl relative">
                        <button onClick={() => setShowPasswordModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Change Password</h3>
                        <div className="space-y-4">
                            <input type="password" placeholder="Current Password" value={modalPassword} onChange={e => setModalPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none dark:text-white" />
                            <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none dark:text-white" />
                            <button onClick={handleChangePassword} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold text-sm">Update Password</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-md border border-red-200 dark:border-red-900/50 shadow-xl relative">
                        <button onClick={() => setShowDeleteModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <Trash2 className="w-6 h-6" />
                            <h3 className="text-lg font-bold">Delete Account</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                            Are you sure? This action cannot be undone. Please enter your password to confirm.
                        </p>
                        <div className="space-y-4">
                            {deleteError && <div className="text-red-500 text-xs font-bold bg-red-50 dark:bg-red-900/20 p-2 rounded">{deleteError}</div>}
                            <input type="password" placeholder="Confirm Password" value={modalPassword} onChange={e => setModalPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none dark:text-white" />
                            <button onClick={handleDeleteAccount} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold text-sm">Permanently Delete Account</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}