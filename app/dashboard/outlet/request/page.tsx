/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, History, ClipboardList, Download, 
  Table as TableIcon, FileText, RefreshCw, X, ChevronDown,
  PackageCheck, Clock, ShoppingCart, CheckCircle2,
  Calendar, Building2, MapPin, FileCheck, FilterX,
  FileUp, AlertCircle, FileSpreadsheet, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [importSuggestions, setImportSuggestions] = useState<any[]>([]); // Untuk menyimpan item yang butuh konfirmasi
  
  // Refs for Import/Export
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFilters = {
    startDate: '',
    endDate: '',
    searchTerm: '',
    status: 'ALL',
    itemGroupId: 'ALL'
  };

  const [filters, setFilters] = useState(initialFilters);
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

  const showNotif = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000); // Hilang otomatis dalam 3 detik
  };

  // --- GLOBAL CONFIG & UTILS ---
  const PRODUCT_ALIASES: Record<string, string> = {
    'COKE': 'COLA',
    'COCA COLA': 'COLA',
    'JACK D': 'JACK DANIELS',
    'JAGER': 'JAGERMEISTER'
  };

  const sanitize = (str: string) => str.toUpperCase().replace(/\s+/g, ' ').trim();

  const getSimilarityScore = (importName: string, dbName: string) => {
    const s1 = sanitize(importName);
    const s2 = sanitize(dbName);
    
    const aliasName = PRODUCT_ALIASES[s1];
    if (aliasName === s2 || s1 === s2) return 1.0; 

    const getGrams = (s: string) => {
      const grams = [];
      for (let i = 0; i < s.length - 1; i++) grams.push(s.substring(i, i + 2));
      return grams;
    };

    const g1 = getGrams(s1);
    const g2 = getGrams(s2);
    const intersection = g1.filter(x => g2.includes(x)).length;
    const total = g1.length + g2.length;
    
    return total === 0 ? 0 : (2.0 * intersection) / total;
  };

  // --- FITUR DOWNLOAD TEMPLATE ---
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nama Barang': 'JAGERMEISTER 700ML',
        'Quantity': 5,
        'Satuan': 'BTL',
        'Catatan': 'Segera dikirim'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Request");
    XLSX.writeFile(wb, "Template_Purchase_Request.xlsx");
  };

  // --- FITUR IMPORT EXCEL ---
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) return alert("File Excel kosong!");

        const newSuggestions: any[] = [];
        const confirmedItems: any[] = [];

        data.forEach((row: any, index: number) => {
          const rowName = row['Nama Barang'] || '';
          let bestMatch: any = null;
          let highestScore = 0;

          products.forEach(p => {
            const score = getSimilarityScore(rowName, p.name);
            if (score > highestScore) {
              highestScore = score;
              bestMatch = p;
            }
          });

          const itemBase = {
            name: rowName,
            quantity: Number(row['Quantity']) || 1,
            uom: row['Satuan'] || 'PCS',
            notes: row['Catatan'] || ''
          };

          // AMBANG BATAS BARU
          if (highestScore > 0.85) {
            // Dianggap sama (termasuk BACARDI WHITE yang beda spasi)
            confirmedItems.push({ ...itemBase, productId: bestMatch.id, itemGroupName: bestMatch.itemGroup?.name });
          } else if (highestScore > 0.25) {
            // COKE ke COLA akan masuk ke sini karena skornya sekitar 0.3 - 0.4
            newSuggestions.push({ ...itemBase, suggestion: bestMatch, score: Math.round(highestScore * 100) });
          } else {
            confirmedItems.push({ ...itemBase, productId: null, itemGroupName: 'Manual' });
          }
        });

        setCart([...cart, ...confirmedItems]);
        if (newSuggestions.length > 0) {
          setImportSuggestions(newSuggestions); // Munculkan modal/notif saran
        } else {
          showNotif(`Berhasil mengimpor ${confirmedItems.length} item`);
        }
      } catch (err) {
        showNotif("Gagal memproses Excel", "error");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const dataToExport = filteredHistory.map(item => ({
      'Tanggal Request': new Date(item.createdAt).toLocaleDateString('id-ID'),
      'Outlet': item.purchaseRequest?.outlet?.name || 'Central',
      'SKU': item.product?.sku || item.product?.code || '-',
      'Nama Barang': item.product?.name || item.tempProductName,
      'Qty Request': item.quantity,
      'Qty Received': item.receivedQuantity || 0,
      'Status': item.status,
      'Tanggal Diterima': item.receivedDate ? new Date(item.receivedDate).toLocaleDateString('id-ID') : '-',
      'Catatan': item.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History PR");
    XLSX.writeFile(wb, `PR_History_${new Date().getTime()}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Tanggal", "Outlet", "SKU", "Item", "Qty Req", "Qty Rec", "Status"];
    const tableRows = filteredHistory.map(item => [
      new Date(item.createdAt).toLocaleDateString('id-ID'),
      item.purchaseRequest?.outlet?.name || 'Central',
      item.product?.sku || item.product?.code || '-',
      item.product?.name || item.tempProductName,
      item.quantity,
      item.receivedQuantity || 0,
      item.status
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.setFontSize(14);
    doc.text("Riwayat Purchase Request", 14, 15);
    doc.save(`PR_History_${new Date().getTime()}.pdf`);
    setShowExportMenu(false);
  };

  const filteredHistory = useMemo(() => {
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
    return filtered.sort((a, b) => {
      const outletA = (a.purchaseRequest?.outlet?.name || 'Z-Tanpa Nama').toLowerCase();
      const outletB = (b.purchaseRequest?.outlet?.name || 'Z-Tanpa Nama').toLowerCase();
      if (outletA !== outletB) return outletA.localeCompare(outletB);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [historyItems, filters]);

  const clearFilters = () => {
  setFilters({
    startDate: '',
    endDate: '',
    searchTerm: '',
    status: 'ALL',
    itemGroupId: 'ALL'
  }); // Mengembalikan state filters ke nilai awal secara manual
};

  // Tambahkan flag isNew untuk item manual
  const addToCart = (product?: any) => {
    const newItem = product ? {
      productId: product.id, 
      name: product.name, 
      itemGroupId: product.itemGroupId,
      itemGroupName: product.itemGroup?.name || 'Umum',
      uom: product.uom || 'PCS', 
      quantity: 1, 
      notes: '',
      isNew: false // Item sudah ada di database
    } : {
      productId: null,
      name: searchTerm, 
      itemGroupId: '',
      itemGroupName: '',
      uom: 'PCS', 
      quantity: 1, 
      notes: '',
      isNew: true // Tandai sebagai item baru yang perlu disimpan
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
        body: JSON.stringify({ outletId: selectedOutletId, items: cart }),
      });
      if (response.ok) {
        setCart([]);
        setSelectedOutletId('');
        alert(`Sukses mengirim request.`);
        setActiveTab('history');
      }
    } catch (error) { 
      alert('Gagal mengirim request.');
    } finally { setLoading(false); }
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
    <div className="max-w-7xl mx-auto space-y-12 pb-20 px-4 sm:px-6 mt-6 font-sans text-slate-900">
      
      {/* Header Section */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Purchase Request</h1>
            <p className="text-slate-500 text-sm font-medium">Kelola permintaan stok barang ke pusat secara kolektif.</p>
          </div>
          
          <div className="flex gap-3 relative">
            {/* Navigasi Tab Identik dengan style Itemlist */}
            <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200 h-fit">
              <button onClick={() => setActiveTab('form')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'form' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <ClipboardList size={14} /> Request Form
              </button>
              <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <History size={14} /> History
              </button>
            </div>

            {activeTab === 'form' && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border border-slate-200 text-slate-600 px-5 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:bg-slate-50 active:scale-95 shadow-sm text-xs"
                >
                  <FileUp size={16} className="text-indigo-600" /> Import Excel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs font-medium text-indigo-700">
              <AlertCircle size={20} className="text-indigo-400" />
              <p>Gunakan fitur <b>Import Excel</b> untuk mengupload request dalam jumlah banyak sekaligus.</p>
            </div>
            {activeTab === 'form' && (
              <button 
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-200 transition-colors"
              >
                <FileSpreadsheet size={16} /> DOWNLOAD TEMPLATE
              </button>
            )}
        </div>

        {activeTab === 'form' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Form & Cart UI (Unchanged logistically, refined visually) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Cari Produk</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Ketik nama barang..." 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all text-sm font-medium" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                  {searchTerm.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border border-slate-200 shadow-xl mt-2 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                      {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5).map((p: any) => (
                        <div key={p.id} onClick={() => addToCart(p)} className="p-4 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 flex justify-between items-center group">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{p.itemGroup?.name || 'UMUM'}</p>
                          </div>
                          <Plus size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      ))}
                      <div onClick={() => addToCart()} className="p-4 bg-slate-50 text-indigo-600 cursor-pointer hover:bg-indigo-100 flex justify-between items-center border-t border-slate-100">
                        <p className="text-xs font-bold italic uppercase tracking-tighter">Tambah Manual</p>
                        <Plus size={16} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/30">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Draft Permintaan ({cart.length})</h3>
                  <div className="flex items-center gap-4">
                      {cart.length > 0 && (
                          <div className="flex items-center gap-3">
                              <Building2 size={16} className="text-indigo-500" />
                              <select required value={selectedOutletId} onChange={(e) => setSelectedOutletId(e.target.value)}
                                  className="text-xs font-bold text-indigo-600 bg-white border border-slate-200 px-4 py-2 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all cursor-pointer shadow-sm"
                              >
                                  <option value="">PILIH OUTLET ASAL...</option>
                                  {outlets.map(o => <option key={o.id} value={o.id}>{o.name.toUpperCase()}</option>)}
                              </select>
                          </div>
                      )}
                      {cart.length > 0 && (
                        <button onClick={() => { setCart([]); setSelectedOutletId(''); }} className="text-[10px] text-slate-400 hover:text-rose-500 font-black uppercase transition-all tracking-tighter">Clear All</button>
                      )}
                  </div>
                </div>
                
                <div className="flex-grow overflow-auto">
                  {cart.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-slate-50/50 sticky top-0 z-10">
                        <tr className="text-slate-400 text-left text-[10px] font-black uppercase tracking-widest border-b">
                          <th className="px-8 py-5">Produk</th>
                          <th className="px-4 py-5 text-center w-24">Qty</th>
                          <th className="px-8 py-5">Catatan</th>
                          <th className="px-8 py-5 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {cart.map((item, idx) => {
                          const isUnknown = !item.productId;

                          return (
                            <tr key={idx} className={`group transition-colors ${isUnknown ? 'bg-rose-50/40' : 'hover:bg-slate-50/80'}`}>
                              <td className="px-8 py-5">
                                {isUnknown ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-rose-600">
                                      <AlertCircle size={14} className="animate-pulse" />
                                      <span className="text-[10px] font-black uppercase tracking-tighter">Item tidak terbaca sistem</span>
                                    </div>
                                    
                                    {/* Dropdown Pencarian untuk Menyambungkan ke Database */}
                                    <div className="relative group/search">
                                      <div className="flex items-center bg-white border border-rose-200 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 ring-rose-500/20">
                                        <Search size={14} className="text-slate-400 mr-2" />
                                        <input 
                                          className="flex-1 text-sm font-bold outline-none"
                                          value={item.name}
                                          placeholder="Ketik untuk mencari di database..."
                                          onChange={(e) => {
                                            const n = [...cart];
                                            n[idx].name = e.target.value;
                                            setCart(n);
                                          }}
                                        />
                                      </div>
                                      
                                      {/* List Dropdown Otomatis */}
                                      {item.name.length > 1 && isUnknown && (
                                        <div className="absolute z-50 w-full bg-white border border-slate-200 shadow-xl mt-1 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                                          {products
                                            .filter(p => p.name.toLowerCase().includes(item.name.toLowerCase()))
                                            .map(p => (
                                              <div 
                                                key={p.id}
                                                onClick={() => {
                                                  const n = [...cart];
                                                  n[idx] = { ...n[idx], productId: p.id, name: p.name, itemGroupId: p.itemGroupId, itemGroupName: p.itemGroup?.name, uom: p.uom, isNew: false };
                                                  setCart(n);
                                                }}
                                                className="p-3 text-xs font-bold hover:bg-indigo-50 cursor-pointer border-b border-slate-50 flex justify-between"
                                              >
                                                {p.name} <span className="text-indigo-500">PILIH</span>
                                              </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                                    <span className="text-[9px] font-black text-indigo-400 uppercase">Terdaftar di Sistem</span>
                                  </>
                                )}
                                
                                {/* Bagian Kategori & UOM */}
                                <div className="flex gap-2 mt-3">
                                  <select 
                                    disabled={!item.isNew} // Hanya bisa diubah jika item baru
                                    className={`text-[10px] font-bold px-2 py-1 rounded border-none outline-none appearance-none transition-all ${
                                      item.isNew ? 'bg-indigo-600 text-white cursor-pointer shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                    value={item.itemGroupId}
                                    onChange={(e) => {
                                      const n = [...cart];
                                      n[idx].itemGroupId = e.target.value;
                                      setCart(n);
                                    }}
                                  >
                                    <option value="">Pilih Kategori...</option>
                                    {itemGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                  </select>

                                  <select 
                                    disabled={!item.isNew} // Hanya bisa diubah jika item baru
                                    className={`text-[10px] font-bold px-2 py-1 rounded border-none outline-none appearance-none transition-all ${
                                      item.isNew ? 'bg-indigo-600 text-white cursor-pointer shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                    value={item.uom}
                                    onChange={(e) => {
                                      const n = [...cart];
                                      n[idx].uom = e.target.value;
                                      setCart(n);
                                    }}
                                  >
                                    {['PCS', 'PACK', 'BTL', 'KG', 'GR', 'LTR', 'ML', 'CAN'].map(u => (
                                      <option key={u} value={u}>{u}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              
                              {/* Kolom Qty, Notes, dan Delete tetap sama namun selaras gaya visual */}
                              <td className="px-4 py-5 text-center">
                                  <input type="number" className="w-20 p-2.5 bg-slate-50 border-none rounded-xl text-center font-black text-indigo-600 text-sm outline-none" 
                                      value={item.quantity} onChange={(e) => { const n=[...cart]; n[idx].quantity=Number(e.target.value); setCart(n); }} 
                                  />
                              </td>
                              <td className="px-8 py-5">
                                  <input placeholder="Catatan tambahan..." className="w-full p-2.5 bg-white border border-slate-100 rounded-xl text-xs font-medium outline-none" 
                                      value={item.notes} onChange={(e) => { const n=[...cart]; n[idx].notes=e.target.value; setCart(n); }} 
                                  />
                              </td>
                              <td className="px-8 py-5 text-right">
                                <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><X size={18}/></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-24 opacity-30">
                      <ClipboardList size={64} className="text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Keranjang Kosong</p>
                    </div>
                  )}
                </div>
                
                {cart.length > 0 && (
                  <div className="p-8 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                    <button onClick={handleSendRequest} disabled={loading} 
                      className={`w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50 ${
                          !selectedOutletId ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                      }`}
                    >
                      {loading ? <Loader2 className="animate-spin mx-auto"/> : !selectedOutletId ? 'Pilih Outlet Dahulu' : 'Kirim Request Sekarang'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* History Table UI (Unchanged logic, refined visually) */
          <div className="space-y-6 animate-in fade-in duration-300">
             {/* Filter Bar History */}
             <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-slate-200 flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Cari nama item atau status..." className="w-full pl-11 pr-4 py-3 bg-transparent rounded-2xl outline-none transition-all text-sm font-medium"
                    value={filters.searchTerm} onChange={e => setFilters({...filters, searchTerm: e.target.value})} />
                </div>
                <div className="flex gap-2 p-1">
                    <select className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-600 outline-none cursor-pointer" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                        <option value="ALL">SEMUA STATUS</option>
                        <option value="PENDING">PENDING</option>
                        <option value="PROCESSED">PROCESSED</option>
                        <option value="RECEIVED">RECEIVED</option>
                    </select>
                    <input type="date" className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 outline-none" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})}/>
                    <input type="date" className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 outline-none" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})}/>
                    <button onClick={clearFilters} className="bg-rose-50 text-rose-600 p-2.5 rounded-xl hover:bg-rose-100 transition-all border border-rose-100 shadow-sm shadow-rose-100/50"><FilterX size={18}/></button>
                </div>
             </div>

             <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b flex justify-between items-center bg-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><History size={20}/></div>
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">Riwayat Purchase Request</h3>
                  </div>
                  <div className="flex gap-3 relative" ref={exportMenuRef}>
                    <button onClick={fetchHistory} className="p-2.5 hover:bg-indigo-50 rounded-xl transition-all border border-slate-100 text-slate-400 hover:text-indigo-600"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button>
                    <button onClick={() => setShowExportMenu(!showExportMenu)} className="bg-slate-950 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.1em] shadow-lg shadow-slate-200 flex items-center gap-2 active:scale-95 transition-all">
                      <Download size={16}/> Export <ChevronDown size={14}/>
                    </button>
                    {showExportMenu && (
                      <div className="absolute top-full right-0 mt-3 w-56 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                        <button onClick={exportToExcel} className="w-full px-5 py-4 text-left text-xs font-bold hover:bg-emerald-50 flex items-center gap-4 transition-colors border-b border-slate-50 text-slate-700 uppercase tracking-tighter">
                          <TableIcon size={18} className="text-emerald-500" /> Excel Spreadsheet
                        </button>
                        <button onClick={exportToPDF} className="w-full px-5 py-4 text-left text-xs font-bold hover:bg-rose-50 flex items-center gap-4 transition-colors text-slate-700 uppercase tracking-tighter">
                          <FileText size={18} className="text-rose-500" /> PDF Document
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 text-left text-[10px] font-black uppercase tracking-widest border-b">
                        <th className="px-8 py-5">Waktu Request</th>
                        <th className="px-8 py-5">Item & Outlet</th>
                        <th className="px-4 py-5 text-center">Qty Req</th>
                        <th className="px-4 py-5 text-center">Qty Rec</th>
                        <th className="px-8 py-5 text-center">Status</th>
                        <th className="px-8 py-5">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        <tr><td colSpan={6} className="py-32 text-center"><Loader2 className="animate-spin mx-auto text-indigo-400 mb-2" size={32}/><p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Synchronizing...</p></td></tr>
                      ) : filteredHistory.map((item: any) => (
                        <tr key={item.id} className="group hover:bg-slate-50/30 transition-all border-none">
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-slate-800 font-bold text-xs">{new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Clock size={10} /> {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <p className="font-bold text-slate-800">{item.product?.name || item.tempProductName}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-tighter">{item.purchaseRequest?.outlet?.name || 'CENTRAL'}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase">{item.product?.sku || '-'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <span className="font-black text-slate-700 text-sm">{item.quantity}</span>
                            <span className="text-[9px] text-slate-400 font-black uppercase ml-1">{item.uom}</span>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <span className={`font-black text-sm ${item.receivedQuantity > 0 ? 'text-emerald-600' : 'text-slate-200'}`}>{item.receivedQuantity || 0}</span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${getStatusStyle(item.status)}`}>
                              {getStatusIcon(item.status)} {item.status}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-[10px] text-slate-400 font-medium italic truncate max-w-[120px]">{item.notes || '-'}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}
      </section>
      {/* MODAL SARAN IMPORT */}
      {importSuggestions.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[250] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-50 bg-indigo-50/30">
              <div className="flex items-center gap-3 text-indigo-600 mb-2">
                <RefreshCw size={24} className="animate-spin-slow" />
                <h2 className="text-xl font-black uppercase tracking-tighter">Konfirmasi Item</h2>
              </div>
              <p className="text-xs font-medium text-slate-500">Beberapa nama barang di Excel mirip dengan inventory kami. Pilih untuk menyambungkan:</p>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto p-6 space-y-3">
              {importSuggestions.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Di Excel</span>
                      <p className="text-sm font-bold text-slate-800">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Saran Sistem</span>
                      <button 
                        onClick={() => {
                          const linkedItem = {
                            productId: item.suggestion.id,
                            name: item.suggestion.name, // Gunakan nama resmi dari DB
                            itemGroupName: item.suggestion.itemGroup?.name,
                            uom: item.uom,
                            quantity: item.quantity,
                            notes: item.notes
                          };
                          setCart([...cart, linkedItem]);
                          setImportSuggestions(prev => prev.filter((_, i) => i !== idx));
                          if(importSuggestions.length === 1) showNotif("Item berhasil disambungkan");
                        }}
                        className="block mt-1 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                      >
                        Gunakan: {item.suggestion.name}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* MODAL SARAN IMPORT */}
            {importSuggestions.length > 0 && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[250] p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-8 border-b border-slate-50 bg-indigo-50/30">
                    <h2 className="text-xl font-black uppercase tracking-tighter text-indigo-600">Konfirmasi Item</h2>
                    <p className="text-xs font-medium text-slate-500">Pilih kecocokan produk untuk item berikut:</p>
                  </div>
                  
                  <div className="max-h-[400px] overflow-y-auto p-6 space-y-3">
                    {/* VARIABEL 'item' dan 'idx' DIDEFINISIKAN DI DALAM MAP INI */}
                    {importSuggestions.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase">Di Excel</span>
                          <p className="text-sm font-bold text-slate-800">{item.name}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black border bg-orange-50 text-orange-600 border-orange-100">
                            MATCH {item.score}%
                          </span>
                          <button 
                            onClick={() => {
                              const linkedItem = {
                                productId: item.suggestion.id,
                                name: item.suggestion.name,
                                itemGroupName: item.suggestion.itemGroup?.name,
                                uom: item.uom,
                                quantity: item.quantity,
                                notes: item.notes
                              };
                              setCart([...cart, linkedItem]);
                              setImportSuggestions(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md"
                          >
                            Gunakan: {item.suggestion.name}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-slate-50 border-t flex gap-3">
                    <button 
                      onClick={() => {
                        const manualItems = importSuggestions.map(s => ({...s, productId: null, itemGroupName: 'Manual'}));
                        setCart([...cart, ...manualItems]);
                        setImportSuggestions([]);
                      }}
                      className="flex-1 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600"
                    >
                      Abaikan Semua
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}