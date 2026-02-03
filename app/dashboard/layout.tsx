/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// --- 1. DEFINISI INTERFACE ---
interface NavItem {
  name: string;
  path: string;
  icon: string;
  badge?: number;
  empty?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [prCount, setPrCount] = useState(0);

  // --- 2. DATA NAVIGASI (UPDATED WITH OUTLET) ---
  const navigation: NavGroup[] = [
    {
      group: 'ADMIN OUTLET',
      items: [
        { name: 'Request Order', path: '/dashboard/outlet/request', icon: '📝' },
        { name: 'Receiving', path: '/dashboard/outlet/receiving', icon: '🚚' },
      ]
    },
    {
      group: 'PURCHASING',
      items: [
        { name: 'List Request', path: '/dashboard/purchasing/pr', icon: '📋', badge: prCount },
        { name: 'Purchase Order', path: '/dashboard/purchasing/po', icon: '🛒' },
        { name: 'Monitor Status', path: '/dashboard/purchasing/receiving', icon: '🔍' },
      ]
    },
    {
      group: 'FINANCE & ANALYST',
      items: [
        { name: 'Finance', path: '/dashboard/finance', icon: '💰', empty: true },
        { name: 'Data Analyst', path: '/dashboard/analyst', icon: '📊', empty: true },
      ]
    },
    {
      group: 'LOGISTICS',
      items: [
        { name: 'Inventory Stock', path: '/dashboard/inventory', icon: '🏠', empty: true },
        { name: 'Report', path: '/dashboard/report', icon: '📄', empty: true },
      ]
    },
    {
      group: 'SETUP & MASTER',
      items: [
        { name: 'Master Inventory', path: '/dashboard/setup/inventory', icon: '📦' },
        { name: 'Outlet List', path: '/dashboard/setup/outlet', icon: '🏪' }, 
        { name: 'Master Supplier', path: '/dashboard/setup/supplier', icon: '🏢' },
        { name: 'Master Menu', path: '/dashboard/setup/menu', icon: '🍽️', empty: true },
        { name: 'User Management', path: '/dashboard/setup/users', icon: '👥', empty: true },
      ]
    }
  ];

  // --- 3. STATE MANAGEMENT ---
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>(() => {
    const initialOpen: { [key: string]: boolean } = {};
    navigation.forEach(nav => {
      if (nav.items.some(item => pathname === item.path)) {
        initialOpen[nav.group] = true;
      }
    });
    return initialOpen;
  });

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:3000/purchasing/pr/pending?t=${Date.now()}`); 
      const data = await res.json();
      const pendingItems = data.filter((item: any) => !item.isChecked).length;
      setPrCount(pendingItems);
    } catch (err) {
      console.error("Gagal mengambil notifikasi", err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const triggerFetch = async () => {
      if (isMounted) await fetchNotifications();
    };
    
    triggerFetch();
    const interval = setInterval(triggerFetch, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
        <div className="p-8 text-2xl font-bold border-b border-slate-800 tracking-tighter">
          🍞 <span className="text-orange-500">Camden</span> Group
        </div>
        
        <nav className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
          {navigation.map((section) => {
            const isOpen = openGroups[section.group];
            
            return (
              <div key={section.group} className="space-y-1">
                <button 
                  onClick={() => toggleGroup(section.group)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors group"
                >
                  <h3 className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300 uppercase tracking-[0.2em]">
                    {section.group}
                  </h3>
                  <span className={`text-[10px] text-slate-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                  {section.items.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                      <Link 
                        key={item.path} 
                        href={item.empty ? '#' : item.path}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                          isActive 
                            ? 'bg-orange-600 shadow-lg shadow-orange-900/40 text-white' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        } ${item.empty ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                            {item.icon}
                          </span>
                          <span className="text-sm font-semibold tracking-tight">{item.name}</span>
                        </div>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-white/5">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold">A</div>
            <div>
              <p className="text-[11px] font-bold text-white uppercase tracking-wider">Super Admin</p>
              <p className="text-[9px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Sistem Online
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b flex items-center justify-between px-10 shadow-sm z-10">
          <div>
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1">
              System / {sectionName(pathname)}
            </h2>
            <p className="text-xl font-bold text-slate-900 capitalize tracking-tight">
              {pathname.split('/').pop()?.replace('-', ' ')}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Monitoring</span>
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></span>
            </div>
            <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl relative border border-transparent hover:border-gray-200">
              <span className="text-xl">🔔</span>
              {prCount > 0 && (
                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                </span>
              )}
            </button>
          </div>
        </header>
        
        <section className="flex-1 overflow-y-auto bg-gray-50/50 p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}

function sectionName(path: string) {
  if (path.includes('outlet')) return 'Outlet Operation';
  if (path.includes('purchasing')) return 'Purchasing Dept';
  if (path.includes('finance')) return 'Finance & Accounting';
  if (path.includes('setup')) return 'Master Setup';
  return 'Main Dashboard';
}