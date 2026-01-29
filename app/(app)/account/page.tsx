"use client";

import { User, Shield, Globe, Clock, Monitor, LogOut, Download, Trash2, CheckCircle } from 'lucide-react';
import { useState } from 'react';

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

const SectionHeader = ({ title, icon: Icon }: any) => (
    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 mt-8 flex items-center gap-2 uppercase tracking-wider">
        <Icon className="w-4 h-4 text-gray-400" />
        {title}
    </h3>
);

export default function AccountPage() {
    const [data, setData] = useState<AccountSettings>({
        displayName: 'John Doe',
        username: 'johndoe_dev',
        email: 'john@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?u=1',
        accountType: 'Individual',
        language: 'English (US)',
        timezone: 'GMT -05:00 (EST)',
        twoFactorEnabled: false,
        lastPasswordChange: 'Oct 12, 2025'
    });

    const updateData = (updates: Partial<AccountSettings>) => {
        setData(prev => ({ ...prev, ...updates }));
    };

    return (
        <div className="p-8 max-w-3xl mx-auto pb-24">
            <h1 className="text-2xl font-bold mb-8 text-slate-900 dark:text-white">Account Settings</h1>

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
                        <p className="text-[10px] text-gray-400">Recommended: Square JPG or PNG, min 400x400px.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Full Name</label>
                        <input 
                            type="text" 
                            value={data.displayName} 
                            onChange={(e) => updateData({ displayName: e.target.value })}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Username</label>
                        <input 
                            type="text" 
                            value={data.username} 
                            onChange={(e) => updateData({ username: e.target.value })}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                        />
                    </div>
                </div>
            </div>

            {/* 2. LOCALIZATION */}
            <SectionHeader title="Localization" icon={Globe} />
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Language</label>
                    <select 
                        value={data.language}
                        onChange={(e) => updateData({ language: e.target.value })}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none"
                    >
                        <option>English (US)</option>
                        <option>English (UK)</option>
                        <option>German</option>
                        <option>Japanese</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Time Zone</label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <select 
                            value={data.timezone}
                            onChange={(e) => updateData({ timezone: e.target.value })}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
                        >
                            <option>GMT -05:00 (EST)</option>
                            <option>GMT +00:00 (UTC)</option>
                            <option>GMT +01:00 (CET)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 3. SECURITY & LOGIN */}
            <SectionHeader title="Security" icon={Shield} />
            <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 px-4">
                <div className="py-4 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-medium">Email Address</h4>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            {data.email} <CheckCircle className="w-3 h-3 text-green-500" />
                        </p>
                    </div>
                    <button className="text-xs font-medium text-indigo-600 hover:underline">Change</button>
                </div>
                
                <div className="py-4 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-medium">Password</h4>
                        <p className="text-xs text-gray-500 mt-1">Last changed: {data.lastPasswordChange}</p>
                    </div>
                    <button className="text-xs font-medium text-indigo-600 hover:underline">Update</button>
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
                <div className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md"><Monitor className="w-4 h-4" /></div>
                        <div>
                            <p className="text-sm font-medium">MacBook Pro — Chrome</p>
                            <p className="text-[10px] text-gray-400">New York, USA • Active now</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-green-500 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded">THIS DEVICE</span>
                </div>
                <button className="text-xs text-red-500 font-medium flex items-center gap-2 hover:opacity-80 transition ml-1">
                    <LogOut className="w-3 h-3" /> Log out from all other sessions
                </button>
            </div>

            {/* 5. DATA & ACCOUNT CONTROL */}
            <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-gray-200 dark:hover:border-gray-700 transition group">
                        <Download className="w-5 h-5 text-gray-400 mb-2 group-hover:text-indigo-500 transition" />
                        <h4 className="text-sm font-bold">Export Personal Data</h4>
                        <p className="text-xs text-gray-500 mt-1">Download a JSON archive of your tasks, history, and profile data.</p>
                        <button className="mt-3 text-xs font-bold text-indigo-600">Request Export</button>
                    </div>
                    
                    <div className="p-4 border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10 rounded-xl">
                        <Trash2 className="w-5 h-5 text-red-400 mb-2" />
                        <h4 className="text-sm font-bold text-red-600">Delete Account</h4>
                        <p className="text-xs text-red-500/70 mt-1">This is permanent. All data will be wiped after a 14-day grace period.</p>
                        <button className="mt-3 text-xs font-bold text-red-600 hover:text-red-700">Begin Deletion</button>
                    </div>
                </div>
            </div>
        </div>
    );
}