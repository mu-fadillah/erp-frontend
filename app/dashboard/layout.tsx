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
  Database, 
  Store, 
  Factory, 
  ChevronDown, 
  Bell, 
  Users,
  PieChart,
  Wallet,
  Menu,
  Activity,
  BarChart3,
  Settings2,
  Package,
  History,
  ChefHat,
  BarChartHorizontal
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
      group: 'FINANCE & ACCOUNTING',
      items: [
        { name: 'Financial Report', path: '/dashboard/finance/accounting', icon: <Wallet size={18} />, empty: true },
        { name: 'Sales Analysis', path: '/dashboard/finance/sales', icon: <BarChart3 size={18} />, empty: true },
      ]
    },
    {
      group: 'PURCHASING',
      items: [
        { name: 'List Request', path: '/dashboard/purchasing/pr', icon: <ClipboardList size={18} />, badge: prCount },
        { name: 'Purchase Order', path: '/dashboard/purchasing/po', icon: <ShoppingCart size={18} /> },
      ]
    },
    {
      group: 'INVENTORY',
      items: [
        { name: 'Item List', path: '/dashboard/inventory/itemlist', icon: <Package size={18} /> },
        { name: 'Inventory Adjustment', path: '/dashboard/inventory/adjust', icon: <History size={18} />, },
      ]
    },
    {
      group: 'PRODUCTION',
      items: [
        { name: 'Kitchen Production', path: '/dashboard/production', icon: <ChefHat size={18} />, empty: true },
      ]
    },
    {
      group: 'ADMIN OUTLET',
      items: [
        { name: 'Request Order', path: '/dashboard/outlet/request', icon: <LayoutDashboard size={18} /> },
        { name: 'Receiving', path: '/dashboard/outlet/receiving', icon: <Truck size={18} /> },
      ]
    },
    {
      group: 'REPORT NAVIGASI',
      items: [
        { name: 'Report In (Barang Masuk)', path: '/dashboard/report/in', icon: <BarChartHorizontal size={18} /> },
      ]
    },
    {
      group: 'SETUP SYSTEM',
      items: [
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
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // --- LOGIKA FETCH NOTIFIKASI ---
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:3000/purchasing/pr/pending?t=${Date.now()}`); 
      
      if (!res.ok) return; // Hindari memproses jika response error

      const data = await res.json();
      if (Array.isArray(data)) {
        const pendingCount = data.filter((item: any) => !item.isChecked).length;
        
        // Hanya update state jika jumlahnya berbeda untuk menghindari render berulang
        setPrCount(prev => {
          if (prev !== pendingCount) return pendingCount;
          return prev;
        });
      }
    } catch (err) {
      console.error("Gagal mengambil notifikasi:", err);
    }
  }, []);

  useEffect(() => {
    // Jalankan fetch pertama kali setelah komponen mount
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 0);

    const interval = setInterval(fetchNotifications, 15000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-slate-950 text-slate-300 flex flex-col transition-all duration-300 z-20`}>
        <div className="h-20 flex items-center px-6 border-b border-slate-900">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Settings2 className="text-white" size={20} />
          </div>
          {isSidebarOpen && (
            <div className="ml-4 overflow-hidden">
              <h1 className="text-sm font-black tracking-widest text-white uppercase">CAMDEN</h1>
              <p className="text-[9px] font-bold text-indigo-400 tracking-tighter uppercase">Inventory System</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navigation.map((section) => {
            const isOpen = openGroups[section.group];
            return (
              <div key={section.group} className="space-y-1">
                {isSidebarOpen && (
                  <button onClick={() => toggleGroup(section.group)} className="w-full flex items-center justify-between px-3 py-4 mt-2 group">
                    <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-400">
                      {section.group}
                    </h3>
                    <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}

                <div className={`space-y-1 ${isSidebarOpen && !isOpen ? 'hidden' : 'block'}`}>
                  {section.items.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                      <Link 
                        key={item.path} 
                        href={item.empty ? '#' : item.path}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all group ${
                          isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'
                        } ${item.empty ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          {isSidebarOpen && <span className="text-[11px] font-bold uppercase">{item.name}</span>}
                        </div>
                        {isSidebarOpen && item.badge !== undefined && item.badge > 0 && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400">
              <Menu size={20} />
            </button>
            <div className="h-6 w-[px] bg-slate-200"></div>
            <div>
              <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                {sectionName(pathname)}
              </h2>
              <p className="text-base font-black text-slate-900 uppercase">
                {pathname.split('/').pop()?.replace('-', ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <Activity size={16} className="text-indigo-600" />
             <button className="relative p-2.5 text-slate-400">
              <Bell size={20} />
              {prCount > 0 && <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-indigo-600 rounded-full border border-white"></span>}
            </button>
          </div>
        </header>
        
        <section className="flex-1 overflow-y-auto bg-slate-50/60 p-6 md:p-8">
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
  if (p.includes('outlet')) return 'Outlet Operations';
  if (p.includes('purchasing')) return 'Procurement';
  if (p.includes('finance')) return 'Finance & Sales';
  if (p.includes('inventory')) return 'Inventory Control';
  if (p.includes('setup')) return 'System Setup';
  return 'Dashboard';
}