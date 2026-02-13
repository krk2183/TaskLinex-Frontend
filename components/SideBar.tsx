"use client";

import { useEffect, useState } from 'react';
import { Home, Settings, FolderKanban, UsersRound, ChevronLeft, LayoutDashboard, BarChart3, Sun, Moon, BadgePlus, MapPinCheck, UserRound, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useLayout } from './LayoutContext'; 
import { useAuth, supabase } from '../app/providers/AuthContext';

const navItems = [
    { name: 'Pulse', href: '/pulse', icon: BadgePlus },
    { name: 'Roadmap', href: '/roadmap', icon: MapPinCheck },
    { name: 'Team', href: '/team', icon: UsersRound },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Envoy', href: '/envoy', icon: FolderKanban },
];

interface UserData {
    name: string;
    initials: string;
    role: string;
}

export default function Sidebar() {
    const { isExpanded, toggleSidebar } = useLayout();
    const { userId } = useAuth();
    const [user, setUser] = useState<UserData | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const fetchUser = async () => {
            try {
                // Use centralized API URL from environment variables
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                
                // Get the JWT token from Supabase session
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                
                if (!token) {
                    console.error("No auth token available");
                    return;
                }
                
                const response = await fetch(`${baseUrl}/users/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    const firstName = userData.firstName || '';
                    const lastName = userData.lastName || '';
                    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
                    
                    setUser({
                        name: `${firstName} ${lastName}`.trim() || userData.username,
                        initials: initials || userData.username?.charAt(0).toUpperCase() || 'U',
                        role: userData.role || 'User'
                    });
                } else {
                    console.error("Failed to fetch user:", response.status);
                }
            } catch (error) {
                console.error("Failed to fetch user info for sidebar", error);
            }
        };

        fetchUser();
    }, [userId]);

    // Close mobile menu when clicking on a link
    const handleLinkClick = () => {
        setMobileMenuOpen(false);
    };
    
    const sidebarWidth = isExpanded ? 'md:w-64' : 'md:w-20';
    const transitionClass = 'transition-all duration-300 ease-in-out';    
    const sidebarBg = 'bg-white dark:bg-gray-900'; 

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between shadow-sm">
                <h1 className="text-xl font-bold text-gray-400 dark:text-white">
                    Task<span className='text-indigo-400 dark:text-indigo-500'>Linex</span>
                </h1>
                <div className="flex items-center gap-3">
                    <Link href="/account" className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">
                        {user?.initials || '...'}
                    </Link>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-lg bg-indigo-50 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-gray-600"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div 
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside className={`md:hidden fixed top-16 right-0 bottom-0 w-64 ${sidebarBg} shadow-xl z-50 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                {/* User Info */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <Link href="/account" onClick={handleLinkClick}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold text-white">
                                {user?.initials || '...'}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-800 dark:text-white">{user?.name || 'Loading...'}</div>
                                <div className="text-xs text-slate-500 capitalize">{user?.role || 'Member'}</div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={handleLinkClick}
                                className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-white rounded-lg py-3 px-4 transition-all duration-200"
                            >
                                <item.icon size={22} className="flex-shrink-0" />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        ))}
                    </div>
                </nav>
            </aside>

            {/* Desktop Sidebar */}
            <aside className={`hidden md:flex ${sidebarBg} shadow-xl ${sidebarWidth} ${transitionClass} flex-col p-4 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 h-screen sticky top-0`}>
                
                <div className="flex justify-between items-center mb-8">
                    <h1 className={`text-2xl font-bold text-gray-400 dark:text-white ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 h-0'} transition-opacity duration-300 overflow-hidden`}>
                        Task<span className='text-indigo-400 dark:text-indigo-500'>Linex</span>
                    </h1>
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-full focus:outline-none bg-indigo-50 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-gray-600 text-indigo-600 dark:text-indigo-400"
                    >
                        <ChevronLeft
                            size={24}
                            className={`transition-transform duration-300 ${isExpanded ? 'rotate-0' : 'rotate-180'}`}
                        />
                    </button>
                </div>
                
                <nav className="flex flex-col flex-1">
                    <div className='flex flex-col space-y-2'>
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center relative overflow-hidden text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-white rounded-lg py-3 px-3 transition-all duration-300 group ${isExpanded ? 'justify-start' : 'justify-center'}`}
                            >
                                <item.icon size={24} className="flex-shrink-0" />
                                <span
                                    className={`ml-3 whitespace-nowrap ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full absolute'} transition-all duration-300 overflow-hidden`}
                                >
                                    {item.name}
                                </span>
                                {!isExpanded && (
                                    <span className="absolute left-full ml-4 py-1 px-3 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>

                    <div className="mt-auto border-t border-gray-200 dark:border-slate-800 pt-4">
                        <div className={`flex items-center gap-3 ${isExpanded ? 'px-2' : 'justify-center'}`}>
                            <Link href="/account" className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                {user?.initials || '...'}
                            </Link>
                            <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? "w-full" : "w-0"}`}>
                                <Link href="/account" className="text-xs">
                                    <div className="text-gray-800 dark:text-white font-medium whitespace-nowrap">{user?.name || 'Loading...'}</div>
                                    <div className="text-slate-500 whitespace-nowrap capitalize">{user?.role || 'Member'}</div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>
            </aside>
        </>
    );
}
