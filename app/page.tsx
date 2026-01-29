/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from 'react';
import { getStocks, runProduction, createSalesOrder, updateStock, getSalesHistory } from '../services/api';

export default function Dashboard() {
  const [activeMenu, setActiveMenu] = useState('purchasing');
  const [stocks, setStocks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [purchaseQty, setPurchaseQty] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false); // Tambahkan loading state

  // Fungsi refresh data yang dipanggil setelah aksi user (Produksi/Jual)
  const refreshData = async () => {
    try {
      const stockData = await getStocks();
      setStocks(stockData);
      const historyData = await getSalesHistory();
      setHistory(historyData);
    } catch (err) {
      console.error("Gagal sinkronisasi:", err);
    }
  };

  // Efek untuk memuat data saat pertama kali buka halaman tanpa memicu warning
  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [stockData, historyData] = await Promise.all([
          getStocks(),
          getSalesHistory()
        ]);
        
        if (isMounted) {
          setStocks(stockData);
          setHistory(historyData);
          if (stockData.length > 0 && !selectedProduct) {
            setSelectedProduct(stockData[0].productId);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInitialData();
    return () => { isMounted = false; }; // Cleanup function
  }, []); // Kosongkan dependency agar hanya jalan sekali

  // ... (Gunakan handleRestock, handleSale, dll yang sudah ada) ...
  // Panggil refreshData() di dalam handleRestock/handleSale/runProduction

  // ... sisa kode handler (handleRestock, handleSale, dll) tetap sama ...

  // Handler: Pembelian/Restock
  const handleRestock = async () => {
    if (!selectedProduct) return alert("Pilih produk terlebih dahulu!");
    if (purchaseQty <= 0) return alert("Jumlah harus lebih dari 0");
    try {
      await updateStock(selectedProduct, Number(purchaseQty));
      alert("Stok berhasil ditambah!");
      refreshData();
    } catch (err: any) {
      alert("Gagal: " + err.message);
    }
  };

  // Handler: Penjualan
  const handleSale = async (productId: string) => {
    if (!customerName) return alert("Masukkan nama pelanggan!");
    try {
      await createSalesOrder({
        customerName: customerName,
        items: [{ productId, quantity: 1, price: 15000 }]
      });
      alert("Penjualan Berhasil!");
      setCustomerName(''); // Reset nama setelah jual
      refreshData();
    } catch (err: any) {
      alert("Gagal: " + err.message);
    }
  };

  // Hitung Total Pendapatan untuk Finance & Cost Control
  const totalRevenue = history.reduce((acc: number, order: any) => {
    const orderTotal = order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    return acc + orderTotal;
  }, 0);

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900 font-sans">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 text-white p-6 shadow-xl">
        <div className="mb-10">
          <h1 className="text-2xl font-black tracking-tighter text-blue-400">BAKERY <span className="text-white">ERP</span></h1>
          <p className="text-xs text-slate-400 mt-1">v1.0 Internal System</p>
        </div>
        
        <nav className="space-y-2">
          {[
            { id: 'purchasing', label: '📦 Purchasing', color: 'bg-blue-600' },
            { id: 'admin-outlet', label: '🏪 Admin Outlet', color: 'bg-emerald-600' },
            { id: 'finance', label: '💰 Finance', color: 'bg-amber-600' },
            { id: 'cost-control', label: '⚖️ Cost Control', color: 'bg-rose-600' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full text-left p-4 rounded-xl transition-all duration-200 font-medium flex items-center ${
                activeMenu === item.id ? `${item.color} shadow-lg scale-105` : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-10 overflow-y-auto">
        
        {/* MENU 1: PURCHASING */}
        {activeMenu === 'purchasing' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-8">Purchasing <span className="text-slate-400 font-normal">| Pengadaan Bahan</span></h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-6 text-blue-600">Restock Bahan Baku</h3>
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-gray-500 block mb-2">Pilih Item</label>
                    <select 
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      {stocks.map((s: any) => (
                        <option key={s.productId} value={s.productId}>{s.product.name} (Stok: {s.quantity}{s.product.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-500 block mb-2">Kuantitas Masuk</label>
                    <input 
                      type="number" 
                      placeholder="Input jumlah..."
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                      onChange={(e) => setPurchaseQty(parseInt(e.target.value))}
                    />
                  </div>
                  <button onClick={handleRestock} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                    Update Stok Bahan
                  </button>
                </div>
              </div>
              <div className="bg-slate-800 p-8 rounded-3xl text-white">
                <h3 className="text-lg font-bold mb-4">Informasi Supplier</h3>
                <div className="p-4 bg-slate-700/50 rounded-2xl border border-slate-600">
                  <p className="text-blue-400 font-bold">PT. Lihat Mendalam</p>
                  <p className="text-sm text-slate-400">Supplier Utama Tepung & Ragi</p>
                  <div className="mt-4 pt-4 border-t border-slate-600 text-xs">
                    Last delivery: Today, 08:00 AM
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MENU 2: ADMIN OUTLET */}
        {activeMenu === 'admin-outlet' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-8">Admin Outlet <span className="text-slate-400 font-normal">| Inventori</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stocks.map((stock: any) => (
                <div key={stock.id} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-1 rounded-md">{stock.product.unit} Based</span>
                    <h3 className="text-xl font-bold mt-3 text-slate-800">{stock.product.name}</h3>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-5xl font-black text-slate-900">{stock.quantity}</span>
                      <span className="ml-2 text-slate-400 font-medium">{stock.product.unit}</span>
                    </div>
                  </div>
                  {stock.product.name.toLowerCase().includes('roti') && (
                    <button 
                      onClick={async () => {
                        try {
                          await runProduction(stock.productId, 1);
                          alert("Produksi Berhasil!");
                          refreshData();
                        } catch (err: any) { alert(err.message); }
                      }}
                      className="mt-8 w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                    >
                      🍳 Masak 1 Pcs
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MENU 3: FINANCE */}
        {activeMenu === 'finance' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-8">Finance <span className="text-slate-400 font-normal">| Kasir Digital</span></h2>
            <div className="mb-8 p-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl shadow-xl text-white">
              <p className="text-amber-100 font-medium uppercase text-xs tracking-widest">Total Omzet (Revenue)</p>
              <h3 className="text-5xl font-black mt-2">Rp {totalRevenue.toLocaleString('id-ID')}</h3>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
              <div className="mb-8">
                <label className="text-sm font-bold text-gray-400 block mb-2 uppercase">Pelanggan</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama pembeli..."
                  className="w-full md:w-1/2 p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stocks.filter(s => s.product.name.toLowerCase().includes('roti')).map((s: any) => (
                  <div key={s.id} className="p-6 border border-gray-100 rounded-2xl flex justify-between items-center bg-slate-50">
                    <div>
                      <p className="font-bold text-lg">{s.product.name}</p>
                      <p className="text-amber-600 font-bold italic">Rp 15.000</p>
                    </div>
                    <button onClick={() => handleSale(s.productId)} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md">
                      JUAL
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MENU 4: COST CONTROL */}
        {activeMenu === 'cost-control' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-8">Cost Control <span className="text-slate-400 font-normal">| Log Transaksi</span></h2>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-black">
                  <tr>
                    <th className="p-6">Waktu</th>
                    <th className="p-6">Customer</th>
                    <th className="p-6">Items</th>
                    <th className="p-6 text-right">Nilai Transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-6 text-sm text-gray-500">{new Date(order.createdAt).toLocaleString('id-ID')}</td>
                      <td className="p-6 font-bold">{order.customerName}</td>
                      <td className="p-6">
                        {order.items.map((i: any) => (
                          <span key={i.id} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mr-2">
                            {i.product.name} (x{i.quantity})
                          </span>
                        ))}
                      </td>
                      <td className="p-6 text-right font-black text-emerald-600">
                        Rp {(order.items.reduce((s: any, i: any) => s + (i.price * i.quantity), 0)).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
      </main>
    </div>
  );
}
