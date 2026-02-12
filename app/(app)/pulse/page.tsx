"use client";

import React, { useState, useEffect } from 'react';
import { 
    Zap, Clock, AlertTriangle, CheckCircle, XCircle, ArrowRight, 
    CornerDownRight, BarChart3, TrendingUp, TrendingDown, 
    MessageSquare, Users, User, Calendar, Flag, Activity, Layers, Info,
    MoreHorizontal, Filter, Search 
} from 'lucide-react';
import { useAuth } from '../../providers/AuthContext';

import { api } from '@/lib/api';

// --- TYPES & INTERFACES ---

type EventType = 'status_change' | 'comment' | 'blocker' | 'milestone' | 'handoff';

interface TeamMember {
    id: string;
    name: string;
    role: string;
    avatar: string;
    status: 'online' | 'busy' | 'offline';
    workload: number; // 0-100%
    currentTask?: string;
}

interface PulseEvent {
    id: string;
    type: EventType;
    actor: TeamMember;
    targetTask: string;
    targetLink: string;
    details: string; // e.g., "Moved to In Progress"
    timestamp: string; // Relative time e.g., "2m ago"
    metadata?: {
        from?: string;
        to?: string;
        blockerReason?: string;
    };
    actionRequired?: boolean;
}

// Upper Element - Blockers & Dependencies, Sprint Health and Team Velocity
interface ProjectHealth {
    velocity: 'High' | 'Medium' | 'Low';
    blockers?: {
        count: number;
        type: 'blocker' | 'dependency';
    };
    sprint?: {
        daysLeft: number;
        completed: number;
        remaining: number;
    };
    isNewUser?: boolean;
}

// --- SAMPLE DATA FOR NEW USERS ---

const SAMPLE_MEMBERS: TeamMember[] = [
    { id: 's1', name: 'Bob', role: 'Frontend', avatar: 'https://ui-avatars.com/api/?name=B+O&background=random', status: 'online', workload: 45 },
    { id: 's2', name: 'Jane', role: 'Backend', avatar: 'https://ui-avatars.com/api/?name=J+A&background=random', status: 'busy', workload: 70 },
    { id: 's3', name: 'Denise', role: 'Design', avatar: 'https://ui-avatars.com/api/?name=D+E&background=random', status: 'offline', workload: 20 },
];

const SYSTEM_EVENTS: PulseEvent[] = [
    {
        id: 'se1', type: 'status_change',
        actor: { id: 'sys', name: 'System', role: 'Bot', avatar: 'https://ui-avatars.com/api/?name=System&background=000&color=fff', status: 'online', workload: 0 },
        targetTask: 'Welcome to TaskLinex', targetLink: '#',
        details: 'Your TaskLinex account has been created.', timestamp: 'Just now'
    },
    {
        id: 'se2', type: 'comment',
        actor: { id: 'sys', name: 'System', role: 'Bot', avatar: 'https://ui-avatars.com/api/?name=System&background=000&color=fff', status: 'online', workload: 0 },
        targetTask: 'First Steps', targetLink: '#',
        details: 'This is a sample Pulse feed. Create your first task to see real activity here.', timestamp: 'Just now'
    },
];

