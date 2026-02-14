"use client";

import React, {
    createContext, useContext, useReducer, useEffect, useState, useMemo, useRef
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from "framer-motion";
import {
    Check, Eye, Loader2, AlertCircle, Sparkles, Info, ChevronRight, Ban, Hourglass, Lightbulb,
    CheckCircle, ArrowRight, XCircle, FolderPlus, Trash2,
    GitCommit, Layers, Zap, BrainCircuit, UserCog, LayoutGrid, List, Calendar, RefreshCw, Plus, Search, X, ChevronDown, Unlink, Settings2, EyeOff,
    MessageSquareWarning, AlertOctagon
} from 'lucide-react';
import { useAuth } from "@/app/providers/AuthContext";

// 1. BACKEND-READY TYPES & INTERFACES
type TaskStatus = 'On Track' | 'At Risk' | 'Blocked' | 'Completed';
type Priority = 'High' | 'Medium' | 'Low';
type ViewMode = 'Week' | 'Month';
type TimelineView = 'Daily' | 'Weekly' | 'Monthly'; // NEW: Timeline granularity
type LayoutMode = 'Roadmap' | 'Board' | 'Sprint';
type DependencyType = 'blocked_by' | 'waiting_on' | 'helpful_if_done_first';

// The "Persona" allows one user to wear multiple hats (e.g., Lead vs Contributor)
interface Persona {
    id: string;
    name: string;
    role: string;
    capacity: number; // 0-100
    color: string;
}

interface User {
    id: string;
    name: string;
    avatar: string;
    baseCapacity: number;
    personas: Persona[];
}


interface Dependency {
    id: string;
    type: DependencyType;
    note: string | null;
    from_task_id: string;
    from_task_title: string;
    from_task_status: TaskStatus;
    to_task_id?: string;
    to_task_title?: string;
}

interface DependencySummary {
    [key: string]: number;
}

interface EnvoySuggestion {
    id: string;
    type: 'handoff' | 'slippage' | 'blocker';
    message: string;
    confidence: number;
    actionLabel: string;
}

interface Task {
    id: string;
    projectId: string;
    title: string;
    startDate: number;
    duration: number; // Actual duration
    plannedDuration: number; // For slippage visualization
    progress: number;
    status: TaskStatus;
    priority: Priority;
    ownerId: string;
    ownerName?: string;
    personaId?: string; // Which "hat" is the owner wearing?
    dependencyIds: string[]; // Array of IDs this task depends on
    handOffToId?: string;
    dependents?: Task[];
    dependencyNote?: string;
    dependencyType?: string;
    isMilestone?: boolean;
    tags: string[];
    dependencySummary?: DependencySummary;
    envoySuggestion?: EnvoySuggestion;
}

interface Project {
    id: string;
    name: string;
    visible: boolean;
}

// Global Filter State
interface FilterState {
    query: string;
    owners: string[];
    statuses: TaskStatus[];
    onlyMyPersonas: boolean;
}

interface AddTaskModalProps {
    onClose: () => void;
    taskToEdit?: Task;
}

interface Proposal {
    id: string;
    field: 'status' | 'priority' | 'startDate' | 'duration' | 'plannedDuration' | 'dependencyIds' | 'tags';
    suggested: any;
    reason?: string;
}

interface EnvoyDrawerProps {
    taskId: string;
    isOpen: boolean;
    onClose: () => void;
    onUpdateSuccess?: () => void;
}
interface BalanceSuggestion {
    id: string;
    type: 'reassign' | 'create_persona' | 'delete_persona';
    taskId?: string;
    taskTitle?: string;
    currentPersona?: string;
    suggestedPersona?: string;
    personaName?: string;
    reason: string;
    priority: 'High' | 'Medium' | 'Low';
}


// ==========================================
// 2. MOCK DATA & API SIMULATION
// ==========================================


const MOCK_USERS: User[] = [
    {
        id: 'u1', name: 'Matthew', avatar: 'https://i.pravatar.cc/150?u=1', baseCapacity: 80,
        personas: [
            { id: 'p_u1_1', name: 'Matt (Lead)', role: 'Lead', capacity: 40, color: 'bg-purple-500' },
            { id: 'p_u1_2', name: 'Matt (Dev)', role: 'Dev', capacity: 60, color: 'bg-blue-500' }
        ]
    },
{
    id: 'u2', name: 'Sarah', avatar: 'https://i.pravatar.cc/150?u=2', baseCapacity: 95,
    personas: [{ id: 'p_u2_1', name: 'Sarah', role: 'Data Scientist', capacity: 95, color: 'bg-emerald-500' }]
},
{
    id: 'u3', name: 'David', avatar: 'https://i.pravatar.cc/150?u=3', baseCapacity: 40,
    personas: [{ id: 'p_u3_1', name: 'David', role: 'Backend', capacity: 40, color: 'bg-indigo-500' }]
}
];

const MOCK_PROJECTS: Project[] = [
    { id: 'proj2', name: 'Web Dashboard V2', visible: true }
];

const MOCK_TASKS: Task[] = [
    {
        id: 't1', projectId: 'proj1', title: 'Model Training P1', startDate: 1, duration: 4, plannedDuration: 4,
        progress: 100, status: 'Completed', priority: 'High', ownerId: 'u1', personaId: 'p_u1_1', dependencyIds: [], tags: ['AI']
    }
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface TriggerProps {
    onTrigger: () => void;
    isActive: boolean;
}

const ActionButton: React.FC<TriggerProps> = ({ onTrigger, isActive }) => (
    <button
    onClick={onTrigger}
    disabled={isActive}
    className="btn-trigger"
    >
    {isActive ? 'Active...' : 'Show Notification'}
    </button>
);

// Async Placeholder
const MockAPI = {
    sleep: (ms: number) => new Promise(r => setTimeout(r, ms)),
    // Newly added: Fetchdata to replace MOCK data
    fetchData: async (token: string) => {
        const headers = { Authorization: `Bearer ${token}` };
        const [tasksRes, personasRes, projectsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/renderTask`, { headers, cache: 'no-store' }),
                                                                       fetch(`${API_BASE_URL}/renderPersona`, { headers, cache: 'no-store' }),
                                                                       fetch(`${API_BASE_URL}/projects`, { headers, cache: 'no-store' })
        ]);

        if (tasksRes.status === 401 || personasRes.status === 401 || projectsRes.status === 401) {
            throw new Error("Unauthorized");
        }

        try {
            const tasks = await tasksRes.json();
            const personasData = await personasRes.json();
            const projects = await projectsRes.json();

            // Map backend personas to frontend structure
            const mappedPersonas = Array.isArray(personasData) ? personasData.map((p: any) => ({
                id: p.id,
                name: p.name,
                role: 'Member',
                capacity: 100,
                color: 'bg-indigo-500'
            })) : [];

            return {
                tasks: Array.isArray(tasks) ? tasks : [],
                users: [],
                projects: Array.isArray(projects) ? projects : MOCK_PROJECTS,
                personas: mappedPersonas
            };
        } catch (error) {
            console.error("Error fetching tasks:", error);
            return { tasks: [], users: [], projects: MOCK_PROJECTS, personas: [] };
        }
    },
    // Newly added: CreateTask to replace MOCK data
    createTask: async (task: Task, token: string) => {
        const response = await fetch(`${API_BASE_URL}/createTask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(task)
        });
        if (!response.ok)  {
            console.log(response);
            throw new Error('Failed to create task')
        }
        return response.json();
    },
    completeTask: async (taskId: string, userId: string, token: string) => {
        const response = await fetch(`${API_BASE_URL}/completeTask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ taskId, userId })
        });
        if (!response.ok) throw new Error('Failed to complete task');
        return response.json();
    },
    autoBalance: async (tasks: Task[]) => {
        await MockAPI.sleep(1200);
        // Simulate logic: Find overloaded user, move task to underloaded user
        const newTasks = [...tasks];
        const riskyTask = newTasks.find(t => t.id === 't3');
        if (riskyTask) {
            riskyTask.ownerId = 'u1'; // Reassign
            riskyTask.status = 'On Track';
        }
        return newTasks;
    },
    triggerEnvoyAction: async (taskId: string, action: string) => {
        await MockAPI.sleep(1000);
        return { success: true, message: `Envoy executed: ${action}` };
    },
    createDependency: async (dep: { from_task_id: string, to_task_id: string, type: string, note?: string, userId: string }, token: string) => {
        const response = await fetch(`${API_BASE_URL}/dependencies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(dep)
        });
        if (!response.ok) throw new Error('Failed to create dependency');
        return response.json();
    },
    fetchDependencies: async (taskId: string, token: string) => {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/dependencies`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch dependencies');
        return response.json();
    },
    updateDependency: async (depId: string, update: { type?: DependencyType, note?: string }, userId: string, token: string) => {
        const response = await fetch(`${API_BASE_URL}/dependencies/${depId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...update, userId })
        });
        if (!response.ok) throw new Error('Failed to update dependency');
        return response.json();
    },
    deleteDependency: async (depId: string, userId: string, token: string) => {
        const response = await fetch(`${API_BASE_URL}/dependencies/${depId}/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete dependency');
        return response.json();
    },
    fetchEnvoyFriction: async (taskId: string, token: string) => {
        const response = await fetch(`${API_BASE_URL}/envoy/task/${taskId}/friction`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch Envoy friction data');
        return response.json();
    },
    lookupDependency: async (fromId: string, toId: string, token: string) => {
        const response = await fetch(`${API_BASE_URL}/dependencies/lookup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ from_task_id: fromId, to_task_id: toId })
        });
        if (!response.ok) throw new Error('Dependency not found');
        return response.json();
    }
};

// ==========================================
// 3. STORE & STATE MANAGEMENT (Context)
// ==========================================

interface AppState {
    tasks: Task[];
    users: User[];
    projects: Project[];
    personas: Persona[];
    currentUser: User | null; // The logged in user
    activePersonaId: string | null; // Which "Hat" they are wearing
    isLoading: boolean;
    filters: FilterState;
    layoutMode: LayoutMode;
    viewMode: ViewMode;
    timelineView: TimelineView; // NEW: Daily/Weekly/Monthly granularity
    hiddenProjects: Set<string>; // NEW: Track hidden projects
    envoyActive: string | null; // Task ID interacting with Envoy
    viewingDependenciesFor: string | null;
}
type Action =
| { type: 'INIT_DATA', payload: any }
| { type: 'SET_ACTIVE_PERSONA', payload: any }
| { type: 'SET_FILTER', payload: Partial<FilterState> }
| { type: 'SET_LAYOUT_MODE', payload: LayoutMode }
| { type: 'SET_VIEW_MODE', payload: ViewMode }
| { type: 'SET_TIMELINE_VIEW', payload: TimelineView }
| { type: 'TOGGLE_PROJECT_VISIBILITY', payload: string }
| { type: 'TOGGLE_PERSONA', payload: string }
| { type: 'ADD_TASK', payload: Task[] }
| { type: 'UPDATE_TASKS', payload: Task[] }
| { type: 'SET_LOADING', payload: boolean }
| { type: 'TRIGGER_ENVOY', payload: string | null }
| { type: 'VIEW_DEPENDENCIES', payload: string | null }
| { type: 'DELETE_PROJECT', payload: string };

const initialState: AppState = {
    tasks: [], users: [], projects: [], personas: [],
    currentUser: null, // Simulating logged in as Matthew
    activePersonaId: 'p_u1_1',
    isLoading: true,
    layoutMode: 'Roadmap',
    viewMode: 'Week',
    timelineView: 'Weekly', // NEW: Default to weekly view
    hiddenProjects: new Set(), // NEW: Track hidden projects
    envoyActive: null,
    viewingDependenciesFor: null,
    filters: { query: '', owners: [], statuses: [], onlyMyPersonas: false }
};

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

function appReducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'INIT_DATA':
            // Preserve currentUser if not provided in payload
            const currentUser = action.payload.currentUser || state.currentUser;
            return {
                ...state,
                ...action.payload,
                currentUser,
                isLoading: false
            };
        case 'SET_ACTIVE_PERSONA':
            return {...state,activePersonaId:action.payload}
        case 'SET_LAYOUT_MODE':
            return { ...state, layoutMode: action.payload };
        case 'SET_FILTER':
            return { ...state, filters: { ...state.filters, ...action.payload } };
        case 'SET_VIEW_MODE':
            return { ...state, viewMode: action.payload };
        case 'SET_TIMELINE_VIEW': // NEW
            return { ...state, timelineView: action.payload };
        case 'TOGGLE_PROJECT_VISIBILITY': { // NEW
            const set = new Set(state.hiddenProjects);
            if (set.has(action.payload)) set.delete(action.payload);
            else set.add(action.payload);
            return { ...state, hiddenProjects: set };
        }
        case 'TOGGLE_PERSONA':
            return { ...state, activePersonaId: action.payload === state.activePersonaId ? null : action.payload };
        case 'UPDATE_TASKS':
            return { ...state, tasks: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'TRIGGER_ENVOY':
            return { ...state, envoyActive: action.payload };
        case 'DELETE_PROJECT':
            return {
                ...state,
                projects: state.projects.filter(p => p.id !== action.payload),
                tasks: state.tasks.filter(t => t.projectId !== action.payload)
            };
        case 'VIEW_DEPENDENCIES':
            return { ...state, viewingDependenciesFor: action.payload };
        default: return state;
    }
}

// Helper to find task in tree
const findTask = (tasks: Task[], id: string): Task | undefined => {
    for (const task of tasks) {
        if (task.id === id) return task;
        if (task.dependents) {
            const found = findTask(task.dependents, id);
            if (found) return found;
        }
    }
    return undefined;
};

const PortalTooltip = ({ text, rect }: { text: string, rect: DOMRect }) => {
    if (typeof document === 'undefined') return null;

    const top = rect.top - 10;
    const left = rect.left + (rect.width / 2);

    return createPortal(
        <div
        className="fixed z-[9999] flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-95 duration-200"
        style={{ top: top, left: left, transform: 'translate(-50%, -100%)' }}
        >
        <div className="bg-slate-900/90 backdrop-blur text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700/50 flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-indigo-400 font-bold uppercase tracking-wider text-[9px]">Note:</span>
        <span className="font-medium max-w-[200px] truncate">{text}</span>
        </div>
        <div className="w-1.5 h-1.5 bg-slate-900/90 rotate-45 -mt-0.5 border-r border-b border-slate-700/50"></div>
        </div>,
        document.body
    );
};

// NEW: Helper functions for timeline view calculations with proper date handling
const getDateRangeForView = (timelineView: TimelineView, viewMode: ViewMode) => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    let totalUnits = 0;
    let unitDuration = 0; // in milliseconds
    let unitType: 'day' | 'week' | 'month' = 'day';

    if (timelineView === 'Daily') {
        // Show 90 days for long scrolling
        totalUnits = 90;
        unitDuration = 24 * 60 * 60 * 1000; // 1 day in ms
        unitType = 'day';
    } else if (timelineView === 'Weekly') {
        // Show 52 weeks (1 year) for long scrolling
        totalUnits = 52;
        unitDuration = 7 * 24 * 60 * 60 * 1000; // 1 week in ms
        unitType = 'week';
    } else { // Monthly
        // Show 24 months (2 years) for long scrolling
        totalUnits = 24;
        unitType = 'month';
    }

    return { totalUnits, unitDuration, unitType, startDate };
};

const generateTimelineLabels = (timelineView: TimelineView, totalUnits: number, startDate: Date): string[] => {
    const labels: string[] = [];

    for (let i = 0; i < totalUnits; i++) {
        const currentDate = new Date(startDate);

        if (timelineView === 'Daily') {
            currentDate.setDate(currentDate.getDate() + i);
            labels.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        } else if (timelineView === 'Weekly') {
            currentDate.setDate(currentDate.getDate() + (i * 7));
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekEnd.getDate() + 6);
            labels.push(`${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
        } else { // Monthly
            currentDate.setMonth(currentDate.getMonth() + i);
            labels.push(currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
        }
    }

    return labels;
};

// Calculate task position based on actual dates
const calculateTaskPosition = (
    taskStartDate: number, // Unix timestamp in seconds
    taskDuration: number, // Duration in seconds
    timelineView: TimelineView,
    startDate: Date,
    totalUnits: number
) => {
    const taskStartMs = taskStartDate * 1000;
    const taskEndMs = taskStartMs + (taskDuration * 1000);
    const startMs = startDate.getTime();

    let cellWidth = 0;
    let leftPosition = 0;
    let widthUnits = 0;

    if (timelineView === 'Daily') {
        cellWidth = 120; // px per day
        const daysSinceStart = Math.floor((taskStartMs - startMs) / (24 * 60 * 60 * 1000));
        const durationDays = Math.ceil(taskDuration / (24 * 60 * 60));
        leftPosition = daysSinceStart * cellWidth;
        widthUnits = durationDays * cellWidth;
    } else if (timelineView === 'Weekly') {
        cellWidth = 150; // px per week
        const weeksSinceStart = Math.floor((taskStartMs - startMs) / (7 * 24 * 60 * 60 * 1000));
        const durationWeeks = Math.ceil(taskDuration / (7 * 24 * 60 * 60));
        leftPosition = weeksSinceStart * cellWidth;
        widthUnits = durationWeeks * cellWidth;
    } else { // Monthly
        cellWidth = 200; // px per month
        const startDateObj = new Date(startMs);
        const taskStartDateObj = new Date(taskStartMs);
        const monthsSinceStart = (taskStartDateObj.getFullYear() - startDateObj.getFullYear()) * 12 +
        (taskStartDateObj.getMonth() - startDateObj.getMonth());
        const durationMonths = Math.ceil(taskDuration / (30 * 24 * 60 * 60));
        leftPosition = monthsSinceStart * cellWidth;
        widthUnits = durationMonths * cellWidth;
    }

    return { leftPosition, widthUnits, cellWidth };
};

// 4. SUB-COMPONENTS

// Calculates connections based on grid positions (Row Index & Column Index)
const DependencyLayer = ({ tasks, projects, viewMode, collapsedProjects }: { tasks: Task[], projects: Project[], viewMode: ViewMode, collapsedProjects: string[] }) => {
    // Flatten tasks to find their visual row index
    const visibleProjects = projects.filter(p => p.visible);
    let rowMap = new Map<string, number>();
    let currentRow = 0;

    visibleProjects.forEach(p => {
        const isCollapsed = collapsedProjects.includes(p.id);
        currentRow++; // Project Header

        if (isCollapsed) {
            return;
        }

        const projectTasks = tasks.filter(t => t.projectId === p.id);
        projectTasks.forEach(t => {
            rowMap.set(t.id, currentRow);
            currentRow++;
        });
    });

    const colWidth = 8.33; // %
    const rowHeight = 56;
    const headerOffset = 140;

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
        {tasks.map(task => {
            if (!task.dependencyIds || task.dependencyIds.length === 0) return null;
            const endRow = rowMap.get(task.id);
            if (endRow === undefined) return null;

            return task.dependencyIds.map(depId => {
                const depTask = tasks.find(t => t.id === depId);
                const startRow = rowMap.get(depId);
                if (!depTask || startRow === undefined) return null;

                // Coordinates
                const x1 = (depTask.startDate + depTask.duration - 1) * colWidth + "%";
                const y1 = (startRow * rowHeight) + (rowHeight / 2) + 20; // +20 fudge factor for padding
                const x2 = (task.startDate - 1) * colWidth + "%";
                const y2 = (endRow * rowHeight) + (rowHeight / 2) + 20;

                // Path Logic (Curved connector)
                return (
                    <g key={`${depId}-${task.id}`}>
                    <path
                    d={`M ${x1} ${y1} C ${parseInt(x1) + 5}% ${y1}, ${parseInt(x2) - 5}% ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={task.status === 'Blocked' ? '#f43f5e' : '#6366f1'}
                    strokeWidth="2"
                    strokeDasharray={task.status === 'On Track' ? '0' : '4'}
                    className="opacity-40"
                    />
                    <circle cx={x2} cy={y2} r="3" fill={task.status === 'Blocked' ? '#f43f5e' : '#6366f1'} />
                    </g>
                );
            });
        })}
        </svg>
    );
};

const DependencyBadge = ({ type, count, onClick }: { type: string, count: number, onClick: () => void }) => {
    if (count === 0) return null;

    const config: Record<string, { icon: React.ElementType, color: string, label: string }> = {
        blocked_by: { icon: Ban, color: 'text-rose-500', label: 'Blocked by' },
        waiting_on: { icon: Hourglass, color: 'text-amber-500', label: 'Waiting on' },
        helpful_if_done_first: { icon: Lightbulb, color: 'text-sky-500', label: 'Helpful if done' }
    };

    const { icon: Icon, color, label } = config[type];

    return (
        <button onClick={onClick} className={`flex items-center gap-1 text-xs font-semibold ${color} bg-white/80 dark:bg-slate-900/80 px-2 py-1 rounded-full border border-current/20 backdrop-blur-sm`} title={`${label}: ${count}`}>
        <Icon className="w-3 h-3" />
        <span>{count}</span>
        </button>
    );
};

