"use client";

import { User, Shield, Globe, Clock, Monitor, LogOut, Download, Trash2, CheckCircle, Save, X, Loader2, Smartphone as LucideIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api'; 

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
    const { userId, jwt, logout } = useAuth(); 
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

    useEffect(() => {
        if (!userId || !jwt) return;
        
        api.get(`/users/${userId}`, jwt)
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
                console.error('Failed to load user:', err);
                setMessage({ text: "Failed to load account data", type: 'error' });
                setIsLoading(false);
            });
    }, [userId, jwt]);

    const updateData = (updates: Partial<AccountSettings>) => {
        setData(prev => ({ ...prev, ...updates }));
    };

    const handleSave = async () => {
        if (!userId || !jwt) return;
        
        setIsSaving(true);
        setMessage(null);
        
        try {
            // Split displayName into firstName and lastName
            const names = data.displayName.trim().split(' ');
            const firstName = names[0] || '';
            const lastName = names.slice(1).join(' ') || '';
            
            await api.patch(`/users/${userId}`, {
                firstName,
                lastName,
                username: data.username,
                timezone: data.timezone
            }, jwt);
            
            setMessage({ text: "Account updated successfully!", type: 'success' });
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            console.error("Update failed:", e);
            setMessage({ text: e.message || "Failed to update account", type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!userId || !jwt) return;
        
        if (!modalPassword || !newPassword) {
            alert("Please fill in all fields");
            return;
        }

        try {
            await api.post(`/users/${userId}/change-password`, {
                currentPassword: modalPassword,
                newPassword: newPassword
            }, jwt);
            
            setShowPasswordModal(false);
            setModalPassword("");
            setNewPassword("");
            setMessage({ text: "Password changed successfully!", type: 'success' });
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            alert(e.message || "Failed to change password. Please check your current password.");
        }
    };

    const handleDeleteAccount = async () => {
        if (!userId || !jwt) return;
        
        if (!modalPassword) {
            setDeleteError("Please enter your password");
            return;
        }

        try {
            await api.post(`/users/${userId}/delete-account`, {
                password: modalPassword
            }, jwt);
            
            // Logout and redirect
            await logout();
            router.push('/');
        } catch (e: any) {
            setDeleteError(e.message || "Failed to delete account. Please check your password.");
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        // Implementation for session revocation
        console.log("Revoke session:", sessionId);
    };

    const handleRevokeAllOtherSessions = async () => {
        // Implementation for revoking all other sessions
        console.log("Revoke all other sessions");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading account settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-8">
            {/* SUCCESS/ERROR MESSAGE */}
            {message && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            <div className="max-w-3xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <User className="w-8 h-8 text-indigo-600" />
                        Account Settings
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-2">Manage your personal information and preferences</p>
                </header>

                {/* 1. PROFILE */}
                <SectionHeader title="Profile" icon={User} />
                <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
                    <div className="flex items-center gap-6 mb-6">
                        <img 
                            src={data.avatarUrl} 
                            className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-gray-700" 
                            alt="Avatar"
                        />
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{data.displayName || 'User'}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">@{data.username}</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{data.accountType} Account</p>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Display Name</label>
                            <input 
                                type="text" 
                                value={data.displayName} 
                                onChange={(e) => updateData({ displayName: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" 
                                placeholder="Your full name"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Username</label>
                            <input 
                                type="text" 
                                value={data.username} 
                                onChange={(e) => updateData({ username: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" 
                                placeholder="username"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. PREFERENCES */}
                <SectionHeader title="Preferences" icon={Globe} />
                <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Language</label>
                            <select 
                                value={data.language}
                                onChange={(e) => updateData({ language: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                            >
                                <option>English (US)</option>
                                <option>English (UK)</option>
                                <option>Spanish</option>
                                <option>French</option>
                                <option>German</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Timezone</label>
                            <select 
                                value={data.timezone}
                                onChange={(e) => updateData({ timezone: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                            >
                                <option>UTC</option>
                                <option>America/New_York</option>
                                <option>America/Los_Angeles</option>
                                <option>Europe/London</option>
                                <option>Europe/Berlin</option>
                                <option>Asia/Tokyo</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* SAVE BUTTON */}
                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* 3. SECURITY & LOGIN */}
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
                                <div key={session.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-950">
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
                </div>

                {/* 5. DATA & ACCOUNT CONTROL */}
                <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-gray-200 dark:hover:border-gray-700 transition group bg-white dark:bg-gray-950">
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
        </div>
    );
}