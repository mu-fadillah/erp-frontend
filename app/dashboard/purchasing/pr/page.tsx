/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PurchasingPRListPage() {
  const [prItems, setPrItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk Modal PO
  const [showPoModal, setShowPoModal] = useState(false);
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  
  const router = useRouter(); 
  const API_URL = 'http://localhost:3000';

  useEffect(() => {
    fetchPRItems();
    fetchSuppliers();
  }, []);

  const fetchPRItems = async () => {
    try {
      const res = await fetch(`${API_URL}/purchasing/pr/pending`);
      const data = await res.json();
      setPrItems(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchSuppliers = async () => {
    try {
      // Pastikan endpoint ini mengembalikan { id, name }
      const res = await fetch(`${API_URL}/supplier`); 
      const data = await res.json();
      setSuppliers(data);
    } catch (err) { console.error(err); }
  };

  // Sync isChecked ke Database agar saat refresh tidak hilang [cite: 2026-01-25]
  const toggleItemCheck = async (id: string, currentStatus: boolean) => {
    try {
      // Optimistic UI Update
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
      fetchPRItems(); // Revert jika gagal
    }
  };

  const openPoModal = () => {
    const selectedItems = prItems.filter((i: any) => i.isChecked);
    if (selectedItems.length === 0) return;

    // Backend mengirim 'lastSupplierName' di tiap PRItem hasil mapping [cite: 2026-01-25]
    const lastSupplier = selectedItems[0].lastSupplierName || '';
    setSelectedSupplierName(lastSupplier);
    setShowPoModal(true);
  };

  const handleCreatePO = async () => {
    const selectedIds = prItems.filter((i: any) => i.isChecked).map((i: any) => i.id);
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/purchasing/po/create-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedIds,
          supplierName: selectedSupplierName, // Mengaktifkan Auto-Upsert Supplier [cite: 2026-01-25]
          type: 'SUPPLIER',
        }),
      });

      if (res.ok) {
        alert("Purchase Order Berhasil Dibuat!");
        router.push('/dashboard/purchasing/po');
      }
    } catch (err) {
      alert("Gagal membuat PO");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* 1. Datalist untuk Autocomplete Supplier */}
      <datalist id="supplier-list">
        {suppliers.map((s: any) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>

      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold">Daftar Permintaan Barang (PR)</h1>
          <p className="text-gray-500 text-sm">Pilih item untuk dikonversi menjadi Purchase Order.</p>
        </div>
      </div>

      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-gray-400">
              <th className="p-4 w-16">PILIH</th>
              <th className="p-4 text-left font-semibold">ITEM</th>
              <th className="p-4 text-center font-semibold">STOK OUTLET</th>
              <th className="p-4 text-center font-semibold">REQ QTY</th>
              <th className="p-4 text-center font-semibold">UOM</th>
              <th className="p-4 text-left font-semibold">LAST SUPPLIER</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {prItems.map((item: any) => (
              <tr key={item.id} className={`${item.isChecked ? 'bg-orange-50/50' : ''} hover:bg-gray-50 transition-colors`}>
                <td className="p-4 text-center">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-orange-600 cursor-pointer"
                    checked={item.isChecked}
                    onChange={() => toggleItemCheck(item.id, item.isChecked)}
                  />
                </td>
                <td className="p-4">
                  <p className="font-bold text-gray-800">{item.product?.name}</p>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                    {item.product?.category?.name}
                  </p>
                </td>
                <td className="p-4 text-center">
                   <span className={`px-3 py-1 rounded-full font-medium ${item.currentStock < 5 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                    {item.currentStock}
                   </span>
                </td>
                <td className="p-4 text-center text-lg font-black text-orange-600">{item.quantity}</td>
                <td className="p-4 text-center font-bold text-gray-400">{item.uom}</td>
                <td className="p-4 italic text-gray-400 text-xs">
                  {item.lastSupplierName || 'Belum ada riwayat'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {prItems.length === 0 && !loading && (
          <div className="p-20 text-center text-gray-400">
            <p>Tidak ada permintaan pending saat ini.</p>
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      {prItems.some((i: any) => i.isChecked) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white p-4 px-8 rounded-3xl shadow-2xl flex items-center gap-8 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Item Terpilih</span>
            <p className="text-lg font-bold">
              <span className="text-orange-400">{prItems.filter((i: any) => i.isChecked).length} Produk</span>
            </p>
          </div>
          <button 
            onClick={openPoModal}
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95"
          >
            Buat PO Sekarang ➔
          </button>
        </div>
      )}

      {/* Modal Konfirmasi */}
      {showPoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-3xl text-orange-600">🚛</span>
            </div>
            <h3 className="text-2xl font-black mb-2">Konfirmasi Supplier</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Tentukan supplier untuk item ini. Jika nama supplier belum ada, sistem akan otomatis mendaftarkannya [cite: 2026-01-25].
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Supplier</label>
                <input 
                  list="supplier-list"
                  placeholder="Ketik nama supplier..."
                  className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-[25px] mt-2 focus:bg-white focus:border-orange-500 outline-none transition-all font-bold text-gray-800"
                  value={selectedSupplierName}
                  onChange={(e) => setSelectedSupplierName(e.target.value)}
                  autoFocus
                />
                {selectedSupplierName && (
                   <p className="text-[10px] text-orange-600 mt-3 font-bold bg-orange-50 p-2 rounded-lg text-center">
                     ✨ AUTO-FILL DARI RIWAYAT TERAKHIR
                   </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-10">
              <button 
                onClick={() => setShowPoModal(false)}
                className="py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleCreatePO}
                disabled={!selectedSupplierName || loading}
                className="py-4 rounded-2xl font-bold bg-gray-900 text-white hover:bg-black shadow-xl disabled:bg-gray-200"
              >
                {loading ? 'Memproses...' : 'Masukkan ke List PO'} 
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}