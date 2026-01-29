/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PurchasingPRListPage() {
  const [prItems, setPrItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter(); 
  const API_URL = 'http://localhost:3000';

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await fetchSuppliers();
      await fetchPRItems();
      setLoading(false);
    };
    initData();
  }, []);

  const fetchPRItems = async () => {
    try {
      const res = await fetch(`${API_URL}/purchasing/pr/pending`);
      const data = await res.json();
      
      const formatted = data.map((item: any) => {
        const currentSupplier = item.lastSupplierName || '';
        const history = item.priceHistory || [];

        // OTOMATISASI HARGA SAAT LOAD:
        // Cari harga di history yang supplierName-nya cocok dengan lastSupplierName
        const matchedHistory = history.find(
          (h: any) => h.supplierName?.toLowerCase() === currentSupplier.toLowerCase()
        );

        return {
          ...item,
          productId: item.productId,
          supplierName: currentSupplier,
          // Jika cocok, pakai harga history. Jika tidak ada history, baru default ke 0.
          price: matchedHistory ? matchedHistory.price : 0,
          priceHistory: history
        };
      });
      setPrItems(formatted);
    } catch (err) { 
      console.error("Gagal mengambil data PR:", err); 
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_URL}/supplier`); 
      const data = await res.json();
      setSuppliers(data);
    } catch (err) { 
      console.error("Gagal mengambil data supplier:", err); 
    }
  };

  const handleSupplierChange = (itemId: string, newSupplierName: string) => {
    setPrItems(prev => prev.map(item => {
      if (item.id === itemId) {
        // Cari di priceHistory saat user mengetik supplier baru
        const historyForThisSupplier = item.priceHistory?.find(
          (h: any) => h.supplierName?.toLowerCase() === newSupplierName.toLowerCase()
        );

        return { 
          ...item, 
          supplierName: newSupplierName,
          price: historyForThisSupplier ? historyForThisSupplier.price : 0
        };
      }
      return item;
    }));
  };

  const updatePriceManual = (id: string, value: string) => {
    // Menggunakan parseFloat agar mendukung desimal
    const numValue = parseFloat(value) || 0;
    setPrItems(prev => prev.map(item => 
      item.id === id ? { ...item, price: numValue } : item
    ));
  };

  const toggleItemCheck = async (id: string, currentStatus: boolean) => {
    try {
      // Optimistic Update
      setPrItems(prev => prev.map(item => 
        item.id === id ? { ...item, isChecked: !currentStatus } : item
      ));

      await fetch(`${API_URL}/purchasing/pr/item/${id}/check`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked: !currentStatus }),
      });
    } catch (err) {
      console.error("Gagal sinkron status ceklis:", err);
      fetchPRItems(); // Rollback jika gagal
    }
  };

  const handleCreatePOMassal = async () => {
    const selectedItems = prItems.filter((i: any) => i.isChecked);
    if (selectedItems.length === 0) return;

    const missingSupplier = selectedItems.filter(i => !i.supplierName || i.supplierName.trim() === "");
    if (missingSupplier.length > 0) {
      alert(`Ada ${missingSupplier.length} item yang belum diisi Supplier-nya!`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/purchasing/po/create-massal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems.map(i => ({
            id: i.id,
            productId: i.productId,
            supplierName: i.supplierName,
            price: Number(i.price),
            quantity: i.quantity,
            uom: i.uom,
            notes: i.notes || ''
          }))
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert("Purchase Order Berhasil Dibuat!");
        router.push('/dashboard/purchasing/po');
      } else {
        alert("Gagal: " + (result.message || "Terjadi kesalahan server"));
      }
    } catch (err) {
      console.error(err);
      alert("Gagal koneksi ke server");
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto bg-gray-50/50 min-h-screen">
      <datalist id="supplier-list">
        {suppliers.map((s: any) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Purchase Request List</h1>
        <p className="text-gray-500 font-medium text-sm">Review dan tentukan supplier sebelum proses PO.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-100 text-gray-600 border-b">
              <th className="p-4 w-14 text-center">PILIH</th>
              <th className="p-4 text-left font-bold uppercase tracking-wider">Item & Note Outlet</th>
              <th className="p-4 text-center font-bold uppercase tracking-wider">Stok</th>
              <th className="p-4 text-center font-bold uppercase tracking-wider">Qty</th>
              <th className="p-4 text-center font-bold uppercase tracking-wider">UOM</th>
              <th className="p-4 text-left font-bold uppercase tracking-wider w-44">Harga Satuan (Rp)</th>
              <th className="p-4 text-left font-bold uppercase tracking-wider w-56">Supplier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {prItems.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-gray-400 font-medium">
                  Tidak ada permintaan pending saat ini.
                </td>
              </tr>
            )}
            {prItems.map((item: any) => (
              <tr key={item.id} className={`${item.isChecked ? 'bg-orange-50/30' : ''} transition-all`}>
                <td className="p-4 text-center">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-orange-600 cursor-pointer"
                    checked={item.isChecked || false}
                    onChange={() => toggleItemCheck(item.id, item.isChecked)}
                  />
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800 text-sm uppercase">{item.product?.name}</p>
                    <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded uppercase">
                      {item.product?.category?.name}
                    </span>
                    {item.notes && (
                      <div className="mt-1 bg-amber-50/50 border-l-2 border-amber-300 p-2 rounded-r-lg">
                        <p className="text-[11px] text-amber-800 italic leading-tight">
                          "{item.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4 text-center font-bold text-gray-400">{item.currentStock}</td>
                <td className="p-4 text-center text-lg font-black text-orange-600">{item.quantity}</td>
                <td className="p-4 text-center font-bold text-gray-400 uppercase">{item.uom}</td>
                
                <td className="p-4">
                  <input 
                    type="number"
                    step="any"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none font-bold text-emerald-600 transition-all shadow-sm"
                    value={item.price || 0}
                    onChange={(e) => updatePriceManual(item.id, e.target.value)}
                  />
                </td>

                <td className="p-4">
                  <input 
                    list="supplier-list"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 outline-none font-bold text-gray-800 transition-all shadow-sm"
                    placeholder="Pilih Supplier..."
                    value={item.supplierName}
                    onChange={(e) => handleSupplierChange(item.id, e.target.value)}
                  />
                  <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase ml-1">
                    {item.lastSupplierName === item.supplierName ? 'Riwayat Terakhir' : 'Supplier Baru'}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating Action Bar */}
      {prItems.some((i: any) => i.isChecked) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white p-4 px-8 rounded-2xl shadow-2xl flex items-center gap-10 animate-in fade-in slide-in-from-bottom-5 z-50">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Siap Proses</span>
            <p className="text-lg font-black text-orange-400 leading-none">
              {prItems.filter((i: any) => i.isChecked).length} Item
            </p>
          </div>
          <button 
            onClick={handleCreatePOMassal}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
          >
            {loading ? 'Processing...' : 'Buat PO Sekarang ➔'}
          </button>
        </div>
      )}
    </div>
  );
}