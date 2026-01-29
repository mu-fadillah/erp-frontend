'use client';
import { useState, useEffect, useCallback } from 'react';

interface PurchasingItem {
  id: string;
  product: { name: string; code: string };
  quantity: number;
  receivedQuantity: number;
}

interface POData {
  id: string;
  orderNumber: string;
  status: string;
  supplier: { name: string };
  items: PurchasingItem[];
}

// Interface untuk state input lokal
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

  // Fungsi 1: Tombol Sesuai Semua
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

  if (loading) return <div className="p-10 text-center font-bold text-gray-400">Menyinkronkan data gudang...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen pb-24">
      <h1 className="text-3xl font-black text-gray-900 mb-8 tracking-tight">Penerimaan Barang</h1>

      <div className="space-y-10">
        {activePOs.length === 0 ? (
          <div className="bg-white p-20 rounded-[40px] text-center border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold">Semua kiriman sudah diterima.</p>
          </div>
        ) : (
          activePOs.map((po) => {
            const isPoDone = po.status === 'RECEIVED';

            return (
              <div key={po.id} className={`bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden transition-all ${isPoDone ? 'opacity-50 grayscale' : ''}`}>
                {/* Header */}
                <div className="p-8 bg-gray-900 text-white flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">{po.orderNumber}</span>
                    <h2 className="text-xl font-bold">{po.supplier?.name}</h2>
                  </div>
                  {!isPoDone && (
                    <button 
                      onClick={() => handleMatchAll(po)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black px-5 py-3 rounded-2xl transition-all active:scale-95"
                    >
                      ✓ SESUAI SEMUA
                    </button>
                  )}
                </div>

                {/* Items List */}
                <div className="p-8 space-y-4">
                  {po.items.map((item) => {
                    const isItemDone = item.receivedQuantity >= item.quantity;
                    const currentInput = receiveData[item.id]?.amount || 0;
                    const remaining = item.quantity - item.receivedQuantity;
                    const isMismatch = currentInput > 0 && currentInput !== remaining;

                    return (
                      <div key={item.id} className={`p-6 rounded-[32px] border transition-all ${isItemDone ? 'bg-gray-100 border-transparent' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className={`font-black ${isItemDone ? 'text-gray-400' : 'text-gray-800'}`}>{item.product?.name}</p>
                            <div className="flex gap-3 mt-1">
                              <span className="text-[9px] font-bold text-gray-400 uppercase">Order: {item.quantity}</span>
                              <span className={`text-[9px] font-bold uppercase ${isItemDone ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                Diterima: {item.receivedQuantity}
                              </span>
                            </div>
                          </div>
                          
                          {!isItemDone && (
                            <div className="flex flex-col items-end">
                              <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Qty Datang</p>
                              <input 
                                type="number"
                                placeholder="0"
                                value={receiveData[item.id]?.amount || ''}
                                onChange={(e) => handleInputChange(item.id, 'amount', e.target.value)}
                                className="w-24 p-3 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 outline-none text-center font-black transition-all"
                              />
                            </div>
                          )}
                        </div>

                        {/* Note field jika Qty tidak sesuai */}
                        {!isItemDone && isMismatch && (
                          <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                            <textarea 
                              placeholder="Mengapa jumlah tidak sesuai? (Contoh: Barang pecah/Kurang)"
                              value={receiveData[item.id]?.notes || ''}
                              onChange={(e) => handleInputChange(item.id, 'notes', e.target.value)}
                              className="w-full p-4 rounded-2xl bg-amber-50 border border-amber-100 text-xs font-bold text-amber-800 outline-none placeholder:text-amber-300"
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!isPoDone && (
                    <button 
                      onClick={() => submitReceiving(po.id)}
                      className="w-full mt-6 bg-indigo-600 text-white py-5 rounded-[24px] font-black hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-100"
                    >
                      Konfirmasi Kedatangan Barang ➔
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}