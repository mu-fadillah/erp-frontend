import React from 'react';
import BentoCard from './BentoCard'; // INI BARIS YANG KURANG TADI ✅

interface EmptyStateProps {
  icon: React.ReactNode; // Ikon dari Lucide (misal: <PackageSearch size={56} />)
  title: string;
  description?: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <BentoCard className="flex flex-col items-center justify-center py-20">
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-indigo-50 rounded-full blur-xl"></div>
        <div className="text-indigo-100 relative">
          {icon}
        </div>
      </div>
      <p className="text-slate-400 font-semibold tracking-[0.2em] uppercase text-xs text-center">
        {title}
      </p>
      {description && (
        <p className="text-slate-400 text-[10px] mt-2 text-center max-w-sm">
          {description}
        </p>
      )}
    </BentoCard>
  );
}