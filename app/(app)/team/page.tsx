"use client";

import React, { useEffect, useState } from 'react';
import {
    Users, AlertTriangle, Shield, Activity, AlertCircle,
    CheckCircle, XCircle, Zap, Plus, UserPlus, Edit3, Search, X, Loader2,
    Copy, Check, Trash2, AtSign
} from 'lucide-react';
import { useAuth } from '../../providers/AuthContext';
import { api } from '@/lib/api';

interface TeamOverview {
    coordinationDebt: string;
    leakageScore: number;
    dependencyRisk: string;
}

interface Member {
    id: string;
    name: string;
    username?: string;
    role: string;
    skills: string[];
    attentionScore: number;
    dependencyLoad: number;
}

interface Intervention {
    id: string;
    type: 'warning' | 'critical' | 'info';
    message: string;
    scope: string;
}

const AVAILABLE_SKILLS = [
    "React", "Node.js", "Python", "SQL", "DevOps", "UI/UX Design",
    "Project Management", "QA Testing", "Data Analysis", "Machine Learning",
    "AWS", "Docker", "Kubernetes", "TypeScript", "Go", "Rust", "Java",
    "C++", "Mobile Dev", "Security", "Marketing", "Sales", "Content Writing", "Finance", "Legal"
];

// --- Avatar Component ---
function MemberAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
    const initials = name
        .split(' ')
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Deterministic hue from name for consistent per-user color
    const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    const bg = `hsl(${hue}, 55%, 28%)`;
    const border = `hsl(${hue}, 55%, 45%)`;

    const sizes = {
        sm: 'w-7 h-7 text-[10px]',
        md: 'w-9 h-9 text-xs',
        lg: 'w-11 h-11 text-sm',
    };

    return (
        <div
            className={`${sizes[size]} rounded-full flex items-center justify-center font-bold shrink-0 border`}
            style={{ backgroundColor: bg, borderColor: border, color: `hsl(${hue}, 80%, 85%)` }}
        >
            {initials || '?'}
        </div>
    );
}

// --- Username Badge ---
function UsernameDisplay({ username, label = "Your username" }: { username: string; label?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(`@${username}`).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-violet-950/30 border border-violet-800/40 rounded-xl p-4 mb-4">
            <p className="text-[10px] text-violet-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                <AtSign className="w-3 h-3" /> {label}
            </p>
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-mono font-bold text-slate-200 truncate">@{username}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold shrink-0"
                >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Share your username so teammates can add you.</p>
        </div>
    );
}

