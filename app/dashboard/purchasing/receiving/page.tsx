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
  ClipboardList,
  Loader2
} from 'lucide-react';

interface MonitoringItem {
  id: string;
  product: { name: string; code: string };
  quantity: number;
  receivedQuantity: number;
  notes?: string;
  uom?: string;
}

interface POMonitor {
  id: string;
  orderNumber: string;
  status: string;
  supplier: { name: string };
  createdAt: string;
  items: MonitoringItem[];
}

export default function ReceivingMonitorPage() {
  const [poLogs, setPoLogs] = useState<POMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const API_URL = 'http://localhost:3000';

  const fetchMonitorData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/purchasing/po/list`);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      
      // Filter: Hanya tampilkan PO yang sudah SENT (dalam perjalanan) atau RECEIVED (selesai) [cite: 2026-01-28]
      const monitorable = data.filter((po: any) => po.status === 'SENT' || po.status === 'RECEIVED');
      setPoLogs(monitorable);
    } catch (err) {
      console.error("Error fetching monitoring data:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchMonitorData();
  }, [fetchMonitorData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-bold tracking-tight">Menyinkronkan data logistik...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <PackageCheck size={20} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Receiving & Audit Control</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Receiving Monitor</h1>
          <p className="text-slate-500 font-medium mt-1">Pantau realisasi pengiriman barang dan audit ketidaksesuaian qty.</p>
        </div>
        
        <button 
          onClick={fetchMonitorData}
          className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-3 rounded-2xl font-bold text-xs hover:bg-slate-50 hover:border-blue-300 transition-all shadow-sm active:scale-95 group"
        >
          <RefreshCcw size={16} className="text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
          REFRESH DATA
        </button>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {poLogs.length === 0 ? (
          <div className="bg-white p-24 rounded-[48px] text-center border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-400">Belum ada aktivitas penerimaan.</h3>
            <p className="text-slate-400 text-sm mt-1">PO yang sudah diterbitkan akan muncul di sini.</p>
          </div>
        ) : (
          poLogs.map((po) => {
            const totalItems = po.items.length;
            const receivedItems = po.items.filter(it => it.receivedQuantity >= it.quantity).length;
            const progress = (receivedItems / totalItems) * 100;

            return (
              <div key={po.id} className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                {/* PO Header Card */}
                <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex gap-6 items-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                      po.status === 'RECEIVED' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white animate-pulse'
                    }`}>
                      {po.status === 'RECEIVED' ? <CheckCircle2 size={24} /> : <Truck size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase">{po.orderNumber}</h2>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest ${
                          po.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {po.status === 'RECEIVED' ? 'FULLY RECEIVED' : 'ON PROGRESS'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">Vendor: <span className="text-slate-700">{po.supplier?.name}</span></p>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end justify-center gap-2">
                     <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Calendar size={14} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Order Date: {new Date(po.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                     </div>
                     {/* Mini Progress Bar */}
                     <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${po.status === 'RECEIVED' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                     </div>
                     <p className="text-[9px] font-black text-slate-400 uppercase">Fulfillment: {Math.round(progress)}%</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="p-8">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">
                        <th className="pb-4 flex items-center gap-2"><ClipboardList size={12}/> Product Detail</th>
                        <th className="pb-4 text-center w-32">Qty Ordered</th>
                        <th className="pb-4 text-center w-32">Qty Received</th>
                        <th className="pb-4 text-right">Status Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {po.items.map((item) => {
                        const isMismatch = item.receivedQuantity > 0 && item.receivedQuantity !== item.quantity;
                        const isComplete = item.receivedQuantity >= item.quantity;
                        const isWaiting = item.receivedQuantity === 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-6">
                              <p className="font-bold text-slate-800 text-sm uppercase">{item.product?.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">SKU: {item.product?.code}</p>
                            </td>
                            <td className="py-6 text-center">
                              <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg">
                                <span className="font-bold text-slate-600">{item.quantity}</span>
                                <span className="ml-1 text-[9px] font-bold text-slate-400 uppercase">{item.uom || 'Unit'}</span>
                              </div>
                            </td>
                            <td className="py-6 text-center">
                              <span className={`text-lg font-black ${
                                isWaiting ? 'text-slate-300' : isMismatch ? 'text-rose-500 underline decoration-rose-200 underline-offset-4' : 'text-emerald-500'
                              }`}>
                                {item.receivedQuantity}
                              </span>
                            </td>
                            <td className="py-6">
                              <div className="flex flex-col items-end gap-2">
                                {isMismatch ? (
                                  <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 p-3 rounded-2xl max-w-xs shadow-sm group-hover:scale-105 transition-transform">
                                    <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-[9px] font-black text-rose-500 uppercase mb-0.5">Quantity Mismatch</p>
                                      <p className="text-[11px] font-bold text-rose-700 italic leading-relaxed">
                                        "{item.notes || 'No discrepancy reason provided.'}"
                                      </p>
                                    </div>
                                  </div>
                                ) : isComplete ? (
                                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black shadow-sm">
                                    <CheckCircle2 size={12} /> VERIFIED MATCH
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-slate-100 text-slate-400 px-4 py-1.5 rounded-full text-[10px] font-black italic">
                                    <Truck size={12} /> WAITING DELIVERY
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}