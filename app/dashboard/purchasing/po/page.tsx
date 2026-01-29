/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useMemo } from 'react';

export default function PurchasingPODashboardPage() {
  const [poList, setPoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingSupplier, setSendingSupplier] = useState<string | null>(null);
  
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState<{ name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const API_URL = 'http://localhost:3000';

  useEffect(() => {
    fetchPOList();
    fetchSuppliers();
  }, []);

  const fetchPOList = async () => {
    try {
      const res = await fetch(`${API_URL}/purchasing/po/list`);
      const data = await res.json();
      setPoList(data);
    } catch (err) {
      console.error("Gagal mengambil data PO:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_URL}/purchasing/suppliers`);
      const data = await res.json();
      setAllSuppliers(data);
    } catch (err) {
      console.error("Gagal mengambil daftar supplier");
    }
  };

  /**
   * PERBAIKAN: Sekarang mengizinkan status 'SENT' untuk dipilih.
   * Hanya mengunci jika sudah 'RECEIVED'.
   */
  const toggleItemSelection = (itemId: string, poStatus: string) => {
    if (poStatus === 'RECEIVED') return; 
    
    setSelectedItemIds(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const confirmSwitchSupplier = async (targetSupplierName: string) => {
    if (selectedItemIds.length === 0) return;

    try {
      const res = await fetch(`${API_URL}/purchasing/po/switch-items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemIds: selectedItemIds, 
          newSupplierName: targetSupplierName 
        })
      });

      if (!res.ok) throw new Error("Gagal memindahkan item");

      setSelectedItemIds([]);
      setIsModalOpen(false);
      setSearchQuery('');
      await fetchPOList();
      alert(`Berhasil memindahkan item ke ${targetSupplierName}. Item kini kembali berstatus DRAFT.`);
    } catch (err) {
      alert("Terjadi kesalahan saat memindahkan item.");
    }
  };

  const groupedPOs = useMemo(() => {
    const groups: { [key: string]: any } = {};
    poList.forEach((po: any) => {
      const sName = po.supplier?.name || 'Tanpa Supplier';
      if (!groups[sName]) {
        groups[sName] = {
          supplierName: sName,
          items: [], 
          hasPendingDrafts: false,
        };
      }
      
      const itemsWithMeta = po.items.map((it: any) => ({ 
        ...it, 
        poStatus: po.status, 
        orderNumber: po.orderNumber 
      }));

      groups[sName].items.push(...itemsWithMeta);
      if (po.status === 'PENDING') groups[sName].hasPendingDrafts = true;
    });
    return Object.values(groups);
  }, [poList]);

  const handleFinalizeAndSend = async (supplierName: string) => {
    setSendingSupplier(supplierName);
    try {
      const res = await fetch(`${API_URL}/purchasing/po/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierName })
      });
      if (!res.ok) throw new Error("Gagal finalisasi");
      await fetchPOList();
      alert(`PO Resmi terbit untuk ${supplierName}`);
    } catch (err) {
      alert("Gagal memproses penggabungan PO.");
    } finally {
      setSendingSupplier(null);
    }
  };

  return (
    <div className="p-8 pb-40 max-w-7xl mx-auto bg-gray-50/50 min-h-screen">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Monitoring PO</h1>
          <p className="text-gray-500 font-medium mt-2">Kelola item draft (kuning) atau item terkirim (hijau).</p>
        </div>
        
        {selectedItemIds.length > 0 && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl hover:bg-indigo-700 transition-all flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4"
          >
            Pindahkan {selectedItemIds.length} Item ➔
          </button>
        )}
      </div>

      <div className="space-y-16">
        {groupedPOs.map((group: any, idx: number) => (
          <div key={idx} className="bg-white rounded-[48px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-10 flex items-center justify-between bg-white border-b border-gray-50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gray-900 rounded-3xl flex items-center justify-center text-2xl shadow-xl">🏢</div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{group.supplierName}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total {group.items.length} Barang dipesan</p>
                </div>
              </div>

              {group.hasPendingDrafts && (
                <button 
                  onClick={() => handleFinalizeAndSend(group.supplierName)}
                  disabled={sendingSupplier === group.supplierName}
                  className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50"
                >
                  {sendingSupplier === group.supplierName ? 'Menggabungkan...' : 'Terbitkan PO Resmi'}
                </button>
              )}
            </div>

            <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.items.map((item: any) => {
                const isDraft = item.poStatus === 'PENDING';
                const isReceived = item.poStatus === 'RECEIVED';
                const isSelected = selectedItemIds.includes(item.id);

                return (
                  <div 
                    key={item.id}
                    onClick={() => toggleItemSelection(item.id, item.poStatus)}
                    className={`relative p-6 rounded-[32px] border-2 transition-all duration-300
                      ${isSelected ? 'border-indigo-500 bg-indigo-50/30' : 'border-transparent bg-gray-50 hover:bg-white hover:shadow-xl hover:border-gray-200'}
                      ${isReceived ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className={`absolute top-0 left-12 right-12 h-1.5 rounded-b-full
                      ${isDraft ? 'bg-amber-400' : 'bg-emerald-500'}
                      ${isReceived ? 'bg-gray-300' : ''}
                    `} />

                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all 
                        ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}
                        ${isReceived ? 'opacity-20' : ''}
                      `}>
                         {isSelected && <span className="text-white text-[10px]">✓</span>}
                      </div>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase
                        ${isDraft ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}
                        ${isReceived ? 'bg-gray-200 text-gray-500' : ''}
                      `}>
                        {isDraft ? '🟡 Draft' : isReceived ? '⚪ Received' : '🟢 Official'}
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-gray-800 leading-tight mb-1">{item.product?.name}</h4>
                    <p className="text-[10px] font-mono font-bold text-gray-400 mb-6">{item.orderNumber}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Kuantitas</span>
                      <span className="text-xl font-black text-gray-900">{item.quantity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Navigator */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-6">
        <div className="bg-gray-900/95 backdrop-blur-xl text-white p-6 rounded-[35px] shadow-2xl flex justify-between items-center border border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">📦</div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Selanjutnya</p>
              <p className="text-sm font-bold">Input Penerimaan Barang</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/purchasing/receiving'}
            className="bg-white text-gray-900 px-8 py-3.5 rounded-2xl font-black text-xs hover:bg-gray-100 transition-all active:scale-95"
          >
            Buka Receiving ➔
          </button>
        </div>
      </div>

      {/* MODAL GANTI SUPPLIER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden p-10 animate-in zoom-in duration-200">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Pindah Supplier</h2>
            <p className="text-gray-400 font-medium mb-8">Pilih kemana {selectedItemIds.length} item ini akan dialihkan.</p>
            <input 
              autoFocus
              placeholder="Cari supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border-none p-6 rounded-3xl outline-none font-bold focus:ring-4 ring-indigo-50 mb-4"
            />
            <div className="max-h-48 overflow-y-auto mb-8 space-y-2 pr-2 font-bold">
              {allSuppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5).map(s => (
                <button 
                  key={s.name} 
                  onClick={() => confirmSwitchSupplier(s.name)}
                  className="w-full text-left p-4 hover:bg-indigo-50 rounded-2xl transition-all flex justify-between"
                >
                  <span>🏢 {s.name}</span>
                  <span className="text-indigo-400">➔</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => confirmSwitchSupplier(searchQuery)} disabled={!searchQuery} className="w-full bg-gray-900 text-white py-5 rounded-3xl font-black hover:bg-black transition-all disabled:opacity-20 shadow-xl">
                Pindahkan Sekarang
              </button>
              <button onClick={() => setIsModalOpen(false)} className="w-full text-gray-400 font-bold py-3 hover:text-gray-600 transition-all">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}