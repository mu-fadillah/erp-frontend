/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useMemo } from 'react';

export default function PurchasingPODashboardPage() {
  const [poList, setPoList] = useState([]);
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
      const res = await fetch(`${API_URL}/purchasing/po/list`);
      const data = await res.json();
      setPoList(data);
      
      const initialPrices: { [key: string]: number } = {};
      data.forEach((po: any) => {
        po.items.forEach((it: any) => {
          if (it.price) initialPrices[it.id] = it.price;
        });
      });
      setItemPrices(initialPrices);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchSuppliers = async () => {
    try {
      // Pastikan endpoint ini sesuai dengan backend Anda (bisa /supplier atau /purchasing/suppliers)
      const res = await fetch(`${API_URL}/supplier`); 
      const data = await res.json();
      setAllSuppliers(data);
    } catch (err) { console.error(err); }
  };

  const handlePriceChange = (itemId: string, value: string) => {
    const numValue = parseInt(value.replace(/\D/g, '')) || 0;
    setItemPrices(prev => ({ ...prev, [itemId]: numValue }));
  };

  const groupedPOs = useMemo(() => {
    const groups: { [key: string]: any } = {};
    poList.forEach((po: any) => {
      if (po.status === 'RECEIVED') return;
      const sName = po.supplier?.name || 'Tanpa Supplier';
      if (!groups[sName]) {
        groups[sName] = { supplierName: sName, items: [], hasPendingDrafts: false };
      }
      
      const itemsWithMeta = po.items.map((it: any) => ({ 
        ...it, 
        poId: po.id,
        poStatus: po.status, 
        orderNumber: po.orderNumber,
        outletNote: it.notes 
      }));

      groups[sName].items.push(...itemsWithMeta);
      if (po.status === 'PENDING') groups[sName].hasPendingDrafts = true;
    });
    return Object.values(groups);
  }, [poList]);

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
        await fetchPOList(); // Refresh data agar item pindah group
      } else {
        const errData = await res.json();
        alert("Gagal: " + errData.message);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal koneksi saat pindah supplier");
    }
  };

  const handleFinalizeAndSend = async (supplierName: string) => {
    setSendingSupplier(supplierName);
    try {
      const res = await fetch(`${API_URL}/purchasing/po/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          supplierName,
          prices: itemPrices 
        })
      });
      if (!res.ok) throw new Error("Gagal finalisasi");
      alert(`PO Resmi terbit untuk ${supplierName}.`);
      await fetchPOList();
    } catch (err) {
      alert("Gagal memproses PO.");
    } finally { setSendingSupplier(null); }
  };

  return (
    <div className="p-8 pb-40 max-w-[1600px] mx-auto bg-gray-50/50 min-h-screen">
      <div className="mb-12">
        <h1 className="text-5xl font-black text-gray-900 tracking-tight">Monitoring PO</h1>
      </div>

      <div className="space-y-12">
        {groupedPOs.map((group: any, idx: number) => (
          <div key={idx} className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 flex items-center justify-between bg-gray-50/50 border-b">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center text-2xl text-white font-bold">🏢</div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{group.supplierName}</h3>
                  <p className="text-sm font-bold text-gray-400 uppercase">{group.items.length} Item</p>
                </div>
              </div>

              {group.hasPendingDrafts && (
                <button 
                  onClick={() => handleFinalizeAndSend(group.supplierName)}
                  className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all"
                >
                  Terbitkan & Simpan Harga
                </button>
              )}
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {group.items.map((item: any) => {
                const isDraft = item.poStatus === 'PENDING';
                return (
                  <div key={item.id} className="relative p-6 rounded-[35px] bg-gray-50 border-2 border-transparent hover:border-gray-200 hover:bg-white transition-all duration-300">
                    <div className={`absolute top-0 left-10 right-10 h-1.5 rounded-b-full ${isDraft ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                    
                    <div className="flex justify-between items-start mb-4">
                       <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${isDraft ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isDraft ? '🟡 DRAFT' : '🟢 OFFICIAL'}
                      </span>
                      {/* Pindah Supplier tersedia untuk DRAFT maupun OFFICIAL */}
                      <button 
                        onClick={() => { setTargetItem(item); setIsModalOpen(true); }}
                        className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase bg-blue-50 px-2 py-1 rounded-lg"
                      >
                        Pindah ⇄
                      </button>
                    </div>

                    <h4 className="text-lg font-black text-gray-800 leading-tight mb-2 uppercase">{item.product?.name}</h4>
                    
                    <div className="mt-4 mb-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Harga Satuan (Rp)</label>
                      <input 
                        type="text"
                        disabled={!isDraft}
                        className="w-full mt-1 p-3 bg-white border-2 border-gray-200 rounded-xl font-black text-emerald-600 focus:border-emerald-500 outline-none transition-all"
                        value={itemPrices[item.id] ? itemPrices[item.id].toLocaleString('id-ID') : ''}
                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-2xl font-black text-gray-900">{item.quantity} <span className="text-xs text-gray-400">{item.uom}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PINDAH SUPPLIER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black mb-2">Ganti Supplier</h2>
            <p className="text-gray-500 text-sm mb-6">Pindah <span className="font-bold text-gray-900 uppercase">{targetItem?.product?.name}</span> ke:</p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              {allSuppliers.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => moveSupplier(s.name)}
                  className="w-full text-left p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 font-bold transition-all flex justify-between items-center group"
                >
                  {s.name}
                  <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">➔</span>
                </button>
              ))}
            </div>
            <button onClick={() => {setIsModalOpen(false); setTargetItem(null);}} className="w-full mt-6 text-gray-400 font-bold py-2">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}