// Sprint Health Graph
const SprintHealthCard  = ({ data, isNewUser }: { data: ProjectHealth, isNewUser?: boolean }) => {
    const totalSlots = 25;

    var totalTasks = (data?.sprint?.completed ?? 0) + (data?.sprint?.remaining ?? 0);

    const currentDayIndex = 15; // Example: we are at bar 15 of 25
    const hasData = totalTasks > 0;

    return (
        <div className={`bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 group ${isNewUser ? 'opacity-75' : ''}`}>
            <div className="flex-1 w-full sm:w-auto">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Sprint Health</p>
                <div className="flex items-center gap-4 text-sm font-medium">
                    <span className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> {data.sprint?.completed ?? 0} Done
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-4 h-4 text-indigo-500" /> {data.sprint?.daysLeft ?? 0}d left
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-300">
                        <Layers className="w-4 h-4 text-amber-500" /> {data.sprint?.remaining ?? 0} Remaining
                    </span>
                </div>
            </div>

            <div className="w-full sm:w-52 h-14 flex items-end gap-[2px]">
                {hasData ? Array.from({ length: totalSlots }).map((_, i) => {
                    // 2. Logic: Is this bar in the past, present, or future?
                    const isPast = i < currentDayIndex;
                    const isCurrent = i === currentDayIndex;
                    
                    let barHeight = 0;
                    const completed = data.sprint?.completed ?? 0;
                    if (isPast) {
                        barHeight = (i / currentDayIndex) * (completed / (totalTasks || 1)) * 100;
                    } else if (isCurrent) {
                        barHeight = (completed / (totalTasks || 1)) * 100;
                    } else {
                        barHeight = 5; // Placeholder for future days
                    }

                    return (
                        <div key={i} className="flex-1 h-full bg-slate-100 dark:bg-slate-800/30 rounded-t-full relative">
                            <div 
                                className={`absolute bottom-0 left-0 right-0 rounded-t-full transition-all duration-1000
                                    ${isCurrent ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 
                                      isPast ? 'bg-slate-400 dark:bg-slate-600' : 'bg-slate-200 dark:bg-slate-800'}
                                `}
                                style={{ 
                                    height: `${Math.max(barHeight, 4)}%`,
                                    transitionDelay: `${i * 10}ms`
                                }}
                            />
                        </div>
                    ); 
                }) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                        <span className="text-xs text-slate-500">No sprint data yet</span>
                    </div>
                )}
            </div>
        </div>
    );
};




// --- HELPER COMPONENTS ---

const StatusPill = ({ status }: { status: string }) => {
    const colors = {
        online: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
        busy: 'bg-amber-500',
        offline: 'bg-gray-400'
    };
    return (
        <span className={`h-2.5 w-2.5 rounded-full ${colors[status as keyof typeof colors] || colors.offline} ring-2 ring-slate-950`} />
    );
};

const WorkloadIndicator = ({ level }: { level: number }) => {
    let color = 'bg-emerald-500';
    if (level > 70) color = 'bg-amber-500';
    if (level > 90) color = 'bg-rose-500';

    return (
        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
                className={`h-full ${color} transition-all duration-500`} 
                style={{ width: `${level}%` }} 
            />
        </div>
    );
};

// --- CORE COMPONENTS ---

const PulseInsights = ({ data, isNewUser }: { data: ProjectHealth, isNewUser: boolean }) => {
    const velocityColors = {
        High: 'text-emerald-500',
        Medium: 'text-amber-500',
        Low: 'text-rose-500'
    };

    const velocityIcons = {
        High: <TrendingUp className="w-5 h-5" />,
        Medium: <BarChart3 className="w-5 h-5" />,
        Low: <TrendingDown className="w-5 h-5" />
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Velocity */}
            <div className={`bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm group hover:border-indigo-600 transition-all duration-300 ${isNewUser ? 'opacity-75' : ''}`}>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Team Velocity</p>
                <div className="flex items-center justify-between">
                    <span className={`text-2xl font-extrabold ${velocityColors[data.velocity]}`}>{data.velocity}</span>
                    <div className={velocityColors[data.velocity]}>
                        {velocityIcons[data.velocity]}
                    </div>
                </div>
                {isNewUser && <p className="text-xs text-slate-500 mt-2">Complete tasks to track velocity</p>}
            </div>

            {/* Blockers */}
            <div className={`bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm group hover:border-rose-600 transition-all duration-300 ${isNewUser ? 'opacity-75' : ''}`}>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Active Blockers</p>
                <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-rose-500">{data.blockers?.count ?? 0}</span>
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <p className="text-xs text-slate-500 mt-2">Urgent {data.blockers?.type ?? 'issues'}</p>
            </div>

            {/* Sprint Health */}
            <SprintHealthCard data={data} isNewUser={isNewUser} />
        </div>
    );
};

