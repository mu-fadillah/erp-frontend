/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronDown, 
  ShoppingCart, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  History
} from 'lucide-react';

export default function PurchasingPRListPage() {
  const [prItems, setPrItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    BAR: true,
    KITCHEN: true,
    OTHER: false
  });

  const router = useRouter(); 
  const API_URL = 'http://localhost:3000';

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchSuppliers(), fetchPRItems()]);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const groupedData = useMemo(() => {
    const groups: Record<string, any[]> = { BAR: [], KITCHEN: [], OTHER: [] };
    prItems.forEach(item => {
      const major = item.product?.majorGroup || 'OTHER';
      if (groups[major]) groups[major].push(item);
      else groups.OTHER.push(item);
    });
    return groups;
  }, [prItems]);

  const fetchPRItems = async () => {
    try {
      const res = await fetch(`${API_URL}/purchasing/pr/pending`);
      const data = await res.json();
      setPrItems(data.map((item: any) => ({
        ...item,
        supplierName: item.lastSupplierName || '',
        // Default harga diambil dari history terakhir jika ada [cite: 2026-01-28]
        price: item.priceHistory?.[0]?.price || 0,
        isChecked: false
      })));
    } catch (err) { console.error("Fetch PR error:", err); }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_URL}/purchasing/suppliers`);
      const data = await res.json();
      setSuppliers(data);
    } catch (err) { console.error("Fetch Suppliers error:", err); }
  };

  const updateItemState = (id: string, field: string, value: any) => {
    setPrItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleCreatePOMassal = async () => {
    const selectedItems = prItems.filter((i: any) => i.isChecked);
    
    // Validasi data sebelum kirim ke CreatePOMassalDto [cite: 2026-02-02]
    const invalidItems = selectedItems.filter(i => !i.supplierName || !i.price || i.price <= 0);
    
    if (invalidItems.length > 0) {
      alert(`Mohon lengkapi Supplier dan Harga (minimal > 0) untuk ${invalidItems.length} item.`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/purchasing/po/create-massal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: selectedItems.map(i => ({
            id: i.id,
            productId: i.productId,
            quantity: i.quantity,
            uom: i.uom,
            supplierName: i.supplierName,
            price: Number(i.price),
            notes: i.notes
          }))
        }),
      });

      if (res.ok) {
        // Berhasil membuat Draft PO, arahkan ke Monitoring [cite: 2026-01-28]
        router.push('/dashboard/purchasing/pr');
      } else {
        const errData = await res.json();
        alert(`Gagal: ${errData.message || 'Terjadi kesalahan sistem'}`);
      }
    } catch (err) {
      alert("Koneksi ke server terputus.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatRupiah = (val: number | string) => {
    if (!val || val === 0) return '';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-3">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-medium">Memuat Permintaan Barang...</p>
      </div>
    );
  }

  const renderTable = (title: string, data: any[], groupKey: string) => {
    const isExpanded = expandedGroups[groupKey];
    if (data.length === 0) return null;

    return (
      <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => setExpandedGroups(prev => ({ ...prev, [groupKey]: !isExpanded }))}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-1.5 h-6 rounded-full ${
              groupKey === 'BAR' ? 'bg-blue-500' : groupKey === 'KITCHEN' ? 'bg-rose-500' : 'bg-slate-400'
            }`} />
            <div className="text-left">
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h2>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{data.length} Items</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        <div className={isExpanded ? 'block' : 'hidden'}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">Select</th>
                  <th className="px-6 py-4">Product Detail</th>
                  <th className="px-6 py-4 text-center">Inventory</th>
                  <th className="px-6 py-4 text-center">Req Qty</th>
                  <th className="px-6 py-4 w-44">Price Estimate</th>
                  <th className="px-6 py-4 w-52">Supplier Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((item) => (
                  <tr key={item.id} className={`group transition-all ${item.isChecked ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-transform group-hover:scale-110" 
                        checked={item.isChecked} 
                        onChange={() => updateItemState(item.id, 'isChecked', !item.isChecked)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-xs uppercase">{item.product?.name}</span>
                        <span className="text-[10px] text-slate-400 mt-1 uppercase font-medium">SKU: {item.product?.sku}</span>
                        {item.notes && (
                          <div className="mt-2 flex items-start gap-1 text-[11px] text-amber-600 bg-amber-50 p-1.5 rounded-lg border border-amber-100">
                            <AlertCircle size={12} className="mt-0.5 shrink-0" />
                            <span>{item.notes}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center px-2 py-1 bg-slate-100 rounded-lg min-w-[50px]">
                        <span className="text-xs font-bold text-slate-600">{item.currentStock}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Stock</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-black text-slate-800">{item.quantity}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{item.uom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                        <input 
                          type="text" 
                          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                          placeholder="0"
                          value={formatRupiah(item.price)}
                          onChange={(e) => updateItemState(item.id, 'price', e.target.value.replace(/\./g, ''))}
                        />
                      </div>
                      {item.priceHistory?.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1 text-[9px] text-slate-400 italic">
                          <History size={10} />
                          Last Price: Rp {formatRupiah(item.priceHistory[0].price)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <input 
                          list="supplier-options" 
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                          placeholder="Pilih Supplier..."
                          value={item.supplierName}
                          onChange={(e) => updateItemState(item.id, 'supplierName', e.target.value)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">
      <datalist id="supplier-options">
        {suppliers.map((s: any) => <option key={s.id} value={s.name} />)}
      </datalist>

      <div className="flex justify-between items-end mb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ShoppingCart size={16} className="text-white" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Supply Chain Management</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Purchase Request</h1>
          <p className="text-sm text-slate-500 font-medium">Review and process outlet requests into draft purchase orders.</p>
        </div>
      </div>

      <div className="space-y-6">
        {renderTable('Bar Department', groupedData.BAR, 'BAR')}
        {renderTable('Kitchen Department', groupedData.KITCHEN, 'KITCHEN')}
        {renderTable('General & Others', groupedData.OTHER, 'OTHER')}
      </div>

      {/* Floating Action Menu */}
      {prItems.some((i: any) => i.isChecked) && (
        <div className="fixed bottom-10 right-10 flex items-center gap-4 bg-slate-900 p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-800 animate-in slide-in-from-bottom-10">
          <div className="px-4 border-r border-slate-700">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Selected Items</p>
            <p className="text-xl font-black text-white">{prItems.filter(i => i.isChecked).length}</p>
          </div>
          <button 
            onClick={handleCreatePOMassal} 
            disabled={actionLoading}
            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {actionLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
            )}
            {actionLoading ? 'Creating Drafts...' : 'Create Mass PO Draft'}
          </button>
        </div>
      )}
    </div>
  );
}