/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useMemo } from 'react';
import { 
  Send, 
  RefreshCcw, 
  ArrowRightLeft, 
  CheckCircle2, 
  Clock, 
  MoreVertical,
  AlertCircle
} from 'lucide-react';

export default function PurchasingPODashboardPage() {
  const [poList, setPoList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingSupplier, setSendingSupplier] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  const [targetItem, setTargetItem] = useState<any>(null); 
  const [itemPrices, setItemPrices] = useState<{ [key: string]: number }>({});

  const API_URL = 'http://localhost:3000';

  useEffect(() => {
    fetchPOList();
    fetchSuppliers();
  }, []);

  const fetchPOList = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/purchasing/po/list`);
      const data = await res.json();
      setPoList(data);
      
      // Sinkronisasi harga awal dari database ke state [cite: 2026-01-28]
      const initialPrices: { [key: string]: number } = {};
      data.forEach((po: any) => {
        po.items.forEach((it: any) => {
          if (it.price) initialPrices[it.id] = it.price;
        });
      });
      setItemPrices(initialPrices);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_URL}/supplier`); 
      const data = await res.json();
      setAllSuppliers(data);
    } catch (err) { 
      console.error(err); 
    }
  };

  const handlePriceChange = (itemId: string, value: string) => {
    const numValue = parseInt(value.replace(/\D/g, '')) || 0;
    setItemPrices(prev => ({ ...prev, [itemId]: numValue }));
  };

  // Grouping data berdasarkan Supplier untuk visualisasi PO Massal [cite: 2026-01-28]
  const groupedPOs = useMemo(() => {
    const groups: { [key: string]: any } = {};
    poList.forEach((po: any) => {
      if (po.status === 'RECEIVED') return; // Sembunyikan yang sudah diterima
      const sName = po.supplier?.name || 'Unassigned';
      
      if (!groups[sName]) {
        groups[sName] = { 
          supplierName: sName, 
          supplierId: po.supplierId,
          items: [], 
          hasPendingDrafts: false,
          totalValue: 0 
        };
      }
      
      const itemsWithMeta = po.items.map((it: any) => {
        const currentPrice = itemPrices[it.id] || it.price || 0;
        groups[sName].totalValue += (it.quantity * currentPrice);
        
        return { 
          ...it, 
          poId: po.id,
          poStatus: po.status, 
          orderNumber: po.orderNumber,
          outletNote: it.prItem?.notes || it.notes 
        };
      });

      groups[sName].items.push(...itemsWithMeta);
      if (po.status === 'PENDING') groups[sName].hasPendingDrafts = true;
    });
    return Object.values(groups);
  }, [poList, itemPrices]);

  const handleFinalizeAndSend = async (supplierName: string) => {
    if (!confirm(`Terbitkan PO Resmi untuk ${supplierName}? Harga akan disimpan sebagai history.`)) return;
    
    setSendingSupplier(supplierName);
    try {
      const res = await fetch(`${API_URL}/purchasing/po/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          supplierName,
          prices: itemPrices // Mengirim Record<string, number> sesuai DTO [cite: 2026-02-02]
        })
      });

      if (!res.ok) throw new Error("Gagal finalisasi");
      
      alert(`PO Resmi terbit! Status berubah menjadi SENT.`);
      await fetchPOList();
    } catch (err) {
      alert("Gagal memproses PO. Pastikan harga sudah diisi.");
    } finally { 
      setSendingSupplier(null); 
    }
  };

  const moveSupplier = async (supplierName: string) => {
    if (!targetItem) return;
    try {
      const res = await fetch(`${API_URL}/purchasing/po/move-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchasingItemId: targetItem.id,
          newSupplierName: supplierName
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setTargetItem(null);
        await fetchPOList();
      }
    } catch (err) {
      alert("Gagal memindahkan item.");
    }
  };

  return (
    <div className="p-8 pb-40 max-w-[1600px] mx-auto bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">PO Monitoring</h1>
          <p className="text-slate-500 font-medium mt-1">Review draft, sesuaikan harga, dan kirim PO ke Vendor.</p>
        </div>
        <button onClick={fetchPOList} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all">
          <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-10">
        {groupedPOs.map((group: any, idx: number) => (
          <div key={idx} className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            {/* Header Supplier */}
            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between bg-slate-50/50 border-b gap-4">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 text-xl">🏢</div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{group.supplierName}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.items.length} Items</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="text-sm font-bold text-blue-600">Rp {group.totalValue.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {group.hasPendingDrafts && (
                <button 
                  onClick={() => handleFinalizeAndSend(group.supplierName)}
                  disabled={!!sendingSupplier}
                  className="flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:bg-slate-300"
                >
                  <Send size={18} />
                  {sendingSupplier === group.supplierName ? 'Processing...' : 'Finalize & Send PO'}
                </button>
              )}
            </div>

            {/* Grid Items */}
            <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {group.items.map((item: any) => {
                const isDraft = item.poStatus === 'PENDING';
                return (
                  <div key={item.id} className="group relative p-6 rounded-[28px] bg-slate-50 border border-slate-100 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className={`flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase ${isDraft ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {isDraft ? <Clock size={10}/> : <CheckCircle2 size={10}/>}
                          {isDraft ? 'Draft' : 'Official'}
                        </span>
                        {isDraft && (
                          <button 
                            onClick={() => { setTargetItem(item); setIsModalOpen(true); }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Move Supplier"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-800 leading-snug mb-2 uppercase tracking-tight">{item.product?.name}</h4>
                      
                      {item.outletNote && (
                        <div className="mb-4 flex items-start gap-2 p-2.5 bg-white rounded-xl border border-slate-100">
                          <AlertCircle size={12} className="text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-[11px] italic text-slate-500">"{item.outletNote}"</p>
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Price / Unit</label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                          <input 
                            type="text"
                            disabled={!isDraft}
                            className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400"
                            value={itemPrices[item.id]?.toLocaleString('id-ID') || ''}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-6 border-t border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Quantity</span>
                        <span className="text-lg font-black text-slate-900">{item.quantity} <span className="text-[10px] text-slate-400 uppercase">{item.uom}</span></span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Subtotal</span>
                        <p className="text-xs font-bold text-slate-700">Rp {((itemPrices[item.id] || 0) * item.quantity).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Pindah Supplier */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900">Switch Supplier</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-sm text-slate-500 mb-6">Pindahkan item <span className="font-bold text-slate-900 underline">{targetItem?.product?.name}</span> ke vendor lain:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {allSuppliers.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => moveSupplier(s.name)}
                  className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50 font-bold text-sm transition-all flex justify-between items-center group"
                >
                  {s.name}
                  <ArrowRightLeft size={14} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}