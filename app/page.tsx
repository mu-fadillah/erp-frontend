/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link';
import { 
  Building2, 
  ArrowRight, 
  LayoutDashboard, 
  ShieldCheck, 
  RefreshCw, 
  Layers 
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-indigo-100 relative overflow-hidden">
      
      {/* Background Ornaments (Aesthetic) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* --- TOP NAVIGATION BAR --- */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo Area */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">LookDeep <span className="font-light text-slate-500">Group</span></h1>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] mt-0.5">Enterprise System</p>
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-slate-900 px-4 py-2 bg-slate-100 rounded-lg">
              Home
            </Link>
            <Link 
              href="/dashboard/setup/outlet" 
              className="group flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 rounded-lg transition-all shadow-lg hover:shadow-indigo-200"
            >
              Go to Dashboard
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="max-w-7xl mx-auto px-6 pt-40 pb-20 relative z-10">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-widest mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            System v2.0 - Internal Use Only
          </div>
          
          <h2 className="text-5xl md:text-6xl font-light text-slate-900 tracking-tight leading-tight">
            Integrated Data Synchronization <br/>
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">
              Across All Divisions
            </span>
          </h2>
          
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Sistem Enterprise Resource Planning (ERP) Berbasis Component Architecture. 
            Dirancang khusus untuk memusatkan pengelolaan data Supply Chain, Inventory, dan Outlet pada jaringan Food & Beverage.
          </p>

          <div className="pt-8 flex items-center justify-center gap-4">
            <Link 
              href="/dashboard/setup/outlet" 
              className="flex items-center gap-3 text-sm font-bold text-white px-8 py-4 bg-indigo-600 hover:bg-slate-900 rounded-xl transition-all shadow-xl shadow-indigo-200 active:scale-95"
            >
              <LayoutDashboard size={18} />
              Access Dashboard
            </Link>
          </div>
        </div>

        {/* --- FEATURE HIGHLIGHTS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200/60 hover:shadow-xl hover:border-indigo-100 transition-all group">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Layers size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Component-Based</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Arsitektur UI yang modular memastikan konsistensi antarmuka dan mempercepat proses rendering di seluruh halaman modul operasional.
            </p>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200/60 hover:shadow-xl hover:emerald-100 transition-all group">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <RefreshCw size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Real-time Sync</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Data dari gudang pusat (Central) tersinkronisasi secara otomatis dengan permintaan outlet, menghilangkan redundansi file Excel.
            </p>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200/60 hover:shadow-xl hover:rose-100 transition-all group">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Data Integrity</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Validasi ketat pada setiap dokumen surat jalan (SJ) dan Purchase Order memastikan proses audit keuangan berjalan akurat.
            </p>
          </div>
        </div>

      </main>

      {/* --- FOOTER --- */}
      <footer className="w-full border-t border-slate-200/60 bg-white py-8 mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            © 2026 LookDeep Group. Internal ERP System.
          </p>
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
            Developed for Academic Purpose
          </p>
        </div>
      </footer>
    </div>
  );
}