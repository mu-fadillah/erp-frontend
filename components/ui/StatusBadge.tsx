import React from 'react';
import { Clock, CheckCircle2, PackageCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStyle = () => {
    switch (status.toUpperCase()) {
      case 'PENDING':
      case 'DRAFT':
        return { 
          icon: <Clock size={10} />, 
          text: 'Draft', 
          css: 'text-amber-600 bg-amber-50 border-amber-100' 
        };
      case 'SENT':
      case 'OFFICIAL':
        return { 
          icon: <CheckCircle2 size={10} />, 
          text: 'Official', 
          css: 'text-emerald-600 bg-emerald-50 border-emerald-100' 
        };
      case 'RECEIVED':
        return { 
          icon: <PackageCheck size={10} />, 
          text: 'Received', 
          css: 'text-indigo-600 bg-indigo-50 border-indigo-100' 
        };
      default:
        return { 
          icon: null, 
          text: status, 
          css: 'text-slate-500 bg-slate-50 border-slate-100' 
        };
    }
  };

  const { icon, text, css } = getStyle();

  return (
    <span className={`flex items-center gap-1 text-[9px] font-bold border px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${css}`}>
      {icon} {text}
    </span>
  );
}