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

  // Bungkus fetch dalam useCallback agar bisa dipanggil berulang dengan efisien
  const fetchNotifications = useCallback(async () => {
    try {
      // Tambahkan timestamp agar browser tidak melakukan caching pada request API
      const res = await fetch(`http://localhost:3000/purchasing/pr/pending?t=${Date.now()}`); 
      const data = await res.json();
      
      // Hitung item yang belum diproses (status selain PROCESSED atau isChecked: false)
      const pendingItems = data.filter((item: any) => !item.isChecked).length;
      
      // Update state hanya jika jumlahnya berubah untuk menghemat render
      setPrCount(pendingItems);
    } catch (err) {
      console.error("Gagal mengambil notifikasi", err);
    }
  }, []);

  useEffect(() => {
  let isMounted = true; // Guard untuk mencegah update state jika komponen sudah unmount

  const triggerFetch = async () => {
    if (isMounted) {
      await fetchNotifications();
    }
  };

  // 1. Jalankan fetch pertama kali
  triggerFetch();

  // 2. Setup Polling setiap 5 detik
  const interval = setInterval(triggerFetch, 5000);

  // 3. Cleanup function
  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}, [fetchNotifications]);

  // --- 2. DATA NAVIGASI ---
  const navigation: NavGroup[] = [
    {
      group: 'ADMIN OUTLET',
      items: [
        { name: 'Request Order', path: '/dashboard/outlet/request', icon: '📦' },
        { name: 'Receiving', path: '/dashboard/outlet/receiving', icon: '🚚' },
      ]
    },
    {
      group: 'PURCHASING',
      items: [
        { name: 'List Request Order', path: '/dashboard/purchasing/pr', icon: '📋', badge: prCount },
        { name: 'Purchase Order (PO)', path: '/dashboard/purchasing/po', icon: '🛒' },
        { name: 'Monitor Receiving', path: '/dashboard/purchasing/receiving', icon: '🔍' },
      ]
    },
    // ... group lainnya tetap sama
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
        { name: 'Inventory', path: '/dashboard/inventory', icon: '🏠', empty: true },
        { name: 'Report', path: '/dashboard/report', icon: '📝', empty: true },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl">
        <div className="p-8 text-2xl font-black border-b border-slate-800 tracking-tighter">
          🍞 <span className="text-orange-500">Camden</span> Group
        </div>
        
        <nav className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
          {navigation.map((section) => (
            <div key={section.group} className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-3">
                {section.group}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link 
                    key={item.path} 
                    href={item.empty ? '#' : item.path}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                      pathname === item.path 
                        ? 'bg-orange-600 shadow-lg shadow-orange-900/20 text-white' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    } ${item.empty ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-bold tracking-tight">{item.name}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-bounce-short">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Badge Section */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-2xl">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg">
              A
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Super Admin</p>
              <p className="text-[10px] text-emerald-400 font-bold">● Live Sync Active</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b flex items-center justify-between px-10 shadow-sm z-10">
          <div>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
              Management System / {sectionName(pathname)}
            </h2>
            <p className="text-xl font-bold text-gray-900 capitalize">
              {pathname.split('/').pop()?.replace('-', ' ')}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-black text-emerald-700 uppercase tracking-tighter">Live Sync</span>
            </div>
            <button className="p-3 hover:bg-gray-100 rounded-2xl relative text-xl transition-colors">
              🔔 {prCount > 0 && (
                <span className="absolute top-3 right-3 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                </span>
              )}
            </button>
          </div>
        </header>
        
        <section className="flex-1 overflow-y-auto bg-gray-50/50 p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}

function sectionName(path: string) {
  if (path.includes('outlet')) return 'Outlet Dashboard';
  if (path.includes('purchasing')) return 'Purchasing Dept';
  if (path.includes('finance')) return 'Finance Dept';
  return 'Main Dashboard';
}