// Task Item
const TaskItem = ({
    task, user, dispatch, isEnvoyActive, onEdit, personas, onTaskDrop, level = 0,
    parentId, onToggleExpand, isExpanded, hasDependents, timelineView, startDate, totalUnits
}: {
    task: Task, user: User | undefined, dispatch: any, isEnvoyActive: boolean,
    onEdit: (t: Task) => void, personas: Persona[],
                  onTaskDrop: (sourceId: string, targetId: string) => void, level?: number,
                  parentId?: string | null,
                  onToggleExpand?: () => void,
                  isExpanded?: boolean,
                  hasDependents?: boolean,
                  timelineView: TimelineView,
                  startDate: Date,
                  totalUnits: number
}) => {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const taskRef = useRef<HTMLDivElement>(null);
    const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
    const statusColor = {
        'On Track': 'bg-indigo-500', 'At Risk': 'bg-amber-500', 'Blocked': 'bg-rose-500', 'Completed': 'bg-emerald-500'
    };
    const currentStatusColor = statusColor[task.status as keyof typeof statusColor] || 'bg-slate-500';
    const assignedPersona = personas?.find(p => p.id === task.personaId);

    // Calculate slippage
    const isSlipping = task.duration > task.plannedDuration;
    const ghostWidth = (task.plannedDuration / task.duration) * 100;

    const ownerName = user?.name || task.ownerName || 'Unknown';
    const ownerAvatar = user?.avatar || `https://ui-avatars.com/api/?name=${ownerName}&background=random`;

    // Calculate position based on actual dates
    const { leftPosition, widthUnits } = calculateTaskPosition(
        task.startDate,
        task.duration,
        timelineView,
        startDate,
        totalUnits
    );

    return (
        <div
        ref={taskRef}
        onMouseEnter={() => { if (taskRef.current) setHoverRect(taskRef.current.getBoundingClientRect()); }}
        onMouseLeave={() => setHoverRect(null)}
        draggable
        onDragStart={(e) => {
            setHoverRect(null);
            e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, parentId: parentId || null }));
            e.dataTransfer.effectAllowed = 'link';
        }}
        onDragOver={(e) => { // Allow drop
            e.preventDefault();
            e.dataTransfer.dropEffect = 'link';
        }}
        onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const dataStr = e.dataTransfer.getData('application/json');
            if (dataStr) {
                const { taskId: sourceId } = JSON.parse(dataStr);
                if (sourceId && sourceId !== task.id) {
                    onTaskDrop(sourceId, task.id);
                }
            }
        }}
        className="absolute top-1/2 -translate-y-1/2 group cursor-grab active:cursor-grabbing"
        style={{
            left: `${leftPosition}px`,
            width: `${widthUnits}px`,
            height: level > 0 ? '2rem' : '2.5rem',
            minWidth: '60px'
        }}
        >
        {/* width: `${task.duration * 8.33}%`,
        height: level > 0 ? '2rem' : '2.5rem'
        }}
        > */}
        {/* Dependency Note Tooltip */}
        {task.dependencyNote && hoverRect && (
            <PortalTooltip text={task.dependencyNote} rect={hoverRect} />
        )}

        {/* NEW: Left Side Trigger (Hover) */}
        <button
        onClick={() => onEdit(task)} // Trigger the edit flow
        className="absolute top-6 -right-3 z-[60] bg-white dark:bg-slate-900 text-gray-400 rounded-full shadow transition-all scale-0 group-hover:scale-100 hover:text-indigo-600 p-1">
        <Info className="w-4 h-4" />
        </button>

        {/* Envoy Trigger (Hover) - Right Side */}
        <button
        ref={triggerRef}
        onClick={() => dispatch({ type: 'TRIGGER_ENVOY', payload: isEnvoyActive ? null : task.id })}
        className={`absolute -top-3 -right-3 z-[60] bg-white dark:bg-slate-900 rounded-full p-1 shadow border transition-all ${task.envoySuggestion ? 'text-indigo-600 scale-100' : 'text-gray-400 scale-0 group-hover:scale-100'}`}
        >
        <BrainCircuit className="w-4 h-4" />
        </button>


        {/* Envoy Popup */}
        {/* {isEnvoyActive && (
            <EnvoyPopup task={task} onClose={() => dispatch({ type: 'TRIGGER_ENVOY', payload: null })} triggerRef={triggerRef} />
    )} */}

    {/* Ghost Bar */}
    {isSlipping && (
        <div className="absolute inset-0 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md opacity-50 w-full" style={{ width: `${ghostWidth}%` }} />
    )}

    {/* Main Bar */}
    <div className={`
        relative h-full rounded-md shadow-sm
        flex items-center px-2 gap-2 overflow-hidden
        ${currentStatusColor}
        transition-all transition-gpu duration-300 ease-in-out
        group-hover:w-max hover:min-w-full hover:z-50 hover:shadow-xl
        `}>
        {/* Dropdown Toggle for Dependents */}
        {hasDependents && onToggleExpand && (
            <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="relative z-20 mr-1 p-0.5 rounded hover:bg-black/20 text-white/80 hover:text-white transition-colors"
            title="Toggle Dependents"
            >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
        )}

        <div className="absolute left-0 top-0 bottom-0 bg-black/20" style={{ width: `${task.progress}%` }} />

        <span className={`relative z-10 font-bold text-white truncate transition-all duration-300 ${level > 0 ? 'text-[11px]' : 'text-xs'}`}>
        {task.title}
        </span>

        <img
        src={ownerAvatar}
        className={`relative z-10 rounded-full border border-white/30 flex-shrink-0 ${level > 0 ? 'w-5 h-5' : 'w-6 h-6'}`}
        alt={ownerName}
        title={ownerName}
        />

        <div className="absolute bottom-1 left-2 z-20 flex items-center gap-1.5">
        <DependencyBadge type="blocked_by" count={task.dependencySummary?.blocked_by_count || 0} onClick={() => dispatch({ type: 'VIEW_DEPENDENCIES', payload: task.id })} />
        <DependencyBadge type="waiting_on" count={task.dependencySummary?.waiting_on_count || 0} onClick={() => dispatch({ type: 'VIEW_DEPENDENCIES', payload: task.id })} />
        <DependencyBadge type="helpful_if_done_first" count={task.dependencySummary?.helpful_if_done_first_count || 0} onClick={() => dispatch({ type: 'VIEW_DEPENDENCIES', payload: task.id })} />
        </div>


        {/* Persona Indicator */}
        {assignedPersona && (
            <div className="absolute bottom-0.5 right-0.5 z-20 w-4 h-4 rounded-full bg-violet-600 text-[8px] flex items-center justify-center text-white border border-white font-bold" title={assignedPersona.name}>
            {assignedPersona.name.charAt(0).toUpperCase()}
            </div>
        )}
        </div>

        {/* Handoff Indicator */}
        {task.handOffToId && (
            <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center text-white border border-white z-20">
            <ArrowRight className="w-3 h-3" />
            </div>
        )}
        </div>
    );
};

// HUD
const WorkloadHUD = () => {
    const { state, dispatch } = useContext(AppContext)!;
    const personas = ['P1','P2'];

    if (state.isLoading) {
        return (
            <div className="flex items-center gap-6 px-6 py-3 bg-white dark:bg-[#0B1120] border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            <div className="flex flex-col gap-1">
            <div className="h-2 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2 min-w-[140px] animate-pulse">
                <div className="flex justify-between items-center"><div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 rounded" /></div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>
            ))}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-6 px-6 py-3 bg-white dark:bg-[#0B1120] border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <div className="flex flex-col">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Capacity</span>
        <span className="text-xs text-slate-500">Persona View</span>
        </div>
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
        {state.users.map(user => {
            // If the user is the current logged-in user, show persona toggles
            const isCurrentUser = state.currentUser?.id === user.id;

            return (
                <div key={user.id} className="flex flex-col gap-1 min-w-[140px]">
                <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                <img src={user.avatar} className="w-6 h-6 rounded-full" alt={user.name} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{user.name}</span>
                </div>
                <span className="text-[10px] text-slate-400">{user.baseCapacity}%</span>
                </div>

                {/* Capacity Bar */}
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${user.baseCapacity > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${user.baseCapacity}%` }} />
                </div>

                {/* Persona Pills */}
                {isCurrentUser && (
                    <div className="flex gap-1 mt-1">
                    {personas.map((item,index) => (
                        <button
                        key={item}
                        onClick={() => dispatch({ type: 'TOGGLE_PERSONA', payload: item })}
                        className={`grid-cols-4 gap-x-4 text-[9px] px-1.5 py-0.5 rounded border transition-colors ${state.activePersonaId === index.toString() ? 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300' : 'bg-transparent border-slate-200 text-slate-500'}`}
                        >
                        {item}
                        </button>
                    ))}
                    </div>
                )}
                </div>
            );
        })}
        {/* THE POP UP SHOULD APPEAR ON THIS PART OF THE PAGE ALLIGNED TO THE RIGHT THAT IS VIOLET-700 */}





        </div>
    );
};

// Add Task Modal
const AddTaskModal = ({ onClose, taskToEdit}: AddTaskModalProps) => {
    const { state, dispatch } = useContext(AppContext)!;
    const { jwt, user, logout } = useAuth();
    const headline = taskToEdit?  'Update Task Details': "Add New Task";
    const buttontitle = taskToEdit? 'Edit Task':'Create Task';

    // Helper functions for date conversion
    const timestampToDateString = (timestamp?: number) => {
        if (!timestamp) return '';
        const date = new Date(timestamp * 1000);
        return date.toISOString().split('T')[0];
    };

    const dateStringToTimestamp = (dateStr: string) => {
        if (!dateStr) return Math.floor(Date.now() / 1000);
        return Math.floor(new Date(dateStr).getTime() / 1000);
    };

    // Fallback defaults
    const [title, setTitle] = useState(taskToEdit?.title || '');
    const [projectId, setProjectId] = useState(taskToEdit?.projectId || state.projects[0]?.id || '');
    const [ownerId, setOwnerId] = useState(taskToEdit?.ownerId || state.currentUser?.id || state.users[0]?.id || '');
    const [startDate, setStartDate] = useState(taskToEdit?.startDate || 1);
    const [startDateInput, setStartDateInput] = useState(timestampToDateString(taskToEdit?.startDate));
    const [duration, setDuration] = useState(taskToEdit?.duration || 1);
    const [deadlineInput, setDeadlineInput] = useState(() => {
        if (taskToEdit?.startDate && taskToEdit?.duration) {
            const deadline = taskToEdit.startDate + (taskToEdit.duration * 7 * 24 * 60 * 60);
            return timestampToDateString(deadline);
        }
        return '';
    });
    const [status, setStatus] = useState<TaskStatus>(taskToEdit?.status || 'On Track');
    const [priority, setPriority] = useState<Priority>(taskToEdit?.priority || 'Medium');

    const currentUserId = state.currentUser?.id || user?.id;

    // Update duration when deadline changes
    const handleDeadlineChange = (deadlineStr: string) => {
        setDeadlineInput(deadlineStr);
        if (startDateInput && deadlineStr) {
            const start = dateStringToTimestamp(startDateInput);
            const end = dateStringToTimestamp(deadlineStr);
            const durationInWeeks = Math.max(1, Math.ceil((end - start) / (7 * 24 * 60 * 60)));
            setDuration(durationInWeeks);
        }
    };

    // Update deadline when start date changes
    const handleStartDateChange = (startStr: string) => {
        setStartDateInput(startStr);
        if (startStr) {
            setStartDate(dateStringToTimestamp(startStr));
            if (deadlineInput) {
                const start = dateStringToTimestamp(startStr);
                const end = dateStringToTimestamp(deadlineInput);
                const durationInWeeks = Math.max(1, Math.ceil((end - start) / (7 * 24 * 60 * 60)));
                setDuration(durationInWeeks);
            }
        }
    };

    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskToEdit) return;

        if (window.confirm("Are you sure you want to delete this task?")) {
            try {
                const response = await fetch(`${API_BASE_URL}/deleteTask`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                    body: JSON.stringify({ id: taskToEdit.id, userId: currentUserId })
                });

                if (!response.ok) throw new Error('Failed to delete task');
                const remainingTasks = state.tasks.filter(t => t.id !== taskToEdit.id);
                dispatch({ type: 'UPDATE_TASKS', payload: remainingTasks });

                onClose();
            } catch (error) {
                console.error("Delete failed:", error);
                alert("Could not delete task. Please check your connection.");
            }
        }
    };

    const handleComplete = async () => {
        if (!taskToEdit) return;
        try {
            await MockAPI.completeTask(taskToEdit.id, currentUserId || 'u1', jwt!);
            // Refresh data
            const data = await MockAPI.fetchData(jwt!);
            dispatch({ type: 'INIT_DATA', payload: data });
            onClose();
        } catch (e) {
            console.error("Failed to complete task", e);
        }
    };

    const handleUncomplete = async () => {
        if (!taskToEdit) return;
        try {
            const response = await fetch(`${API_BASE_URL}/updateTask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({
                    ...taskToEdit,
                    status: 'On Track',
                    progress: 0,
                    userId: currentUserId
                })
            });

            if (!response.ok) throw new Error('Failed to uncomplete task');

            const data = await MockAPI.fetchData(jwt!);
            dispatch({ type: 'INIT_DATA', payload: data });
            onClose();
        } catch (e) {
            console.error("Failed to uncomplete task", e);
        }
    };

    // handleSubmit decides between adding tasks and updating tasks
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!jwt) {
            alert("You are not authenticated. Please log in.");
            return;
        }

        const taskPayload = {
            id: taskToEdit ? taskToEdit.id : `t${Date.now()}`,
            projectId,
            title,
            startDate: Number(startDate),
            duration: Number(duration),
            plannedDuration: taskToEdit ? taskToEdit.plannedDuration : Number(duration),
            progress: taskToEdit ? taskToEdit.progress : 0,
            status,
            priority,
            ownerId: ownerId || currentUserId,
            dependencyIds: taskToEdit ? taskToEdit.dependencyIds : [],
            tags: taskToEdit ? taskToEdit.tags : [],
            userId: currentUserId
        };


        try {
            const endpoint = taskToEdit ? '/updateTask' : '/createTask';
            // Use the dynamic IP or localhost consistently
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                body: JSON.stringify(taskPayload)
            });

            if (response.status === 401) {
                logout();
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { detail: errorText };
                }
                console.error("Task save failed:", errorData);
                throw new Error(errorData?.detail || `Failed to save task: ${response.status}`);
            }
            const savedTask = await response.json();

            // FIX: If updating, find the task in the current list and replace it
            if (taskToEdit) {
                const updatedTasks = state.tasks.map(t => t.id === savedTask.id ? savedTask : t);
                dispatch({ type: 'UPDATE_TASKS', payload: updatedTasks });
            } else {
                dispatch({ type: 'UPDATE_TASKS', payload: [...state.tasks, savedTask] });
            }
            onClose();
        } catch (error) {
            console.error("Failed to save task:", error);
        }
    };


    return (
        // Creates the background blur
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{headline}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
        <X className="w-5 h-5" />
        </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Task Title</label>
        <input
        type="text"
        required
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        placeholder="e.g. Database Migration"
        />
        </div>

        <div className="grid grid-cols-2 gap-4">
        <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Project</label>
        <select
        value={projectId}
        onChange={e => setProjectId(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        >
        {state.projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
        ))}
        </select>
        </div>
        <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Owner</label>
        <select
        value={ownerId}
        onChange={e => setOwnerId(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        >
        {state.users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
        ))}
        </select>
        </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
        <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Start Date</label>
        <input
        type="date"
        value={startDateInput}
        onChange={e => handleStartDateChange(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        />
        </div>
        <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Deadline</label>
        <input
        type="date"
        value={deadlineInput}
        onChange={e => handleDeadlineChange(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        />
        </div>
        </div>

        <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Duration (Weeks)</label>
        <input
        type="number"
        min="1" max="52"
        value={duration}
        onChange={e => setDuration(Number(e.target.value))}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        />
        </div>

        <div className="grid grid-cols-2 gap-4">
        <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Status</label>
        <select
        value={status}
        onChange={e => setStatus(e.target.value as TaskStatus)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        >
        <option value="On Track">On Track</option>
        <option value="At Risk">At Risk</option>
        <option value="Blocked">Blocked</option>
        <option value="Completed">Completed</option>
        </select>
        </div>
        <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Priority</label>
        <select
        value={priority}
        onChange={e => setPriority(e.target.value as Priority)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        >
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
        </select>
        </div>
        </div>

        {taskToEdit && (
            (taskToEdit.status === 'Completed' || (taskToEdit.status as string) === 'Done') ? (
                <button
                type="button"
                onClick={handleUncomplete}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                <XCircle className="w-4 h-4" /> Mark as Incomplete
                </button>
            ) : (
                <button
                type="button"
                onClick={handleComplete}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                <CheckCircle className="w-4 h-4" /> Mark as Complete
                </button>
            )
        )}

        <div className="pt-4 flex justify-between items-center border-t border-gray-100 mt-6">
        {/* Left Side: Delete */}
        <button
        type='button'
    onClick={(e) => handleDelete(e)}
    className='px-4 py-2 text-sm font-bold text-white bg-red-800 hover:bg-red-600 rounded-lg transition-all transform hover:scale-105 active:scale-95'
    >
    Delete
    </button>

    {/* Right Side: Grouped Actions */}
    <div className="flex items-center gap-3">
    <button
    type="button"
    onClick={onClose}
    className="mr-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:scale-102 rounded-lg transition-colors"
    >
    Cancel
    </button>

    <button
    type="submit"
    onClick={(e)=>handleSubmit(e)}
    className="px-4 py-2 text-sm font-bold text-white bg-violet-700 hover:bg-violet-800 rounded-lg shadow-[5px_5px_0px_0px_rgba(109,40,217,0.3)] hover:shadow-[8px_8px_0px_0px_rgba(109,40,217,0.4)] transition-all transform hover:-translate-y-1 active:translate-y-0"
    >
    {buttontitle}
    </button>
    </div>
    </div>
    </form>
    </div>
    </div>
    );
};

const AddProjectModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
    const { state, dispatch } = useContext(AppContext)!;
    const { jwt } = useAuth();
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        onSuccess();
        try {
            const response = await fetch(`${API_BASE_URL}/createProject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ name, userId: state.currentUser?.id })
            });
            if (!response.ok) throw new Error('Failed to create project');

            const newProject = await response.json();

            // Refresh full data to ensure everything is in sync
            const data = await MockAPI.fetchData(jwt!);
            dispatch({ type: 'INIT_DATA', payload: data });
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to create project');
        }
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add New Project</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
        <X className="w-5 h-5" />
        </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Project Name</label>
        <input
        type="text"
        required
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        placeholder="e.g. Mobile App V1"
        />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
        <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-slate-700 transition-colors">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-violet-700 hover:bg-violet-800 rounded-lg transition-all">Create Project</button>
        </div>
        </form>
        </div>
        </div>
    );
};

