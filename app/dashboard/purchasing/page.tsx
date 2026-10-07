/* eslint-disable react/no-unescaped-entities */
'use client';
import Link from 'next/link';
import { 
  ClipboardList, 
  ShoppingCart, 
  Truck, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

/* --- IMPORT KOMPONEN UI GLOBAL --- */
import PageHeader from '@/components/ui/PageHeader';
import AnimatedWrapper from '@/components/ui/AnimatedWrapper';
import BentoCard from '@/components/ui/BentoCard';
/* --- AKHIR IMPORT --- */

export default function PurchasingDashboard() {
  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen space-y-6">
      
      {/* --- HEADER SECTION --- */}
      <PageHeader 
        title="Purchasing" 
        highlight="Dashboard" 
        description="Pusat kontrol operasional untuk manajemen Purchase Request dan penerbitan Purchase Order."
        moduleName="Procurement"
        icon={<ShieldCheck size={14} className="text-indigo-600" />}
      />
      {/* --- AKHIR HEADER SECTION --- */}


      {/* --- MENU CARDS SECTION --- */}
      <AnimatedWrapper delay="300">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* --- KARTU: PURCHASE REQUEST --- */}
          <Link href="/dashboard/purchasing/pr" className="group">
            <BentoCard className="h-full hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 border-transparent hover:border-indigo-100 flex flex-col justify-between group-hover:-translate-y-1">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <ClipboardList size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">List Request (PR)</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Tinjau, filter, dan tetapkan supplier untuk permintaan barang dari seluruh outlet operasional.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
                Kelola Request <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </BentoCard>
          </Link>
          {/* --- AKHIR KARTU: PURCHASE REQUEST --- */}


          {/* --- KARTU: PURCHASE ORDER --- */}
          <Link href="/dashboard/purchasing/po" className="group">
            <BentoCard className="h-full hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 border-transparent hover:border-indigo-100 flex flex-col justify-between group-hover:-translate-y-1">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingCart size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Purchase Order (PO)</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Proses draf PO, terbitkan order resmi ke vendor, dan pantau status real-time.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest">
                Buat Order <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </BentoCard>
          </Link>
          {/* --- AKHIR KARTU: PURCHASE ORDER --- */}


          {/* --- KARTU: RECEIVING --- */}
          <Link href="/dashboard/outlet/receiving" className="group">
            <BentoCard className="h-full hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 border-transparent hover:border-indigo-100 flex flex-col justify-between group-hover:-translate-y-1">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Truck size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Receiving</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Konfirmasi kedatangan fisik barang dari supplier berdasarkan nomor Surat Jalan (SJ).
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-widest">
                Terima Barang <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </BentoCard>
          </Link>
          {/* --- AKHIR KARTU: RECEIVING --- */}

        </div>
      </AnimatedWrapper>
      {/* --- AKHIR MENU CARDS SECTION --- */}
      
    </div>
  );
}