/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, History, ClipboardList, Download, 
  Table as TableIcon, FileText, RefreshCw, X, ChevronDown,
  PackageCheck, Clock, ShoppingCart, CheckCircle2,
  Calendar, Building2, MapPin, FileCheck
} from 'lucide-react';

export default function AdminOutletRequestPage() {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [products, setProducts] = useState<any[]>([]);
  const [itemGroups, setItemGroups] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]); 
  const [selectedOutletId, setSelectedOutletId] = useState<string>(''); 
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    searchTerm: '',
    status: 'ALL',
    itemGroupId: 'ALL'
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
      const [prodRes, groupRes, outletRes] = await Promise.all([
        fetch(`${API_URL}/product`),
        fetch(`${API_URL}/item-group`),
        fetch(`${API_URL}/outlet`) 
      ]);
      setProducts(await prodRes.json());
      setItemGroups(await groupRes.json());
      setOutlets(await outletRes.json());
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
      // Tambahkan timestamp agar tidak terkena cache browser
      const res = await fetch(`${API_URL}/purchasing/pr/history?t=${Date.now()}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching PR history:", err);
      setHistoryItems([]); 
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    // 1. Filter data terlebih dahulu
    const filtered = historyItems.filter((item: any) => {
      const prod = item.product || {};
      const itemName = (prod.name || item.tempProductName || '').toLowerCase();
      const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
      
      const matchSearch = itemName.includes(filters.searchTerm.toLowerCase());
      const matchStatus = filters.status === 'ALL' || item.status === filters.status;
      const matchGroup = filters.itemGroupId === 'ALL' || prod.itemGroupId === filters.itemGroupId;
      const matchStart = !filters.startDate || itemDate >= filters.startDate;
      const matchEnd = !filters.endDate || itemDate <= filters.endDate;

      return matchSearch && matchStatus && matchGroup && matchStart && matchEnd;
    });

    // 2. Logic Sortir: Nama Outlet (A-Z) -> Tanggal (Terbaru ke Terlama)
    return filtered.sort((a, b) => {
      const outletA = (a.purchaseRequest?.outlet?.name || 'Z-Tanpa Nama').toLowerCase();
      const outletB = (b.purchaseRequest?.outlet?.name || 'Z-Tanpa Nama').toLowerCase();

      // Jika nama outlet berbeda, urutkan A-Z (Ascending)
      if (outletA !== outletB) {
        return outletA.localeCompare(outletB);
      }

      // Jika outletnya sama, urutkan berdasarkan tanggal (Descending / Baru ke Lama)
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      
      return dateB - dateA;
    });
  }, [historyItems, filters]);

  const addToCart = (product?: any) => {
    const newItem = product ? {
      productId: product.id, 
      name: product.name, 
      itemGroupId: product.itemGroupId,
      itemGroupName: product.itemGroup?.name || 'Umum',
      uom: product.uom || 'PCS', 
      quantity: 1, 
      notes: ''
    } : {
      name: searchTerm, 
      itemGroupId: '',
      itemGroupName: '',
      uom: 'PCS', 
      quantity: 1, 
      notes: ''
    };
    setCart([...cart, newItem]);
    setSearchTerm('');
  };

  const handleSendRequest = async () => {
    if (cart.length === 0) return;
    if (!selectedOutletId) {
        alert("Pilih outlet terlebih dahulu!");
        return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/purchasing/pr/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            outletId: selectedOutletId, 
            items: cart 
        }),
      });
      if (response.ok) {
        setCart([]);
        setSelectedOutletId('');
        alert(`Sukses mengirim request.`);
        setActiveTab('history');
      }
    } catch (error) { 
      alert('Gagal mengirim request.');
    } finally { 
      setLoading(false); 
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'DRAFT': return <FileText size={12} />;
      case 'OFFICIAL': return <FileCheck size={12} />;
      case 'PENDING': return <Clock size={12} />;
      case 'PROCESSED': return <ShoppingCart size={12} />;
      case 'SENT': return <PackageCheck size={12} />;
      case 'RECEIVED': return <CheckCircle2 size={12} />;
      default: return null;
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'DRAFT': return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'OFFICIAL': return 'bg-violet-50 text-violet-600 border-violet-100';
      case 'PENDING': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'PROCESSED': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'SENT': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'RECEIVED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 sm:px-6 mt-6 font-sans text-slate-900">
      
      {/* Top Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Request</h1>
          <p className="text-sm text-slate-500">Kelola permintaan stok barang ke pusat</p>
        </div>
        
        <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit border border-slate-200">
          <button 
            onClick={() => setActiveTab('form')} 
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'form' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ClipboardList size={14} /> Request Form
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <History size={14} /> History
          </button>
        </div>
      </div>

      {activeTab === 'form' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Left Column: Search & Add */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">Cari Produk</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Ketik nama barang..." 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all text-sm font-medium" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
                
                {searchTerm.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-slate-200 shadow-xl mt-2 rounded-xl overflow-hidden">
                    {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5).map((p: any) => (
                      <div key={p.id} onClick={() => addToCart(p)} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 flex justify-between items-center group">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                          <p className="text-[10px] text-indigo-500 font-medium uppercase tracking-wider">{p.itemGroup?.name || 'UMUM'}</p>
                        </div>
                        <Plus size={16} className="text-slate-300 group-hover:text-indigo-600" />
                      </div>
                    ))}
                    <div onClick={() => addToCart()} className="p-3 bg-indigo-50 text-indigo-600 cursor-pointer hover:bg-indigo-100 flex justify-between items-center">
                      <p className="text-xs font-medium italic">Barang tidak terdaftar? Tambah manual</p>
                      <Plus size={16} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200">
                <h4 className="text-sm font-bold mb-2">Punya Request Khusus?</h4>
                <p className="text-xs text-indigo-100 leading-relaxed opacity-90">Anda dapat menambah item secara manual jika produk tidak ditemukan di database kami.</p>
            </div>
          </div>

          {/* Right Column: Cart Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Draft Permintaan ({cart.length})</h3>
                
                <div className="flex items-center gap-4">
                    {cart.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-slate-400" />
                            <select 
                                required
                                value={selectedOutletId}
                                onChange={(e) => setSelectedOutletId(e.target.value)}
                                className="text-[10px] font-bold text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                            >
                                <option value="">PILIH OUTLET ASAL...</option>
                                {outlets.map(o => (
                                    <option key={o.id} value={o.id}>{o.name.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {cart.length > 0 && (
                      <button onClick={() => { setCart([]); setSelectedOutletId(''); }} className="text-[10px] text-slate-400 hover:text-rose-500 font-bold uppercase transition-all">Clear All</button>
                    )}
                </div>
              </div>
              
              <div className="flex-grow overflow-auto min-h-[400px]">
                {cart.length > 0 ? (
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                      <tr className="text-slate-400 text-left text-[10px] font-bold uppercase tracking-widest border-b">
                        <th className="px-6 py-4">Produk</th>
                        <th className="px-4 py-4 text-center">Qty</th>
                        <th className="px-6 py-4">Catatan</th>
                        <th className="px-6 py-4 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {cart.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">{item.name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <select 
                                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border-none outline-none appearance-none cursor-pointer hover:bg-indigo-100 transition-colors"
                                value={item.itemGroupId}
                                onChange={(e) => {
                                  const n = [...cart];
                                  n[idx].itemGroupId = e.target.value;
                                  n[idx].itemGroupName = itemGroups.find(g => g.id === e.target.value)?.name || '';
                                  setCart(n);
                                }}
                              >
                                <option value="">Kategori...</option>
                                {itemGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                              </select>

                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-medium">UOM:</span>
                                <select 
                                  className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border-none outline-none appearance-none cursor-pointer hover:bg-slate-200 transition-colors"
                                  value={item.uom}
                                  onChange={(e) => {
                                    const n = [...cart];
                                    n[idx].uom = e.target.value;
                                    setCart(n);
                                  }}
                                >
                                  {['PCS', 'PACK', 'BTL', 'KG', 'GR', 'LTR', 'ML'].map(u => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-center">
                                <input 
                                    type="number" 
                                    className="w-16 p-2 bg-slate-100 border-none rounded-lg text-center font-bold text-indigo-600 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" 
                                    value={item.quantity} 
                                    onChange={(e) => { const n=[...cart]; n[idx].quantity=Number(e.target.value); setCart(n); }} 
                                />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <input 
                                placeholder="Opsional..." 
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white transition-all" 
                                value={item.notes} 
                                onChange={(e) => { const n=[...cart]; n[idx].notes=e.target.value; setCart(n); }} 
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-rose-500 rounded-lg transition-all">
                                <X size={16}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                        <ClipboardList size={32}/>
                    </div>
                    <p className="text-slate-400 font-medium text-sm tracking-wide">Daftar permintaan masih kosong</p>
                  </div>
                )}
              </div>
              
              {cart.length > 0 && (
                <div className="p-6 bg-slate-50 border-t border-slate-200">
                  <button 
                    onClick={handleSendRequest} 
                    disabled={loading} 
                    className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md transition-all active:scale-[0.98] disabled:opacity-50 ${
                        !selectedOutletId ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                    }`}
                  >
                    {loading ? 'Mengirim...' : !selectedOutletId ? 'Pilih Outlet Terlebih Dahulu' : 'Kirim Request ke Purchasing'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* History Section */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
            <div className="flex-grow min-w-[200px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Pencarian</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500 transition-all" 
                    placeholder="Nama item..." 
                    value={filters.searchTerm} 
                    onChange={e => setFilters({...filters, searchTerm: e.target.value})}
                />
              </div>
            </div>
            <div className="w-40">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Status</label>
              <select 
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none cursor-pointer" 
                value={filters.status} 
                onChange={e => setFilters({...filters, status: e.target.value})}
              >
                <option value="ALL">SEMUA</option>
                <option value="PENDING">PENDING</option>
                <option value="PROCESSED">PROCESSED</option>
                <option value="RECEIVED">RECEIVED</option>
              </select>
            </div>
            <div className="w-40">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1"><Calendar size={10}/> Dari</label>
              <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-semibold" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})}/>
            </div>
            <div className="w-40">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1"><Calendar size={10}/> Sampai</label>
              <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-semibold" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})}/>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><History size={16}/></div>
                <h3 className="text-sm font-bold text-slate-700 tracking-tight">Riwayat Permintaan</h3>
              </div>
              <div className="flex gap-2 relative" ref={exportMenuRef}>
                <button onClick={fetchHistory} className="p-2 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 text-slate-500">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
                </button>
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all hover:bg-slate-800"
                >
                  <Download size={14}/> Export <ChevronDown size={14}/>
                </button>
                {showExportMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in zoom-in-95 duration-100">
                    <button className="w-full px-4 py-3 text-left text-xs font-semibold hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-50 text-slate-700">
                      <TableIcon size={16} className="text-emerald-600" /> Excel Spreadsheet
                    </button>
                    <button className="w-full px-4 py-3 text-left text-xs font-semibold hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-700">
                      <FileText size={16} className="text-rose-600" /> PDF Document
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-left text-[10px] font-bold uppercase tracking-widest border-b">
                    <th className="px-6 py-4">Waktu</th>
                    <th className="px-6 py-4">Item & Outlet</th>
                    <th className="px-4 py-4 text-center">Qty Request</th>
                    <th className="px-4 py-4 text-center">Qty Received</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="py-20 text-center"><RefreshCw className="animate-spin mx-auto text-indigo-400 mb-2"/> <p className="text-xs font-medium text-slate-400">Memuat data...</p></td></tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr><td colSpan={6} className="py-20 text-center text-slate-400 text-xs font-medium">Data tidak ditemukan</td></tr>
                  ) : filteredHistory.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-700 font-semibold text-xs">
                            {new Date(item.createdAt).toLocaleDateString('id-ID', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(item.createdAt).toLocaleTimeString('id-ID', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{item.product?.name || item.tempProductName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                            <MapPin size={10} /> {item.purchaseRequest?.outlet?.name || 'Central'}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{item.product?.itemGroup?.name || 'UMUM'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-slate-700 text-sm">{item.quantity}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{item.uom}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          {/* 3. Menampilkan Qty Received dari realisasi admin */}
                          <span className={`font-black text-sm ${item.receivedQuantity > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                            {item.receivedQuantity || 0}
                          </span>
                          <span className={`text-[9px] font-bold uppercase ${item.receivedQuantity > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>CONFIRMED</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-tight ${getStatusStyle(item.status)}`}>
                          {getStatusIcon(item.status)}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-400 italic truncate max-w-[120px]">{item.notes || '-'}</p>
                      </td>
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