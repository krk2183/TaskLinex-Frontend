"use client";

import React, { useEffect, useState } from 'react';
import { 
    Users, AlertTriangle, Shield, Activity, 
    CheckCircle, XCircle, Zap, BarChart3, Plus, UserPlus, Edit3, Search, X, Loader2, Trash2, UserMinus
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

export default function TeamPage() {
    const { userId, jwt } = useAuth();
    const [overview, setOverview] = useState<TeamOverview | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [userRole, setUserRole] = useState("user");
    const [error, setError] = useState<string | null>(null);

    // Remove member confirmation
    const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

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
                setInterventions(intData.filter((i: any) => i.scope === 'team'));
                setUserRole(userData.role);
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
        
        try {
            await api.post('/team/add_member', { 
                userId, 
                username: newUsername.trim() 
            }, jwt);

            // Refresh members list
            const updatedMembers = await api.get(`/team/members?userId=${userId}`, jwt);
            setMembers(updatedMembers);            
            setIsAdding(false);
            setNewUsername("");
            
        } catch (e: any) {
            console.error("Failed to add member:", e);
            alert(e.message || "Failed to add team member. Please check the username and try again.");
        }
    };

    const handleRemoveMember = async () => {
        if (!memberToRemove || !userId || !jwt) return;
        
        try {
            await api.post('/team/remove_member', {
                userId,
                memberId: memberToRemove.id
            }, jwt);

            // Refresh members list
            const updatedMembers = await api.get(`/team/members?userId=${userId}`, jwt);
            setMembers(updatedMembers);
            setMemberToRemove(null);
            
        } catch (e: any) {
            console.error("Failed to remove member:", e);
            alert(e.message || "Failed to remove team member.");
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

            // Update local state
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, skills: newSkills } : m));
            if (editingMember && editingMember.id === memberId) {
                setEditingMember(prev => prev ? { ...prev, skills: newSkills } : null);
            }
        } catch (e) {
            console.error("Failed to update skills", e);
            alert("Failed to update skills. Please try again.");
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
            // Call backend to resolve intervention
            await api.post('/envoy/resolve_intervention', {
                interventionId,
                userId
            }, jwt);

            // Remove from UI
            setInterventions(prev => prev.filter(i => i.id !== interventionId));
        } catch (e) {
            console.error("Failed to resolve intervention:", e);
        }
    };

    const handleDismissIntervention = (interventionId: string) => {
        // Just remove from UI (no backend call for dismiss)
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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2">
                        Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-500">Intelligence</span>
                    </h1>
                    <p className="text-slate-400">Coordination metrics, dependency mapping & AI-powered insights</p>
                </header>

                {error && (
                    <div className="mb-6 bg-rose-900/20 border border-rose-900/50 p-4 rounded-xl flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                        <p className="text-rose-300 text-sm">{error}</p>
                    </div>
                )}

            {/* Remove Member Confirmation Modal */}
            {memberToRemove && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-rose-900/50 rounded-xl p-6 w-full max-w-md">
                        <div className="flex items-center gap-3 mb-4">
                            <UserMinus className="w-6 h-6 text-rose-500" />
                            <h3 className="text-lg font-bold text-white">Remove Team Member</h3>
                        </div>
                        <p className="text-slate-300 mb-6">
                            Are you sure you want to remove <span className="text-white font-bold">{memberToRemove.name}</span> from your team?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleRemoveMember}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 px-4 rounded-lg font-bold transition-colors"
                            >
                                Remove
                            </button>
                            <button
                                onClick={() => setMemberToRemove(null)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-lg font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Skills Modal */}
            {editingMember && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-violet-900/50 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white">Edit Skills</h3>
                                <p className="text-sm text-slate-400 mt-1">{editingMember.name}</p>
                            </div>
                            <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-white p-2">
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
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            {AVAILABLE_SKILLS
                                .filter(skill => skill.toLowerCase().includes(skillSearch.toLowerCase()))
                                .map(skill => {
                                    const isSelected = editingMember.skills?.includes(skill);
                                    return (
                                        <button
                                            key={skill}
                                            onClick={() => toggleSkill(skill)}
                                            className={`w-full text-left px-4 py-2.5 rounded-lg border transition-all ${
                                                isSelected 
                                                    ? 'bg-violet-600 border-violet-500 text-white' 
                                                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-violet-900/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{skill}</span>
                                                {isSelected && <CheckCircle className="w-4 h-4" />}
                                            </div>
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
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Team Members ({members.length})</h3>
                        <div className="space-y-3">
                            {members.map(m => {
                                const isCurrentUser = m.id === userId;
                                
                                return (
                                    <div key={m.id} className="flex items-center justify-between p-2 hover:bg-slate-800 rounded-lg transition-colors group">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className="font-bold text-slate-200 truncate">{m.name}</div>
                                                {isCurrentUser && (
                                                    <span className="text-[9px] bg-violet-600 px-1.5 py-0.5 rounded text-white font-bold">YOU</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500">{m.role}</div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {m.skills?.slice(0, 3).map(s => (
                                                    <span key={s} className="text-[9px] bg-slate-800 px-1 rounded text-slate-400">{s}</span>
                                                ))}
                                                {m.skills?.length > 3 && <span className="text-[9px] text-slate-500">+{m.skills.length - 3}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-2">
                                            <div>
                                                <div className={`text-xs font-bold ${m.attentionScore < 50 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {m.attentionScore}%
                                                </div>
                                                <div className="text-[10px] text-slate-500">{m.dependencyLoad} deps</div>
                                            </div>
                                            
                                            {/* Edit Button for Admin or Self */}
                                            {(userRole === 'admin' || m.id === userId) && (
                                                <button 
                                                    onClick={() => setEditingMember(m)} 
                                                    className="p-1.5 text-slate-500 hover:text-violet-400 hover:bg-slate-800 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Edit skills"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                </button>
                                            )}

                                            {/* Remove Button (only for non-current users) */}
                                            {!isCurrentUser && (
                                                <button 
                                                    onClick={() => setMemberToRemove(m)} 
                                                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Remove from team"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Add Member Section */}
                        <div className="mt-4 pt-4 border-t border-slate-800">
                            {isAdding ? (
                                <div className="space-y-2">
                                    <input 
                                        type="text" 
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                                        placeholder="Enter username..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 outline-none"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleAddMember} 
                                            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg transition-colors font-bold text-sm flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Add Member
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setIsAdding(false);
                                                setNewUsername("");
                                            }} 
                                            className="px-4 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsAdding(true)}
                                    className="w-full py-2.5 text-sm font-bold text-violet-400 border border-violet-900/50 rounded-lg hover:bg-violet-900/20 transition-colors flex items-center justify-center gap-2"
                                >
                                    <UserPlus className="w-4 h-4" /> Add Team Member
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* CENTER: Intelligence Panels */}
                <div className="lg:col-span-6 space-y-6">
                    {/* Overview Cards */}
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

                    {/* Deep Dive Panel (Placeholder for Graph) */}
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
                            {interventions.map((item, idx) => (
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
                                    
                                    {/* Actions */}
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