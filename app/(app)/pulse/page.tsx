"use client";

import React, { useState, useEffect } from 'react';
import {
    Zap, Clock, AlertTriangle, CheckCircle, XCircle, ArrowRight,
    CornerDownRight, BarChart3, TrendingUp, TrendingDown,
    MessageSquare, Users, User, Calendar, Flag, Activity, Layers, Info,
    MoreHorizontal, Filter, Search, Sparkles, Plus, Target, Rocket
} from 'lucide-react';
import { useAuth } from '../../providers/AuthContext';

import { api } from '@/lib/api';

// --- TYPES & INTERFACES ---

type EventType = 'status_change' | 'comment' | 'blocker' | 'milestone' | 'handoff' | 'task_deleted';

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
const SprintHealthCard = ({ data, isNewUser }: { data: ProjectHealth; isNewUser?: boolean }) => {
    const totalSlots = 25;

    const totalTasks = (data?.sprint?.completed ?? 0) + (data?.sprint?.remaining ?? 0);

    const currentDayIndex = 15; // Example: we are at bar 15 of 25
    const hasData = totalTasks > 0;

    return (
        <div className={`bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 group transition-all hover:border-slate-700 ${isNewUser ? 'min-h-[120px]' : ''}`}>
            <div className="flex-1 w-full sm:w-auto">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Sprint Health
                </p>
                <div className="flex items-center gap-4 text-sm font-medium flex-wrap">
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

            <div className="w-full sm:w-52 h-16 flex items-end gap-[2px]">
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
                        <div key={i} className="flex-1 h-full bg-slate-800/30 rounded-t-full relative">
                            <div
                                className={`absolute bottom-0 left-0 right-0 rounded-t-full transition-all duration-1000
                                ${isCurrent ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' :
                                        isPast ? 'bg-slate-600' : 'bg-slate-800'}
                            `}
                                style={{
                                    height: `${Math.max(barHeight, 4)}%`,
                                    transitionDelay: `${i * 10}ms`
                                }}
                            />
                        </div>
                    );
                }) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg border border-dashed border-slate-700/70">
                        <span className="text-xs text-slate-500 font-medium">Start sprint to track progress</span>
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

