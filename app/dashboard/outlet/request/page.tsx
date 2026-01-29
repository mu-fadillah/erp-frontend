/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';

export default function AdminOutletRequestPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // State baru untuk kategori
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const API_URL = 'http://localhost:3000'; 

  useEffect(() => {
    // Load Produk
    fetch(`${API_URL}/product`)
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : data.data || []));

    // Load Kategori untuk suggestions [cite: 2026-01-25]
    fetch(`${API_URL}/category`) // Pastikan Anda punya endpoint GET /category
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : data.data || []))
      .catch((err) => console.error("Gagal load kategori:", err));
  }, []);

  const filteredProducts = products.filter((p: any) =>
    p?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fungsi Tambah Item (Lama atau Baru)
  const addToCart = (product?: any) => {
    // Jika product ada, berarti item lama. Jika tidak, berarti input manual item baru.
    const newItem = product ? {
      productId: product.id,
      name: product.name,
      categoryName: product.category?.name || 'Umum',
      uom: product.uom || 'PCS',
      quantity: 1,
      currentStock: 0
    } : {
      name: searchTerm, // Mengambil teks yang sedang diketik sebagai nama barang baru
      categoryName: '',
      uom: 'PCS',
      quantity: 1,
      currentStock: 0
    };

    setCart([...cart, newItem]);
    setSearchTerm('');
  };

  const handleSendRequest = async () => {
    if (cart.length === 0) return;
    
    // Validasi sederhana sebelum kirim
    const isInvalid = cart.some(item => !item.name || !item.categoryName || !item.uom);
    if (isInvalid) {
      alert("Mohon lengkapi Nama, Kategori, dan Satuan untuk semua item.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/purchasing/pr/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }), // Mengirim sesuai CreatePRDto
      });

      if (response.ok) {
        alert('Request berhasil dikirim! Barang baru akan otomatis tersimpan di Master Product.');
        setCart([]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 1. Datalist untuk Autocomplete Kategori */}
      <datalist id="category-list">
        {categories.map((cat: any) => (
          <option key={cat.id} value={cat.name} />
        ))}
      </datalist>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Form Request Barang</h1>
        <p className="text-gray-500 text-sm">Input permintaan barang outlet ke bagian Purchasing.</p>
      </div>

      {/* SEKSI ATAS: Pencarian & Input [cite: 2026-01-25] */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm border-orange-100">
        <label className="block text-sm font-semibold mb-3 text-gray-700">Cari atau Tambah Item Baru:</label>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Ketik nama barang (contoh: Minyak Goreng)..." 
            className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none shadow-sm transition-all text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {searchTerm.length > 0 && (
            <div className="absolute z-50 w-full bg-white border shadow-2xl mt-2 rounded-2xl overflow-hidden border-orange-100">
              {/* Hasil Pencarian */}
              {filteredProducts.slice(0, 5).map((p: any) => (
                <div 
                  key={p.id} 
                  onClick={() => addToCart(p)} 
                  className="p-4 hover:bg-orange-50 cursor-pointer border-b flex justify-between items-center group"
                >
                  <div>
                    <p className="font-bold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400 uppercase">{p.category?.name || 'Umum'}</p>
                  </div>
                  <span className="text-orange-600 font-bold text-sm">+ Pilih</span>
                </div>
              ))}
              
              {/* Opsi Barang Baru */}
              <div 
                onClick={() => addToCart()} 
                className="p-4 bg-orange-600 text-white cursor-pointer hover:bg-orange-700 flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✨</span>
                  <div>
                    <p className="font-bold">"{searchTerm}" tidak ditemukan?</p>
                    <p className="text-xs opacity-80">Klik untuk menambah sebagai barang baru</p>
                  </div>
                </div>
                <span className="bg-white text-orange-600 px-3 py-1 rounded-lg text-[10px] font-black">TAMBAH BARU</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SEKSI BAWAH: Daftar Request (Tabel) [cite: 2026-01-25] */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-700">Item Terpilih ({cart.length})</h2>
          {cart.length > 0 && (
            <button 
              onClick={() => setCart([])} 
              className="text-xs text-red-500 hover:underline"
            >
              Hapus Semua
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {cart.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left uppercase text-[10px] tracking-widest bg-gray-50/50">
                  <th className="px-6 py-4">Informasi Barang</th>
                  <th className="px-6 py-4 text-center">Satuan</th>
                  <th className="px-6 py-4 text-center">Stok Saat Ini</th>
                  <th className="px-6 py-4 text-center">Qty Request</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cart.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{item.name}</p>
                      <input 
                        list="category-list"
                        placeholder="Set Kategori..." 
                        className="text-[11px] text-blue-600 border-b border-dashed border-blue-200 p-0 focus:ring-0 w-full bg-transparent focus:border-blue-500 outline-none mt-1"
                        value={item.categoryName}
                        onChange={(e) => {
                          const newCart = [...cart];
                          newCart[idx].categoryName = e.target.value;
                          setCart(newCart);
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <select 
                        className="p-1.5 border rounded-lg text-xs bg-white outline-none focus:border-orange-500"
                        value={item.uom}
                        onChange={(e) => {
                          const newCart = [...cart];
                          newCart[idx].uom = e.target.value;
                          setCart(newCart);
                        }}
                      >
                        {['PCS', 'KG', 'GR', 'LITER', 'PACK', 'BTL'].map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="number" 
                        className="w-20 p-2 border border-gray-200 rounded-xl text-center focus:ring-2 focus:ring-orange-100 outline-none"
                        value={item.currentStock}
                        onChange={(e) => {
                          const newCart = [...cart];
                          newCart[idx].currentStock = Number(e.target.value);
                          setCart(newCart);
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="number" 
                        className="w-20 p-2 border-2 border-orange-100 rounded-xl text-center font-bold text-orange-600 focus:border-orange-500 outline-none"
                        value={item.quantity}
                        onChange={(e) => {
                          const newCart = [...cart];
                          newCart[idx].quantity = Number(e.target.value);
                          setCart(newCart);
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-4">🛒</div>
              <p className="text-gray-400 font-medium">Belum ada item yang dipilih.</p>
              <p className="text-xs text-gray-300 mt-1">Cari barang di atas untuk memulai.</p>
            </div>
          )}
        </div>

        {/* Action Bar di bawah tabel [cite: 2026-01-25] */}
        {cart.length > 0 && (
          <div className="p-6 bg-gray-50 border-t">
            <button 
              onClick={handleSendRequest}
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 ${
                loading ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-100'
              }`}
            >
              {loading ? 'MENYIMPAN DATA...' : 'KONFIRMASI & KIRIM REQUEST ➔'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}