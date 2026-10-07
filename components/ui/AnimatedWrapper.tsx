import React from 'react';

interface AnimatedWrapperProps {
  children: React.ReactNode;
  className?: string;
  delay?: '300' | '500' | '700' | '1000'; // Pilihan durasi
}

export default function AnimatedWrapper({ children, className = '', delay = '500' }: AnimatedWrapperProps) {
  return (
    <div className={`animate-in fade-in slide-in-from-bottom-4 duration-${delay} ${className}`}>
      {children}
    </div>
  );
}