export default function TeamPage() {
    const { userId, jwt } = useAuth();
    const [overview, setOverview] = useState<TeamOverview | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [myUsername, setMyUsername] = useState<string | null>(null);
    const [userRole, setUserRole] = useState("user");
    const [error, setError] = useState<string | null>(null);
    const [addError, setAddError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    // Skills Modal State
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [skillSearch, setSkillSearch] = useState("");

    useEffect(() => {
        if (!userId || !jwt) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [ovData, memData, intData, userData] = await Promise.all([
                    api.get(`/team/overview?userId=${userId}`, jwt),
                    api.get(`/team/members?userId=${userId}`, jwt),
                    api.get(`/envoy/interventions?userId=${userId}`, jwt),
                    api.get(`/users/${userId}`, jwt)
                ]);

                setOverview(ovData);
                setMembers(memData);
                setInterventions(intData.filter((i: Intervention) => i.scope === 'team'));
                setUserRole(userData.role);
                setMyUsername(userData.username || null);
            } catch (e) {
                console.error("Failed to load team data", e);
                setError("Failed to load team data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, jwt]);

    const handleAddMember = async () => {
        if (!newUsername.trim() || !userId || !jwt) return;
        setAddError(null);

        try {
            await api.post('/team/add_member', {
                userId,
                username: newUsername.trim()
            }, jwt);

            const updatedMembers = await api.get(`/team/members?userId=${userId}`, jwt);
            setMembers(updatedMembers);
            setIsAdding(false);
            setNewUsername("");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "User not found or already on team.";
            setAddError(msg);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!userId || !jwt) return;
        setRemovingId(memberId);

        try {
            await api.post('/team/remove_member', { userId, memberId }, jwt);
            setMembers(prev => prev.filter(m => m.id !== memberId));
        } catch (e) {
            console.error("Failed to remove member:", e);
        } finally {
            setRemovingId(null);
        }
    };

    const handleUpdateSkills = async (memberId: string, newSkills: string[]) => {
        if (!userId || !jwt) return;

        try {
            await api.post('/team/update_skills', {
                requesterId: userId,
                targetUserId: memberId,
                skills: newSkills
            }, jwt);

            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, skills: newSkills } : m));
            if (editingMember && editingMember.id === memberId) {
                setEditingMember(prev => prev ? { ...prev, skills: newSkills } : null);
            }
        } catch (e) {
            console.error("Failed to update skills", e);
        }
    };

    const toggleSkill = (skill: string) => {
        if (!editingMember) return;
        const currentSkills = editingMember.skills || [];
        const newSkills = currentSkills.includes(skill)
            ? currentSkills.filter(s => s !== skill)
            : [...currentSkills, skill];
        handleUpdateSkills(editingMember.id, newSkills);
    };

    const handleResolveIntervention = async (interventionId: string) => {
        if (!jwt) return;
        try {
            await api.post('/envoy/resolve_intervention', { interventionId, userId }, jwt);
            setInterventions(prev => prev.filter(i => i.id !== interventionId));
        } catch (e) {
            console.error("Failed to resolve intervention:", e);
        }
    };

    const handleDismissIntervention = (interventionId: string) => {
        setInterventions(prev => prev.filter(i => i.id !== interventionId));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading team data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                    <p className="text-slate-400">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const filteredSkills = AVAILABLE_SKILLS.filter(s =>
        s.toLowerCase().includes(skillSearch.toLowerCase())
    );

    // Separate self from other members for display
    const selfMember = members.find(m => m.id === userId);
    const otherMembers = members.filter(m => m.id !== userId);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Team Intelligence</h1>
                    <p className="text-slate-400">Real-time coordination health & predictive intervention signals.</p>
                </div>

                {/* Skills Modal */}
                {editingMember && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                            <div className="flex items-center gap-3 mb-5">
                                <MemberAvatar name={editingMember.name} size="md" />
                                <div>
                                    <h3 className="text-xl font-bold text-white">{editingMember.name}</h3>
                                    <p className="text-sm text-slate-400">Edit Skills</p>
                                </div>
                                <button onClick={() => setEditingMember(null)} className="ml-auto text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search skills..."
                                        value={skillSearch}
                                        onChange={(e) => setSkillSearch(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto pr-1">
                                {filteredSkills.map((skill) => {
                                    const isSelected = editingMember.skills?.includes(skill);
                                    return (
                                        <button
                                            key={skill}
                                            onClick={() => toggleSkill(skill)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                isSelected
                                                    ? 'bg-violet-600 text-white border border-violet-500'
                                                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                                            }`}
                                        >
                                            {skill}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* LEFT: Member List */}
                    <div className="lg:col-span-3 space-y-4">

                        {/* Your Username Card */}
                        {myUsername && <UsernameDisplay username={myUsername} />}

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Users className="w-3.5 h-3.5" /> Team Members
                                <span className="ml-auto text-slate-600 font-normal normal-case text-xs">{members.length} total</span>
                            </h3>

                            <div className="space-y-2">
                                {/* Render self first with a "You" badge */}
                                {selfMember && (
                                    <div className="flex items-center gap-3 p-2.5 bg-violet-950/20 border border-violet-900/30 rounded-xl">
                                        <MemberAvatar name={selfMember.name} size="md" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-200 text-sm truncate">{selfMember.name}</span>
                                                <span className="text-[9px] bg-violet-700/60 text-violet-200 px-1.5 py-0.5 rounded-full font-bold shrink-0">You</span>
                                            </div>
                                            {myUsername && (
                                                <span className="text-[14px] text-slate-500 font-mono">@{myUsername}</span>
                                            )}
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {selfMember.skills?.slice(0, 2).map(s => (
                                                    <span key={s} className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{s}</span>
                                                ))}
                                                {(selfMember.skills?.length ?? 0) > 2 && (
                                                    <span className="text-[9px] text-slate-500">+{(selfMember.skills?.length ?? 0) - 2}</span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setEditingMember(selfMember)}
                                            className="p-1.5 text-slate-500 hover:text-violet-400 hover:bg-slate-800 rounded-lg transition-colors"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}

                                {/* Other members */}
                                {otherMembers.map(m => (
                                    <div key={m.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-800/50 rounded-xl transition-colors group">
                                        <MemberAvatar name={m.name} size="md" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-200 text-sm truncate">{m.name}</div>
                                            {m.username && (
                                                <span className="text-[14px] text-slate-500 font-mono">@{m.username}</span>
                                            )}
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {m.skills?.slice(0, 2).map(s => (
                                                    <span key={s} className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{s}</span>
                                                ))}
                                                {(m.skills?.length ?? 0) > 2 && (
                                                    <span className="text-[9px] text-slate-500">+{(m.skills?.length ?? 0) - 2}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {(userRole === 'admin' || m.id === userId) && (
                                                <button
                                                    onClick={() => setEditingMember(m)}
                                                    className="p-1.5 text-slate-500 hover:text-violet-400 hover:bg-slate-800 rounded-lg transition-colors"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRemoveMember(m.id)}
                                                disabled={removingId === m.id}
                                                className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                                            >
                                                {removingId === m.id
                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    : <Trash2 className="w-3.5 h-3.5" />
                                                }
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {otherMembers.length === 0 && (
                                    <div className="text-center py-6 text-slate-600 text-xs">
                                        <Users className="w-6 h-6 mx-auto mb-2 opacity-30" />
                                        No teammates yet. Add one below.
                                    </div>
                                )}
                            </div>

                            {/* Add Member — available to all users */}
                            <div className="mt-4 pt-4 border-t border-slate-800">
                                {isAdding ? (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                                <input
                                                    type="text"
                                                    value={newUsername}
                                                    onChange={(e) => { setNewUsername(e.target.value); setAddError(null); }}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                                                    placeholder="username"
                                                    autoFocus
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-violet-500 outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={handleAddMember}
                                                className="bg-violet-600 hover:bg-violet-700 text-white p-1.5 rounded-lg transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setIsAdding(false); setNewUsername(""); setAddError(null); }}
                                                className="text-slate-400 hover:text-white p-1.5"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {addError && (
                                            <p className="text-xs text-rose-400 flex items-center gap-1.5">
                                                <AlertCircle className="w-3 h-3 shrink-0" /> {addError}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsAdding(true)}
                                        className="w-full py-2 text-xs font-bold text-violet-400 border border-violet-900/50 rounded-lg hover:bg-violet-900/20 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <UserPlus className="w-3 h-3" /> Add Team Member
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CENTER: Intelligence Panels */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Coordination Debt</div>
                                <div className={`text-2xl font-black ${overview?.coordinationDebt === 'High' ? 'text-rose-500' : 'text-amber-500'}`}>
                                    {overview?.coordinationDebt || 'Low'}
                                </div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Leakage Score</div>
                                <div className="text-2xl font-black text-violet-500">
                                    {overview?.leakageScore || 0}%
                                </div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Dependency Risk</div>
                                <div className="text-2xl font-black text-rose-500">
                                    {overview?.dependencyRisk || 'Low'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl min-h-[300px] flex flex-col items-center justify-center text-slate-500">
                            <Activity className="w-12 h-12 mb-4 opacity-20" />
                            <p>Dependency Graph Visualization</p>
                            <span className="text-xs opacity-50">(Coming Soon)</span>
                        </div>
                    </div>

                    {/* RIGHT: Envoy Interventions */}
                    <div className="lg:col-span-3">
                        <div className="bg-slate-900 border border-violet-900/30 rounded-xl p-5 sticky top-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Shield className="w-5 h-5 text-violet-500" />
                                <h3 className="font-bold text-white">Envoy Interventions</h3>
                            </div>

                            <div className="space-y-4">
                                {interventions.map((item) => (
                                    <div key={item.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg relative group">
                                        <div className="flex items-start gap-3">
                                            {item.type === 'critical' ? (
                                                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                            ) : (
                                                <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                            )}
                                            <div>
                                                <p className="text-sm text-slate-300 leading-snug">{item.message}</p>
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 block">
                                                    {item.scope}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleResolveIntervention(item.id)}
                                                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold py-1.5 rounded transition-colors"
                                            >
                                                Resolve
                                            </button>
                                            <button
                                                onClick={() => handleDismissIntervention(item.id)}
                                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-1.5 rounded transition-colors"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {interventions.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 text-sm">
                                        <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        No active interventions.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
