/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useMemo } from 'react';
import { 
  FileDown, 
  Calendar, 
  Filter, 
  Building2,
  Loader2,
  RotateCcw,
  ClipboardList,
  History,
  Calculator,
  ChevronDown,
  ChevronUp,
  Search,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { fetchApi } from '../../../utils/api'; 

export default function IncomingGoodsReport() {
  // --- STATE MANAGEMENT ---
  const [data, setData] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'detail'>('summary');
  
  // States Filter API
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // States Filter Lokal (Real-time Frontend)
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchSj, setSearchSj] = useState('');
  const [searchItem, setSearchItem] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  
  // States Dropdown Autocomplete
  const [focusSupplier, setFocusSupplier] = useState(false);
  const [focusSj, setFocusSj] = useState(false);
  const [focusItem, setFocusItem] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  // --- AKHIR STATE MANAGEMENT ---

  // --- FETCH DATA (API CALLS) ---
  const fetchReport = async (overrideOutlet?: string, overrideStart?: string, overrideEnd?: string) => {
    setLoading(true);
    try {
      const outletId = overrideOutlet !== undefined ? overrideOutlet : selectedOutlet;
      const start = overrideStart !== undefined ? overrideStart : startDate;
      const end = overrideEnd !== undefined ? overrideEnd : endDate;

      const params = new URLSearchParams();
      if (outletId) params.append('outletId', outletId);
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const res = await fetchApi(`/purchasing/report/incoming?${params.toString()}`);
      const result = await res.json();
      
      const dataArray = Array.isArray(result) ? result : (result.data || []);
      setData(dataArray);
      
    } catch (err) {
      toast.error("Koneksi gagal saat memuat laporan");
      setData([]); 
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  const fetchOutlets = async () => {
    try {
      const res = await fetchApi('/outlet');
      const d = await res.json();
      setOutlets(Array.isArray(d) ? d : (d.data || []));
    } catch (err) {
      setOutlets([]);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    let initialOutlet = '';
    
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      
      if (user.role === 'ADMINOUTLET') {
        initialOutlet = user.outletId;
        setSelectedOutlet(user.outletId);
      }
    }

    fetchOutlets();
    fetchReport(initialOutlet, '', '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 
  // --- AKHIR FETCH DATA ---


  // --- DATA TRANSFORMATION & AUTOCOMPLETE EXTRACTION ---
  
  // Mengekstrak daftar unik untuk Autocomplete Dropdown
  const uniqueSuppliers = useMemo(() => Array.from(new Set(data.map(item => item.purchasing?.supplier?.name).filter(Boolean))) as string[], [data]);
  const uniqueSjs = useMemo(() => Array.from(new Set(data.map(item => item.purchasing?.referenceNo).filter(Boolean))) as string[], [data]);
  const uniqueItems = useMemo(() => Array.from(new Set(data.map(item => item.product?.name || item.name).filter(Boolean))) as string[], [data]);

  // 1. Terapkan Filter Lokal (Supplier, SJ, Nama Barang)
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const supplierName = item.purchasing?.supplier?.name || '';
      const sj = item.purchasing?.referenceNo || '';
      const itemName = item.product?.name || item.name || '';
      
      const matchSupplier = searchSupplier === '' || supplierName.toLowerCase().includes(searchSupplier.toLowerCase());
      const matchSj = searchSj === '' || sj.toLowerCase().includes(searchSj.toLowerCase());
      const matchItem = searchItem === '' || itemName.toLowerCase().includes(searchItem.toLowerCase());
      
      return matchSupplier && matchSj && matchItem;
    });
  }, [data, searchSupplier, searchSj, searchItem]);

  // 2. Akumulasi untuk Tab Summary
  const summaryData = useMemo(() => {
    const summary = filteredData.reduce((acc: any, item: any) => {
      const productName = item.product?.name || item.name;
      const sku = item.product?.sku || 'NO-SKU';
      
      const key = selectedOutlet 
        ? `${sku}-${productName}-${item.purchasing?.outletId}` 
        : `${sku}-${productName}`;

      if (!acc[key]) {
        acc[key] = {
          ...item, 
          quantity: 0,
          displayOutletName: selectedOutlet 
            ? (item.purchasing?.outlet?.name || 'Unknown') 
            : 'ALL OUTLET'
        };
      }
      acc[key].quantity += Number(item.receivedQuantity) || 0; 
      return acc;
    }, {});

    return Object.values(summary).sort((a: any, b: any) => b.quantity - a.quantity);
  }, [filteredData, selectedOutlet]);
  // --- AKHIR DATA TRANSFORMATION ---


  // --- PERHITUNGAN TOTAL QTY OTOMATIS ---
  const totalQuantity = useMemo(() => {
    const dataToCalculate = activeTab === 'summary' ? summaryData : filteredData;
    return dataToCalculate.reduce((sum, item) => {
      const qty = activeTab === 'summary' ? item.quantity : (item.receivedQuantity || 0);
      return sum + Number(qty);
    }, 0);
  }, [activeTab, summaryData, filteredData]);
  // --- AKHIR PERHITUNGAN ---


  // --- ACTION HANDLERS ---
  const handleOutletChange = (id: string) => {
    setSelectedOutlet(id);
    fetchReport(id, startDate, endDate); 
  };

  const clearFilters = () => {
    const isOutletAdmin = currentUser?.role === 'ADMINOUTLET';
    const defaultOutlet = isOutletAdmin ? currentUser.outletId : '';
    
    if (!isOutletAdmin) setSelectedOutlet('');
    setStartDate('');
    setEndDate('');
    setSearchSupplier('');
    setSearchSj('');
    setSearchItem('');
    
    fetchReport(defaultOutlet, '', '');
  };

  const exportToExcel = () => {
    const dataToExport = activeTab === 'summary' ? summaryData : filteredData;
    const excelData = dataToExport.map((item: any, index: number) => ({
      'NO.': index + 1,
      'SKU': item.product?.sku || '-',
      'NAMA ITEM': item.product?.name || item.name,
      'ITEM GROUP': item.product?.itemGroup?.name || '-',
      'UOM': item.uom || '-',
      'TOTAL QTY': activeTab === 'summary' ? item.quantity : (item.receivedQuantity || 0),
      'NAMA OUTLET': activeTab === 'summary' ? item.displayOutletName : (item.purchasing?.outlet?.name || '-'),
      ...(activeTab === 'detail' && { 
        'NO. SURAT JALAN': item.purchasing?.referenceNo || '-',
        'TANGGAL RECEIVED': new Date(item.receivedDate || item.updatedAt).toLocaleDateString('id-ID'),
        'NOTES': item.notes || '-'
      })
    }));

    excelData.push({
        'NO.': '',
        'SKU': '',
        'NAMA ITEM': 'TOTAL KESELURUHAN',
        'ITEM GROUP': '',
        'UOM': '',
        'TOTAL QTY': totalQuantity,
        'NAMA OUTLET': '',
        ...(activeTab === 'detail' && { 
            'NO. SURAT JALAN': '',
            'TANGGAL RECEIVED': '',
            'NOTES': ''
        })
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab === 'summary' ? "Summary" : "Detail");
    XLSX.writeFile(wb, `Report_Incoming_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };
  // --- AKHIR ACTION HANDLERS ---


  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen space-y-6 animate-in fade-in duration-700">
      
      {/* --- HEADER & TABS --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Kiri: Judul */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Incoming Goods Report</h1>
          <p className="text-xs text-slate-500 font-medium">Laporan rekapitulasi barang masuk ke outlet.</p>
        </div>

        {/* Kanan: Aksi (Excel) dan Tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          
          <button onClick={exportToExcel} className="bg-emerald-50 text-emerald-600 px-5 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all active:scale-95 flex justify-center items-center gap-2 border border-emerald-100 w-full sm:w-auto">
            <FileDown size={16} /> Excel
          </button>
          
          <div className="hidden sm:block w-[1px] h-8 bg-slate-200" />
          
          <div className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-1 w-full sm:w-fit border border-slate-200/50 shadow-inner">
            <button 
              onClick={() => setActiveTab('summary')} 
              className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'summary' ? 'bg-white text-indigo-600 shadow-md translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
            >
              <ClipboardList size={16} /> Summary
            </button>
            <button 
              onClick={() => setActiveTab('detail')} 
              className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'detail' ? 'bg-white text-indigo-600 shadow-md translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
            >
              <History size={16} /> Detail
            </button>
          </div>

        </div>
      </div>
      {/* --- AKHIR HEADER & TABS --- */}

      {/* --- FILTER ACCORDION SECTION --- */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm transition-all duration-500 hover:shadow-md">
        
        {/* Header Toggle Filter */}
        <div 
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className={`px-6 py-4 flex justify-between items-center cursor-pointer transition-colors ${isFilterExpanded ? 'bg-slate-50/50 rounded-t-[2rem] border-b border-slate-100' : 'bg-transparent'}`}
        >
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-indigo-600" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Filter Laporan</span>
          </div>
          <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200">
            {isFilterExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
          </div>
        </div>

        {/* Isi Filter yang Expandable */}
        <div className={`transition-all duration-500 ${isFilterExpanded ? 'max-h-[1000px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          <div className="p-5 flex flex-col gap-4">
            
            {/* --- BARIS 1: Outlet, Supplier, SJ, Tombol Aksi --- */}
            <div className="flex flex-wrap lg:flex-nowrap items-start gap-4">
              
              <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Outlet</label>
                <div className="relative group">
                  <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${currentUser?.role === 'ADMINOUTLET' ? 'text-slate-300' : 'text-slate-400 group-hover:text-indigo-500'}`} size={14} />
                  <select 
                    className={`w-full pl-10 pr-8 py-2 border rounded-xl text-sm font-medium outline-none transition-all appearance-none ${
                      currentUser?.role === 'ADMINOUTLET' 
                      ? 'bg-slate-100 border-transparent text-slate-500 cursor-not-allowed opacity-80' 
                      : 'bg-slate-50 border-slate-100 cursor-pointer focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200'
                    }`}
                    value={selectedOutlet}
                    onChange={(e) => handleOutletChange(e.target.value)}
                    disabled={currentUser?.role === 'ADMINOUTLET'}
                  >
                    {currentUser?.role !== 'ADMINOUTLET' && <option value="">Semua Outlet</option>}
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Autocomplete Input: Supplier */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Supplier / Vendor</label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" size={14} />
                  <input 
                    type="text" 
                    placeholder="Ketik nama supplier..." 
                    value={searchSupplier} 
                    onChange={(e) => setSearchSupplier(e.target.value)} 
                    onFocus={() => setFocusSupplier(true)}
                    onBlur={() => setTimeout(() => setFocusSupplier(false), 200)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-100 rounded-xl text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all" 
                  />
                  {focusSupplier && uniqueSuppliers.filter(s => s.toLowerCase().includes(searchSupplier.toLowerCase())).length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-xl z-[100] max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                      {uniqueSuppliers.filter(s => s.toLowerCase().includes(searchSupplier.toLowerCase())).map((s, i) => (
                        <div 
                          key={i} 
                          className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer border-b border-slate-50 last:border-0 transition-colors" 
                          onClick={() => { setSearchSupplier(s); setFocusSupplier(false); }}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Autocomplete Input: Surat Jalan */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Surat Jalan</label>
                <div className="relative group">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" size={14} />
                  <input 
                    type="text" 
                    placeholder="Ketik No. SJ..." 
                    value={searchSj} 
                    onChange={(e) => setSearchSj(e.target.value)} 
                    onFocus={() => setFocusSj(true)}
                    onBlur={() => setTimeout(() => setFocusSj(false), 200)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-100 rounded-xl text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all" 
                  />
                  {focusSj && uniqueSjs.filter(s => s.toLowerCase().includes(searchSj.toLowerCase())).length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-xl z-[100] max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                      {uniqueSjs.filter(s => s.toLowerCase().includes(searchSj.toLowerCase())).map((s, i) => (
                        <div 
                          key={i} 
                          className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer border-b border-slate-50 last:border-0 transition-colors" 
                          onClick={() => { setSearchSj(s); setFocusSj(false); }}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tombol Aksi di Paling Kanan Baris 1 */}
              <div className="flex items-center gap-2 ml-auto shrink-0 pt-6">
                <button onClick={() => fetchReport(selectedOutlet, startDate, endDate)} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-indigo-600 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-slate-200">
                  <Filter size={16} /> Filter
                </button>
                <button onClick={clearFilters} className="bg-slate-100 text-slate-500 px-3 py-2 rounded-xl hover:bg-slate-200 transition-all active:rotate-180 duration-500" title="Reset Filter">
                  <RotateCcw size={16} />
                </button>
              </div>

            </div>
            
            {/* --- BARIS 2: Item Name, Range Tanggal --- */}
            <div className="flex flex-wrap lg:flex-nowrap items-start gap-4 mt-2">
              
              {/* Autocomplete Input: Item Name */}
              <div className="flex flex-col gap-1.5 flex-1 lg:max-w-[calc(33.333%-0.7rem)]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Item Name</label>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" size={14} />
                  <input 
                    type="text" 
                    placeholder="Ketik nama item / produk..." 
                    value={searchItem} 
                    onChange={(e) => setSearchItem(e.target.value)} 
                    onFocus={() => setFocusItem(true)}
                    onBlur={() => setTimeout(() => setFocusItem(false), 200)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-100 rounded-xl text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all" 
                  />
                  {focusItem && uniqueItems.filter(i => i.toLowerCase().includes(searchItem.toLowerCase())).length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-xl z-[100] max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                      {uniqueItems.filter(i => i.toLowerCase().includes(searchItem.toLowerCase())).map((itm, i) => (
                        <div 
                          key={i} 
                          className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer border-b border-slate-50 last:border-0 transition-colors" 
                          onClick={() => { setSearchItem(itm); setFocusItem(false); }}
                        >
                          {itm}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Range Tanggal */}
              <div className="flex flex-col gap-1.5 flex-1 lg:max-w-[calc(66.666%-0.7rem)]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Periode Tanggal (Hanya API)</label>
                <div className="flex items-center gap-2">
                  <div className="relative group w-full md:w-auto">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" size={14} />
                    <input type="date" className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <span className="text-slate-300 font-bold">-</span>
                  <div className="relative group w-full md:w-auto">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" size={14} />
                    <input type="date" className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
      {/* --- AKHIR FILTER ACCORDION SECTION --- */}

      {/* --- MAIN TABLE SECTION --- */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-500">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 animate-pulse">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
            <p className="text-sm font-medium text-slate-400">Menyiapkan laporan...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              
              {/* Table Header */}
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. SJ</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Details</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Total Qty</th>
                  {activeTab === 'detail' && <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>}
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outlet</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              
              {/* Table Body */}
              <tbody className="divide-y divide-slate-50">
                {(activeTab === 'summary' ? summaryData : filteredData).length > 0 ? (
                  <>
                      {(activeTab === 'summary' ? summaryData : filteredData).map((item, idx) => (
                        <tr 
                          key={idx} 
                          className="hover:bg-slate-50/50 transition-all duration-200 group text-sm animate-in fade-in slide-in-from-bottom-1"
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <td className="px-6 py-3 text-sm font-medium text-slate-700">
                            {activeTab === 'summary' ? '-' : (item.purchasing?.referenceNo || '-')}
                          </td>
                          <td className="px-6 py-3 font-medium text-slate-700">
                             {activeTab === 'summary' ? (
                               <span className="text-slate-400 italic">Mixed Suppliers</span>
                             ) : (
                               item.purchasing?.supplier?.name || '-'
                             )}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col group-hover:translate-x-1 transition-transform">
                              <span className="text-[10px] font-semibold text-indigo-500 uppercase">{item.product?.sku || 'NO-SKU'}</span>
                              <span className="font-medium text-slate-700">{item.product?.name || item.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-bold transition-all group-hover:bg-indigo-600 group-hover:text-white">
                              {activeTab === 'summary' ? item.quantity : (item.receivedQuantity || 0)} 
                              <span className="text-[10px] opacity-70 uppercase font-semibold border-l border-indigo-200 group-hover:border-indigo-400 pl-1.5 ml-1">{item.uom}</span>
                            </div>
                          </td>
                          {activeTab === 'detail' && (
                            <td className="px-6 py-3 text-slate-500 font-medium">
                              {new Date(item.receivedDate || item.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                          )}
                          <td className="px-6 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded-md uppercase border transition-all ${
                              selectedOutlet || activeTab === 'summary' 
                              ? 'text-indigo-600 bg-indigo-50 border-indigo-100 group-hover:bg-indigo-100' 
                              : 'text-slate-400 bg-slate-100 border-transparent'
                            }`}>
                              {activeTab === 'summary' ? item.displayOutletName : (item.purchasing?.outlet?.name || '-')}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs text-slate-400 font-medium truncate max-w-[150px]">
                            {activeTab === 'summary' ? '-' : (item.notes || '-')}
                          </td>
                        </tr>
                      ))}
                      
                      {/* --- BARIS TOTAL KALKULASI OTOMATIS --- */}
                      <tr className="bg-indigo-50/50 border-t-2 border-indigo-100">
                          <td colSpan={3} className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 text-indigo-600">
                                  <Calculator size={16} />
                                  <span className="text-xs font-bold uppercase tracking-widest">Total Qty Seluruh Item</span>
                              </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                              <div className="inline-flex items-center justify-center px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-black text-sm shadow-md">
                                  {totalQuantity}
                              </div>
                          </td>
                          {activeTab === 'detail' && <td></td>}
                          <td></td>
                          <td></td>
                      </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={activeTab === 'detail' ? 7 : 6} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center opacity-20 animate-bounce">
                        <ClipboardList size={48} className="mb-2" />
                        <p className="text-sm font-semibold">Tidak ada data ditemukan</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* --- AKHIR MAIN TABLE SECTION --- */}
      
    </div>
  );
}