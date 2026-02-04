/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { 
  FileDown, 
  Calendar, 
  Filter, 
  Building2,
  Loader2,
  RotateCcw,
  Tag
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function IncomingGoodsReport() {
  const [data, setData] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter States
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchOutlets();
    fetchReport();
  }, []);

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
    const excelData = data.map((item, index) => ({
      'NO.': index + 1,
      'NO. SURAT JALAN': '-', 
      'NAMA SUPPLIER': item.purchasing?.supplier?.name || '-',
      'SKU': item.product?.sku || '-',
      'NAMA ITEM': item.product?.name || item.name,
      'ITEM GROUP': item.product?.itemGroup?.name || '-',
      'MAJOR GROUP': item.product?.itemGroup?.majorGroup || '-',
      'TANGGAL RECEIVED': new Date(item.updatedAt).toLocaleDateString('id-ID'),
      'UOM': item.uom || '-',
      'QTY RECEIVED': item.quantity,
      'NAMA OUTLET': item.purchasing?.outlet?.name || '-',
      'NOTES': item.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Barang Masuk");
    XLSX.writeFile(wb, `Report_Barang_Masuk_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">Incoming Goods Report</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Laporan rekapitulasi barang masuk ke outlet.</p>
        </div>
        
        <button 
          onClick={exportToExcel}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-emerald-100 active:scale-95"
        >
          <FileDown size={18} /> Export Excel
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8 flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Filter Outlet</label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              className="pl-11 pr-8 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all appearance-none"
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
            >
              <option value="">Semua Outlet</option>
              {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Range Tanggal</label>
          <div className="flex items-center gap-3">
            <input 
              type="date" 
              className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all cursor-pointer"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-300">s/d</span>
            <input 
              type="date" 
              className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all cursor-pointer"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchReport}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-sm"
          >
            <Filter size={16} /> Terapkan
          </button>
          
          <button 
            onClick={clearFilters}
            className="bg-slate-100 text-slate-500 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all flex items-center gap-2"
            title="Clear All Filters"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
            <p className="text-sm font-medium text-slate-400">Menyusun laporan...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">No. SJ</th>
                  <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Item Details</th>
                  <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Groups</th>
                  <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Received Qty</th>
                  <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Outlet</th>
                  <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.length > 0 ? (
                  data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-5 text-xs text-slate-400 font-medium italic">-</td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-slate-700">{item.purchasing?.supplier?.name}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tight">
                            {item.product?.sku || 'NO-SKU'}
                          </span>
                          <span className="text-sm font-medium text-slate-700">
                            {item.product?.name || item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <Tag size={10} className="text-slate-400" />
                            <span className="text-[11px] font-semibold text-slate-600">
                              {item.product?.itemGroup?.name || '-'}
                            </span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase ml-4">
                            {item.product?.itemGroup?.majorGroup || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                          <span className="text-sm font-bold">{item.quantity}</span>
                          <span className="text-[10px] font-semibold uppercase opacity-70 border-l border-indigo-200 pl-1.5 ml-0.5">
                            {item.uom}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-slate-400" />
                          <span className="text-xs font-semibold text-slate-500">
                            {new Date(item.updatedAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-tight">
                          {item.purchasing?.outlet?.name}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-xs text-slate-500 max-w-[180px] truncate font-medium">
                        {item.notes || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center text-slate-400 text-sm font-medium">
                      Tidak ada data barang masuk untuk kriteria ini.
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