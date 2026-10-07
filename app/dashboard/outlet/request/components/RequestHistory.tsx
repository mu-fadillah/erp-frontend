/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, History as HistoryIcon, Download, Table as TableIcon, 
  FileText, RefreshCw, ChevronDown, PackageCheck, Clock, 
  ShoppingCart, CheckCircle2, Calendar, FileCheck, FilterX, Loader2 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast'; // Tambahan utilitas global toast
import { fetchApi } from '../../../../utils/api'; // Menggunakan utilitas global API

/* --- UI COMPONENTS IMPORT --- */
import BentoCard from '@/components/ui/BentoCard';
import EmptyState from '@/components/ui/EmptyState';
import AnimatedWrapper from '@/components/ui/AnimatedWrapper';
/* --- AKHIR UI COMPONENTS IMPORT --- */

export default function RequestHistory() {
  // --- STATE MANAGEMENT ---
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', searchTerm: '', status: 'ALL', itemGroupId: 'ALL' });
  const exportMenuRef = useRef<HTMLDivElement>(null);
  // --- AKHIR STATE MANAGEMENT ---

  // --- LIFECYCLE & EVENT LISTENERS ---
  useEffect(() => {
    fetchHistory();
    
    // Menutup menu export jika klik di luar elemen
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // --- AKHIR LIFECYCLE ---

  // --- FETCH DATA (API CALLS) ---
  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Menggunakan fetchApi global
      const res = await fetchApi(`/purchasing/pr/history?t=${Date.now()}`, { 
        cache: 'no-store' 
      });
      const data = await res.json();
      
      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (err) { 
      toast.error("Gagal mengambil data riwayat request.");
      setHistoryItems([]); 
    } finally { 
      setLoading(false); 
    }
  };
  // --- AKHIR FETCH DATA ---

  // --- DATA TRANSFORMATION & FILTERING ---
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
  // --- AKHIR DATA TRANSFORMATION ---

  // --- EXPORT HANDLERS (EXCEL & PDF) ---
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
    toast.success("File Excel berhasil diunduh");
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
    toast.success("File PDF berhasil diunduh");
  };
  // --- AKHIR EXPORT HANDLERS ---

  // --- UI HELPER COMPONENTS ---
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
  // --- AKHIR UI HELPER COMPONENTS ---

  return (
    <AnimatedWrapper delay="500" className="space-y-5">
      
      {/* --- SECTION: FILTER BAR --- */}
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
              <div className="w-36">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2 ml-1 flex items-center gap-1"><Calendar size={12}/> Range</label>
                <input type="date" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] outline-none focus:bg-white transition-all text-slate-600 font-medium" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})}/>
              </div>
              <div className="w-36 self-end">
                <input type="date" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] outline-none focus:bg-white transition-all text-slate-600 font-medium" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})}/>
              </div>
           </div>
           <button onClick={() => setFilters({ startDate: '', endDate: '', searchTerm: '', status: 'ALL', itemGroupId: 'ALL' })} className="bg-rose-50 text-rose-500 p-2.5 rounded-lg hover:bg-rose-100 transition-all border border-rose-100 active:scale-95 shadow-sm"><FilterX size={16}/></button>
         </div>
      </BentoCard>
      {/* --- AKHIR SECTION: FILTER BAR --- */}

      {/* --- SECTION: TABLE HISTORY --- */}
      <BentoCard noPadding>
         
         {/* Table Header & Export Button */}
         <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><HistoryIcon size={16}/></div>
              <h3 className="text-lg font-light text-slate-900 tracking-tight">Request <span className="font-semibold text-indigo-600">Archive</span></h3>
            </div>
            <div className="flex gap-2 relative" ref={exportMenuRef}>
              <button onClick={fetchHistory} className="p-2.5 hover:bg-slate-50 rounded-lg transition-all border border-slate-100 text-slate-400 hover:text-indigo-600"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/></button>
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2 shadow-md hover:bg-indigo-600 transition-all active:scale-95"><Download size={14}/> Export <ChevronDown size={12} className={showExportMenu ? 'rotate-180 transition-transform' : 'transition-transform'}/></button>
              
              {/* Dropdown Export */}
              {showExportMenu && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-slate-100 rounded-xl shadow-xl z-[100] overflow-hidden animate-in zoom-in-95 origin-top-right">
                  <button onClick={exportToExcel} className="w-full px-4 py-3 text-left text-[11px] font-semibold hover:bg-emerald-50 flex items-center gap-3 text-slate-700 transition-colors border-b border-slate-50 uppercase tracking-wider"><TableIcon size={14} className="text-emerald-500" /> Excel Format</button>
                  <button onClick={exportToPDF} className="w-full px-4 py-3 text-left text-[11px] font-semibold hover:bg-rose-50 flex items-center gap-3 text-slate-700 transition-colors uppercase tracking-wider"><FileText size={14} className="text-rose-500" /> PDF Document</button>
                </div>
              )}
            </div>
         </div>
         
         {/* Table Content */}
         <div className="overflow-x-auto">
           <table className="w-full text-left border-separate border-spacing-y-2 px-4 pb-4 pt-2">
             <thead>
               <tr className="text-slate-400 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
                 <th className="px-4 pb-2">Timestamp</th>
                 <th className="px-4 pb-2">Item & Destination</th>
                 <th className="px-4 pb-2 text-center whitespace-nowrap">Received / Request</th>
                 <th className="px-4 pb-2 text-center">Status</th>
                 <th className="px-4 pb-2 text-center">No. SJ</th>
                 <th className="px-4 pb-2 text-right">Notes</th>
               </tr>
             </thead>
             <tbody>
               {loading ? (
                 <tr>
                   <td colSpan={6} className="py-20 text-center">
                     <div className="flex flex-col items-center">
                       <Loader2 className="animate-spin text-indigo-400 mb-3" size={32}/>
                       <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-[0.2em]">Syncing Archives...</p>
                     </div>
                   </td>
                 </tr>
               ) : filteredHistory.length > 0 ? (
                 filteredHistory.map((item: any) => (
                   <tr key={item.id} className="bg-white hover:bg-slate-50/80 transition-all border-y border-slate-100 group hover:shadow-sm">
                     <td className="px-4 py-3.5 rounded-l-lg border-l border-y border-slate-100 group-hover:border-indigo-100 transition-colors">
                       <div className="flex flex-col space-y-0.5">
                         <span className="text-slate-800 font-semibold text-[11px]">{new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                         <span className="text-[9px] text-slate-400 flex items-center gap-1 font-semibold"><Clock size={10} /> {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                     </td>
                     <td className="px-4 py-3.5 border-y border-slate-100 group-hover:border-indigo-100 transition-colors">
                       <div className="flex flex-col">
                         <p className="font-semibold text-slate-800 text-xs leading-tight">{item.product?.name || item.tempProductName}</p>
                         <div className="flex items-center gap-1.5 mt-1">
                           <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-widest">{item.purchaseRequest?.outlet?.name || 'CENTRAL'}</span>
                           <span className="text-[8px] font-semibold text-slate-400 uppercase">SKU: {item.product?.sku || '-'}</span>
                         </div>
                       </div>
                     </td>
                     <td className="px-4 py-3.5 text-center border-y border-slate-100 group-hover:border-indigo-100 transition-colors">
                       <div className="flex flex-col items-center">
                         <span className="font-bold text-slate-800 text-sm">{item.receivedQuantity}</span>
                         <div className={`text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded ${item.quantity > 0 ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}>REQ: {item.quantity || 0}</div>
                       </div>
                     </td>
                     <td className="px-4 py-3.5 text-center border-y border-slate-100 group-hover:border-indigo-100 transition-colors">
                       <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-[8px] font-bold uppercase border tracking-widest ${getStatusStyle(item.status)}`}>
                         {getStatusIcon(item.status)} {item.status}
                       </span>
                     </td>
                     <td className="px-4 py-3.5 text-center border-y border-slate-100 group-hover:border-indigo-100 transition-colors">
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{item.purchasingItems?.[0]?.purchasing?.referenceNo || '-'}</p>
                     </td>
                     <td className="px-4 py-3.5 text-right rounded-r-lg border-r border-y border-slate-100 group-hover:border-indigo-100 transition-colors">
                       <p className="text-[10px] text-slate-400 italic truncate max-w-[120px] ml-auto font-medium">{item.notes || '-'}</p>
                     </td>
                   </tr>
                 ))
               ) : (
                 <tr>
                   <td colSpan={6} className="py-20">
                     <EmptyState icon={<HistoryIcon size={40}/>} title="No matching history found" />
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </BentoCard>
      {/* --- AKHIR SECTION: TABLE HISTORY --- */}

    </AnimatedWrapper>
  );
}