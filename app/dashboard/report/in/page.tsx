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
  Tag,
  ClipboardList,
  History
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function IncomingGoodsReport() {
  const [data, setData] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'detail'>('summary');
  
  // Filter States
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchOutlets();
    fetchReport();
  }, []);

  // --- LOGIKA SUMMARY (AGREGASI DATA) ---
  const summaryData = useMemo(() => {
    const summary = data.reduce((acc: any, item: any) => {
      const productName = item.product?.name || item.name;
      const sku = item.product?.sku || 'NO-SKU';
      
      // Key hanya berdasarkan SKU, Nama, dan Outlet (Supplier diabaikan agar Qty menyatu)
      const key = `${sku}-${productName}`;

      if (!acc[key]) {
        acc[key] = {
          ...item, 
          quantity: 0,
          // Set supplier ke '-' atau 'Multiple' karena sudah digabung
          purchasing: {
            ...item.purchasing,
            supplier: { name: 'Multiple Suppliers' },
            referenceNo: 'Mixed'
          }
        };
      }
      acc[key].quantity += item.quantity;
      return acc;
    }, {});

    return Object.values(summary).sort((a: any, b: any) => b.quantity - a.quantity);
  }, [data]);

  const fetchOutlets = async () => {
    try {
      const res = await fetch('http://localhost:3000/outlet');
      const d = await res.json();
      setOutlets(d);
    } catch (err) {
      console.error("Gagal memuat outlet", err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        outletId: selectedOutlet,
        startDate,
        endDate
      });
      const res = await fetch(`http://localhost:3000/purchasing/report/incoming?${params}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Gagal memuat laporan", err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedOutlet('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchReport(), 100);
  };

  const exportToExcel = () => {
    const dataToExport = activeTab === 'summary' ? summaryData : data;
    const excelData = dataToExport.map((item: any, index: number) => ({
      'NO.': index + 1,
      'NO. SURAT JALAN': activeTab === 'summary' ? '-' : (item.purchasing?.referenceNo || '-'),
      'NAMA SUPPLIER': activeTab === 'summary' ? 'Multiple Suppliers' : (item.purchasing?.supplier?.name || '-'),
      'SKU': item.product?.sku || '-',
      'NAMA ITEM': item.product?.name || item.name,
      'ITEM GROUP': item.product?.itemGroup?.name || '-',
      ...(activeTab === 'detail' && { 'TANGGAL RECEIVED': new Date(item.updatedAt).toLocaleDateString('id-ID') }),
      'UOM': item.uom || '-',
      'TOTAL QTY': item.quantity,
      'NAMA OUTLET': item.purchasing?.outlet?.name || '-',
      'NOTES': activeTab === 'summary' ? '-' : (item.notes || '-')
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab === 'summary' ? "Summary" : "Detail");
    XLSX.writeFile(wb, `Report_Incoming_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Incoming Goods Report</h1>
          <p className="text-xs text-slate-500 font-medium">Laporan rekapitulasi barang masuk ke outlet.</p>
        </div>

        <div className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-1 w-fit border border-slate-200/50">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'summary' 
                ? 'bg-white text-indigo-600 shadow-sm shadow-indigo-100' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList size={16} /> Summary
          </button>
          <button
            onClick={() => setActiveTab('detail')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'detail' 
                ? 'bg-white text-indigo-600 shadow-sm shadow-indigo-100' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History size={16} /> Detail
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap items-end gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Outlet</label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select 
              className="pl-10 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none"
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
            >
              <option value="">Semua Outlet</option>
              {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Periode</label>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-300 font-bold">-</span>
            <input 
              type="date" 
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold outline-none"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={fetchReport} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-indigo-600 transition-all flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
          <button onClick={clearFilters} className="bg-slate-100 text-slate-500 px-3 py-2 rounded-xl hover:bg-slate-200 transition-all">
            <RotateCcw size={16} />
          </button>
          <div className="w-[1px] h-8 bg-slate-100 mx-2" />
          <button onClick={exportToExcel} className="bg-emerald-50 text-emerald-600 px-5 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all flex items-center gap-2">
            <FileDown size={16} /> Excel
          </button>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
            <p className="text-sm font-medium text-slate-400">Memproses data {activeTab}...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. SJ</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Details</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Total Qty</th>
                  {activeTab === 'detail' && (
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  )}
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outlet</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(activeTab === 'summary' ? summaryData : data).length > 0 ? (
                  (activeTab === 'summary' ? summaryData : data).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors group text-sm">
                      <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                        {activeTab === 'summary' ? '-' : (item.purchasing?.referenceNo || '-')}
                      </td>
                      <td className="px-6 py-5 font-semibold text-slate-700">
                         {activeTab === 'summary' ? (
                           <span className="text-slate-400 italic font-medium">Multiple Suppliers</span>
                         ) : (
                           item.purchasing?.supplier?.name || '-'
                         )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase">
                            {item.product?.sku || 'NO-SKU'}
                          </span>
                          <span className="font-bold text-slate-700">
                            {item.product?.name || item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl font-black">
                          {item.quantity} 
                          <span className="text-[10px] opacity-70 uppercase font-bold border-l border-indigo-200 pl-1.5 ml-1">
                            {item.uom}
                          </span>
                        </div>
                      </td>
                      {activeTab === 'detail' && (
                        <td className="px-6 py-5 text-slate-500 font-bold">
                          {new Date(item.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      )}
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg uppercase">
                          {item.purchasing?.outlet?.name}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-xs text-slate-400 font-medium truncate max-w-[150px]">
                        {activeTab === 'summary' ? '-' : (item.notes || '-')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={activeTab === 'detail' ? 7 : 6} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        <ClipboardList size={48} className="mb-2" />
                        <p className="text-sm font-bold">Tidak ada data ditemukan</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}