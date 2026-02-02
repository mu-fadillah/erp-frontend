/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  Package, 
  RefreshCcw, 
  AlertCircle, 
  ChevronRight,
  Truck,
  Loader2,
  ListChecks
} from 'lucide-react';

interface PurchasingItem {
  id: string;
  product: { name: string; code: string };
  quantity: number;
  receivedQuantity: number;
  uom?: string;
}

interface POData {
  id: string;
  orderNumber: string;
  status: string;
  supplier: { name: string };
  items: PurchasingItem[];
}

interface ReceiveInput {
  amount: number;
  notes: string;
}

export default function ReceivingPage() {
  const [activePOs, setActivePOs] = useState<POData[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiveData, setReceiveData] = useState<{ [key: string]: ReceiveInput }>({});
  
  const API_URL = 'http://localhost:3000';

  const fetchActivePOs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/purchasing/po/list?status=SENT`);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      setActivePOs(data);
    } catch (err) {
      console.error("Error fetching POs:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchActivePOs();
  }, [fetchActivePOs]);

  const handleMatchAll = (po: POData) => {
    const updates = { ...receiveData };
    po.items.forEach(item => {
      const remaining = item.quantity - item.receivedQuantity;
      if (remaining > 0) {
        updates[item.id] = { amount: remaining, notes: '' };
      }
    });
    setReceiveData(updates);
  };

  const handleInputChange = (itemId: string, field: keyof ReceiveInput, value: string) => {
    setReceiveData(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { amount: 0, notes: '' }),
        [field]: field === 'amount' ? (parseInt(value) || 0) : value
      }
    }));
  };

  const submitReceiving = async (poId: string) => {
    const po = activePOs.find(p => p.id === poId);
    if (!po) return;

    const itemsToSubmit = po.items
      .filter(item => (receiveData[item.id]?.amount || 0) > 0)
      .map(item => ({
        itemId: item.id,
        amount: receiveData[item.id].amount,
        notes: receiveData[item.id].notes || ''
      }));

    if (itemsToSubmit.length === 0) {
      alert("Masukkan jumlah barang yang diterima!");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/purchasing/po/receive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSubmit })
      });

      if (!res.ok) throw new Error("Gagal submit");

      alert("Penerimaan barang berhasil dicatat!");
      setReceiveData({});
      fetchActivePOs();
    } catch (err) {
      alert("Terjadi kesalahan saat memproses penerimaan.");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Menghubungkan ke Gudang...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto bg-slate-50 min-h-screen pb-32">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Receiving</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Barang Datang Hari Ini</p>
          </div>
        </div>
        <button 
          onClick={fetchActivePOs} 
          className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 text-slate-400 hover:text-orange-500 hover:border-orange-200 transition-all active:scale-90"
        >
          <RefreshCcw size={20} />
        </button>
      </div>

      <div className="space-y-8">
        {activePOs.length === 0 ? (
          <div className="bg-white p-20 rounded-[40px] text-center border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold text-sm">Semua kiriman sudah diterima.</p>
          </div>
        ) : (
          activePOs.map((po) => (
            <div key={po.id} className="bg-white rounded-[35px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              {/* CARD HEADER */}
              <div className="px-6 py-5 bg-slate-900 text-white">
                <div className="flex justify-between items-start mb-2">
                   <div className="bg-orange-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                     {po.orderNumber}
                   </div>
                   <button 
                    onClick={() => handleMatchAll(po)}
                    className="flex items-center gap-1.5 text-[10px] font-black text-orange-400 hover:text-orange-300 transition-colors uppercase"
                   >
                     <ListChecks size={14} /> Match All
                   </button>
                </div>
                <h2 className="text-lg font-bold truncate leading-tight">{po.supplier?.name}</h2>
              </div>

              {/* ITEM LIST */}
              <div className="divide-y divide-slate-50">
                {po.items.map((item) => {
                  const remaining = item.quantity - item.receivedQuantity;
                  const currentInput = receiveData[item.id]?.amount || 0;
                  const isMismatch = currentInput > 0 && currentInput !== remaining;
                  const isFullyReceived = remaining <= 0;

                  if (isFullyReceived) return null;

                  return (
                    <div key={item.id} className="p-6 transition-all hover:bg-slate-50/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-black text-slate-800 text-sm uppercase leading-tight mb-1">{item.product?.name}</h3>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Order: <span className="text-slate-700">{item.quantity} {item.uom || 'U'}</span></span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Left: <span className="text-orange-600">{remaining}</span></span>
                          </div>
                        </div>

                        <div className="relative">
                          <input 
                            type="number"
                            value={receiveData[item.id]?.amount || ''}
                            onChange={(e) => handleInputChange(item.id, 'amount', e.target.value)}
                            className={`w-20 py-3 rounded-2xl border-2 text-center font-black text-lg transition-all outline-none ${
                              currentInput > 0 
                              ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-lg shadow-orange-500/10' 
                              : 'border-slate-100 bg-slate-50 focus:border-orange-300 focus:bg-white'
                            }`}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* MISMATCH WARNING & NOTE */}
                      {isMismatch && (
                        <div className="mt-4 animate-in slide-in-from-top-2">
                          <div className="flex items-center gap-2 text-rose-500 mb-2">
                            <AlertCircle size={14} />
                            <span className="text-[10px] font-black uppercase">Selisih detected! Berikan alasan:</span>
                          </div>
                          <input 
                            type="text"
                            value={receiveData[item.id]?.notes || ''}
                            onChange={(e) => handleInputChange(item.id, 'notes', e.target.value)}
                            placeholder="Contoh: Barang pecah / Supplier salah kirim..."
                            className="w-full px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-700 placeholder:text-rose-300 outline-none focus:ring-2 focus:ring-rose-200 transition-all"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* CONFIRM BUTTON */}
              <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                <button 
                  onClick={() => submitReceiving(po.id)}
                  className="w-full py-4 bg-slate-900 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                >
                  Confirm Delivery
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}