const TeamSidebar = ({ members, isNewUser }: { members: TeamMember[], isNewUser: boolean }) => {
    return (
        <div className={`bg-slate-900 border border-slate-800 p-5 rounded-2xl sticky top-8 ${isNewUser ? 'opacity-75' : ''}`}>
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <Users className="w-4 h-4" /> Team ({members.length})
                </h3>
                <button className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors">View All</button>
            </div>

            {isNewUser && (
                <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                    <p className="text-xs text-indigo-300">👥 Sample team members shown</p>
                    <p className="text-xs text-slate-400 mt-1">Invite colleagues to see real team data</p>
                </div>
            )}

            <div className="space-y-3">
                {members.map(member => (
                    <div key={member.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer group">
                        <div className="relative">
                            <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full" />
                            <div className="absolute -bottom-0.5 -right-0.5">
                                <StatusPill status={member.status} />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{member.name}</p>
                            <p className="text-xs text-slate-500 truncate">{member.role}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                                <WorkloadIndicator level={member.workload} />
                                <span className="text-[10px] text-slate-500 font-mono">{member.workload}%</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {members.length === 0 && !isNewUser && (
                <div className="text-center py-8">
                    <User className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm text-slate-500">No team members yet</p>
                    <button className="mt-3 text-xs text-indigo-500 hover:text-indigo-400">Invite teammates</button>
                </div>
            )}
        </div>
    );
};

const ActivityStream = ({ events, isNewUser }: { events: PulseEvent[], isNewUser: boolean }) => {
    const eventTypeLabels = {
        status_change: '📝 Status Update',
        comment: '💬 Comment',
        blocker: '🚫 Blocker',
        milestone: '🎯 Milestone',
        handoff: '🔄 Handoff'
    };

    const eventTypeColors = {
        status_change: 'border-indigo-500/30 bg-indigo-500/5',
        comment: 'border-blue-500/30 bg-blue-500/5',
        blocker: 'border-rose-500/30 bg-rose-500/5',
        milestone: 'border-emerald-500/30 bg-emerald-500/5',
        handoff: 'border-amber-500/30 bg-amber-500/5'
    };

    return (
        <div className={`bg-slate-900 border border-slate-800 p-5 rounded-2xl ${isNewUser ? 'opacity-75' : ''}`}>
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Activity Stream
                </h3>
                <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                        <Filter className="w-4 h-4 text-slate-500" />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                        <Search className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
            </div>

            {isNewUser && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-xs text-amber-300">📊 Sample activity shown</p>
                    <p className="text-xs text-slate-400 mt-1">Your real activity will appear here as you work</p>
                </div>
            )}

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {events.map((event, index) => (
                    <div 
                        key={event.id} 
                        className={`border rounded-xl p-4 ${eventTypeColors[event.type]} hover:border-opacity-60 transition-all duration-300 group`}
                        style={{ 
                            animation: `slideInFromRight 0.4s ease-out ${index * 0.05}s both`
                        }}
                    >
                        <div className="flex items-start gap-3">
                            <img src={event.actor.avatar} alt={event.actor.name} className="w-9 h-9 rounded-full flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-1.5">
                                    <div>
                                        <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                                            {event.actor.name}
                                        </span>
                                        <span className="text-xs text-slate-500 ml-2">{event.actor.role}</span>
                                    </div>
                                    <span className="text-xs text-slate-500 font-mono">{event.timestamp}</span>
                                </div>

                                <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                                    <span className="inline-block">{eventTypeLabels[event.type]}</span>
                                    <ArrowRight className="w-3 h-3 flex-shrink-0" />
                                    <a href={event.targetLink} className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors truncate">
                                        {event.targetTask}
                                    </a>
                                </p>

                                <p className="text-sm text-slate-300 leading-relaxed">{event.details}</p>

                                {event.actionRequired && (
                                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                                        <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors">
                                            <Flag className="w-3 h-3" /> Review Required
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {events.length === 0 && !isNewUser && (
                <div className="text-center py-12">
                    <Activity className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                    <p className="text-sm text-slate-500">No activity yet</p>
                    <p className="text-xs text-slate-600 mt-1">Updates will appear here as you work</p>
                </div>
            )}

            <style jsx>{`
                @keyframes slideInFromRight {
                    from {
                        opacity: 0;
                        transform: translateX(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgb(15 23 42 / 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgb(71 85 105 / 0.8);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgb(100 116 139);
                }
            `}</style>
        </div>
    );
};

const PulseFocusComponent = ({ 
    currentTask, 
    nextTask, 
    rationale, 
    isNewUser 
}: { 
    currentTask: any; 
    nextTask: any; 
    rationale: string | null; 
    isNewUser: boolean;
}) => {
    return (
        <div className={`bg-slate-900 border border-slate-800 p-5 rounded-2xl sticky top-8 ${isNewUser ? 'opacity-75' : ''}`}>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-5 flex items-center gap-2">
                <Zap className="w-4 h-4" /> My Focus
            </h3>

            {isNewUser && (
                <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p className="text-xs text-purple-300">🎯 Sample focus shown</p>
                    <p className="text-xs text-slate-400 mt-1">Create tasks to see your real focus</p>
                </div>
            )}

            {/* Current Task */}
            <div className="mb-6">
                <p className="text-xs text-slate-500 uppercase font-bold mb-2 flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Current
                </p>
                {currentTask ? (
                    <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl hover:border-indigo-600 transition-all group">
                        <h4 className="font-semibold text-slate-200 mb-2 group-hover:text-white transition-colors">{currentTask.title}</h4>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30">{currentTask.status}</span>
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30">{currentTask.priority}</span>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800/30 border border-dashed border-slate-700 p-4 rounded-xl text-center">
                        <XCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-xs text-slate-500">No task in progress</p>
                    </div>
                )}
            </div>

            {/* Next Recommended */}
            <div>
                <p className="text-xs text-slate-500 uppercase font-bold mb-2">Up Next</p>
                {nextTask ? (
                    <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl hover:border-indigo-600 transition-all group">
                        <h4 className="font-semibold text-slate-300 mb-2 group-hover:text-white transition-colors">{nextTask.title}</h4>
                        <div className="flex items-center gap-2 text-xs mb-3">
                            <span className="px-2 py-1 bg-slate-700/50 text-slate-400 rounded-md">{nextTask.status}</span>
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30">{nextTask.priority}</span>
                        </div>
                        {rationale && (
                            <div className="pt-3 border-t border-slate-700/50">
                                <p className="text-xs text-slate-400 flex items-start gap-2">
                                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-indigo-500" />
                                    <span className="leading-relaxed">{rationale}</span>
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-slate-800/30 border border-dashed border-slate-700 p-4 rounded-xl text-center">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-xs text-slate-500">All caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export default function PulsePage() {
    const { userId, jwt } = useAuth();

    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [activityEvents, setActivityEvents] = useState<PulseEvent[]>([]);
    const [focusData, setFocusData] = useState<any>({ currentTask: null, nextTask: null, rationale: null });
    const [stats, setStats] = useState<ProjectHealth>({
        velocity: 'Medium',
        blockers: { count: 0, type: 'blocker' },
        sprint: { daysLeft: 0, completed: 0, remaining: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [hasSeenActivity, setHasSeenActivity] = useState(false);
    const [inviteStatus, setInviteStatus] = useState<'idle' | 'animating'>('idle');

    // STRICT CHECK: Only show placeholders if backend explicitly says isNewUser is true.
    // If stats.isNewUser is undefined (e.g. API error/429), default to FALSE to prevent placeholders from reappearing.
    const isNewUser = !loading && stats.isNewUser === true;

    function copyToClipboard() {
        setInviteStatus('animating');
        setTimeout(() => setInviteStatus('idle'), 2000);

        const textToCopy = 'http://192.168.0.117:3000';

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                alert("Invite link copied!");
            }).catch(err => {
                console.error("Error: ", err);
            });
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;            
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    alert("Invite link copied!");
                }
            } catch (err) {
                console.error("Error while generating invite link!", err);
            }
            
            document.body.removeChild(textArea);
        }
    }

    useEffect(() => {
        if (!userId || !jwt) return;

        const fetchData = async () => {
            try {
                const [teamData, activityData, focusData, statsData] = await Promise.all([
                    api.get(`/team/members?userId=${userId}`, jwt),
                    // FIXED: Changed from /pulse/events to /pulse/activity with userId parameter
                    api.get(`/pulse/activity?userId=${userId}`, jwt),
                    api.get(`/pulse/${userId}`, jwt),
                    api.get(`/pulse/stats?userId=${userId}`, jwt),
                ]);

                const mappedTeam: TeamMember[] = Array.isArray(teamData) ? teamData.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    role: m.role,
                    avatar: `https://ui-avatars.com/api/?name=${m.name}&background=random`,
                    status: m.status || 'offline',
                    workload: m.workload || Math.floor(Math.random() * 100),
                    currentTask: m.currentTask
                })) : [];
                
                setTeamMembers(mappedTeam);
                if (mappedTeam.length > 0) setHasSeenActivity(true);

                const events = Array.isArray(activityData) ? activityData : [];
                setActivityEvents(events);
                if (events.length > 0) setHasSeenActivity(true);

                if (focusData) {
                    setFocusData(focusData);
                }

                if (statsData) {
                    setStats(statsData);
                }

            } catch (error) {
                console.error("Failed to fetch pulse data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
        // Poll for updates every 5 seconds
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [userId, jwt]);
    
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
            {/* Header Area */}
            <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                        TaskLinex <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Pulse</span>
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Synchronize with your team without the meetings.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                         {teamMembers.slice(0, 5).map(m => (
                             <img key={m.id} src={m.avatar} className="w-8 h-8 rounded-full border-2 border-slate-950" />
                         ))}
                         {teamMembers.length > 5 && (
                             <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold border-2 border-slate-950">
                                 +{teamMembers.length - 5}
                             </div>
                         )}
                    </div>
                    <button 
                        onClick={copyToClipboard} 
                        className={`bg-slate-900 text-sm font-semibold py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-all duration-500 ease-out ${inviteStatus === 'animating' ? 'px-12 bg-indigo-900/30 border-indigo-500/50 text-indigo-300' : 'px-4'}`}
                    >
                        {inviteStatus === 'animating' ? 'Link Copied!' : 'Invite'}
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {/* 1. Top Level Insights */}
                <PulseInsights data={stats} isNewUser={isNewUser} />

                {/* 2. Main Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left: Team Sidebar (20%) */}
                    <div className="hidden lg:block lg:col-span-3">
                        <TeamSidebar members={isNewUser ? SAMPLE_MEMBERS : teamMembers} isNewUser={isNewUser} />
                    </div>

                    {/* Middle: Activity Feed (50%) */}
                    <div className="lg:col-span-6">
                        <ActivityStream events={isNewUser ? SYSTEM_EVENTS : activityEvents} isNewUser={isNewUser} />
                    </div>

                    {/* Right: My Focus (30%) */}
                    <div className="lg:col-span-3">
                        <PulseFocusComponent 
                            currentTask={focusData.currentTask} 
                            nextTask={focusData.nextTask} 
                            rationale={focusData.rationale} 
                            isNewUser={isNewUser}
                        />
                        
                        {/* Mini Widget: Upcoming Deadlines */}
                        <div className="mt-6 bg-slate-900 p-5 rounded-2xl border border-slate-800">
                             <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> This Week
                             </h4>
                             <div className="space-y-3">
                                <div className="flex gap-3 items-start">
                                    <div className="flex flex-col items-center min-w-[30px]">
                                        <span className="text-xs font-bold text-gray-400">OCT</span>
                                        <span className="text-lg font-black text-gray-800 dark:text-gray-200">24</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold leading-tight">Client Demo: V1 Prototype</p>
                                        <p className="text-xs text-rose-500 mt-1 font-medium">Risk: High</p>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}