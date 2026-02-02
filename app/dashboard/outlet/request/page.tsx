/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, History, ClipboardList, Download, 
  Table as TableIcon, FileText, RefreshCw, X, ChevronDown 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminOutletRequestPage() {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [products, setProducts] = useState<any[]>([]);
  const [itemGroups, setItemGroups] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Export UI State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    searchTerm: '',
    status: 'ALL',
    itemGroupId: 'ALL',
    majorGroup: 'ALL'
  });
  
  const API_URL = 'http://localhost:3000'; 

  useEffect(() => {
    fetchData();
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, groupRes] = await Promise.all([
        fetch(`${API_URL}/product`),
        fetch(`${API_URL}/item-group`)
      ]);
      setProducts(await prodRes.json());
      setItemGroups(await groupRes.json());
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/purchasing/pr/history`);
      const data = await res.json();
      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistoryItems([]); 
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIKA FILTER ---
  const filteredHistory = useMemo(() => {
    return historyItems.filter((item: any) => {
      const prod = item.product || {};
      const itemName = (prod.name || item.tempProductName || '').toLowerCase();
      const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
      
      const matchSearch = itemName.includes(filters.searchTerm.toLowerCase());
      const matchStatus = filters.status === 'ALL' || item.status === filters.status;
      const matchMajor = filters.majorGroup === 'ALL' || prod.majorGroup === filters.majorGroup;
      const matchGroup = filters.itemGroupId === 'ALL' || prod.itemGroupId === filters.itemGroupId;
      const matchStart = !filters.startDate || itemDate >= filters.startDate;
      const matchEnd = !filters.endDate || itemDate <= filters.endDate;

      return matchSearch && matchStatus && matchMajor && matchGroup && matchStart && matchEnd;
    });
  }, [historyItems, filters]);

  // --- EXPORT LOGIC ---
  const handleExportExcel = () => {
    const data = filteredHistory.map(item => ({
      Tanggal: new Date(item.createdAt).toLocaleDateString('id-ID'),
      Barang: item.product?.name || item.tempProductName,
      Group: item.product?.itemGroup?.name || '-',
      Qty: item.quantity,
      UOM: item.uom,
      Status: item.status,
      Catatan: item.notes || '-'
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PurchaseRequest");
    XLSX.writeFile(workbook, `PR_Report_${new Date().getTime()}.xlsx`);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    autoTable(doc, {
      head: [['Tanggal', 'Barang', 'Group', 'Qty', 'UOM', 'Status', 'Catatan']],
      body: filteredHistory.map(item => [
        new Date(item.createdAt).toLocaleDateString('id-ID'),
        item.product?.name || item.tempProductName,
        item.product?.itemGroup?.name || '-',
        item.quantity,
        item.uom,
        item.status,
        item.notes || '-'
      ]),
      headStyles: { fillColor: [79, 70, 229] },
      theme: 'grid'
    });
    doc.save(`PR_Report_${new Date().getTime()}.pdf`);
    setShowExportMenu(false);
  };

  // --- CART LOGIC ---
  const addToCart = (product?: any) => {
    const newItem = product ? {
      productId: product.id, 
      name: product.name, 
      itemGroupId: product.itemGroupId,
      itemGroupName: product.itemGroup?.name || 'Umum',
      uom: product.uom || 'PCS', 
      quantity: 1, 
      currentStock: 0, 
      notes: ''
    } : {
      name: searchTerm, 
      itemGroupId: '',
      itemGroupName: '',
      uom: 'PCS', 
      quantity: 1, 
      currentStock: 0, 
      notes: ''
    };
    setCart([...cart, newItem]);
    setSearchTerm('');
  };

  const handleSendRequest = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/purchasing/pr/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
      });
      if (response.ok) {
        setCart([]);
        setActiveTab('history');
      }
    } catch (error) { 
      alert('Gagal mengirim request.');
    } finally { 
      setLoading(false); 
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'PENDING': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'ORDERED': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'RECEIVED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 sm:px-6 mt-4">
      {/* Tab Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit mx-auto shadow-sm">
        <button 
          onClick={() => setActiveTab('form')} 
          className={`flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'form' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ClipboardList size={18} /> Request Form
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={`flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <History size={18} /> History
        </button>
      </div>

      {activeTab === 'form' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Search Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Search size={20}/></div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Cari Barang</h2>
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ketik nama barang yang ingin dipesan..." 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-lg" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
              {searchTerm.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-slate-200 shadow-2xl mt-2 rounded-2xl overflow-hidden">
                  {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5).map((p: any) => (
                    <div key={p.id} onClick={() => addToCart(p)} className="p-4 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{p.itemGroup?.name || 'UMUM'}</p>
                      </div>
                      <Plus size={18} className="text-slate-300 group-hover:text-indigo-600" />
                    </div>
                  ))}
                  <div onClick={() => addToCart()} className="p-4 bg-slate-900 text-white cursor-pointer hover:bg-black flex justify-between items-center">
                    <p className="text-sm font-medium italic">"{searchTerm}" tidak ditemukan? Tambah manual.</p>
                    <span className="bg-indigo-600 px-3 py-1 rounded-lg text-[10px] font-bold">MANUAL ADD</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cart Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-700">DAFTAR PESANAN ({cart.length})</h3>
              {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700 font-bold px-3 py-1 bg-red-50 rounded-lg transition-all">Kosongkan</button>}
            </div>
            <div className="overflow-x-auto">
              {cart.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/30 text-slate-400 text-left text-[11px] font-bold uppercase tracking-wider border-b">
                      <th className="px-6 py-4">Barang & Group</th>
                      <th className="px-4 py-4 text-center">Satuan</th>
                      <th className="px-4 py-4 text-center">Stok Sesuai</th>
                      <th className="px-4 py-4 text-center">Request Qty</th>
                      <th className="px-6 py-4">Catatan</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 uppercase">{item.name}</p>
                          <select 
                            className="text-[11px] text-indigo-600 font-bold bg-transparent outline-none mt-1 border-b border-indigo-100"
                            value={item.itemGroupId}
                            onChange={(e) => {
                              const n = [...cart];
                              n[idx].itemGroupId = e.target.value;
                              n[idx].itemGroupName = itemGroups.find(g => g.id === e.target.value)?.name || '';
                              setCart(n);
                            }}
                          >
                            <option value="">Pilih Group...</option>
                            {itemGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <select className="p-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white outline-none" value={item.uom} onChange={(e) => { const n=[...cart]; n[idx].uom=e.target.value; setCart(n); }}>
                            {['PCS', 'KG', 'GR', 'LTR', 'ML', 'PACK', 'BTL'].map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input type="number" className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-bold outline-none" value={item.currentStock} onChange={(e) => { const n=[...cart]; n[idx].currentStock=Number(e.target.value); setCart(n); }} />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input type="number" className="w-20 p-2 border-2 border-indigo-100 rounded-xl text-center font-bold text-indigo-600 text-lg outline-none focus:border-indigo-500 transition-all" value={item.quantity} onChange={(e) => { const n=[...cart]; n[idx].quantity=Number(e.target.value); setCart(n); }} />
                        </td>
                        <td className="px-6 py-4">
                          <input placeholder="Contoh: Urgent" className="w-full p-2 bg-slate-50 border border-transparent focus:border-slate-200 rounded-xl text-sm outline-none" value={item.notes} onChange={(e) => { const n=[...cart]; n[idx].notes=e.target.value; setCart(n); }} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={18}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200"><ClipboardList size={32}/></div>
                  <p className="text-slate-400 font-medium">Belum ada barang di daftar pesanan</p>
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button onClick={handleSendRequest} disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-100 transition-all active:scale-[0.99] disabled:opacity-50">
                  {loading ? 'MEMPROSES...' : 'KIRIM REQUEST KE PURCHASING'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History Section */
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Cari Barang</label>
              <input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" placeholder="Ketik nama..." value={filters.searchTerm} onChange={e => setFilters({...filters, searchTerm: e.target.value})}/>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Status</label>
              <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                <option value="ALL">SEMUA</option>
                <option value="PENDING">PENDING</option>
                <option value="ORDERED">ORDERED</option>
                <option value="RECEIVED">RECEIVED</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Group</label>
              <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" value={filters.itemGroupId} onChange={e => setFilters({...filters, itemGroupId: e.target.value})}>
                <option value="ALL">SEMUA GROUP</option>
                {itemGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Mulai</label>
              <input type="date" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-bold" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})}/>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Selesai</label>
              <input type="date" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-bold" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})}/>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold tracking-widest uppercase">Riwayat Permintaan</h3>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{filteredHistory.length} Record</span>
              </div>
              <div className="flex gap-2 relative" ref={exportMenuRef}>
                <button onClick={fetchHistory} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><RefreshCw size={16}/></button>
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20"
                >
                  <Download size={14}/> Export <ChevronDown size={14}/>
                </button>
                {showExportMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-[110] overflow-hidden text-slate-700 animate-in zoom-in-95 duration-150">
                    <button onClick={handleExportExcel} className="w-full px-4 py-3 text-left text-sm hover:bg-indigo-50 flex items-center gap-3 transition-colors">
                      <TableIcon size={16} className="text-emerald-600" /> Excel (.xlsx)
                    </button>
                    <button onClick={handleExportPDF} className="w-full px-4 py-3 text-left text-sm hover:bg-indigo-50 flex items-center gap-3 transition-colors border-t border-slate-50">
                      <FileText size={16} className="text-red-600" /> PDF Document
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-left text-[11px] font-bold uppercase tracking-wider border-b">
                    <th className="px-6 py-4">Waktu</th>
                    <th className="px-6 py-4">Item & Detail</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="py-20 text-center text-slate-400 animate-pulse font-bold">LOADING DATA...</td></tr>
                  ) : filteredHistory.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 uppercase">{item.product?.name || item.tempProductName}</p>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">
                          {item.product?.itemGroup?.name || 'UMUM'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-slate-900 text-base">{item.quantity}</span>
                        <span className="ml-1 text-[10px] text-slate-400 font-bold uppercase">{item.uom}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 italic text-xs">{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}