const DeleteProjectModal = ({ project, onClose, onConfirm }: { project: Project, onClose: () => void, onConfirm: () => void }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delete Project</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
        <X className="w-5 h-5" />
        </button>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">{project.name}</span>? This action cannot be undone and will remove all associated tasks.
        </p>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all shadow-lg shadow-red-900/20">Delete Project</button>
        </div>
        </div>
        </div>
    );
};



const ProjectVisibilityDropdown: React.FC<{
    state: AppState;
    dispatch: React.Dispatch<Action>;
    onDeleteProject: (projectId: string) => void;
}> = ({ state, dispatch, onDeleteProject }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);

    // Calculate position when opening
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY + 4, // 4px gap
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        } else {
            setMenuPosition(null);
        }
    }, [isOpen]);

    // Update position on scroll/resize
    useEffect(() => {
        if (!isOpen) return;
        const handleScrollResize = () => {
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setMenuPosition({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                });
            }
        };
        window.addEventListener('scroll', handleScrollResize, true);
        window.addEventListener('resize', handleScrollResize);
        return () => {
            window.removeEventListener('scroll', handleScrollResize, true);
            window.removeEventListener('resize', handleScrollResize);
        };
    }, [isOpen]);

    return (
        <div className="relative">
        <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
        <Layers className="w-4 h-4" />
        Manage Projects
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && menuPosition && createPortal(
            <>
            {/* Backdrop to close */}
            <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            />
            <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                position: 'absolute',
                top: menuPosition.top,
                left: menuPosition.left,
                minWidth: menuPosition.width,
            }}
            className="z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl w-96 max-h-[600px] overflow-y-auto"
            >
            {/* Rest of the dropdown content (unchanged) */}
            <div className="p-3">
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700 mb-3">
            Project Management
            </div>

            {state.projects.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                No projects yet. Create one to get started!
                </div>
            ) : (
                <div className="space-y-2">
                {state.projects.map(project => {
                    const isHidden = state.hiddenProjects.has(project.id);
                    const isExpanded = expandedProject === project.id;
                    const projectTasks = state.tasks.filter(t => t.projectId === project.id);

                    return (
                        <div
                        key={project.id}
                        className={`border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden ${isHidden ? 'opacity-60' : ''}`}
                        >
                        {/* Project Header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 flex-1">
                        <button
                        onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                        <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                        <span className={`text-sm font-medium ${isHidden ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                        {project.name}
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        {projectTasks.length}
                        </span>
                        </div>

                        <div className="flex items-center gap-1">
                        <button
                        onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'TOGGLE_PROJECT_VISIBILITY', payload: project.id });
                        }}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        title={isHidden ? "Show project" : "Hide project"}
                        >
                        {isHidden ? (
                            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                            <Eye className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        )}
                        </button>
                        <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onDeleteProject(project.id);
                        }}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Delete project"
                        >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                        </div>
                        </div>

                        {/* Project Tasks */}
                        {isExpanded && (
                            <div className="px-3 py-2 space-y-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800">
                            {projectTasks.length === 0 ? (
                                <div className="text-xs text-slate-400 text-center py-4">
                                No tasks in this project
                                </div>
                            ) : (
                                projectTasks.map(task => {
                                    const statusColors = {
                                        'On Track': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                        'At Risk': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                                        'Blocked': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                        'Completed': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    };

                                    return (
                                        <div
                                        key={task.id}
                                        className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded text-xs"
                                        >
                                        <span className="text-slate-700 dark:text-slate-300 truncate flex-1">
                                        {task.title}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[task.status]}`}>
                                        {task.status}
                                        </span>
                                        </div>
                                    );
                                })
                            )}
                            </div>
                        )}
                        </div>
                    );
                })}
                </div>
            )}
            </div>
            </motion.div>
            </>,
            document.body
        )}
        </div>
    );
};

const EnvoyDrawer: React.FC<EnvoyDrawerProps> = ({ taskId, isOpen, onClose, onUpdateSuccess }) => {
    const { jwt } = useAuth();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(false);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [frictionData, setFrictionData] = useState<{ blockers: string[], external_waits: string[], soft_dependencies: string[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Modal state for "Review" fields
    const [reviewProposal, setReviewProposal] = useState<Proposal | null>(null);

    const autoApplyFields = ['status', 'priority'];

    const fetchSuggestionsAndFriction = async () => {
        setLoading(true);
        setError(null);
        try {
            const [suggestRes, frictionRes] = await Promise.all([
                fetch(`${API_BASE_URL}/envoy/suggest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                    body: JSON.stringify({ task_id: taskId, all: true })
                }),
                MockAPI.fetchEnvoyFriction(taskId, jwt!)
            ]);
            if (!suggestRes.ok) throw new Error('Failed to fetch suggestions');
            const suggestData = await suggestRes.json();
            setProposals(suggestData.proposals || []);
            setFrictionData(frictionRes);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && taskId) {
            fetchSuggestionsAndFriction();
        }
    }, [isOpen, taskId]);

    const handleApply = async (proposal: Proposal) => {
        setApplyingId(proposal.id);
        try {
            const response = await fetch(`${API_BASE_URL}/envoy/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({
                    task_id: taskId,
                    proposals: [proposal]
                })
            });
            if (!response.ok) throw new Error('Failed to apply change');

            setProposals(prev => prev.filter(p => p.id !== proposal.id));
            setReviewProposal(null);
            if (onUpdateSuccess) onUpdateSuccess();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setApplyingId(null);
        }
    };

    const autoProposals = proposals.filter(p => autoApplyFields.includes(p.field));
    const optionalProposals = proposals.filter(p => !autoApplyFields.includes(p.field));

    return (
        <div>
        {/* Drawer Overlay */}
        {isOpen && (
            <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity"
            onClick={onClose}
            />
        )}

        {/* Sidebar Drawer */}
        <div className={`fixed top-0 left-0 h-full w-96 bg-gray-900 shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out border-r-[5px] rounded-xl border-violet-700 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2 text-violet-400">
        <BrainCircuit className="w-6 h-6" />
        <h2 className="text-2xl font-bold tracking-tight text-white">Envoy AI</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
        <X className="w-5 h-5 text-gray-400 hover:text-white" />
        </button>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-violet-500" />
            <p>Analyzing project context...</p>
            </div>
        ) : error ? (
            <div className="p-4 bg-rose-900/20 border border-rose-800 rounded-lg text-rose-400 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <p className="text-sm">{error}</p>
            </div>
        ) : (
            <div className="space-y-8">
            {/* Section: Auto-Apply */}
            <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Direct Optimization</h3>
            {autoProposals.length === 0 && <p className="text-sm text-gray-500 italic">No immediate field updates suggested.</p>}
            {autoProposals.map((p, i) => (
                <div key={p.id || i} className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm mb-3">
                <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium px-2 py-0.5 bg-gray-700 rounded text-gray-300 capitalize">{p.field}</span>
                <button
                onClick={() => handleApply(p)}
                disabled={applyingId === p.id}
                className="flex items-center gap-1 text-xs font-bold text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
                >
                {applyingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Apply
                </button>
                </div>
                <p className="text-sm font-semibold text-gray-200">Change to: <span className="text-violet-400">{p.suggested}</span></p>
                {p.reason && <p className="text-xs text-gray-400 mt-2 leading-relaxed italic">"{p.reason}"</p>}
                </div>
            ))}
            </section>

            {/* Section: Optional/Review */}
            <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Strategic Timeline Adjustments</h3>
            {optionalProposals.length === 0 && <p className="text-sm text-gray-500 italic">No timeline changes suggested.</p>}
            {optionalProposals.map(p => (
                <div key={p.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm mb-3">
                <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium px-2 py-0.5 bg-violet-900/30 rounded text-violet-300 capitalize">{p.field.replace('Ids', '')}</span>
                <button
                onClick={() => setReviewProposal(p)}
                className="flex items-center gap-1 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors"
                >
                <Eye className="w-3 h-3" />
                Review
                </button>
                </div>
                <p className="text-sm text-gray-400">Suggested: <span className="font-mono font-bold text-gray-200">{JSON.stringify(p.suggested)}</span></p>
                </div>
            ))}
            </section>
            </div>
        )}

        {/* Main Action Button */}
        <button
        onClick={fetchSuggestionsAndFriction}
        className="mt-4 w-full py-3 bg-gray-800 border-2 border-violet-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-700 hover:border-violet-600 transition-all shadow-lg shadow-gray-900/50 active:scale-[0.98]"
        >
        <Sparkles className="w-4 h-4 text-violet-400" />
        Refresh Suggestions
        </button>

        {/* Review Modal */}
        {reviewProposal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setReviewProposal(null)} />

            <div className="relative bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 overflow-hidden border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-900/30 rounded-lg">
            <Eye className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Review AI Suggestion</h3>
            </div>

            <div className="space-y-4 mb-6">
            <div className="p-3 bg-gray-900 rounded-lg border border-gray-700">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Field</p>
            <p className="text-sm font-semibold capitalize text-gray-200">{reviewProposal.field}</p>
            </div>

            <div className="p-3 bg-gray-900 rounded-lg border border-gray-700">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Proposed Value</p>
            <code className="text-sm font-bold text-violet-400">{JSON.stringify(reviewProposal.suggested)}</code>
            </div>

            {reviewProposal.reason && (
                <div className="p-3 bg-violet-900/20 rounded-lg border border-violet-900/50">
                <p className="text-xs font-bold text-violet-400 uppercase mb-1">AI Reasoning</p>
                <p className="text-sm text-gray-300 italic">"{reviewProposal.reason}"</p>
                </div>
            )}
            </div>

            <div className="flex gap-3">
            <button
            onClick={() => setReviewProposal(null)}
            className="flex-1 py-2.5 text-sm font-bold text-gray-400 hover:bg-gray-700 hover:text-white rounded-xl transition-colors"
            >
            Cancel
            </button>
            <button
            onClick={() => handleApply(reviewProposal)}
            disabled={applyingId === reviewProposal.id}
            className="flex-1 py-2.5 bg-violet-700 text-white text-sm font-bold rounded-xl hover:bg-violet-600 shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
            {applyingId === reviewProposal.id && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm & Apply
            </button>
            </div>
            </div>
            </div>
        )}
        </div>
        </div>
        </div>
        </div>
    );
};

const DependencyCreationModal = ({ sourceId, targetId, tasks, onClose, onConfirm }: { sourceId: string, targetId: string, tasks: Task[], onClose: () => void, onConfirm: (type: DependencyType, note: string) => void }) => {
    const sourceTask = findTask(tasks, sourceId);
    const targetTask = findTask(tasks, targetId);
    const [type, setType] = useState<DependencyType>('blocked_by');
    const [note, setNote] = useState('');

    if (!sourceTask || !targetTask) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 scale-100 animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create Dependency</h3>
        <p className="text-sm text-slate-500 mb-6">
        How is <span className="font-bold text-slate-800 dark:text-slate-200">{targetTask.title}</span> related to <span className="font-bold text-slate-800 dark:text-slate-200">{sourceTask.title}</span>?
        </p>

        <div className="space-y-3 mb-6">
        <button onClick={() => setType('blocked_by')} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${type === 'blocked_by' ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500 dark:bg-rose-900/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-300'}`}>
        <div className={`p-2 rounded-full ${type === 'blocked_by' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}><Ban className="w-4 h-4" /></div>
        <div className="text-left"><div className="font-bold text-sm text-slate-900 dark:text-white">Blocked By</div><div className="text-xs text-slate-500">Target cannot start until source is done</div></div>
        </button>

        <button onClick={() => setType('waiting_on')} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${type === 'waiting_on' ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500 dark:bg-amber-900/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300'}`}>
        <div className={`p-2 rounded-full ${type === 'waiting_on' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}><Hourglass className="w-4 h-4" /></div>
        <div className="text-left"><div className="font-bold text-sm text-slate-900 dark:text-white">Waiting On</div><div className="text-xs text-slate-500">External factor or decision needed</div></div>
        </button>

        <button onClick={() => setType('helpful_if_done_first')} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${type === 'helpful_if_done_first' ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500 dark:bg-sky-900/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-sky-300'}`}>
        <div className={`p-2 rounded-full ${type === 'helpful_if_done_first' ? 'bg-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}><Lightbulb className="w-4 h-4" /></div>
        <div className="text-left"><div className="font-bold text-sm text-slate-900 dark:text-white">Helpful if done first</div><div className="text-xs text-slate-500">Soft dependency, advisory only</div></div>
        </button>
        </div>

        <div className="mb-6">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Note (Optional)</label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. API spec needed" />
        </div>

        <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
        <button onClick={() => onConfirm(type, note)} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/20 transition-all">Create Link</button>
        </div>
        </div>
        </div>
    );
};

const DependencyEditModal = ({ fromId, toId, tasks, onClose, onUpdate }: { fromId: string, toId: string, tasks: Task[], onClose: () => void, onUpdate: () => void }) => {
    const { state, dispatch } = useContext(AppContext)!;
    const { jwt } = useAuth();
    const fromTask = findTask(tasks, fromId);
    const toTask = findTask(tasks, toId);
    const [loading, setLoading] = useState(false);

    const handleRemove = async () => {
        setLoading(true);
        try {
            const dep = await MockAPI.lookupDependency(fromId, toId, jwt!);
            await MockAPI.deleteDependency(dep.id, state.currentUser?.id || 'u1', jwt!);
            onUpdate();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to remove dependency");
        } finally {
            setLoading(false);
        }
    };

    const handleChangeType = async (newType: DependencyType) => {
        setLoading(true);
        try {
            const dep = await MockAPI.lookupDependency(fromId, toId, jwt!);
            await MockAPI.updateDependency(dep.id, { type: newType }, state.currentUser?.id || 'u1', jwt!);
            onUpdate();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to update dependency");
        } finally {
            setLoading(false);
        }
    };

    if (!fromTask || !toTask) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Manage Dependency</h3>
        <p className="text-sm text-slate-500 mb-6">
        <span className="font-bold text-slate-800 dark:text-slate-200">{toTask.title}</span> is currently dependent on <span className="font-bold text-slate-800 dark:text-slate-200">{fromTask.title}</span>.
        </p>

        <div className="space-y-3">
        <button onClick={handleRemove} disabled={loading} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold text-sm transition-colors">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
        Remove Dependency
        </button>

        <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or Change Type</span></div>
        </div>

        <div className="grid grid-cols-3 gap-2">
        <button onClick={() => handleChangeType('blocked_by')} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-center">Blocked By</button>
        <button onClick={() => handleChangeType('waiting_on')} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-center">Waiting On</button>
        <button onClick={() => handleChangeType('helpful_if_done_first')} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-center">Helpful</button>
        </div>
        </div>

        <button onClick={onClose} className="mt-6 w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
        </div>
        </div>
    );
};

const DependencyPanel = ({ taskId, onClose }: { taskId: string, onClose: () => void }) => {
    const { state, dispatch } = useContext(AppContext)!;
    const { jwt } = useAuth();
    const [dependencies, setDependencies] = useState<{ blocked_by: Dependency[], blocking: Dependency[] }>({ blocked_by: [], blocking: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await MockAPI.fetchDependencies(taskId, jwt!);
            setDependencies(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [taskId]);

    const refreshRoadmapData = async () => {
        const data = await MockAPI.fetchData(jwt!);
        dispatch({ type: 'INIT_DATA', payload: data });
    };

    const handleDelete = async (depId: string) => {
        if (!state.currentUser) return;
        try {
            await MockAPI.deleteDependency(depId, state.currentUser.id, jwt!);
            await fetchData();
            await refreshRoadmapData();
        } catch (e) {
            console.error(e);
        }
    };

    const DepTypeIcon = ({ type }: { type: DependencyType }) => {
        const config = {
            blocked_by: { icon: Ban, color: 'text-rose-400' },
            waiting_on: { icon: Hourglass, color: 'text-amber-400' },
            helpful_if_done_first: { icon: Lightbulb, color: 'text-sky-400' }
        };
        const Icon = config[type].icon;
        return <Icon className={`w-4 h-4 ${config[type].color}`} />;
    };

    return (
        <>
        <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
        <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-full duration-300">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h3 className="font-bold text-lg">Task Dependencies</h3>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {loading ? <Loader2 className="animate-spin" /> : error ? <p>{error}</p> : (
            <>
            <section>
            <h4 className="text-sm font-bold text-slate-500 mb-3">This Task is Blocked By...</h4>
            <div className="space-y-2">
            {dependencies.blocked_by.length > 0 ? dependencies.blocked_by.map(dep => (
                <div key={dep.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><DepTypeIcon type={dep.type} /><span className="font-medium">{dep.from_task_title}</span></div>
                <button onClick={() => handleDelete(dep.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
                {dep.note && <p className="text-xs text-slate-500 mt-1 pl-6 italic">"{dep.note}"</p>}
                </div>
            )) : <p className="text-sm text-slate-400 italic">No blocking dependencies.</p>}
            </div>
            </section>
            <section>
            <h4 className="text-sm font-bold text-slate-500 mb-3">This Task Blocks...</h4>
            <div className="space-y-2">
            {dependencies.blocking.length > 0 ? dependencies.blocking.map(dep => (
                <div key={dep.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center"><div className="flex items-center gap-2"><DepTypeIcon type={dep.type} /><span className="font-medium">{dep.to_task_title}</span></div><button onClick={() => handleDelete(dep.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                </div>
            )) : <p className="text-sm text-slate-400 italic">This task is not blocking anything.</p>}
            </div>
            </section>
            </>
        )}
        </div>
        </div>
        </>
    );
};

// export default EnvoyDrawer;

// MAIN PAGE COMPONENT

const BoardView = ({ tasks, users }: { tasks: Task[], users: User[] }) => {
    const columns: TaskStatus[] = ['On Track', 'At Risk', 'Blocked', 'Completed'];

    return (
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-50 dark:bg-[#0B1120] p-6">
        <div className="flex h-full gap-6">
        {columns.map(status => (
            <div key={status} className="flex-shrink-0 w-80 flex flex-col bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">{status}</h3>
            <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
            {tasks.filter(t => t.status === status).length}
            </span>
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            {tasks.filter(t => t.status === status).map(task => {
                const owner = users.find(u => u.id === task.ownerId);
                const ownerName = owner?.name || task.ownerName || 'Unknown';
                const ownerAvatar = owner?.avatar || `https://ui-avatars.com/api/?name=${ownerName}&background=random`;
                return (
                    <div key={task.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        task.priority === 'High' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                        task.priority === 'Medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>{task.priority}</span>
                    <img src={ownerAvatar} className="w-5 h-5 rounded-full" alt={ownerName} title={ownerName} />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{task.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>W{task.startDate}</span>
                    <span>•</span>
                    <span>{task.duration}w</span>
                    </div>
                    </div>
                );
            })}
            </div>
            </div>
        ))}
        </div>
        </div>
    );
};

const SprintView = ({ tasks, users }: { tasks: Task[], users: User[] }) => {
    return (
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#0B1120] p-8">
        <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase tracking-wider text-slate-500 font-semibold">
        <tr>
        <th className="p-4 border-b border-slate-200 dark:border-slate-800">Task</th>
        <th className="p-4 border-b border-slate-200 dark:border-slate-800">Owner</th>
        <th className="p-4 border-b border-slate-200 dark:border-slate-800">Status</th>
        <th className="p-4 border-b border-slate-200 dark:border-slate-800">Priority</th>
        <th className="p-4 border-b border-slate-200 dark:border-slate-800">Timeline</th>
        </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
        {tasks.map(task => {
            const owner = users.find(u => u.id === task.ownerId);
            const ownerName = owner?.name || task.ownerName || 'Unknown';
            const ownerAvatar = owner?.avatar || `https://ui-avatars.com/api/?name=${ownerName}&background=random`;
            return (
                <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-4 font-medium text-slate-900 dark:text-slate-200">{task.title}</td>
                <td className="p-4">
                <div className="flex items-center gap-2">
                <img src={ownerAvatar} className="w-5 h-5 rounded-full" alt={ownerName} />
                <span className="text-slate-600 dark:text-slate-400">{ownerName}</span>
                </div>
                </td>
                <td className="p-4">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    task.status === 'On Track' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                    task.status === 'At Risk' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    task.status === 'Blocked' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}>
                {task.status}
                </span>
                </td>
                <td className="p-4">
                <span className={`font-medium ${
                    task.priority === 'High' ? 'text-rose-500' :
                    task.priority === 'Medium' ? 'text-amber-500' :
                    'text-slate-500'
                }`}>{task.priority}</span>
                </td>
                <td className="p-4 text-slate-500">
                W{task.startDate} - W{task.startDate + task.duration}
                </td>
                </tr>
            );
        })}
        </tbody>
        </table>
        </div>
        </div>
    );
};

