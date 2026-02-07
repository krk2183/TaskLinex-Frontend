"use client";

import React, { useEffect, useState } from 'react';
import { 
    Users, AlertTriangle, Shield, Activity, 
    CheckCircle, XCircle, Zap, BarChart3 
} from 'lucide-react';

interface TeamOverview {
    coordinationDebt: string;
    leakageScore: number;
    dependencyRisk: string;
}

interface Member {
    id: string;
    name: string;
    role: string;
    attentionScore: number;
    dependencyLoad: number;
}

interface Intervention {
    id: string;
    type: 'warning' | 'critical' | 'info';
    message: string;
    scope: string;
}

export default function TeamPage() {
    const [overview, setOverview] = useState<TeamOverview | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [loading, setLoading] = useState(true);

    // Mock User ID - in real app get from context/auth
    const userId = "u1"; 

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ovRes, memRes, intRes] = await Promise.all([
                    fetch(`http://192.168.0.113:8000/team/overview?userId=${userId}`),
                    fetch(`http://192.168.0.113:8000/team/members?userId=${userId}`),
                    fetch(`http://192.168.0.113:8000/envoy/interventions?userId=${userId}`)
                ]);

                setOverview(await ovRes.json());
                setMembers(await memRes.json());
                setInterventions(await intRes.json());
            } catch (e) {
                console.error("Failed to load team data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="p-8 text-slate-400">Loading Team Intelligence...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-sans">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Users className="w-8 h-8 text-violet-500" />
                    Team Operations
                </h1>
                <p className="text-slate-400 mt-2">Operational intelligence and coordination health.</p>
            </header>

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
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xs font-bold ${m.attentionScore < 50 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {m.attentionScore}% Focus
                                        </div>
                                        <div className="text-[10px] text-slate-500">{m.dependencyLoad} deps</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 py-2 text-xs font-bold text-violet-400 border border-violet-900/50 rounded-lg hover:bg-violet-900/20 transition-colors">
                            Manage Roles
                        </button>
                    </div>
                </div>

                {/* CENTER: Intelligence Panels */}
                <div className="lg:col-span-6 space-y-6">
                    {/* Overview Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Coordination Debt</div>
                            <div className={`text-2xl font-black ${overview?.coordinationDebt === 'High' ? 'text-rose-500' : 'text-amber-500'}`}>
                                {overview?.coordinationDebt}
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Leakage Score</div>
                            <div className="text-2xl font-black text-violet-500">
                                {overview?.leakageScore}%
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Dependency Risk</div>
                            <div className="text-2xl font-black text-rose-500">
                                {overview?.dependencyRisk}
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
                                <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-lg relative group">
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
                                        <button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold py-1.5 rounded">
                                            Resolve
                                        </button>
                                        <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-1.5 rounded">
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
    );
}