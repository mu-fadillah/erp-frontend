/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Package, 
  RefreshCcw, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  ListChecks,
  XCircle,
  Building2,
  ClipboardCheck,
  MapPin,
  Calendar // Pastikan ini di-import
} from 'lucide-react';

interface PurchasingItem {
  id: string;
  product: { name: string; code: string; sku?: string };
  quantity: number;
  receivedQuantity: number;
  uom?: string;
  prItem?: {
    purchaseRequest?: {
      outlet?: {
        name: string;
      };
    };
  };
}

interface POData {
  id: string;
  orderNumber: string;
  status: string;
  supplier: { name: string };
  outlet?: { name: string }; 
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
  const [expandedPOs, setExpandedPOs] = useState<{ [key: string]: boolean }>({});
  
  const API_URL = 'http://localhost:3000';

  const fetchActivePOs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/purchasing/po/list?status=SENT`);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      
      // Filter status SENT dan urutkan PO berdasarkan Order Number
      const onlySent = data
        .filter((po: any) => po.status === 'SENT')
        .sort((a: any, b: any) => b.orderNumber.localeCompare(a.orderNumber));

      setActivePOs(onlySent);
    } catch (err) {
      console.error("Error fetching POs:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchActivePOs();
  }, [fetchActivePOs]);

  const togglePO = (poId: string) => {
    setExpandedPOs(prev => ({ ...prev, [poId]: !prev[poId] }));
  };

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

  const handleClearAll = (po: POData) => {
    const updates = { ...receiveData };
    po.items.forEach(item => {
      delete updates[item.id];
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

    if (!confirm(`Konfirmasi penerimaan ${itemsToSubmit.length} item? Tanggal hari ini akan dicatat sebagai waktu penerimaan.`)) return;

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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-slate-50 min-h-screen pb-32">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight text-[10px] uppercase tracking-[0.2em]">Receiving</h1>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Konfirmasi Stok Masuk per Item & Outlet</p>
        </div>
        <button 
          onClick={fetchActivePOs}
          className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-orange-600 transition-colors shadow-sm"
        >
          <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <Loader2 className="animate-spin text-orange-600 mb-4" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loading Warehouse Data...</p>
          </div>
        ) : activePOs.length === 0 ? (
          <div className="bg-white p-20 rounded-[40px] text-center border-2 border-dashed border-slate-200">
             <Package size={40} className="text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-bold text-sm uppercase">Belum ada PO untuk diterima.</p>
          </div>
        ) : (
          activePOs.map((po) => {
            const isExpanded = expandedPOs[po.id] || false;
            
            // LOGIKA SORTIR: Mengurutkan item berdasarkan nama outlet secara ascending
            const sortedItems = [...po.items].sort((a, b) => {
              const outletA = a.prItem?.purchaseRequest?.outlet?.name || po.outlet?.name || 'Central';
              const outletB = b.prItem?.purchaseRequest?.outlet?.name || po.outlet?.name || 'Central';
              return outletA.localeCompare(outletB);
            });

            return (
              <div key={po.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div 
                  onClick={() => togglePO(po.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-slate-100 text-slate-400'}`}>
                      <Building2 size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-tighter">{po.orderNumber}</span>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight text-[10px] uppercase tracking-[0.2em]">{po.supplier?.name}</h2>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-tight">{po.items.length} Items dalam pengiriman ini</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {isExpanded && (
                      <div className="flex items-center gap-2 mr-4">
                        <button onClick={(e) => { e.stopPropagation(); handleMatchAll(po); }} className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100 uppercase tracking-tight text-[10px] uppercase tracking-[0.2em]">
                          <ListChecks size={14} /> MATCH ALL
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleClearAll(po); }} className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-100 uppercase tracking-tight text-[10px] uppercase tracking-[0.2em]">
                          <XCircle size={14} /> CLEAR
                        </button>
                      </div>
                    )}
                    {isExpanded ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 animate-in slide-in-from-top-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item & Destination</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Remaining</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Receive</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {sortedItems.map((item) => {
                            const remaining = item.quantity - item.receivedQuantity;
                            const currentInput = receiveData[item.id]?.amount || 0;
                            
                            const itemOutlet = item.prItem?.purchaseRequest?.outlet?.name || po.outlet?.name || 'Central';

                            if (remaining <= 0) return null;

                            return (
                              <tr key={item.id} className="group hover:bg-slate-50/30 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="text-sm font-bold text-slate-700 uppercase tracking-tight">
                                    {item.product?.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                      {item.product?.sku || item.product?.code || '-'}
                                    </span>
                                    <span className="flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                                      <MapPin size={10} /> {itemOutlet}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="text-sm font-black text-orange-600">{remaining}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex justify-center">
                                    <input 
                                      type="number"
                                      value={receiveData[item.id]?.amount || ''}
                                      onChange={(e) => handleInputChange(item.id, 'amount', e.target.value)}
                                      className={`w-20 py-2 rounded-xl border-2 text-center font-black transition-all outline-none ${
                                        currentInput > 0 ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-100 bg-slate-50'
                                      }`}
                                      placeholder="0"
                                    />
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {currentInput > 0 ? (
                                    <div className="flex flex-col gap-1">
                                      {currentInput !== remaining && (
                                        <input 
                                          type="text"
                                          value={receiveData[item.id]?.notes || ''}
                                          onChange={(e) => handleInputChange(item.id, 'notes', e.target.value)}
                                          placeholder="Alasan selisih..."
                                          className="w-full px-3 py-2 rounded-lg bg-rose-50 border border-rose-100 text-[11px] font-bold text-rose-700 outline-none"
                                        />
                                      )}
                                      <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit uppercase">
                                        <Calendar size={10} /> {new Date().toLocaleDateString('id-ID')}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-300 italic flex items-center gap-1 uppercase">
                                      Waiting for input...
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-6 bg-slate-50/50 flex justify-end">
                      <button 
                        onClick={() => submitReceiving(po.id)}
                        className="flex items-center gap-3 bg-slate-900 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 group shadow-lg shadow-slate-200 disabled:bg-slate-300"
                      >
                        <ClipboardCheck size={16} />
                        Confirm Receiving
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}