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
    const isBlocker = data.blockers?.type === 'blocker';
    const velocityStyles = {
        High: { color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/20', iconColor: 'text-emerald-600', textSize: 'text-xl' },
        Medium: { color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/20', iconColor: 'text-amber-600', textSize: 'text-lg' },
        Low: { color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/20', iconColor: 'text-rose-600', textSize: 'text-xl' }
    };

    const status = velocityStyles[data.velocity] || velocityStyles.Medium;

    return (
        <>
        {isNewUser && (
            <div className="mb-6 bg-violet-900/20 border border-violet-500/30 p-3 rounded-lg flex items-center gap-3 text-sm text-violet-200">
                <Info className="w-4 h-4 text-violet-400" />
                Insights populate as your team starts working.
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm flex items-center justify-between ${isNewUser ? 'opacity-75' : ''}`}>
                <div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Team Velocity</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`${status.textSize} font-black text-slate-200`}>
                            {isNewUser ? '—' : data.velocity}
                        </span>
                        <TrendingUp className={`w-5 h-5 ${status.color}`} />
                    </div>
                </div>
                <div className={`h-10 w-10 ${status.bg} rounded-lg flex items-center justify-center`}>
                    <Zap className={`w-5 h-5 ${status.iconColor}`} />
                </div>
            </div>
            
            {((data.blockers?.count ?? 0) > 0 || isNewUser) && (
                <div className={`bg-slate-900 border ${isBlocker ? 'border-rose-200 dark:border-rose-900/50' : 'border-amber-200 dark:border-amber-900/50'} p-4 rounded-xl shadow-sm flex items-center justify-between relative overflow-hidden`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isBlocker ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                            {isBlocker ? 'Active Blockers' : 'External Dependencies'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-2xl font-black ${isBlocker ? 'text-rose-600' : 'text-amber-600'}`}>
                                {isNewUser ? '0 (sample)' : `${data.blockers?.count ?? 0} ${(data.blockers?.count ?? 0) === 1 ? 'Issue' : 'Issues'}`}
                            </span>
                        </div>
                    </div>
                        <a href="/analytics" 
                       className={`
                            text-xs px-4 py-2 rounded-lg font-bold
                            transition-all duration-200 ease-out
                            cursor-pointer outline-none active:scale-95                            
                            border border-slate-700/50 
                            
                            ${isBlocker 
                                ? `bg-rose-900/80 text-rose-100 hover:bg-rose-800 
                                hover:border-rose-500/50
                                shadow-[0_4px_12px_-4px_rgba(225,29,72,0.6)]` 
                                : `bg-slate-800 text-slate-300 hover:bg-slate-700
                                hover:text-slate-100
                                hover:border-slate-500/50
                                shadow-[0_4px_12px_-4px_rgba(0,0,0,0.5)]`
                            }
                        `}>
                            View
                        </a>
                </div>
            )}

            {/* SPRINT HEALTH FIELD */}

            {((data.sprint?.daysLeft ?? 0) > 0 || isNewUser) && (
                <SprintHealthCard data={data} isNewUser={isNewUser} />
            )}
        </div>
        </>
    );
};


const TeamSidebar = ({ members, isNewUser }: { members: TeamMember[], isNewUser: boolean }) => {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 h-fit sticky top-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" /> Team Pulse
                </h3>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{members.filter(member => member.status === 'online').length} Online</span>
            </div>

            <div className={`space-y-5 ${isNewUser ? 'opacity-60' : ''}`}>
                {members.map((member) => (
                    <div key={member.id} className="group relative">
                        <div className="flex items-start gap-3">
                            <div className="relative">
                                <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-800" />
                                <div className="absolute -bottom-1 -right-1">
                                    <StatusPill status={member.status} />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-0.5">
                                    <h4 className="text-sm font-bold text-slate-200">{member.name}</h4>
                                    <div className="flex items-center gap-1">
                                        {isNewUser && <span className="text-[9px] bg-slate-800 px-1 rounded text-slate-500">Sample</span>}
                                        <span className="text-[10px] text-slate-500">{member.role}</span>
                                    </div>
                                </div>
                                <WorkloadIndicator level={member.workload} />
                                {member.currentTask && (
                                    <p className="text-xs text-slate-400 mt-1 truncate group-hover:text-indigo-500 transition-colors">
                                        <Activity className="w-3 h-3 inline mr-1 text-slate-500" />
                                        {member.currentTask}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
                {isNewUser ? (
                    <button className="text-sm text-violet-400 font-semibold hover:underline">Invite teammates to replace these placeholders</button>
                ) : (
                    <button className="text-sm text-indigo-400 font-semibold hover:underline">View Schedule</button>
                )}
            </div>
        </div>
    );
};

// Feed Sections Main Content
const FeedItem = ({ event, isSample }: { event: PulseEvent, isSample?: boolean }) => {
    // COLOR SCHEME AND ICONOGRAPHY
    const getStyles = (event: PulseEvent) => {
        if (event.details === 'Task Deleted') {
            return { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-900' };
        }
        switch(event.type) {
            case 'blocker':
                return { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-900' };
            case 'status_change':
                return { icon: ArrowRight, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-900' };
            case 'handoff':
                return { icon: User, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-900' };
            default:
                return { icon: MessageSquare, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-800' };
          }
    };

    const style = getStyles(event);
    const Icon = style.icon;
    const isDeleted = event.details === 'Task Deleted';
    
    return (
        <div className="flex gap-3 sm:gap-4 relative pb-8 last:pb-0">
            {/* Timeline Line */}
            <div className={`absolute left-[19px] top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800 last:hidden ${isSample ? 'opacity-50' : ''}`} />

            {/* Avatar */}
            <div className="relative z-10">
                <img 
                    src={event.actor.avatar} 
                    alt={event.actor.name} 
                    className="w-10 h-10 rounded-full border-4 border-gray-50 dark:border-gray-950 object-cover shadow-sm" 
                />
                <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-gray-900 ${style.color}`}>
                    <Icon className="w-3 h-3" />
                </div>
            </div>

            {/* Content Card */}
            <div className={`flex-1 p-3 sm:p-4 rounded-xl border ${style.border} ${style.bg} relative group transition-all hover:shadow-md ${isSample ? 'opacity-80' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-1 gap-1 sm:gap-0">
                    <p className="text-sm text-slate-200">
                        <span className="font-bold">{event.actor.name}</span> <span className="text-slate-400 font-normal">{event.details}</span> <span className={`font-semibold ${isDeleted ? 'text-rose-400' : 'text-indigo-400 hover:underline cursor-pointer'}`}>"{event.targetTask}"</span>
                        {isSample && <span className="ml-2 text-[10px] bg-slate-800/50 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">Sample</span>}
                    </p>
                    <span className="text-xs text-slate-500 whitespace-nowrap ml-0 sm:ml-2">{event.timestamp}</span>
                </div>

                {/* Metadata / Details */}
                {/* WHEN OBSTACLE */}
                {event.metadata?.blockerReason && (
                    <div className="mt-2 p-2 bg-rose-100 dark:bg-rose-950/50 rounded-lg text-xs text-rose-800 dark:text-rose-200 font-medium flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        "{event.metadata.blockerReason}"
                    </div>
                )}
                {/* WHEN CONTINUING */}
                {event.metadata?.from && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-mono text-slate-400">
                        {/* TASK FROM */}
                        <span className="px-2 py-0.5 bg-slate-800/50 rounded">{event.metadata.from}</span>
                        <ArrowRight className="w-3 h-3" />
                        {/* TASK TO */}
                        <span className="px-2 py-0.5 bg-slate-800/50 rounded font-bold text-slate-200">{event.metadata.to}</span>
                    </div>
                )}

                {/* Action Options */}
                <div className="mt-3 flex gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    {event.actionRequired ? (
                        <button className="text-xs flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-700 shadow-sm text-slate-200 hover:text-emerald-500 font-semibold">
                            <CheckCircle className="w-3 h-3" /> Resolve
                        </button>
                    ) : (
                         <button className="text-xs flex items-center gap-1 bg-transparent hover:bg-slate-800/50 px-2 py-1 rounded text-slate-400">
                            <MessageSquare className="w-3 h-3" /> Reply
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ActivityStream = ({ events, isNewUser }: { events: PulseEvent[], isNewUser: boolean }) => {
    const safeEvents = Array.isArray(events) ? events : [];
    return (
        <div className="bg-slate-950 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-800 h-[600px] flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4 sm:gap-0 shrink-0">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-200 flex items-center gap-2">
                    Activity Stream
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h2>
                
                {/* 🔎🔎SEARCH FIELD 🔎🔎 */}
                <div className="flex gap-2 w-full sm:w-auto">
                     <div className="relative flex-1 sm:flex-none">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Filter feed..." 
                            className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-48 transition-all focus:w-full sm:focus:w-64"
                        />
                    </div>
                    <button className="p-2 border border-slate-700 rounded-lg hover:bg-slate-800 text-slate-400">
                        <Filter className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* EVENT FIELD */}
            <div className="pl-2 flex-1 overflow-y-auto pr-2">
                {safeEvents.map(event => (
                    <FeedItem key={event.id} event={event} isSample={isNewUser} />
                ))}

                {isNewUser ? (
                    <div className="mt-8 p-4 bg-slate-900/50 border border-dashed border-slate-800 rounded-xl text-center">
                        <p className="text-sm text-slate-400 mb-2">Try creating a task, commenting, or changing a status to see how activity appears here.</p>
                        <button className="text-xs text-indigo-400 font-semibold hover:text-indigo-300">
                            Create your first task &rarr;
                        </button>
                    </div>
                ) : (
                    <div className="mt-8 text-center pb-4">
                        <button className="text-sm text-slate-400 hover:text-indigo-400 transition-colors flex items-center justify-center w-full gap-2">
                            <Clock className="w-3 h-3" /> Load previous updates
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Pulse Focus ---
const PulseFocusComponent = ({ currentTask, nextTask, rationale, isNewUser }: { currentTask: any, nextTask: any, rationale: string, isNewUser: boolean }) => {
    if (!currentTask && !nextTask) {
        return (
            isNewUser ? (
            <div className="bg-slate-950 text-white p-6 rounded-2xl shadow-2xl border border-slate-800 relative lg:sticky lg:top-6 flex flex-col items-center justify-center text-center min-h-[300px]">
                <h2 className="text-xl font-bold mb-2 text-violet-200">Your Focus will appear here</h2>
                <p className="text-slate-400 text-sm mb-6">When you create tasks, TaskLinex highlights what matters most.</p>
                <a href='/roadmap' className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-bold text-sm mb-3 w-full transition-colors">Create your first task</a>
                <button className="text-violet-400 hover:text-violet-300 text-xs font-medium">Let Envoy generate a demo task</button>
            </div>
            ) : (
            <div className="bg-slate-950 text-white p-6 rounded-2xl shadow-2xl border border-slate-800 relative lg:sticky lg:top-6 flex flex-col items-center justify-center text-center min-h-[300px]">
                <div className="bg-slate-900 p-4 rounded-full mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">All Caught Up!</h2>
                <p className="text-slate-400 text-sm">You have no active tasks. Take a breather or pick something from the backlog.</p>
            </div>
            )
        );
    }

    return (
        <div className="bg-slate-950 text-white p-6 rounded-2xl shadow-2xl border border-indigo-500/30 relative lg:sticky lg:top-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-1">My Focus</h3>
                    <h2 className="text-xl font-bold truncate max-w-[200px]">{currentTask ? currentTask.title : "Ready for next"}</h2>
                </div>
                {currentTask && (
                    <div className="bg-indigo-600 animate-pulse px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Active
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {currentTask ? (
                    <div className="bg-slate-800/50 p-4 rounded-xl border-l-4 border-indigo-500">
                        <div className="flex justify-between text-xs text-slate-400 mb-2">
                            <span>Progress</span>
                            <span>{currentTask.progress}%</span>
                        </div>
                        <p className="font-medium text-sm">{currentTask.title}</p>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${currentTask.progress}%` }} />
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800/30 p-4 rounded-xl border border-dashed border-slate-700 text-center">
                        <p className="text-sm text-slate-400">No active task selected.</p>
                    </div>
                )}

                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Up Next</p>
                    {nextTask && (
                        <div className={`flex items-center justify-between p-3 ${nextTask.priority === 'High' ? 'bg-rose-900/30' : 'bg-slate-800/30'} rounded-lg hover:bg-slate-800 transition cursor-pointer group`}>
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                                <span className="text-sm text-slate-300">{nextTask.title}</span>
                            </div>
                            {nextTask.priority === 'High' && <Zap className="w-3 h-3 text-red-400" />}
                        </div>
                    )}
                    {rationale && (
                        <div className="p-3 bg-indigo-900/20 rounded-lg border border-indigo-500/20">
                            <p className="text-xs text-indigo-300 italic">"{rationale}"</p>
                        </div>
                    )}
                </div>

            </div>

            <button className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/50 transition-all transform hover:scale-[1.02]">
                Resume Context
            </button>
        </div>
    );
};

// --- MAIN PAGE LAYOUT ---

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
                console.error("Fehler: ", err);
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
                        api.get(`/pulse/events`, jwt),
                        api.get(`/pulse/${userId}`, jwt), // Ensure this endpoint exists in backend!
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
                         <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold border-2 border-slate-950">+2</div>
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