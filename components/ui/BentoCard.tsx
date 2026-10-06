import React from 'react';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean; // Opsi jika butuh kotak tanpa padding (misal untuk tabel)
}

export default function BentoCard({ children, className = '', noPadding = false }: BentoCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden ${noPadding ? '' : 'p-6 md:p-8'} ${className}`}>
      {children}
    </div>
  );
}