const RoadmapRow = ({ task, users, level, onEdit, onTaskDrop, dispatch, envoyActiveTaskId, personas, parentId, timelineView, startDate, totalUnits }: {
    task: Task;
    users: User[];
    level: number;
    onEdit: (t: Task) => void;
    onTaskDrop: (sourceId: string, targetId: string) => void;
    dispatch: React.Dispatch<Action>;
    envoyActiveTaskId: string | null;
    personas: Persona[];
    parentId?: string | null;
    timelineView: TimelineView;
    startDate: Date;
    totalUnits: number;
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const dependents = task.dependents || [];

    return (
        <div className="space-y-0.5">
        <div className={`relative ${level > 0 ? 'h-12' : 'h-14'}`} style={{ paddingLeft: `${level * 24}px` }}>
        {/* {dependents.length > 0 && (
            <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
            style={{ left: `${level > 0 ? level * 24 - 20 : 4}px`}}
            title={isExpanded ? "Collapse dependents" : "Expand dependents"}
            >
            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
    )} */}
    {/* Connector Line for Children */}
    {level > 0 && (
        <div className="absolute left-0 top-0 bottom-1/2 w-4 border-l-2 border-b-2 border-slate-300 dark:border-slate-700 rounded-bl-xl"
        style={{ left: `${(level * 24) - 12}px` }}
        />
    )}
    <TaskItem
    task={task}
    user={users.find(u => u.id === task.ownerId)}
    dispatch={dispatch}
    isEnvoyActive={envoyActiveTaskId === task.id}
    onEdit={onEdit}
    personas={personas}
    onTaskDrop={onTaskDrop}
    level={level}
    parentId={parentId}
    onToggleExpand={() => setIsExpanded(!isExpanded)}
    isExpanded={isExpanded}
    hasDependents={dependents.length > 0}
    timelineView={timelineView}
    startDate={startDate}
    totalUnits={totalUnits}
    />
    </div>
    <AnimatePresence initial={false}>
    {isExpanded && dependents.length > 0 && (
        <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
        >
        {dependents.map((dep, index) => (
            <motion.div
            key={dep.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            >
            <RoadmapRow
            task={dep}
            users={users}
            level={level + 1}
            onEdit={onEdit}
            onTaskDrop={onTaskDrop}
            dispatch={dispatch}
            envoyActiveTaskId={envoyActiveTaskId}
            personas={personas}
            parentId={task.id}
            timelineView={timelineView}
            startDate={startDate}
            totalUnits={totalUnits}
            />
            </motion.div>
        ))}
        </motion.div>
    )}
    </AnimatePresence>
    </div>
    );
};


// AUTO-BALANCE MODAL COMPONENT
interface AutoBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    suggestions: BalanceSuggestion[];
    loading: boolean;
    onAccept: (suggestion: BalanceSuggestion) => void;
    onDecline: (suggestionId: string) => void;
}

const AutoBalanceModal: React.FC<AutoBalanceModalProps> = ({
    isOpen,
    onClose,
    suggestions,
    loading,
    onAccept,
    onDecline
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
        onClick={onClose}
        >
        <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0F172A] border border-violet-500/20 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl shadow-violet-500/20"
        >
        <div className="p-4 md:p-6 border-b border-slate-800/50 bg-gradient-to-b from-violet-950/30 to-transparent">
        <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
        <div className="p-2 bg-violet-500/10 rounded-lg">
        <Zap className="w-5 md:w-6 h-5 md:h-6 text-violet-500" />
        </div>
        <div>
        <h2 className="text-lg md:text-xl font-bold text-white">Auto-Balance Suggestions</h2>
        <p className="text-xs md:text-sm text-slate-400 mt-0.5">AI-powered workload distribution</p>
        </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
        <X className="w-5 h-5" />
        </button>
        </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-4" />
            <p className="text-sm text-slate-400">Analyzing task distribution...</p>
            </div>
        ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
            <p className="text-base text-white font-medium mb-2">Workload Balanced</p>
            <p className="text-sm text-slate-400">No optimization opportunities found</p>
            </div>
        ) : (
            <div className="space-y-3 md:space-y-4">
            {suggestions.map((suggestion) => (
                <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 md:p-5 hover:border-violet-500/30 transition-colors"
                >
                <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                {suggestion.type === 'create_persona' && (
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <Plus className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Create Persona</span>
                    </div>
                )}
                {suggestion.type === 'delete_persona' && (
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <Trash2 className="w-3 h-3 text-red-400" />
                    <span className="text-xs font-mono font-bold text-red-400 uppercase">Remove Persona</span>
                    </div>
                )}
                {suggestion.type === 'reassign' && (
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                    <ArrowRight className="w-3 h-3 text-violet-400" />
                    <span className="text-xs font-mono font-bold text-violet-400 uppercase">Reassign Task</span>
                    </div>
                )}
                </div>
                <span className={`text-xs font-mono px-2 py-1 rounded $${
                    suggestion.priority === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                    suggestion.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' :
                    'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                }`}>{suggestion.priority}</span>
                </div>
                <div className="mb-4">
                {suggestion.type === 'reassign' && (
                    <>
                    <h4 className="text-white font-semibold text-sm mb-2">{suggestion.taskTitle}</h4>
                    <div className="flex items-center gap-2 text-xs mb-3 flex-wrap">
                    <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded font-mono">{suggestion.currentPersona || 'Unassigned'}</span>
                    <ArrowRight className="w-3 h-3 text-violet-400" />
                    <span className="px-2 py-1 bg-violet-500/20 text-violet-300 rounded font-mono font-bold">{suggestion.suggestedPersona}</span>
                    </div>
                    </>
                )}
                {suggestion.type === 'create_persona' && (
                    <h4 className="text-white font-semibold text-sm mb-3">Create "{suggestion.personaName}" persona</h4>
                )}
                {suggestion.type === 'delete_persona' && (
                    <h4 className="text-white font-semibold text-sm mb-3">Remove "{suggestion.personaName}" persona</h4>
                )}
                <p className="text-sm text-slate-400 leading-relaxed">{suggestion.reason}</p>
                </div>
                <div className="flex gap-3">
                <button
                onClick={() => onAccept(suggestion)}
                className="flex-1 flex items-center justify-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs md:text-sm font-bold rounded-[14px] transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 active:scale-95"
                >
                <CheckCircle className="w-4 h-4" />Accept
                </button>
                <button
                onClick={() => onDecline(suggestion.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs md:text-sm font-bold rounded-[14px] transition-all active:scale-95"
                >
                <XCircle className="w-4 h-4" />Decline
                </button>
                </div>
                </motion.div>
            ))}
            </div>
        )}
        </div>
        </motion.div>
        </motion.div>
        </AnimatePresence>
    );
};

