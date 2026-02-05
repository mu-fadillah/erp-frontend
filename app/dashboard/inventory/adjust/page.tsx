/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { 
  Save, 
  History, 
  ClipboardCheck, 
  Search, 
  RefreshCcw, 
  ArrowRight,
  ArrowLeft,
  Edit3,
  CheckCircle2
} from 'lucide-react';

export default function InventoryAdjustPage() {
  const [activeTab, setActiveTab] = useState<'adjust' | 'history'>('adjust');
  const [loading, setLoading] = useState(false);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');
  const [adjustDate, setAdjustDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<any[]>([]);

  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const API_URL = 'http://localhost:3000';

  useEffect(() => {
    fetchOutlets();
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, selectedOutlet]);

  const fetchOutlets = async () => {
    const res = await fetch(`${API_URL}/outlet`);
    const data = await res.json();
    setOutlets(data);
  };

  const fetchHistory = async () => {
    if (!selectedOutlet) return;
    const res = await fetch(`${API_URL}/inventory/history?outletId=${selectedOutlet}`);
    const data = await res.json();
    setHistoryList(data);
  };

  const fetchPrepareData = async () => {
    if (!selectedOutlet || !selectedMajor) {
      alert("Pilih Outlet dan Major Group terlebih dahulu!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/inventory/prepare?outletId=${selectedOutlet}&majorGroup=${selectedMajor}&adjustDate=${adjustDate}`);
      const data = await res.json();
      setItems(data.map((item: any) => ({ ...item, newQty: '', newCost: item.lastBuyPrice || 0 })));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleViewDetail = async (headerId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/inventory/detail/${headerId}`);
      const data = await res.json();
      const formattedItems = data.items.map((it: any) => ({
        ...it,
        productId: it.productId,
        sku: it.product?.sku,
        name: it.product?.name,
        uom: it.product?.uom,
        itemGroup: it.product?.itemGroup || { name: '-' },
        majorGroup: data.majorGroup,
        newQty: it.physicalQty,
        newCost: it.lastBuyPrice || it.product?.buyPrice || 0,
      }));
      setSelectedHistory({ ...data, items: formattedItems });
      setIsEditMode(false);
    } catch (err) { alert("Gagal mengambil detail."); } finally { setLoading(false); }
  };

  const handleUpdateHistory = async () => {
    if (!confirm("Apakah Anda yakin ingin menyimpan perubahan pada audit ini?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/inventory/update/${selectedHistory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustDate: selectedHistory.adjustDate,
          items: selectedHistory.items.map((it: any) => ({
            productId: it.productId,
            physicalQty: Number(it.newQty)
          }))
        })
      });

      if (res.ok) {
        alert("Perubahan berhasil disimpan!");
        setIsEditMode(false);
        fetchHistory();
      } else { alert("Gagal mengupdate data."); }
    } catch (err) { alert("Terjadi kesalahan koneksi."); } finally { setLoading(false); }
  };

  const handleInputChange = (productId: string, field: string, value: string) => {
    const val = value === '' ? '' : parseFloat(value);
    if (isEditMode && selectedHistory) {
      setSelectedHistory({
        ...selectedHistory,
        items: selectedHistory.items.map((it: any) => it.productId === productId ? { ...it, [field]: val } : it)
      });
    } else {
      setItems(prev => prev.map(item => item.productId === productId ? { ...item, [field]: val } : item));
    }
  };

  const handleSubmit = async () => {
    if (!adjustDate || items.length === 0) return;
    if (!confirm("Simpan data penyesuaian stok ini?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustDate, outletId: selectedOutlet, majorGroup: selectedMajor,
          items: items.map(it => ({ ...it, physicalQty: it.newQty === '' ? 0 : Number(it.newQty) }))
        })
      });
      if (res.ok) { alert("Berhasil!"); setItems([]); setActiveTab('history'); }
    } catch (err) { alert("Gagal!"); } finally { setLoading(false); }
  };

  const renderTable = (dataItems: any[], editEnabled: boolean) => (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              <th className="px-4 py-4 border-b">SKU</th>
              <th className="px-4 py-4 border-b">Item Name</th>
              <th className="px-4 py-4 border-b">Item Group</th>
              <th className="px-4 py-4 border-b">Major</th>
              <th className="px-4 py-4 border-b text-center">Current Qty</th>
              <th className="px-4 py-4 border-b">UOM</th>
              <th className="px-4 py-4 border-b text-center bg-indigo-50/30 text-indigo-600">New Qty</th>
              <th className="px-4 py-4 border-b text-center">Qty Diff</th>
              <th className="px-4 py-4 border-b text-center bg-emerald-50/30 text-emerald-600">New Cost</th>
              <th className="px-4 py-4 border-b text-right">New Total Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {dataItems.map((item) => {
              const currentQty = (item.initialQty || 0) + (item.incomingQty || 0);
              const displayNewQty = item.newQty === '' ? 0 : parseFloat(item.newQty);
              const qtyDiff = displayNewQty - currentQty;
              const totalCost = (qtyDiff > 0 ? qtyDiff : 0) * (item.newCost || 0);
              
              return (
                <tr key={item.productId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-mono">{item.sku || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-slate-500">{item.itemGroup?.name || '-'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-[10px]">{item.majorGroup}</span></td>
                  <td className="px-4 py-3 text-center text-slate-500 font-medium bg-slate-50/30">{currentQty}</td>
                  <td className="px-4 py-3 text-slate-400 uppercase text-[10px]">{item.uom}</td>
                  <td className="px-4 py-3 text-center bg-indigo-50/10">
                    {editEnabled ? (
                      <input type="number" className="w-16 p-1.5 text-center bg-white border border-indigo-200 rounded-lg outline-none text-indigo-600 font-bold focus:ring-2 focus:ring-indigo-400" 
                        value={item.newQty} onChange={(e) => handleInputChange(item.productId, 'newQty', e.target.value)} />
                    ) : (
                      <span className="font-bold text-indigo-600">{item.newQty}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={qtyDiff !== 0 ? (qtyDiff > 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold') : 'text-slate-300'}>
                      {qtyDiff > 0 ? `+${qtyDiff}` : qtyDiff}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center bg-emerald-50/10">
                    <input type="number" disabled={!editEnabled || qtyDiff <= 0} className="w-24 p-1.5 text-center bg-white border border-emerald-100 rounded-lg outline-none text-emerald-600 font-medium disabled:opacity-30" 
                      value={item.newCost} onChange={(e) => handleInputChange(item.productId, 'newCost', e.target.value)} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">{new Intl.NumberFormat('id-ID').format(totalCost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-8 pb-40 max-w-[1600px] mx-auto bg-slate-50 min-h-screen font-sans text-slate-600">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Inventory Control</h1>
          <p className="text-slate-400 text-sm mt-1">Audit stok fisik dan sinkronisasi saldo inventaris.</p>
        </div>
        <div className="bg-slate-200/50 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
          <button onClick={() => { setActiveTab('adjust'); setSelectedHistory(null); }} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'adjust' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><ClipboardCheck size={14} /> Adjust Inventory</button>
          <button onClick={() => { setActiveTab('history'); setSelectedHistory(null); }} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><History size={14} /> History</button>
        </div>
      </div>

      {activeTab === 'adjust' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm">
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Tanggal Adjust</label><input type="date" value={adjustDate} onChange={(e) => setAdjustDate(e.target.value)} className="w-full mt-1.5 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Outlet</label><select value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)} className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none"><option value="">-- Pilih Lokasi --</option>{outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Major Group</label><select value={selectedMajor} onChange={(e) => setSelectedMajor(e.target.value)} className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none"><option value="">-- Kategori --</option><option value="KITCHEN">KITCHEN</option><option value="BAR">BAR</option></select></div>
            <div className="flex items-end"><button onClick={fetchPrepareData} disabled={loading} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300">{loading ? <RefreshCcw className="animate-spin" size={16} /> : <Search size={16} />} LOAD DATA</button></div>
          </div>
          {items.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {renderTable(items, true)}
              <div className="flex justify-end"><button onClick={handleSubmit} className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-100"><Save size={16} /> SAVE ADJUSTMENT</button></div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {!selectedHistory ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
               <div className="p-6 bg-slate-50/50 border-b border-slate-100"><select value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)} className="max-w-xs p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"><option value="">-- Pilih Outlet History --</option>{outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
               <table className="w-full text-left text-xs">
                 <thead><tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-50"><th className="px-8 py-4">Tanggal Adjust</th><th className="px-8 py-4">Outlet</th><th className="px-6 py-4 text-center">Major Group</th><th className="px-6 py-4 text-center">Total Item</th><th className="px-8 py-4 text-right">Aksi</th></tr></thead>
                 <tbody className="divide-y divide-slate-50">
                   {historyList.length > 0 ? historyList.map((h) => (
                    <tr key={h.id} onClick={() => handleViewDetail(h.id)} className="group hover:bg-slate-50 cursor-pointer transition-colors text-slate-500">
                      <td className="px-8 py-4 font-medium text-slate-700">{new Date(h.adjustDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-8 py-4">{h.outlet?.name}</td>
                      <td className="px-6 py-4 text-center"><span className="px-2 py-0.5 rounded bg-slate-100 text-[10px]">{h.majorGroup}</span></td>
                      <td className="px-6 py-4 text-center">{h._count?.items || 0} Items</td>
                      <td className="px-8 py-4 text-right"><button className="text-indigo-400 group-hover:text-indigo-600"><ArrowRight size={18} /></button></td>
                    </tr>
                  )) : (<tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">No history found.</td></tr>)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setSelectedHistory(null)} className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 font-medium"><ArrowLeft size={16} /> Back to List</button>
                <div className="flex gap-2">
                  {isEditMode ? (
                    <button onClick={handleUpdateHistory} disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-emerald-700">
                      {loading ? <RefreshCcw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} SAVE CHANGES
                    </button>
                  ) : (
                    <button onClick={() => setIsEditMode(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50">
                      <Edit3 size={14} /> Edit Audit
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-6 grid grid-cols-3 gap-6 shadow-sm">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Adjust Date</label>
                  {isEditMode ? (
                    <input type="date" className="block mt-1 p-1 text-sm font-semibold border-b border-indigo-300 outline-none text-indigo-600" 
                      value={selectedHistory.adjustDate.split('T')[0]} 
                      onChange={(e) => setSelectedHistory({...selectedHistory, adjustDate: e.target.value})} />
                  ) : (
                    <p className="text-sm font-semibold text-slate-700 mt-1">{new Date(selectedHistory.adjustDate).toLocaleDateString()}</p>
                  )}
                </div>
                <div><label className="text-[10px] font-bold text-slate-400 uppercase">Outlet</label><p className="text-sm font-semibold text-slate-700 mt-1">{selectedHistory.outlet?.name}</p></div>
                <div><label className="text-[10px] font-bold text-slate-400 uppercase">Category</label><p className="text-sm font-semibold text-slate-700 mt-1">{selectedHistory.majorGroup}</p></div>
              </div>
              {renderTable(selectedHistory.items, isEditMode)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}