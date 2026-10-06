/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, History, ClipboardList, Download, 
  Table as TableIcon, FileText, RefreshCw, X, ChevronDown,
  PackageCheck, Clock, ShoppingCart, CheckCircle2,
  Calendar, Building2, FileCheck, FilterX,
  FileUp, AlertCircle, FileSpreadsheet, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/* ===================================================================================
   UI COMPONENTS IMPORT
   Centralized components to maintain design consistency across the ERP system.
=================================================================================== */
import PageHeader from '@/components/ui/PageHeader';
import AnimatedWrapper from '@/components/ui/AnimatedWrapper';
import BentoCard from '@/components/ui/BentoCard';
import EmptyState from '@/components/ui/EmptyState';

export default function AdminOutletRequestPage() {
  /* ===================================================================================
     STATE MANAGEMENT
     Handles core data, form arrays, active tabs, and temporary UI states.
  =================================================================================== */
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
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [importSuggestions, setImportSuggestions] = useState<any[]>([]); 
  
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFilters = { startDate: '', endDate: '', searchTerm: '', status: 'ALL', itemGroupId: 'ALL' };
  const [filters, setFilters] = useState(initialFilters);
  const API_URL = 'http://localhost:3000'; 

  /* ===================================================================================
     LIFECYCLE EFFECTS
     Initializes data and event listeners (e.g., clicking outside dropdowns).
  =================================================================================== */
  useEffect(() => {
    fetchData();
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (importMenuRef.current && !importMenuRef.current.contains(event.target as Node)) {
        setShowImportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { 
    if (activeTab === 'history') fetchHistory(); 
  }, [activeTab]);

  /* ===================================================================================
     DATA FETCHERS
     Retrieves base products, groups, outlets, and historical PR data from the API.
  =================================================================================== */
  const fetchData = async () => {
    try {
      const [prodRes, groupRes, outletRes] = await Promise.all([
        fetch(`${API_URL}/product`), fetch(`${API_URL}/item-group`), fetch(`${API_URL}/outlet`) 
      ]);
      setProducts(await prodRes.json());
      setItemGroups(await groupRes.json());
      setOutlets(await outletRes.json());
    } catch (err) { console.error("Fetch error:", err); }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/purchasing/pr/history?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (err) { 
      console.error("Error fetching PR history:", err); 
      setHistoryItems([]); 
    } finally { 
      setLoading(false); 
    }
  };

  /* ===================================================================================
     UTILITIES & HELPERS
     Toast notifications, similarity scoring for Excel uploads, and data sanitization.
  =================================================================================== */
  const showNotif = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const PRODUCT_ALIASES: Record<string, string> = {
    'COKE': 'COLA', 'COCA COLA': 'COLA', 'JACK D': 'JACK DANIELS', 'JAGER': 'JAGERMEISTER'
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

  /* ===================================================================================
     EXCEL IMPORT LOGIC
     Handles template generation, file reading, and Smart Name Matching logic.
  =================================================================================== */
  const handleDownloadTemplate = () => {
    const templateData = [{ 'Nama Barang': 'JAGERMEISTER 700ML', 'Quantity': 5, 'Satuan': 'BTL', 'Catatan': 'Segera dikirim' }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Request");
    XLSX.writeFile(wb, "Template_Purchase_Request.xlsx");
    setShowImportMenu(false);
  };

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

        data.forEach((row: any) => {
          const rowName = row['Nama Barang'] || '';
          let bestMatch: any = null;
          let highestScore = 0;
          products.forEach(p => {
            const score = getSimilarityScore(rowName, p.name);
            if (score > highestScore) { highestScore = score; bestMatch = p; }
          });
          const itemBase = { name: rowName, quantity: Number(row['Quantity']) || 1, uom: row['Satuan'] || 'PCS', notes: row['Catatan'] || '' };
          
          if (highestScore > 0.85) {
            confirmedItems.push({ ...itemBase, productId: bestMatch.id, itemGroupId: bestMatch.itemGroupId, itemGroupName: bestMatch.itemGroup?.name, uom: bestMatch.uom, isNew: false });
          } else if (highestScore > 0.25) {
            newSuggestions.push({ ...itemBase, suggestion: bestMatch, score: Math.round(highestScore * 100) });
          } else {
            confirmedItems.push({ ...itemBase, productId: null, itemGroupId: '', isNew: true });
          }
        });
        
        setCart(prev => [...prev, ...confirmedItems]);
        setShowImportMenu(false);
        
        if (newSuggestions.length > 0) setImportSuggestions(newSuggestions);
        else showNotif(`Berhasil mengimpor ${confirmedItems.length} item`);
        
      } catch (err) { 
        showNotif("Gagal memproses Excel", "error"); 
      } finally { 
        if (fileInputRef.current) fileInputRef.current.value = ''; 
      }
    };
    reader.readAsBinaryString(file);
  };

  /* ===================================================================================
     HISTORY MEMOIZATION & EXPORTS
     Filters the history data based on active states and manages Excel/PDF exports.
  =================================================================================== */
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
      head: [tableColumn], body: tableRows, startY: 20, styles: { fontSize: 8 }, headStyles: { fillColor: [15, 23, 42] }
    });

    doc.setFontSize(14);
    doc.text("Riwayat Purchase Request", 14, 15);
    doc.save(`PR_History_${new Date().getTime()}.pdf`);
    setShowExportMenu(false);
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', searchTerm: '', status: 'ALL', itemGroupId: 'ALL' });
  };

  /* ===================================================================================
     FORM SUBMISSION & CART LOGIC
     Adds items manually, formats data, and POSTs the final request array.
  =================================================================================== */
  const addToCart = (product?: any) => {
    const newItem = product ? {
      productId: product.id, name: product.name, itemGroupId: product.itemGroupId, itemGroupName: product.itemGroup?.name || 'Umum',
      uom: product.uom || 'PCS', quantity: 1, notes: '', isNew: false 
    } : {
      productId: null, name: searchTerm, itemGroupId: '', itemGroupName: '', uom: 'PCS', quantity: 1, notes: '', isNew: true 
    };
    setCart([...cart, newItem]);
    setSearchTerm('');
  };

  const handleSendRequest = async () => {
    if (cart.length === 0 || !selectedOutletId) return alert("Pilih outlet dan item yang ingin dipesan!");
    
    const cleanedItems = cart.map(item => ({
      productId: item.productId || undefined, name: item.name, quantity: Number(item.quantity), uom: item.uom,
      itemGroupName: item.itemGroupName || 'Umum', itemGroupId: item.itemGroupId || undefined, notes: item.notes || ''
    }));

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/purchasing/pr/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outletId: selectedOutletId, items: cleanedItems }),
      });
      
      if (response.ok) { 
        setCart([]); setSelectedOutletId(''); showNotif("Request berhasil dikirim"); setActiveTab('history'); 
      } else {
        const errorData = await response.json();
        console.error("Validation Error:", errorData);
        alert("Gagal: " + (Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message));
      }
    } catch (error) { 
      showNotif("Gagal mengirim request", "error"); 
    } finally { 
      setLoading(false); 
    }
  };

  /* ===================================================================================
     UI HELPER COMPONENTS
     Returns mapped colors and icons based on status strings.
  =================================================================================== */
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
      case 'RECEIVED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'SENT': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'PENDING': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  /* ===================================================================================
     MAIN RENDER
  =================================================================================== */
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-600 relative selection:bg-indigo-100">
      
      {/* Toast Notification Container */}
      {notification && (
        <div className={`fixed top-10 right-10 z-[500] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right duration-500 ${
          notification.type === 'success' ? 'bg-white border-emerald-100 text-emerald-800' : 'bg-white border-rose-100 text-rose-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={20}/> : <AlertCircle className="text-rose-500" size={20}/>}
          <p className="text-sm font-semibold">{notification.message}</p>
        </div>
      )}

      {/* Main Layout Container (0.5cm edge gap applied via p-4 md:p-5) */}
      <div className="w-full p-4 md:p-5 pb-24 space-y-5">
        
        {/* === HEADER COMPONENT === */}
        <PageHeader 
          title="Purchase" 
          highlight="Request" 
          description="Manage and synchronize your outlet inventory requirements with central warehouse."
          moduleName="Outlet Operations"
          icon={<ShoppingCart size={14} className="text-indigo-600" />}
        >
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            
            {/* Dropdown Import Excel */}
            <div className="relative" ref={importMenuRef}>
              <button onClick={() => setShowImportMenu(!showImportMenu)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all active:scale-95 shadow-sm group">
                <FileUp size={14} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                Actions & Imports
                <ChevronDown size={14} className={`transition-transform duration-300 ${showImportMenu ? 'rotate-180' : ''}`} />
              </button>
              
              <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" className="hidden" />

              {showImportMenu && (
                <div className="absolute right-0 sm:left-0 mt-2 w-64 bg-white border border-slate-100 rounded-xl shadow-xl z-[100] overflow-hidden animate-in zoom-in-95 origin-top-left">
                  <button onClick={handleDownloadTemplate} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-semibold text-slate-600 hover:bg-indigo-50/50 transition-colors border-b border-slate-50 text-left">
                    <FileSpreadsheet size={16} className="text-indigo-500" /> Download Template
                  </button>
                  <button 
                    onClick={() => { 
                      fileInputRef.current?.click(); 
                      setShowImportMenu(false); 
                    }} 
                    className="w-full flex items-center gap-3 px-5 py-4 text-xs font-semibold text-slate-600 hover:bg-emerald-50/50 transition-colors text-left"
                  >
                    <FileUp size={16} className="text-emerald-500" /> Upload Excel File
                  </button>
                </div>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-xl h-fit shadow-inner">
              <button onClick={() => setActiveTab('form')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${activeTab === 'form' ? 'bg-white text-indigo-600 shadow-sm translate-y-[-1px]' : 'text-slate-500 hover:text-slate-800'}`}><ClipboardList size={14} /> Request Form</button>
              <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm translate-y-[-1px]' : 'text-slate-500 hover:text-slate-800'}`}><History size={14} /> History</button>
            </div>
          </div>
        </PageHeader>

        {/* === TAB CONTENTS === */}
        {activeTab === 'form' ? (
          <AnimatedWrapper delay="500" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left Column (Search & Outlet Selection) */}
            <div className="lg:col-span-4 space-y-5">
              
              {/* Product Discovery Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 relative z-[60] group !overflow-visible">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-4">Discovery</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" placeholder="Search products..." className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-300 transition-all text-sm font-semibold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  
                  {/* Dynamic Search Results Dropdown */}
                  {searchTerm.length > 0 && (
                    <div className="absolute z-[100] w-full bg-white border border-slate-100 shadow-2xl mt-2 rounded-xl overflow-hidden animate-in zoom-in-95 duration-200">
                      {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5).map((p: any) => (
                        <div key={p.id} onClick={() => addToCart(p)} className="p-4 hover:bg-indigo-50/50 cursor-pointer flex justify-between items-center transition-colors border-b border-slate-50 last:border-0 group/item">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tighter">{p.itemGroup?.name || 'General'}</p>
                          </div>
                          <Plus size={16} className="text-slate-300 group-hover/item:text-indigo-600 transition-colors" />
                        </div>
                      ))}
                      <div onClick={() => addToCart()} className="p-4 bg-indigo-50/30 text-indigo-600 cursor-pointer hover:bg-indigo-50 flex justify-between items-center transition-colors border-t border-indigo-100/50">
                        <p className="text-xs font-semibold italic">Add Unknown Item Manually</p>
                        <Plus size={16} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Outlet Destination Card */}
              <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative z-[10] overflow-hidden group">
                <div className="absolute bottom-0 right-0 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none"><Building2 size={140}/></div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-4">Destination</label>
                <div className="relative">
                  <select required value={selectedOutletId} onChange={(e) => setSelectedOutletId(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-white/20 transition-all appearance-none cursor-pointer relative z-10">
                    <option value="" className="text-slate-900">Choose Origin Outlet...</option>
                    {outlets.map(o => <option key={o.id} value={o.id} className="text-slate-900">{o.name.toUpperCase()}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none z-20" size={16} />
                </div>
              </div>
            </div>

            {/* Right Column (Draft Cart Table) */}
            <div className="lg:col-span-8">
              <BentoCard noPadding className="flex flex-col h-full min-h-[500px]">
                
                {/* Cart Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2.5 rounded-lg text-indigo-600 shadow-sm"><ShoppingCart size={16}/></div>
                    <div>
                      <h3 className="text-lg font-light text-slate-900 tracking-tight">Draft <span className="font-semibold">Request</span></h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.1em]">Total queuing: {cart.length} items</p>
                    </div>
                  </div>
                  {cart.length > 0 && <button onClick={() => { setCart([]); setSelectedOutletId(''); }} className="text-[10px] font-semibold text-rose-400 hover:text-rose-600 uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all hover:bg-rose-50 border border-transparent hover:border-rose-100">Clear Queue</button>}
                </div>

                {/* Cart Body */}
                <div className="flex-grow overflow-auto px-4 py-4 md:px-6 md:py-6">
                  {cart.length > 0 ? (
                    <table className="w-full border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-slate-400 text-left text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
                          <th className="px-4 pb-2">Information</th>
                          <th className="px-3 pb-2 text-center w-28">Quantity</th>
                          <th className="px-4 pb-2 text-right">Notes</th>
                          <th className="px-3 pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item, idx) => {
                          const isUnknown = !item.productId;
                          return (
                            <tr key={idx} className={`group transition-all duration-300 ${isUnknown ? 'bg-rose-50/30' : 'bg-slate-50/50 hover:bg-white hover:shadow-md hover:translate-y-[-1px]'}`}>
                              <td className={`px-4 py-4 rounded-l-lg border-y border-l transition-colors ${isUnknown ? 'border-rose-100' : 'border-slate-100 group-hover:border-indigo-100'}`}>
                                <div className="space-y-3">
                                  {isUnknown ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-1.5 text-rose-500 mb-1 font-semibold text-[9px] uppercase tracking-widest"><AlertCircle size={12} className="animate-pulse" /> Unknown Item</div>
                                      <div className="relative">
                                        <div className="flex items-center bg-white border border-rose-100 rounded-lg px-3 py-2 shadow-sm focus-within:border-rose-400 transition-all"><Search size={14} className="text-slate-300 mr-2" /><input className="flex-1 text-xs font-semibold outline-none bg-transparent" value={item.name} placeholder="Manual input..." onChange={(e) => { const n=[...cart]; n[idx].name=e.target.value; setCart(n); }} /></div>
                                        {item.name.length > 1 && (
                                          <div className="absolute z-50 w-full bg-white border border-slate-100 shadow-xl mt-1.5 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                                            {products.filter(p => p.name.toLowerCase().includes(item.name.toLowerCase())).map(p => (<div key={p.id} onClick={() => { const n=[...cart]; n[idx] = { ...n[idx], productId: p.id, name: p.name, itemGroupId: p.itemGroupId, itemGroupName: p.itemGroup?.name, uom: p.uom, isNew: false }; setCart(n); }} className="p-2.5 text-xs font-semibold hover:bg-indigo-50 cursor-pointer flex justify-between border-b border-slate-50 text-slate-600"><span>{p.name}</span><span className="text-indigo-600 uppercase text-[9px]">Connect</span></div>))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col"><p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{item.name}</p><p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">{item.itemGroupName || 'General'}</p></div>
                                  )}
                                  <div className="flex gap-2">
                                    <select disabled={!item.isNew} className={`text-[9px] font-semibold px-2 py-1 rounded border-none outline-none appearance-none transition-all ${item.isNew ? 'bg-slate-900 text-white cursor-pointer' : 'bg-slate-200/50 text-slate-400'}`} value={item.itemGroupId} onChange={(e) => { const selectedId = e.target.value; const n = [...cart]; n[idx].itemGroupId = selectedId; n[idx].itemGroupName = itemGroups.find(g => g.id === selectedId)?.name; setCart(n); }}><option value="">CATEGORY</option>{itemGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                                    <select disabled={!item.isNew} className={`text-[9px] font-semibold px-2 py-1 rounded border-none outline-none appearance-none transition-all ${item.isNew ? 'bg-indigo-100 text-indigo-700 cursor-pointer' : 'bg-slate-200/50 text-slate-400'}`} value={item.uom} onChange={(e) => { const n=[...cart]; n[idx].uom=e.target.value; setCart(n); }}>{['PCS', 'PACK', 'BTL', 'KG', 'CAN', 'GR', 'ML', 'LTR'].map(u => <option key={u} value={u}>{u}</option>)}</select>
                                  </div>
                                </div>
                              </td>
                              <td className={`px-3 py-4 text-center border-y transition-colors ${isUnknown ? 'border-rose-100' : 'border-slate-100 group-hover:border-indigo-100'}`}><input type="number" className="w-20 p-2.5 bg-white border border-slate-100 rounded-lg text-center font-semibold text-indigo-600 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm" value={item.quantity} onChange={(e) => { const n=[...cart]; n[idx].quantity=Number(e.target.value); setCart(n); }} /></td>
                              <td className={`px-4 py-4 border-y transition-colors ${isUnknown ? 'border-rose-100' : 'border-slate-100 group-hover:border-indigo-100'}`}><input placeholder="Notes..." className="w-full p-2.5 bg-white border border-slate-100 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300 shadow-sm text-slate-600 placeholder:text-slate-300" value={item.notes} onChange={(e) => { const n=[...cart]; n[idx].notes=e.target.value; setCart(n); }} /></td>
                              <td className={`px-3 py-4 text-right rounded-r-lg border-y border-r transition-colors ${isUnknown ? 'border-rose-100' : 'border-slate-100 group-hover:border-indigo-100'}`}><button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 duration-300"><X size={16}/></button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-10 opacity-70">
                      <div className="relative mb-4"><div className="absolute inset-0 bg-indigo-50 rounded-full blur-xl"></div><ShoppingCart size={48} className="text-indigo-200 relative" /></div>
                      <p className="text-slate-400 font-semibold tracking-[0.2em] uppercase text-[10px] text-center">Your draft list is currently empty</p>
                    </div>
                  )}
                </div>

                {/* Submit Action Footer */}
                <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                  <button onClick={handleSendRequest} disabled={loading || cart.length === 0} className={`w-full py-4 rounded-xl font-semibold text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:translate-y-0 translate-y-[-1px] ${cart.length > 0 ? 'bg-slate-900 text-white hover:bg-indigo-600 hover:shadow-indigo-500/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                    {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'Complete & Send Request'}
                  </button>
                </div>
              </BentoCard>
            </div>
          </AnimatedWrapper>
        ) : (
          
          /* === HISTORY TAB === */
          <AnimatedWrapper delay="500" className="space-y-5">
            
            {/* Filters Section */}
            <BentoCard className="flex flex-wrap gap-5 items-end relative !overflow-visible">
               <div className="flex-grow min-w-[250px]">
                 <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2 ml-1">Universal Search</label>
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                   <input className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300" placeholder="Search item or status..." value={filters.searchTerm} onChange={e => setFilters({...filters, searchTerm: e.target.value})}/>
                 </div>
               </div>
               <div className="flex flex-wrap gap-3 items-end">
                 <div className="w-40">
                   <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2 ml-1">Status Filter</label>
                   <select className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold outline-none cursor-pointer focus:bg-white transition-all" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                     <option value="ALL">All Status</option><option value="PENDING">Pending</option><option value="PROCESSED">Processed</option><option value="RECEIVED">Received</option>
                   </select>
                 </div>
                 <div className="flex gap-2">
                    <div className="w-36"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2 ml-1 flex items-center gap-1"><Calendar size={12}/> Range</label><input type="date" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] outline-none focus:bg-white transition-all text-slate-600 font-medium" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})}/></div>
                    <div className="w-36 self-end"><input type="date" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] outline-none focus:bg-white transition-all text-slate-600 font-medium" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})}/></div>
                 </div>
                 <button onClick={clearFilters} className="bg-rose-50 text-rose-500 p-2.5 rounded-lg hover:bg-rose-100 transition-all border border-rose-100 active:scale-95 shadow-sm"><FilterX size={16}/></button>
               </div>
            </BentoCard>

            {/* History Table Section */}
            <BentoCard noPadding>
               <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                  <div className="flex items-center gap-3"><div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><History size={16}/></div><h3 className="text-lg font-light text-slate-900 tracking-tight">Request <span className="font-semibold text-indigo-600">Archive</span></h3></div>
                  <div className="flex gap-2 relative" ref={exportMenuRef}>
                    <button onClick={fetchHistory} className="p-2.5 hover:bg-slate-50 rounded-lg transition-all border border-slate-100 text-slate-400 hover:text-indigo-600"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/></button>
                    <button onClick={() => setShowExportMenu(!showExportMenu)} className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2 shadow-md hover:bg-indigo-600 transition-all active:scale-95"><Download size={14}/> Export <ChevronDown size={12} className={showExportMenu ? 'rotate-180 transition-transform' : 'transition-transform'}/></button>
                    
                    {showExportMenu && (
                      <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-slate-100 rounded-xl shadow-xl z-[100] overflow-hidden animate-in zoom-in-95 origin-top-right">
                        <button onClick={exportToExcel} className="w-full px-4 py-3 text-left text-[11px] font-semibold hover:bg-emerald-50 flex items-center gap-3 text-slate-700 transition-colors border-b border-slate-50 uppercase tracking-wider"><TableIcon size={14} className="text-emerald-500" /> Excel Format</button>
                        <button onClick={exportToPDF} className="w-full px-4 py-3 text-left text-[11px] font-semibold hover:bg-rose-50 flex items-center gap-3 text-slate-700 transition-colors uppercase tracking-wider"><FileText size={14} className="text-rose-500" /> PDF Document</button>
                      </div>
                    )}
                  </div>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-separate border-spacing-y-2 px-4 pb-4 pt-2">
                   <thead><tr className="text-slate-400 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80"><th className="px-4 pb-2">Timestamp</th><th className="px-4 pb-2">Item & Destination</th><th className="px-4 pb-2 text-center whitespace-nowrap">Req / Rec</th><th className="px-4 pb-2 text-center">Status</th><th className="px-4 pb-2 text-center">No. SJ</th><th className="px-4 pb-2 text-right">Notes</th></tr></thead>
                   <tbody>
                     {loading ? (<tr><td colSpan={5} className="py-20 text-center"><div className="flex flex-col items-center"><Loader2 className="animate-spin text-indigo-400 mb-3" size={32}/><p className="text-[10px] font-semibold text-slate-300 uppercase tracking-[0.2em]">Syncing Archives...</p></div></td></tr>) : 
                     filteredHistory.length > 0 ? filteredHistory.map((item: any) => (
                       <tr key={item.id} className="bg-white hover:bg-slate-50/80 transition-all border-y border-slate-100 group hover:shadow-sm">
                         <td className="px-4 py-3.5 rounded-l-lg border-l border-y border-slate-100 group-hover:border-indigo-100 transition-colors"><div className="flex flex-col space-y-0.5"><span className="text-slate-800 font-semibold text-[11px]">{new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span><span className="text-[9px] text-slate-400 flex items-center gap-1 font-semibold"><Clock size={10} /> {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div></td>
                         <td className="px-4 py-3.5 border-y border-slate-100 group-hover:border-indigo-100 transition-colors"><div className="flex flex-col"><p className="font-semibold text-slate-800 text-xs leading-tight">{item.product?.name || item.tempProductName}</p><div className="flex items-center gap-1.5 mt-1"><span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-widest">{item.purchaseRequest?.outlet?.name || 'CENTRAL'}</span><span className="text-[8px] font-semibold text-slate-400 uppercase">SKU: {item.product?.sku || '-'}</span></div></div></td>
                         <td className="px-4 py-3.5 text-center border-y border-slate-100 group-hover:border-indigo-100 transition-colors"><div className="flex flex-col items-center"><span className="font-bold text-slate-800 text-sm">{item.quantity}</span><div className={`text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded ${item.receivedQuantity > 0 ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}>REC: {item.receivedQuantity || 0}</div></div></td>
                         <td className="px-4 py-3.5 text-center border-y border-slate-100 group-hover:border-indigo-100 transition-colors"><span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-[8px] font-bold uppercase border tracking-widest ${getStatusStyle(item.status)}`}>{getStatusIcon(item.status)} {item.status}</span></td>
                         <td className="px-4 py-3.5 text-center border-y border-slate-100 group-hover:border-indigo-100 transition-colors"><p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{item.purchasingItems?.[0]?.purchasing?.referenceNo || '-'}</p></td>
                         <td className="px-4 py-3.5 text-right rounded-r-lg border-r border-y border-slate-100 group-hover:border-indigo-100 transition-colors"><p className="text-[10px] text-slate-400 italic truncate max-w-[120px] ml-auto font-medium">{item.notes || '-'}</p></td>
                       </tr>
                     )) : (<tr><td colSpan={5} className="py-20"><EmptyState icon={<History size={40}/>} title="No matching history found" /></td></tr>)}
                   </tbody>
                 </table>
               </div>
            </BentoCard>
          </AnimatedWrapper>
        )}
      </div>

      {/* ===================================================================================
         MODAL: SYNC CONFLICTS
         Displays Excel import suggestions when confidence score is in the grey area.
      =================================================================================== */}
      {importSuggestions.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-8 border-b border-slate-50 bg-indigo-50/30 text-center">
              <div className="flex items-center justify-center gap-3 text-indigo-600 mb-2"><RefreshCw size={24} className="animate-spin-slow" /><h2 className="text-xl font-light tracking-tight text-slate-900">Sync <span className="font-semibold">Conflicts</span></h2></div>
              <p className="text-xs text-slate-500 font-medium">Similar items detected in inventory. Please link them.</p>
            </div>
            
            <div className="max-h-[350px] overflow-y-auto p-6 space-y-3 bg-slate-50/50">
              {importSuggestions.map((item, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 hover:border-indigo-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div><span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Spreadsheet Record</span><p className="text-xs font-semibold text-slate-800">{item.name}</p></div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest block mb-2 px-2 py-0.5 bg-indigo-50 rounded border border-indigo-100">Match {item.score}%</span>
                      <button 
                        onClick={() => { 
                          const linkedItem = { productId: item.suggestion.id, name: item.suggestion.name, itemGroupId: item.suggestion.itemGroupId, itemGroupName: item.suggestion.itemGroup?.name, uom: item.suggestion.uom || item.uom, quantity: item.quantity, notes: item.notes, isNew: false }; 
                          setCart(prev => [...prev, linkedItem]); 
                          setImportSuggestions(prev => prev.filter((_, i) => i !== idx)); 
                          if(importSuggestions.length === 1) showNotif("Item successfully linked"); 
                        }} 
                        className="bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-md hover:bg-slate-900 transition-all active:scale-95"
                      >
                        Use Connect
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-5 bg-white border-t border-slate-100">
              <button onClick={() => { const manualItems = importSuggestions.map(s => ({...s, productId: null, isNew: true})); setCart(prev => [...prev, ...manualItems]); setImportSuggestions([]); }} className="w-full py-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-slate-800 transition-colors hover:bg-slate-50 rounded-lg">Ignore & Add as New</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}