const EnvoySidebar: React.FC<{isOpen: boolean; onClose: () => void; suggestions: EnvoySuggestion[]; onApplySuggestion: (s: EnvoySuggestion) => void}> = ({isOpen, onClose, suggestions, onApplySuggestion}) => {
    return (
        <AnimatePresence>
        {isOpen && (
            <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 md:hidden" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 400, damping: 40 }} className="fixed top-0 right-0 bottom-0 w-full md:w-96 bg-[#0F172A] border-l border-violet-500/20 shadow-2xl z-50 flex flex-col">
            <div className="p-6 border-b border-slate-800/50">
            <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
            <div className="relative">
            <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full" />
            <div className="relative p-2 bg-violet-500/10 rounded-lg">
            <BrainCircuit className="w-5 h-5 text-violet-400" />
            </div>
            </div>
            <div>
            <h3 className="font-bold text-lg text-white">Envoy</h3>
            <p className="text-xs text-slate-500 font-mono">AI ASSISTANT</p>
            </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
            </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-400">{suggestions.length} optimization{suggestions.length !== 1 ? 's' : ''} found</span>
            <span className="ml-auto text-xs font-mono text-violet-400">{suggestions.filter(s => s.confidence > 0.8).length} HIGH CONF</span>
            </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="p-4 bg-slate-800/30 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500 mb-1 font-medium">All Systems Optimal</p>
                <p className="text-xs text-slate-600">No immediate actions required</p>
                </div>
            ) : (
                suggestions.map((suggestion) => (
                    <motion.div key={suggestion.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="group relative bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 hover:border-violet-500/30 rounded-xl p-4 transition-all duration-200">
                    <div className="absolute top-3 right-3">
                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold $${
                        suggestion.confidence > 0.8 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        suggestion.confidence > 0.6 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        'bg-slate-700 text-slate-400 border border-slate-600'
                    }`}>{Math.round(suggestion.confidence * 100)}%</div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                    {suggestion.type === 'blocker' && <div className="p-1.5 bg-red-500/10 rounded-lg"><Ban className="w-3.5 h-3.5 text-red-400" /></div>}
                    {suggestion.type === 'slippage' && <div className="p-1.5 bg-orange-500/10 rounded-lg"><Hourglass className="w-3.5 h-3.5 text-orange-400" /></div>}
                    {suggestion.type === 'handoff' && <div className="p-1.5 bg-blue-500/10 rounded-lg"><ArrowRight className="w-3.5 h-3.5 text-blue-400" /></div>}
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">{suggestion.type}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed mb-4 pr-16">{suggestion.message}</p>
                    <button onClick={() => onApplySuggestion(suggestion)} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 active:scale-95">
                    {suggestion.actionLabel}<ArrowRight className="w-3 h-3" />
                    </button>
                    </motion.div>
                ))
            )}
            </div>
            <div className="p-4 border-t border-slate-800/50">
            <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-3 h-3" />
            <span>Powered by Envoy AI • Real-time analysis</span>
            </div>
            </div>
            </motion.div>
            </>
        )}
        </AnimatePresence>
    );
};


export default function RoadmapPage() {
    const { user, jwt, logout } = useAuth();
    const userId = user?.id;
    const [state, dispatch] = useReducer(appReducer, initialState);
    const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined);
    const [addProjectVisible, setAddProjectVisible] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [dependencyModal, setDependencyModal] = useState<{ sourceId: string, targetId: string } | null>(null);
    const [dependencyEditModal, setDependencyEditModal] = useState<{ fromId: string, toId: string } | null>(null);
    const [timelineScale, setTimelineScale] = useState<'Week' | 'Month' | 'Quarter'>('Week');
    const [error, setError] = useState<string | null>(null);
    const loading = state.isLoading;
    const { viewingDependenciesFor } = state;
    const personas = ['P1', 'P2', 'P3'] // Dummy
    const [popupMessage, setPopupMessage] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const triggerPopup = (message: string) => {
        setPopupMessage(message);
        setTimeout(() => setPopupMessage(null), 3000);
    };

    // Initial Data Fetch
    useEffect(() => {
        // Wait for the AuthContext to provide the userId.
        if (!userId || !jwt) return;

        const loadData = async () => {
            try {
                const data = await MockAPI.fetchData(jwt); // This now calls /renderTask

                // Fetch Team Members (Users) to populate owner fields
                let teamMembers: User[] = [];
                try {
                    const teamRes = await fetch(`${API_BASE_URL}/team/members?userId=${userId}`, {
                        headers: { Authorization: `Bearer ${jwt}` }
                    });
                    if (teamRes.ok) {
                        const members = await teamRes.json();
                        teamMembers = members.map((m: any) => ({
                            id: m.id,
                            name: m.name,
                            avatar: `https://ui-avatars.com/api/?name=${m.name}&background=random`,
                            baseCapacity: 80, // Default
                            personas: []
                        }));
                    }
                } catch (e) { console.error("Failed to load team", e); }

                // Ensure current user is in the list if not returned by team endpoint (e.g. admin/isolated)
                let currentUser = teamMembers.find(u => u.id === userId);
                if (!currentUser) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
                            headers: { Authorization: `Bearer ${jwt}` }
                        });
                        if (res.ok) {
                            const u = await res.json();
                            currentUser = {
                                id: u.id,
                                name: u.firstName || u.username || 'User',
                                avatar: `https://ui-avatars.com/api/?name=${u.firstName || 'U'}&background=0D8ABC&color=fff`,
                                baseCapacity: 100,
                                personas: []
                            };
                            teamMembers.push(currentUser);
                        }
                    } catch (e) { console.error("Failed to load user", e); }
                }

                // Update data.users with fetched team members
                if (teamMembers.length > 0) {
                    data.users = teamMembers;
                }

                dispatch({ type: 'INIT_DATA', payload: { ...data, currentUser } });
            } catch (e: any) {
                if (e.message === "Unauthorized") {
                    logout();
                } else {
                    console.error("Failed to load data", e);
                }
            }
        };
        loadData();
    }, [userId, jwt, logout]);

    // Filter Logic
    const filteredTasks = useMemo(() => {
        return state.tasks.filter(t => {
            // THIS PART
            const matchesSearch = t.title.toLowerCase().includes(state.filters.query.toLowerCase());
            const matchesStatus = state.filters.statuses.length === 0 || state.filters.statuses.includes(t.status);
            // Persona Filter Logic
            const matchesPersona = !state.filters.onlyMyPersonas || (state.activePersonaId ? t.personaId === state.activePersonaId : true);
            return matchesSearch && matchesStatus && matchesPersona;
        });
    }, [state.tasks, state.filters, state.activePersonaId]);

    const handleAutoBalance = async () => {
        // Open the auto-balance modal with suggestions
        await fetchBalanceSuggestions();
    };

    const [collapsedProjects, setCollapsedProjects] = useState<string[]>([]);
    const toggleProjectCollapse = (projectId: string) => {
        setCollapsedProjects(prev =>
        prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
        );
    };

    const handleDeleteProject = (projectId: string) => {
        const project = state.projects.find(p => p.id === projectId);
        if (state.projects.length === 1) {
            triggerPopup("Cannot delete the last project.");
            setProjectToDelete(null);
            return;
        }
        if (project) {
            setProjectToDelete(project);
        }
    };

    const confirmDeleteProject = async () => {
        if (!projectToDelete) return;
        try {
            const res = await fetch(`${API_BASE_URL}/deleteProject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ id: projectToDelete.id, userId })
            });
            if (!res.ok) throw new Error("Failed");

            const newProjects = state.projects.filter(p => p.id !== projectToDelete.id);
            const newTasks = state.tasks.filter(t => t.projectId !== projectToDelete.id);

            dispatch({ type: 'DELETE_PROJECT', payload: projectToDelete.id });
        } catch (e) {
            console.error(e);
            alert("Failed to delete project");
        } finally {
            setProjectToDelete(null);
        }
    };

    const handleCreateDependency = async (type: DependencyType, note: string) => {
        if (!dependencyModal || !state.currentUser) return;
        try {
            await MockAPI.createDependency({
                from_task_id: dependencyModal.sourceId,
                to_task_id: dependencyModal.targetId,
                type,
                note,
                userId: state.currentUser.id
            }, jwt!);
            const data = await MockAPI.fetchData(jwt!);
            dispatch({ type: 'INIT_DATA', payload: data });
            setDependencyModal(null);
        } catch (e) {
            console.error(e);
            alert("Failed to create dependency");
        }
    };


    function logDateAndQuarter(date = new Date()) {
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
            // month: 'long', // Adjust if needed
            // day: 'numeric',
            year: 'numeric'
        });
        const formattedDate = dateFormatter.format(date);

        const month = date.getMonth() + 1;
        const quarter = Math.ceil(month / 3);

        return(`${formattedDate} - Q${quarter}`)
    }

    // Usage:

    const [addVisible,setAVisible] = useState(false);
    
    // Auto-Balance Modal State
    const [showAutoBalanceModal, setShowAutoBalanceModal] = useState(false);
    const [balanceSuggestions, setBalanceSuggestions] = useState<BalanceSuggestion[]>([]);
    const [autoBalanceLoading, setAutoBalanceLoading] = useState(false);
    
    // Envoy Sidebar State
    const [showEnvoySidebar, setShowEnvoySidebar] = useState(false);
    const AI_SUGGESTIONS: EnvoySuggestion[] = [
        {
            id: 'env1',
            type: 'handoff',
            message: 'Task "API Integration" might benefit from handoff to backend team',
            confidence: 85,
            actionLabel: 'Suggest Handoff'
        },
        {
            id: 'env2',
            type: 'slippage',
            message: 'Task "UI Polish" is at risk of missing deadline',
            confidence: 72,
            actionLabel: 'Adjust Timeline'
        },
        {
            id: 'env3',
            type: 'blocker',
            message: 'Dependency blocking "Launch Prep" - consider parallel work',
            confidence: 90,
            actionLabel: 'Review Dependencies'
        }
    ];
    
    // Auto-Balance Handler: Fetch suggestions
    const fetchBalanceSuggestions = async () => {
        if (!jwt || !userId) return;
        
        setAutoBalanceLoading(true);
        setShowAutoBalanceModal(true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/envoy/auto-balance-personas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify({
                    tasks: state.tasks,
                    userId: userId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                setBalanceSuggestions(data.suggestions || []);
            } else {
                console.error('Failed to fetch balance suggestions');
                setBalanceSuggestions([]);
            }
        } catch (error) {
            console.error('Error fetching balance suggestions:', error);
            setBalanceSuggestions([]);
        } finally {
            setAutoBalanceLoading(false);
        }
    };
    
    // Accept Balance Suggestion
    const handleAcceptBalanceSuggestion = async (suggestion: BalanceSuggestion) => {
        if (!jwt || !userId) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/envoy/apply-balance-suggestion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify({
                    suggestion,
                    userId: userId
                })
            });
            
            if (response.ok) {
                // Remove the accepted suggestion from the list
                setBalanceSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
                
                // Refresh tasks to show updated assignments
                const data = await MockAPI.fetchData(jwt);
                dispatch({ type: 'INIT_DATA', payload: data });
                
                triggerPopup('Balance suggestion applied successfully!');
            } else {
                console.error('Failed to apply balance suggestion');
                triggerPopup('Failed to apply suggestion');
            }
        } catch (error) {
            console.error('Error applying balance suggestion:', error);
            triggerPopup('Error applying suggestion');
        }
    };
    
    // Decline Balance Suggestion
    const handleDeclineBalanceSuggestion = (suggestionId: string) => {
        setBalanceSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    };

    const handleBackgroundDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;

        try {
            const { taskId, parentId } = JSON.parse(dataStr);
            // If dragged item has a parent (is a child) and is dropped on background
            if (parentId) {
                setDependencyEditModal({ fromId: parentId, toId: taskId });
            }
        } catch(e) {}
    };

    return (
        <AppContext.Provider value={{ state, dispatch }}>
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col font-sans animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">

        {/* TOP HEADER */}
        <header className="bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 p-3 md:p-4 z-40">
        <div className="max-w-[1800px] mx-auto">
        {/* MOBILE LAYOUT */}
        <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
        <div className="p-1.5 bg-violet-500/10 rounded-lg">
        <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
        <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Execution Roadmap</h1>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><GitCommit className="w-2 h-2"/> v2.4.0</span>
        <span>•</span>
        <span>{logDateAndQuarter()}</span>
        </div>
        </div>
        </div>
        <button onClick={handleAutoBalance} className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/20 transition-all active:scale-95">
        <Zap className="w-3 h-3" /> Balance
        </button>
        </div>
        <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
        <input type="text" placeholder="Search tasks..." className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-full focus:ring-2 focus:ring-violet-500 outline-none" onChange={(e) => dispatch({ type: 'SET_FILTER', payload: { query: e.target.value } })} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3">
        <select value={state.activePersonaId||''} onChange={(e)=> dispatch({type:'SET_ACTIVE_PERSONA',payload:e.target.value})} className="flex-shrink-0 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
        <option value={'all'}>All Tasks</option>
        <option value={'personas'}>Personas</option>
        {personas.map((item,index)=>(<option key={index} value={item}>{item}</option>))}
        </select>
        <select value={state.timelineView} onChange={(e) => dispatch({ type: 'SET_TIMELINE_VIEW', payload: e.target.value as TimelineView })} className="flex-shrink-0 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
        <option value="Daily">Daily</option>
        <option value="Weekly">Weekly</option>
        <option value="Monthly">Monthly</option>
        </select>
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
        <button onClick={() => dispatch({ type: 'SET_LAYOUT_MODE', payload: 'Roadmap' })} className={`p-1.5 rounded-md transition-all ${state.layoutMode === 'Roadmap' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-400'}`}><Calendar className="w-3.5 h-3.5" /></button>
        <button onClick={() => dispatch({ type: 'SET_LAYOUT_MODE', payload: 'Board' })} className={`p-1.5 rounded-md transition-all ${state.layoutMode === 'Board' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-400'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
        <button onClick={() => dispatch({ type: 'SET_LAYOUT_MODE', payload: 'Sprint' })} className={`p-1.5 rounded-md transition-all ${state.layoutMode === 'Sprint' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-400'}`}><List className="w-3.5 h-3.5" /></button>
        </div>
        </div>
        <AnimatePresence>
        {state.activePersonaId && state.activePersonaId !== 'all' && state.activePersonaId !== 'personas' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/30 rounded-lg">
            <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-violet-600 dark:text-violet-400 flex-1">Filtering: {state.activePersonaId}</span>
            <button onClick={() => dispatch({type:'SET_ACTIVE_PERSONA', payload: 'all'})} className="text-violet-500 hover:text-violet-700"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
        )}
        </AnimatePresence>
        </div>

        {/* DESKTOP LAYOUT */}
        <div className="hidden md:flex flex-col xl:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
        <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Execution Roadmap</h1>
        <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="flex items-center gap-1"><GitCommit className="w-3 h-3"/> v2.4.0</span>
        <span>•</span>
        <span>{logDateAndQuarter()}</span>
        </div>
        </div>
        </div>
        <div className="flex items-center z-50 gap-3 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto overflow-y-visible">
        <div className="relative group">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input type="text" placeholder="Search (JQL support pending)..." className="pl-9 pr-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-64 focus:ring-2 focus:ring-indigo-500 outline-none" onChange={(e) => dispatch({ type: 'SET_FILTER', payload: { query: e.target.value } })} />
        </div>
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
        <select value={state.activePersonaId||''} onChange={(e)=> dispatch({type:'SET_ACTIVE_PERSONA',payload:e.target.value})} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${state.filters.onlyMyPersonas ? 'bg-indigo-700 text-violet-700 dark:bg-indigo-900 dark:text-indigo-300' : 'hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
        <option value={'all'}>All Tasks</option>
        <option value={'personas'}>Personas</option>
        {personas.map((item,index)=>(<option key={index} value={item}>{item}</option>))}
        </select>
        <AnimatePresence>
        {state.activePersonaId && state.activePersonaId !== 'all' && state.activePersonaId !== 'personas' && (
            <motion.div initial={{ opacity: 0, scale: 0.95, x: -10 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95, x: -10 }} className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-lg">
            <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-violet-600 dark:text-violet-400">{state.activePersonaId}</span>
            <button onClick={() => dispatch({type:'SET_ACTIVE_PERSONA', payload: 'all'})} className="ml-1 text-violet-500 hover:text-violet-700"><X className="w-3 h-3" /></button>
            </motion.div>
        )}
        </AnimatePresence>
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
        <select value={state.timelineView} onChange={(e) => dispatch({ type: 'SET_TIMELINE_VIEW', payload: e.target.value as TimelineView })} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
        <option value="Daily">Daily View</option>
        <option value="Weekly">Weekly View</option>
        <option value="Monthly">Monthly View</option>
        </select>
        <ProjectVisibilityDropdown state={state} dispatch={dispatch} onDeleteProject={handleDeleteProject} />
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
        <button onClick={() => setAddProjectVisible(true)} className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 transition-all" title="Add Project"><FolderPlus className="w-4 h-4" /></button>
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
        <button onClick={() => dispatch({ type: 'SET_LAYOUT_MODE', payload: 'Roadmap' })} className={`p-1.5 rounded-md transition-all ${state.layoutMode === 'Roadmap' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Calendar className="w-4 h-4" /></button>
        <button onClick={() => dispatch({ type: 'SET_LAYOUT_MODE', payload: 'Board' })} className={`p-1.5 rounded-md transition-all ${state.layoutMode === 'Board' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-4 h-4" /></button>
        <button onClick={() => dispatch({ type: 'SET_LAYOUT_MODE', payload: 'Sprint' })} className={`p-1.5 rounded-md transition-all ${state.layoutMode === 'Sprint' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><List className="w-4 h-4" /></button>
        </div>
        <button onClick={handleAutoBalance} className="ml-auto bg-violet-600 dark:bg-violet-600 hover:bg-violet-700 dark:hover:bg-violet-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-violet-500/20 transition-all"><Zap className="w-3 h-3" /> Auto-Balance</button>
        </div>
        </div>
        </div>
        </header>

        <WorkloadHUD />

        {/* GANTT CANVAS */}
        {state.layoutMode === 'Roadmap' && (() => {
            const { totalUnits, startDate } = getDateRangeForView(state.timelineView, state.viewMode);
            const labels = generateTimelineLabels(state.timelineView, totalUnits, startDate);
            const cellWidth = state.timelineView === 'Daily' ? 120 : state.timelineView === 'Weekly' ? 150 : 200;
            const totalWidth = totalUnits * cellWidth;

            return (
                <div className="flex-1 overflow-x-auto overflow-y-auto relative custom-scrollbar bg-slate-50 dark:bg-[#0B1120]" onDragOver={(e) => e.preventDefault()} onDrop={handleBackgroundDrop}>
                <div style={{ minWidth: `${totalWidth}px` }} className="p-8">

                {/* TIMELINE DATES */}
                <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-[#0B1120]/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 mb-6">
                <div className="flex gap-0">
                {labels.map((label, i) => (
                    <div key={i} className="py-3 border-r border-slate-200 dark:border-slate-800/50 text-center" style={{ minWidth: `${cellWidth}px`, width: `${cellWidth}px` }}>
                    <span className={`text-xs font-bold text-slate-400 uppercase ${state.timelineView === 'Monthly' ? 'tracking-normal' : 'tracking-widest'}`}>
                    {label}
                    </span>
                    </div>
                ))}
                </div>
                </div>

                <div className="relative">
                {/* BACKGROUND GRID */}
                <div className="absolute inset-0 flex pointer-events-none z-0">
                {Array.from({ length: totalUnits }).map((_, i) => (
                    <div key={i} className="border-r border-dashed border-slate-200 dark:border-slate-800 h-full" style={{ minWidth: `${cellWidth}px`, width: `${cellWidth}px` }} />
                ))}
                </div>

                {/* SVG LINES OVERLAY */}
                <DependencyLayer tasks={state.tasks} projects={state.projects} viewMode={state.viewMode} collapsedProjects={collapsedProjects} />

                {/* PROJECT ROWS */}
                <div className="space-y-12 relative z-10">
                {state.isLoading ? (
                    // Loading Skeletons
                    <div className="space-y-12 p-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="animate-pulse space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                        <div className="w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>
                        <div className="h-14 w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-lg" />
                        <div className="h-14 w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-lg" />
                        </div>
                    ))}
                    </div>
                ) : state.projects.filter(project => !state.hiddenProjects.has(project.id)).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-center">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No matching tasks found</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Try adjusting your search or filters to find what you're looking for.
                    </p>
                    </div>
                ) : (
                    state.projects
                    .filter(project => !state.hiddenProjects.has(project.id)) // NEW: Filter out hidden projects
                    .map(project => {
                        const projectTasks = filteredTasks.filter(t => t.projectId === project.id);
                        const isCollapsed = collapsedProjects.includes(project.id);

                        // Get unique users for this project to display avatars
                        const projectUserIds = [...new Set(projectTasks.map(task => task.ownerId))];
                        const projectUsers = state.users.filter(user => projectUserIds.includes(user.id));

                        // REMOVED: if (projectTasks.length === 0) return null; // Now showing all projects

                        return (
                            <div key={project.id}>
                            {/* Project Title Stickiness */}
                            <div className="sticky left-0 flex items-center gap-3 pr-4 w-fit z-20 bg-slate-50 dark:bg-[#0B1120] py-1 rounded-r-lg mb-2">
                            <button onClick={() => toggleProjectCollapse(project.id)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors">
                            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${!isCollapsed ? 'rotate-90' : ''}`} />
                            </button>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{project.name}</h3>
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                            {projectTasks.length}
                            </span>

                            <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="ml-2 p-1 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Delete Project"
                            >
                            <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Collapsed View: Show Avatars */}
                            <div className={`flex items-center transition-all duration-300 ease-in-out ${isCollapsed ? 'pl-2 opacity-100' : '-translate-x-4 opacity-0 h-0 w-0'}`}>
                            {projectUsers.map((user, index) => (
                                <img
                                key={user.id}
                                src={user.avatar}
                                alt={user.name}
                                className="w-6 h-6 rounded-full border-2 border-slate-50 dark:border-[#0B1120]"
                                style={{ marginLeft: index > 0 ? '-10px' : 0, zIndex: projectUsers.length - index }}
                                />
                            ))}
                            </div>
                            </div>

                            {/* Animated Task Container */}
                            <div className={`grid transition-all duration-300 ease-in-out ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                            <div className="overflow-hidden">
                            <div className="relative min-h-[100px] space-y-1">
                            {projectTasks.length === 0 ? (
                                <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                                No tasks in this project yet
                                </div>
                            ) : (
                                projectTasks.map(task => (
                                    <RoadmapRow
                                    key={task.id}
                                    task={task}
                                    users={state.users}
                                    level={0}
                                    dispatch={dispatch}
                                    envoyActiveTaskId={state.envoyActive}
                                    onEdit={(t) => {
                                        setTaskToEdit(t);
                                        setAVisible(true);
                                    }}
                                    personas={state.personas}
                                    onTaskDrop={(s, t) => setDependencyModal({ sourceId: s, targetId: t })}
                                    parentId={null}
                                    timelineView={state.timelineView}
                                    startDate={startDate}
                                    totalUnits={totalUnits}
                                    />
                                ))
                            )}
                            </div>
                            </div>
                            </div>
                            </div>
                        );
                    })
                )}
                </div>
                </div>
                </div>
                </div>
            );
        })()}

        {/* BOARD & SPRINT VIEWS */}
        {state.layoutMode === 'Board' && <BoardView tasks={filteredTasks} users={state.users} />}
        {state.layoutMode === 'Sprint' && <SprintView tasks={filteredTasks} users={state.users} />}

        {/* SHARED OVERLAYS */}
        <div>
        <div className='fixed bottom-6 right-6 z-50' id='addButton'>
        <button
        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-[12px] p-4 shadow-lg transition-transform hover:scale-110"
        onClick={() => {
            setTaskToEdit(undefined);
            setAVisible(true);
        }}>
        <Plus className="w-15 h-6" />
        </button>
        </div>

        {/* --- ENVOY DRAWER --- */}
        <EnvoyDrawer
        taskId={state.envoyActive || ''}
        isOpen={state.envoyActive !== null}
        onClose={() => dispatch({ type: 'TRIGGER_ENVOY', payload: null })}
        onUpdateSuccess={async () => {
            // Refresh data after AI apply
            const data = await MockAPI.fetchData(jwt!);
            dispatch({ type: 'INIT_DATA', payload: data });
        }}
        />

        {/* Open the AddTaskModal window */}
        {addVisible && ( <AddTaskModal
            onClose={() => {
                setAVisible(false);
                setTaskToEdit(undefined);
            }}
            taskToEdit={taskToEdit} />)}

            {/* Add Project Modal */}
            {addProjectVisible && (
                <AddProjectModal
                onClose={() => setAddProjectVisible(false)}
                onSuccess={() => triggerPopup("Project Created Successfully!")}
                />
            )}

            {/* Delete Project Modal */}
            {projectToDelete && (
                <DeleteProjectModal
                project={projectToDelete}
                onClose={() => setProjectToDelete(null)}
                onConfirm={confirmDeleteProject}
                />
            )}

            {/* Dependency Creation Modal */}
            {dependencyModal && (
                <DependencyCreationModal
                sourceId={dependencyModal.sourceId}
                targetId={dependencyModal.targetId}
                tasks={state.tasks}
                onClose={() => setDependencyModal(null)}
                onConfirm={handleCreateDependency}
                />
            )}

            {/* Dependency Edit Modal (Drag Out) */}
            {dependencyEditModal && (
                <DependencyEditModal
                fromId={dependencyEditModal.fromId}
                toId={dependencyEditModal.toId}
                tasks={state.tasks}
                onClose={() => setDependencyEditModal(null)}
                onUpdate={async () => {
                    const data = await MockAPI.fetchData(jwt!);
                    dispatch({ type: 'INIT_DATA', payload: data });
                }}
                />
            )}

            {/* NEW: Dependency Panel */}
            {/* NEW: Dependency Panel */}
            {viewingDependenciesFor && (
                <DependencyPanel
                taskId={viewingDependenciesFor}
                onClose={() => dispatch({ type: 'VIEW_DEPENDENCIES', payload: null })}
                />
            )}

            {/* VIOLET SUCCESS POPUP */}
            {mounted && createPortal(
                <AnimatePresence>
                {popupMessage && (
                    <motion.div
                    key="success-popup"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed top-28 right-6 z-[9999] flex items-center gap-3 bg-violet-700 text-white px-6 py-4 rounded-xl shadow-2xl border-l-4 border-violet-400"
                    >
                    <Sparkles className="w-5 h-5 text-violet-200" />
                    <div>
                    <p className="font-bold text-sm">{popupMessage}</p>
                    </div>
                    </motion.div>
                )}
                </AnimatePresence>,
                document.body
            )}

            </div>

            </div>

            <AutoBalanceModal
            isOpen={showAutoBalanceModal}
            onClose={() => setShowAutoBalanceModal(false)}
            suggestions={balanceSuggestions}
            loading={autoBalanceLoading}
            onAccept={handleAcceptBalanceSuggestion}
            onDecline={handleDeclineBalanceSuggestion}
            />

            <EnvoySidebar
            isOpen={showEnvoySidebar}
            onClose={() => setShowEnvoySidebar(false)}
            suggestions={AI_SUGGESTIONS}
            onApplySuggestion={(suggestion) => {
                console.log('Apply suggestion:', suggestion);
            }}
            />

            <style jsx global>{`
                .scrollbar-thin {
                    scrollbar-width: thin;
                }
                .scrollbar-thin::-webkit-scrollbar {
                    height: 4px;
                }
                .scrollbar-thin::-webkit-scrollbar-track {
                    background: transparent;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: #4a5568;
                    border-radius: 2px;
                }
                .touch-none {
                    -webkit-touch-callout: none;
                    -webkit-user-select: none;
                    user-select: none;
                }
                button:active {
                    transform: scale(0.98);
                }
                @media (max-width: 768px) {
                    .task-card {
                        font-size: 0.875rem;
                    }
                }
                `}</style>

                </AppContext.Provider>
    );
}
