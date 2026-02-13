"use client";

import React, { useEffect, useState } from 'react';
import { 
    Users, AlertTriangle, Shield, Activity, 
    CheckCircle, XCircle, Zap, BarChart3, Plus, UserPlus, Edit3, Search, X, Loader2
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
            
        } catch (e) {
            console.error("Failed to add member:", e);
            const errorMessage = e instanceof Error ? e.message : "Failed to add team member. Please check the username and try again.";
            alert(errorMessage);
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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Team Intelligence</h1>
                    <p className="text-slate-400">Real-time coordination health & predictive intervention signals.</p>
                </div>

            {/* Skills Modal */}
            {editingMember && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white">{editingMember.name}</h3>
                                <p className="text-sm text-slate-400">Edit Skills</p>
                            </div>
                            <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search */}
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

                        {/* Skills Grid */}
                        <div className="flex flex-wrap gap-2">
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
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Team Members</h3>
                        <div className="space-y-3">
                            {members.map(m => (
                                <div key={m.id} className="flex items-center justify-between p-2 hover:bg-slate-800 rounded-lg transition-colors">
                                    <div>
                                        <div className="font-bold text-slate-200">{m.name}</div>
                                        <div className="text-xs text-slate-500">{m.role}</div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {m.skills?.slice(0, 3).map(s => (
                                                <span key={s} className="text-[9px] bg-slate-800 px-1 rounded text-slate-400">{s}</span>
                                            ))}
                                            {(m.skills?.length ?? 0) > 3 && <span className="text-[9px] text-slate-500">+{(m.skills?.length ?? 0) - 3}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xs font-bold ${m.attentionScore < 50 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {m.attentionScore}% Focus
                                        </div>
                                        <div className="text-[10px] text-slate-500">{m.dependencyLoad} deps</div>
                                    </div>
                                    
                                    {/* Edit Button for Admin or Self */}
                                    {(userRole === 'admin' || m.id === userId) && (
                                        <button onClick={() => setEditingMember(m)} className="ml-2 p-1.5 text-slate-500 hover:text-violet-400 hover:bg-slate-800 rounded transition-colors">
                                            <Edit3 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {userRole === 'admin' && (
                            <div className="mt-4 pt-4 border-t border-slate-800">
                            {isAdding ? (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                                        placeholder="Username"
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-violet-500 outline-none"
                                    />
                                    <button onClick={handleAddMember} className="bg-violet-600 hover:bg-violet-700 text-white p-1.5 rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
                                    <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white p-1.5"><XCircle className="w-4 h-4" /></button>
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
                        )}
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
