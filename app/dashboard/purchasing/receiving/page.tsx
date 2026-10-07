/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCcw, 
  PackageCheck, 
  AlertTriangle, 
  Truck, 
  CheckCircle2, 
  Calendar,
  Loader2,
  MapPin,
  Building2
} from 'lucide-react';
import toast from 'react-hot-toast'; // Tambahan utilitas global toast
import { fetchApi } from '../../../utils/api'; // Menggunakan utilitas global API

// --- INTERFACES ---
interface MonitoringItem {
  id: string;
  product: { name: string; code: string; sku?: string };
  quantity: number;
  receivedQuantity: number;
  notes?: string;
  uom?: string;
  prItem?: {
    purchaseRequest?: {
      outlet?: { name: string };
    };
  };
}

interface POMonitor {
  id: string;
  orderNumber: string;
  status: string;
  supplier: { name: string };
  createdAt: string;
  items: MonitoringItem[];
}
// --- AKHIR INTERFACES ---

export default function ReceivingMonitorPage() {
  // --- STATE MANAGEMENT ---
  const [poLogs, setPoLogs] = useState<POMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  // --- AKHIR STATE MANAGEMENT ---

  // --- FETCH DATA (API CALLS) ---
  const fetchMonitorData = useCallback(async () => {
    try {
      setLoading(true);
      // Menggunakan fetchApi Global yang otomatis menyisipkan Token JWT
      const res = await fetchApi(`/purchasing/po/list?t=${Date.now()}`);
      if (!res.ok) throw new Error("Gagal mengambil data");
      
      const data = await res.json();
      
      // Safeguard jika response bukan array
      if (!Array.isArray(data)) {
        setPoLogs([]);
        return;
      }
      
      const monitorable = data.filter((po: any) => po.status === 'SENT' || po.status === 'RECEIVED');
      
      // Sortir Berdasarkan Tanggal Terbaru
      const sorted = monitorable.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setPoLogs(sorted);
    } catch (err) {
      toast.error("Gagal mengambil data monitoring logistik");
      setPoLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitorData();
  }, [fetchMonitorData]);
  // --- AKHIR FETCH DATA ---

  // --- RENDER PREPARATION (LOADING STATE) ---
  if (loading && poLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-transparent gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sinkronisasi Audit Logistik...</p>
      </div>
    );
  }
  // --- AKHIR RENDER PREPARATION ---

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 sm:px-6 mt-6 font-sans text-slate-900">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receiving Monitor</h1>
          <p className="text-sm text-slate-500 font-medium">Pantau realisasi pengiriman barang per outlet</p>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={fetchMonitorData}
                className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95 group"
            >
                <RefreshCcw size={14} className={`group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                REFRESH DATA
            </button>
        </div>
      </div>
      {/* --- AKHIR HEADER SECTION --- */}


      {/* --- STATS OVERVIEW --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total PO Aktif</p>
            <p className="text-2xl font-bold text-slate-800">{poLogs.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dalam Pengiriman</p>
            <p className="text-2xl font-bold text-amber-600">{poLogs.filter(po => po.status === 'SENT').length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Telah Diterima</p>
            <p className="text-2xl font-bold text-emerald-600">{poLogs.filter(po => po.status === 'RECEIVED').length}</p>
        </div>
      </div>
      {/* --- AKHIR STATS OVERVIEW --- */}


      {/* --- MAIN CONTENT (PO LOGS) --- */}
      <div className="space-y-6">
        {poLogs.length === 0 ? (
          
          /* EMPTY STATE */
          <div className="bg-white py-20 rounded-3xl text-center border border-slate-200 shadow-sm">
            <Truck size={40} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Belum ada aktivitas logistik</h3>
          </div>
          
        ) : (
          
          /* DAFTAR PO LOGS */
          poLogs.map((po) => {
            const totalItems = po.items.length;
            const receivedItemsCount = po.items.filter(it => it.receivedQuantity >= it.quantity && it.quantity > 0).length;
            const progress = totalItems > 0 ? (receivedItemsCount / totalItems) * 100 : 0;

            return (
              <div key={po.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                
                {/* Header Card PO */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/30">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl shadow-sm ${
                      po.status === 'RECEIVED' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {po.status === 'RECEIVED' ? <CheckCircle2 size={20} /> : <Truck size={20} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h2 className="text-base font-bold text-slate-800 tracking-tight">{po.orderNumber}</h2>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase border ${
                            po.status === 'RECEIVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                            {po.status === 'RECEIVED' ? 'Diterima' : 'Pengiriman'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="flex items-center gap-1.5 text-slate-500">
                                <Building2 size={12} className="text-slate-400" />
                                <p className="text-[11px] font-bold uppercase tracking-tight">{po.supplier?.name}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400 border-l pl-3 border-slate-200">
                                <Calendar size={12} />
                                <p className="text-[10px] font-bold uppercase">{new Date(po.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>
                    </div>
                  </div>

                  {/* Progress Bar Pengiriman */}
                  <div className="w-full md:w-auto flex flex-col items-end gap-1.5">
                    <div className="flex justify-between w-full md:w-40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Progress</span>
                        <span className={po.status === 'RECEIVED' ? 'text-emerald-600' : 'text-indigo-600'}>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full md:w-40 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 ${po.status === 'RECEIVED' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                  </div>
                </div>

                {/* --- ITEMS TABLE --- */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="px-6 py-4 text-left font-black">Produk & Destinasi</th>
                        <th className="px-4 py-4 text-center font-black">Pesanan</th>
                        <th className="px-4 py-4 text-center font-black">Diterima</th>
                        <th className="px-6 py-4 text-right font-black">Status Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {po.items.map((item) => {
                        const isMismatch = item.receivedQuantity > 0 && item.receivedQuantity !== item.quantity;
                        const isComplete = item.receivedQuantity >= item.quantity && item.quantity > 0;
                        const isWaiting = item.receivedQuantity === 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-800 text-xs uppercase mb-1">
                                {item.product?.name || "Unknown Product"}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                                  <MapPin size={10} /> {item.prItem?.purchaseRequest?.outlet?.name || "Central"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                  {item.product?.code || (item.product as any)?.sku || "NO-SKU"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                    {item.quantity} <span className="text-[9px] text-slate-400 ml-0.5 uppercase">{item.uom || 'PCS'}</span>
                                </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`text-sm font-black ${
                                isWaiting ? 'text-slate-300' : isMismatch ? 'text-rose-600' : 'text-emerald-600'
                              }`}>
                                {item.receivedQuantity}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end">
                                {isMismatch ? (
                                  <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-xl border border-rose-100 shadow-sm group relative cursor-help">
                                    <AlertTriangle size={12} className="animate-pulse" />
                                    <span className="text-[10px] font-black uppercase">Mismatch</span>
                                    {/* Tooltip Notes */}
                                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-900 text-white p-2 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl font-medium">
                                        "{item.notes || 'Tidak ada catatan'}"
                                    </div>
                                  </div>
                                ) : isComplete ? (
                                  <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase">
                                    <CheckCircle2 size={12} /> Verified
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-slate-300 text-[10px] font-black uppercase italic">
                                    <Truck size={12} /> In Transit
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* --- AKHIR ITEMS TABLE --- */}

              </div>
            );
          })
        )}
      </div>
      {/* --- AKHIR MAIN CONTENT --- */}
      
    </div>
  );
}