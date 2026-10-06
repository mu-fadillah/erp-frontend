import React from 'react';

interface PageHeaderProps {
  title: string;
  highlight?: string; // Teks yang berwarna ungu (opsional)
  description: string;
  moduleName?: string; // Nama modul di atas judul (opsional)
  icon?: React.ReactNode; // Icon dari Lucide React
  children?: React.ReactNode; // Slot kosong untuk menaruh tombol/tab tambahan di kanan
}

export default function PageHeader({ 
  title, 
  highlight, 
  description, 
  moduleName = "ERP SYSTEM", 
  icon, 
  children 
}: PageHeaderProps) {
  return (
    <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200/60 pb-6">
      <div className="space-y-2">
        
        {/* Label Modul & Icon */}
        {icon && (
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <div className="bg-indigo-100/50 p-1.5 rounded-lg">
              {icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{moduleName}</span>
          </div>
        )}
        
        {/* Judul Halaman */}
        <h1 className="text-3xl font-light text-slate-900 tracking-tight">
          {title} {highlight && <span className="font-semibold text-indigo-600">{highlight}</span>}
        </h1>
        
        {/* Deskripsi */}
        <p className="text-slate-400 text-xs tracking-wide max-w-md">
          {description}
        </p>
      </div>

      {/* Area Kanan (Untuk Tombol/Tab) */}
      {children && (
        <div className="flex flex-wrap items-center gap-3">
          {children}
        </div>
      )}
    </section>
  );
}