const PulseInsights = ({ data, isNewUser }: { data: ProjectHealth; isNewUser: boolean }) => {
    const isBlocker = data.blockers?.type === 'blocker';
    const velocityStyles = {
        High: { gradient: 'from-emerald-500 to-teal-500', icon: TrendingUp, text: 'High Velocity' },
        Medium: { gradient: 'from-indigo-500 to-purple-500', icon: Activity, text: 'Steady Pace' },
        Low: { gradient: 'from-amber-500 to-orange-500', icon: TrendingDown, text: 'Slow Burn' },
    };
    const currentVelocity = velocityStyles[data.velocity];
    const VelocityIcon = currentVelocity.icon;

    return (
        <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Velocity Card */}
                <div className={`bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm hover:border-slate-700 transition-all min-h-[120px] flex flex-col justify-between ${isNewUser ? 'opacity-90' : ''}`}>
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5" />
                            Team Velocity
                        </p>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${currentVelocity.gradient} flex items-center justify-center shadow-lg`}>
                                <VelocityIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-slate-200">{currentVelocity.text}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {isNewUser ? 'Complete tasks to build velocity' : 'Based on recent activity'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Blockers Card */}
                <div className={`bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm hover:border-slate-700 transition-all min-h-[120px] flex flex-col justify-between ${data.blockers?.count === 0 ? 'opacity-90' : ''}`}>
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {isBlocker ? 'Blockers' : 'Dependencies'}
                        </p>
                        {data.blockers?.count === 0 || isNewUser ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                                    <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-emerald-400">All Clear</p>
                                    <p className="text-xs text-slate-500 mt-0.5">No blockers detected</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg">
                                    <XCircle className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-rose-400">{data.blockers?.count} Active</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Requires attention</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sprint Health */}
                <SprintHealthCard data={data} isNewUser={isNewUser} />
            </div>
        </div>
    );
};

const TeamSidebar = ({ members, isNewUser }: { members: TeamMember[]; isNewUser: boolean }) => {
    const hasMembers = members && members.length > 0;

    return (
        <div className="sticky top-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Team
                    </h3>
                    {!isNewUser && (
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded-full text-slate-400 font-medium">
                            {members.length}
                        </span>
                    )}
                </div>

                {!hasMembers ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-slate-800/30 to-slate-900/30 rounded-xl border border-dashed border-slate-700/50">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4 border border-indigo-500/30">
                            <Users className="w-8 h-8 text-indigo-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-300 mb-2">Build your team</p>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                            Invite teammates to collaborate and track progress together
                        </p>
                        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                            Invite Team
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 flex-1">
                        {isNewUser && (
                            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3 mb-4">
                                <p className="text-xs text-indigo-300 flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Sample team shown. Invite real teammates!
                                </p>
                            </div>
                        )}
                        {members.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-all group cursor-pointer border border-transparent hover:border-slate-700"
                            >
                                <div className="relative">
                                    <img
                                        src={member.avatar}
                                        alt={member.name}
                                        className="w-10 h-10 rounded-full border-2 border-slate-700 group-hover:border-indigo-500 transition-colors"
                                    />
                                    <div className="absolute -bottom-0.5 -right-0.5">
                                        <StatusPill status={member.status} />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-slate-200 truncate">{member.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{member.role}</p>
                                    {member.currentTask && (
                                        <p className="text-xs text-indigo-400 mt-1 truncate flex items-center gap-1">
                                            <Target className="w-3 h-3" />
                                            {member.currentTask}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <WorkloadIndicator level={member.workload} />
                                    <span className="text-xs text-slate-500 font-medium">{member.workload}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ActivityStream = ({ events, isNewUser }: { events: PulseEvent[]; isNewUser: boolean }) => {
    const hasEvents = events && events.length > 0;

    const eventIcons: Record<EventType, typeof Zap> = {
        status_change: Zap,
        comment: MessageSquare,
        blocker: AlertTriangle,
        milestone: Flag,
        handoff: CornerDownRight,
        task_deleted: XCircle
    };

    const eventStyles: Record<EventType, string> = {
        status_change: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        comment: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        blocker: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        milestone: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        handoff: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        task_deleted: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Activity Feed
                </h3>
                {!isNewUser && hasEvents && (
                    <button className="text-xs text-slate-500 hover:text-slate-300 font-medium flex items-center gap-1 transition-colors">
                        <Filter className="w-3.5 h-3.5" />
                        Filter
                    </button>
                )}
            </div>

            {!hasEvents ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-slate-800/30 to-slate-900/30 rounded-xl border border-dashed border-slate-700/50">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-5 border border-indigo-500/30">
                        <Rocket className="w-10 h-10 text-indigo-400" />
                    </div>
                    <p className="text-lg font-semibold text-slate-300 mb-2">Ready for takeoff!</p>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed max-w-sm">
                        Your activity feed will come alive as you and your team create tasks, collaborate, and make progress
                    </p>
                    <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-indigo-500/20">
                        <Plus className="w-4 h-4" />
                        Create First Task
                    </button>
                </div>
            ) : (
                <>
                    {isNewUser && (
                        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4 mb-4">
                            <p className="text-xs text-indigo-300 flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5" />
                                Sample activity shown. Your real activity will appear here as you work!
                            </p>
                        </div>
                    )}
                    <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                        {events.map((evt) => {
                            const EventIcon = eventIcons[evt.type];
                            return (
                                <div
                                    key={evt.id}
                                    className="group relative flex gap-4 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700 cursor-pointer"
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${eventStyles[evt.type]}`}>
                                        <EventIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <p className="text-sm font-semibold text-slate-200">
                                                {evt.actor.name} <span className="text-slate-500 font-normal">on</span> {evt.targetTask}
                                            </p>
                                            <span className="text-xs text-slate-500 whitespace-nowrap">{evt.timestamp}</span>
                                        </div>
                                        <p className="text-sm text-slate-400 leading-relaxed">{evt.details}</p>
                                        {evt.actionRequired && (
                                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-1 rounded-md">
                                                <Info className="w-3 h-3" />
                                                Action required
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

const PulseFocusComponent = ({
    currentTask,
    nextTask,
    rationale,
    isNewUser
}: {
    currentTask: string | null;
    nextTask: string | null;
    rationale: string | null;
    isNewUser: boolean;
}) => {
    const hasFocus = currentTask || nextTask;

    return (
        <div className="sticky top-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg min-h-[300px] flex flex-col">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        My Focus
                    </h3>
                </div>

                {!hasFocus ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-slate-800/30 to-slate-900/30 rounded-xl border border-dashed border-slate-700/50">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4 border border-purple-500/30">
                            <Target className="w-8 h-8 text-purple-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-300 mb-2">Set your focus</p>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                            Create tasks to prioritize your work and stay on track
                        </p>
                        <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                            Add Task
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 flex-1">
                        {isNewUser && (
                            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 mb-4">
                                <p className="text-xs text-purple-300 flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Your AI-powered focus will appear here
                                </p>
                            </div>
                        )}
                        {currentTask && (
                            <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/40 p-4 rounded-xl">
                                <p className="text-xs text-indigo-300 uppercase tracking-wide font-bold mb-2 flex items-center gap-1.5">
                                    <Zap className="w-3.5 h-3.5" />
                                    Current Focus
                                </p>
                                <p className="text-sm font-semibold text-slate-200 leading-relaxed">{currentTask}</p>
                            </div>
                        )}

                        {nextTask && (
                            <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                                <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mb-2 flex items-center gap-1.5">
                                    <ArrowRight className="w-3.5 h-3.5" />
                                    Up Next
                                </p>
                                <p className="text-sm font-semibold text-slate-300 leading-relaxed">{nextTask}</p>
                            </div>
                        )}

                        {rationale && (
                            <div className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-lg">
                                <p className="text-xs text-slate-500 leading-relaxed">{rationale}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function PulsePage() {
    const { userId, jwt } = useAuth();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [activityEvents, setActivityEvents] = useState<PulseEvent[]>([]);
    const [focusData, setFocusData] = useState<{ currentTask: string | null; nextTask: string | null; rationale: string | null }>({ currentTask: null, nextTask: null, rationale: null });
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

        const textToCopy = 'https://tasklinex.vercel.app';

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                //alert("App Invite link copied!");
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
                    api.get(`/pulse/events?userId=${userId}`, jwt), // Pass userId to filter
                    api.get(`/pulse/${userId}`, jwt),
                    api.get(`/pulse/stats?userId=${userId}`, jwt),
                ]);

                const mappedTeam: TeamMember[] = Array.isArray(teamData) ? teamData.map((m: {
                    id: string;
                    name: string;
                    role: string;
                    status?: string;
                    workload?: number;
                    currentTask?: string
                }) => ({
                    id: m.id,
                    name: m.name,
                    role: m.role,
                    avatar: `https://ui-avatars.com/api/?name=${m.name}&background=random`,
                    status: (m.status || 'offline') as TeamMember['status'],
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
                        {isNewUser ? 'Welcome! Let\'s get started with your first task.' : 'Synchronize with your team without the meetings.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {teamMembers.length > 0 && (
                        <div className="flex -space-x-3">
                            {teamMembers.slice(0, 5).map(m => (
                                <img key={m.id} src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full border-2 border-slate-950" />
                            ))}
                            {teamMembers.length > 5 && (
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold border-2 border-slate-950">
                                    +{teamMembers.length - 5}
                                </div>
                            )}
                        </div>
                    )}
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* Left: Team Sidebar (25%) */}
                    <div className="lg:col-span-3">
                        <TeamSidebar members={isNewUser ? [] : teamMembers} isNewUser={isNewUser} />
                    </div>

                    {/* Middle: Activity Feed (50%) */}
                    <div className="lg:col-span-6">
                        <ActivityStream events={isNewUser ? [] : activityEvents} isNewUser={isNewUser} />
                    </div>

                    {/* Right: My Focus (25%) */}
                    <div className="lg:col-span-3">
                        <PulseFocusComponent
                            currentTask={focusData.currentTask}
                            nextTask={focusData.nextTask}
                            rationale={focusData.rationale}
                            isNewUser={isNewUser}
                        />

                        {/* Mini Widget: Upcoming Deadlines */}
                        {!isNewUser && (
                            <div className="mt-6 bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> This Week
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex gap-3 items-start p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                                        <div className="flex flex-col items-center min-w-[35px] bg-slate-700 rounded-lg p-2">
                                            <span className="text-xs font-bold text-slate-400">OCT</span>
                                            <span className="text-lg font-black text-slate-200">24</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold leading-tight text-slate-200">Client Demo: V1 Prototype</p>
                                            <p className="text-xs text-rose-400 mt-1 font-medium flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Risk: High
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(71, 85, 105, 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(71, 85, 105, 0.8);
                }
            `}</style>
        </div>
    );
}
