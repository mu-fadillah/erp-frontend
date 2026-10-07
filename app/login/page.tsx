'use client';

import Link from 'next/link';
import { 
  Building2, 
  ArrowRight, 
  LayoutDashboard, 
  ShieldCheck, 
  RefreshCw, 
  Layers 
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Kredensial tidak valid');
      }

      // Simpan token di Cookie agar bisa dibaca oleh middleware Next.js (berlaku 1 hari)
      document.cookie = `token=${data.access_token}; path=/; max-age=86400`;
      
      // Simpan data user di LocalStorage untuk kebutuhan UI (Role, Permissions, dll)
      localStorage.setItem('user', JSON.stringify(data.user));

      // Arahkan ke halaman utama dashboard
      router.push('/dashboard/setup/outlet');
      router.refresh(); // Memaksa re-render agar layout mendeteksi status login baru
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
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
          </div>
        </div>
      </nav>

      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard LookDeep</h1>
          <p className="text-sm text-slate-500 mt-1">Silakan masuk ke akun Anda</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-500 ml-1 mb-2 block">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                required
                type="text"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 ml-1 mb-2 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                required
                type="password"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-semibold hover:bg-indigo-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}