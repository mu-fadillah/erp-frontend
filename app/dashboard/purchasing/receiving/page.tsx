/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';

interface MonitoringItem {
  id: string;
  product: { name: string; code: string };
  quantity: number;
  receivedQuantity: number;
  notes?: string;
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
      // Mengambil semua PO yang sudah dikirim atau diterima untuk dipantau
      const res = await fetch(`${API_URL}/purchasing/po/list`);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      
      // Filter hanya PO yang minimal sudah dalam proses kirim (SENT atau RECEIVED)
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

  if (loading) return <div className="p-10 text-center font-bold text-gray-400">Memuat data monitoring...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Monitor Penerimaan</h1>
          <p className="text-gray-500 font-medium">Pantau ketidaksesuaian barang dari outlet dan supplier.</p>
        </div>
        <button 
          onClick={fetchMonitorData}
          className="bg-white border border-gray-200 px-6 py-3 rounded-2xl font-bold text-xs hover:bg-gray-50 transition-all shadow-sm"
        >
          🔄 REFRESH DATA
        </button>
      </div>

      <div className="grid gap-8">
        {poLogs.length === 0 ? (
          <div className="bg-white p-20 rounded-[40px] text-center border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold">Belum ada aktivitas penerimaan barang.</p>
          </div>
        ) : (
          poLogs.map((po) => (
            <div key={po.id} className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
              {/* Header Monitor */}
              <div className="p-8 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                <div className="flex gap-6 items-center">
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    po.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600 animate-pulse'
                  }`}>
                    {po.status === 'RECEIVED' ? '● FULLY RECEIVED' : '○ ON PROGRESS'}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 uppercase tracking-tighter">{po.orderNumber}</h2>
                    <p className="text-xs font-bold text-gray-400">Supplier: {po.supplier?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Tanggal Order</p>
                  <p className="font-bold text-gray-700">{new Date(po.createdAt).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              {/* Items Monitor */}
              <div className="p-8">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                      <th className="pb-4">Nama Produk</th>
                      <th className="pb-4 text-center">Qty Order</th>
                      <th className="pb-4 text-center">Qty Masuk</th>
                      <th className="pb-4 text-right">Status & Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {po.items.map((item) => {
                      const isMismatch = item.receivedQuantity > 0 && item.receivedQuantity !== item.quantity;
                      const isComplete = item.receivedQuantity >= item.quantity;

                      return (
                        <tr key={item.id} className="group">
                          <td className="py-6 font-bold text-gray-800">{item.product?.name}</td>
                          <td className="py-6 text-center font-bold text-gray-500">{item.quantity}</td>
                          <td className={`py-6 text-center font-black ${isComplete ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {item.receivedQuantity}
                          </td>
                          <td className="py-6">
                            <div className="flex flex-col items-end gap-2">
                              {isMismatch ? (
                                <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl max-w-xs shadow-sm">
                                  <p className="text-[9px] font-black text-rose-400 uppercase mb-1">Mismatch Note:</p>
                                  <p className="text-xs font-bold text-rose-700 italic leading-relaxed">
                                    "{item.notes || 'Tidak ada alasan yang diisi oleh outlet'}"
                                  </p>
                                </div>
                              ) : isComplete ? (
                                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black">✓ MATCHED</span>
                              ) : (
                                <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-[10px] font-black italic">AWAITING DELIVERY</span>
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
          ))
        )}
      </div>
    </div>
  );
}