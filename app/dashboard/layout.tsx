/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Truck, 
  ShoppingCart, 
  Search, 
  Database, 
  Store, 
  Factory, 
  ChevronDown, 
  Bell, 
  Box,
  Activity,
  Users,
  PieChart,
  Wallet,
  Menu,
  UtensilsCrossed,
  BarChart3,
  Layers,
  Settings2 // Tambahkan ini untuk logo
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- CONFIG NAVIGASI ---
  const navigation: NavGroup[] = [
    {
      group: 'ADMIN OUTLET',
      items: [
        { name: 'Request Order', path: '/dashboard/outlet/request', icon: <ClipboardList size={18} /> },
        { name: 'Receiving', path: '/dashboard/outlet/receiving', icon: <Truck size={18} /> },
      ]
    },
    {
      group: 'PURCHASING',
      items: [
        { name: 'List Request', path: '/dashboard/purchasing/pr', icon: <LayoutDashboard size={18} />, badge: prCount },
        { name: 'Purchase Order', path: '/dashboard/purchasing/po', icon: <ShoppingCart size={18} /> },
        { name: 'Monitor Status', path: '/dashboard/purchasing/receiving', icon: <Search size={18} /> },
      ]
    },
    {
      group: 'FINANCE & ANALYST',
      items: [
        { name: 'Finance', path: '/dashboard/finance', icon: <Wallet size={18} />, empty: true },
        { name: 'Data Analyst', path: '/dashboard/analyst', icon: <BarChart3 size={18} />, empty: true },
      ]
    },
    {
      group: 'LOGISTICS',
      items: [
        { name: 'Inventory Stock', path: '/dashboard/inventory', icon: <Box size={18} />, empty: true },
        { name: 'Report', path: '/dashboard/logistics/report', icon: <PieChart size={18} /> },
      ]
    },
    {
      group: 'SETUP & MASTER',
      items: [
        { name: 'Master Inventory', path: '/dashboard/setup/inventory', icon: <Database size={18} /> },
        { name: 'Master Menu', path: '/dashboard/setup/menu', icon: <UtensilsCrossed size={18} />, empty: true },
        { name: 'Outlet Management', path: '/dashboard/setup/outlet', icon: <Store size={18} /> }, 
        { name: 'Supplier Management', path: '/dashboard/setup/supplier', icon: <Factory size={18} /> },
        { name: 'User Management', path: '/dashboard/setup/users', icon: <Users size={18} />, empty: true },
      ]
    }
  ];

  // --- LOGIKA OPEN/CLOSE GROUPS ---
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>(() => {
    const initialOpen: { [key: string]: boolean } = {};
    navigation.forEach(nav => {
      if (nav.items.some(item => pathname === item.path)) {
        initialOpen[nav.group] = true;
      }
    });
    return initialOpen;
  });

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // --- LOGIKA FETCH NOTIFIKASI ---
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:3000/purchasing/pr/pending?t=${Date.now()}`, {
        cache: 'no-store'
      }); 
      
      if (!res.ok) throw new Error('Network response was not ok');
      
      const data = await res.json();
      if (Array.isArray(data)) {
        const pendingItems = data.filter((item: any) => !item.isChecked).length;
        setPrCount(pendingItems);
      }
    } catch (err) {
      console.error("Gagal mengambil notifikasi:", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-22'} bg-slate-950 text-slate-300 flex flex-col transition-all duration-300 ease-in-out z-20`}>
        {/* Logo Section */}
        <div className="h-20 flex items-center px-6 border-b border-slate-900">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
            <Settings2 className="text-white" size={20} />
          </div>
          {isSidebarOpen && (
            <div className="ml-4 overflow-hidden whitespace-nowrap">
              <h1 className="text-sm font-black tracking-[0.2em] text-white uppercase">CAMDEN</h1>
              <p className="text-[9px] font-bold text-indigo-400 tracking-widest uppercase">Global Network</p>
            </div>
          )}
        </div>
        
        {/* Navigation Section */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {navigation.map((section) => {
            const isOpen = openGroups[section.group];
            return (
              <div key={section.group} className="space-y-1">
                {isSidebarOpen && (
                  <button onClick={() => toggleGroup(section.group)} className="w-full flex items-center justify-between px-3 py-4 mt-2 group text-left">
                    <h3 className="text-[9px] font-black text-slate-500 group-hover:text-slate-400 uppercase tracking-[0.25em] transition-colors">
                      {section.group}
                    </h3>
                    <ChevronDown size={12} className={`text-slate-700 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}

                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isSidebarOpen && isOpen ? 'max-h-[500px] opacity-100' : isSidebarOpen ? 'max-h-0 opacity-0' : 'max-h-full'}`}>
                  {section.items.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                      <Link 
                        key={item.path} 
                        href={item.empty ? '#' : item.path}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                          isActive 
                            ? 'bg-indigo-600 shadow-xl shadow-indigo-600/10 text-white' 
                            : 'text-slate-400 hover:bg-slate-900 hover:text-indigo-400'
                        } ${item.empty ? 'opacity-20 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`${isActive ? 'scale-110 text-white' : 'group-hover:scale-110 group-hover:text-indigo-400'} transition-all`}>
                            {item.icon}
                          </span>
                          {isSidebarOpen && <span className="text-[11px] font-bold uppercase tracking-wider">{item.name}</span>}
                        </div>
                        {isSidebarOpen && item.badge !== undefined && item.badge > 0 && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center ${isActive ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
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

        {/* Footer User */}
        <div className="p-4 border-t border-slate-900 bg-slate-950">
          <div className={`flex items-center ${isSidebarOpen ? 'gap-3 bg-slate-900/50 p-3 rounded-2xl border border-white/5' : 'justify-center'}`}>
            <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400 font-black flex-shrink-0 border border-slate-700">
              A
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">Super Admin</p>
                <p className="text-[9px] text-indigo-400 font-bold flex items-center gap-1.5 uppercase">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                  Connected
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 border border-transparent hover:border-slate-100 transition-all">
              <Menu size={20} />
            </button>
            <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>
            <div>
              <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                {sectionName(pathname)}
              </h2>
              <p className="text-base font-black text-slate-900 uppercase tracking-tighter">
                {pathname.split('/').pop()?.replace('-', ' ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Network</span>
                <span className="text-[9px] font-bold text-slate-600 uppercase">Secure</span>
              </div>
              <Activity size={16} className="text-indigo-600 animate-pulse" />
            </div>

            <button className="relative p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all group">
              <Bell size={20} className="group-hover:rotate-12 transition-transform" />
              {prCount > 0 && (
                <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600 border border-white"></span>
                </span>
              )}
            </button>
          </div>
        </header>
        
        <section className="flex-1 overflow-y-auto bg-slate-50/60 p-6 md:p-8 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}

function sectionName(path: string) {
  const p = path.toLowerCase();
  if (p.includes('outlet')) return 'Operation / Branch Control';
  if (p.includes('purchasing')) return 'Supply Chain / Purchasing';
  if (p.includes('finance')) return 'Management / Finance';
  if (p.includes('setup')) return 'Administrator / Master';
  return 'Main / Dashboard';
}