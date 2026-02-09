/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Edit2, Trash2, X, LayoutGrid, Check, 
  ChevronDown, ChevronUp, Download, FileText, Table as TableIcon,
  FileUp, AlertCircle, Loader2, FileSpreadsheet, RefreshCw
} from 'lucide-react';

// Import Library
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [itemGroups, setItemGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  
  // UI States
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal & Form States
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // PERBAIKAN: Tambahkan recipeUom dan conversionRate ke formData
  const [formData, setFormData] = useState({ 
    name: '', 
    itemGroupId: '', 
    uom: 'PCS', 
    buyPrice: '',
    recipeUom: '',      // New
    conversionRate: '1' // New (as string for input handling)
  });

  // Group Edit States
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupData, setEditGroupData] = useState({ name: '', majorGroup: '' });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMajor, setFilterMajor] = useState('ALL');
  const [filterGroup, setFilterGroup] = useState('ALL');

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
      setLoading(true);
      const [prodRes, groupRes] = await Promise.all([
        fetch('http://localhost:3000/product'),
        fetch('http://localhost:3000/item-group')
      ]);
      setProducts(await prodRes.json());
      setItemGroups(await groupRes.json());
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateNextSKU = (lastSKU: string | null) => {
    const prefix = "C00";
    if (!lastSKU || !lastSKU.startsWith(prefix)) return `${prefix}0001`;
    const lastNumber = parseInt(lastSKU.replace(prefix, ''));
    const nextNumber = lastNumber + 1;
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  };

  // --- LOGIKA DOWNLOAD TEMPLATE (Updated) ---
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nama Item': 'JAGERMEISTER 700ML',
        'Group': 'LIQUOR',
        'Harga': 500000,
        'Satuan': 'BTL',
        'Stok Awal': 10,
        'Satuan Resep': 'ML',
        'Isi per Satuan': 700
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template_Import");
    XLSX.writeFile(workbook, "Template_Import_Inventory.xlsx");
  };

  // --- LOGIKA IMPORT EXCEL (Updated) ---
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) return alert("File Excel kosong!");

        let currentLastSKU = products.length > 0 
          ? [...products].sort((a, b) => b.sku.localeCompare(a.sku))[0].sku 
          : "C000000";

        const formattedPayload = data.map((row: any) => {
          const newSKU = generateNextSKU(currentLastSKU);
          currentLastSKU = newSKU;
          const group = itemGroups.find(g => g.name.toLowerCase() === (row['Group'] || '').toLowerCase());

          return {
            sku: newSKU,
            name: row['Nama Item'],
            itemGroupId: group?.id || itemGroups[0]?.id,
            buyPrice: Number(row['Harga']) || 0,
            uom: row['Satuan'] || 'PCS',
            qty: Number(row['Stok Awal']) || 0,
            recipeUom: row['Satuan Resep'] || '',
            conversionRate: Number(row['Isi per Satuan']) || 1
          };
        });

        const res = await fetch('http://localhost:3000/product/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formattedPayload)
        });

        if (res.ok) {
          alert(`Berhasil mengimpor ${formattedPayload.length} item!`);
          fetchData();
        }
      } catch (err) {
        alert("Gagal memproses file.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const getExportData = () => {
    return filteredProducts.map(p => ({
      'Kode Item': p.sku,
      'Nama Item': p.name,
      'Item Group': p.itemGroup?.name || '-',
      'Major Group': p.majorGroup,
      'Harga': p.buyPrice,
      'Stok': p.qty,
      'UOM': p.uom,
      'Recipe UOM': p.recipeUom || '-',
      'Conv Rate': p.conversionRate
    }));
  };

  const handleExportExcel = () => {
    const data = getExportData();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, `Inventory_Report_${new Date().getTime()}.xlsx`);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const data = getExportData();
    const headers = [['Kode', 'Nama Item', 'Group', 'Major', 'Harga', 'Stok', 'UOM', 'Recipe UOM', 'Rate']];
    const body = data.map(item => Object.values(item));
    autoTable(doc, {
      head: headers,
      body: body,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`Inventory_Report_${new Date().getTime()}.pdf`);
    setShowExportMenu(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(value);
  };

  const formatNumberWithDot = (value: string | number) => {
    if (!value || value === '0' || value === 0) return '';
    const number = String(value).replace(/\D/g, ''); 
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, ''); 
    setFormData({ ...formData, buyPrice: rawValue === '0' || rawValue === '' ? '' : rawValue });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = isEdit ? `http://localhost:3000/product/${selectedId}` : 'http://localhost:3000/product';
      const method = isEdit ? 'PATCH' : 'POST';

      const finalRecipeUom = formData.recipeUom.trim() === '' ? formData.uom : formData.recipeUom;
      const finalConversionRate = !formData.conversionRate || Number(formData.conversionRate) === 0 
                                  ? 1 
                                  : Number(formData.conversionRate);

      const finalPayload = { 
        ...formData, 
        buyPrice: Number(formData.buyPrice),
        recipeUom: finalRecipeUom,
        conversionRate: finalConversionRate,
        ...( !isEdit && { sku: generateNextSKU(products.length > 0 ? products[0].sku : null) } )
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      if (res.ok) {
        setShowModal(false);
        // Reset form ke default
        setFormData({ 
          name: '', 
          itemGroupId: '', 
          uom: 'PCS', 
          buyPrice: '', 
          recipeUom: '', 
          conversionRate: '1' 
        }); 
        fetchData();
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMajor = filterMajor === 'ALL' || p.majorGroup === filterMajor;
    const matchesGroup = filterGroup === 'ALL' || p.itemGroupId === filterGroup;
    return matchesSearch && matchesMajor && matchesGroup;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 px-4 sm:px-6">
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Inventory List</h1>
            <p className="text-slate-500 text-sm font-medium">Manajemen stok barang dan konversi satuan resep.</p>
          </div>
          
          <div className="flex gap-3 relative">
            <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
            >
              <FileUp size={18} className="text-indigo-600" /> Import
            </button>

            <div className="relative" ref={exportMenuRef}>
                <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                >
                <Download size={18} /> Export <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>

                {showExportMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <button onClick={handleExportExcel} className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-3 border-b border-slate-50"><TableIcon size={16} className="text-green-600" /> Excel (.xlsx)</button>
                    <button onClick={handleExportPDF} className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-3"><FileText size={16} className="text-red-600" /> PDF Document</button>
                </div>
                )}
            </div>

            <button 
              onClick={() => { 
                setIsEdit(false); 
                setFormData({name:'', itemGroupId:'', uom:'PCS', buyPrice: '', recipeUom: '', conversionRate: '1'}); 
                setShowModal(true); 
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus size={18} /> Tambah Item
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs font-medium text-indigo-700">
              <AlertCircle size={20} className="text-indigo-400" />
              <p>Atur <b>Satuan Resep</b> dan <b>Isi per Satuan</b> untuk kalkulasi pemakaian bahan di Menu Jual secara otomatis.</p>
            </div>
            <button 
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-200 transition-colors"
            >
              <FileSpreadsheet size={16} /> DOWNLOAD TEMPLATE
            </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Cari nama atau SKU..."
              className="w-full pl-11 pr-4 py-2.5 bg-transparent rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-sm"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none cursor-pointer" value={filterMajor} onChange={(e) => setFilterMajor(e.target.value)}>
              <option value="ALL">Semua Divisi</option>
              <option value="BAR">BAR</option>
              <option value="KITCHEN">KITCHEN</option>
              <option value="OTHER">OTHER</option>
            </select>
            <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none cursor-pointer" value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
              <option value="ALL">Semua Group</option>
              {itemGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div onClick={() => setIsTableExpanded(!isTableExpanded)} className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-slate-50/50 transition-colors">
            <h3 className="text-sm font-semibold text-slate-700">Daftar Produk</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filteredProducts.length} Items</span>
              {isTableExpanded ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
            </div>
          </div>

          {isTableExpanded && (
            <div className="overflow-x-auto border-t border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Item</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Group</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Harga</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Stok</th>
                    {/* NEW COLUMNS */}
                    <th className="px-6 py-3.5 text-xs font-semibold text-indigo-500 uppercase tracking-wider text-center bg-indigo-50/30">Ratio Resep</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                        <Loader2 className="animate-spin mx-auto mb-2 text-indigo-500" /> Memproses data...
                    </td></tr>
                  ) : filteredProducts.map((p) => (
                    <tr key={p.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-indigo-600 font-mono tracking-tighter">{p.sku}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{p.name}</td>
                      <td className="px-6 py-4 text-[11px] font-medium text-slate-500">
                        {p.itemGroup?.name || '-'} 
                        <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-[9px]">{p.majorGroup}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-slate-600">{formatCurrency(p.buyPrice || 0)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-slate-900">{p.qty}</span>
                        <span className="ml-1 text-[10px] font-medium text-slate-400 uppercase">{p.uom}</span>
                      </td>
                      {/* NEW DATA CELL */}
                      <td className="px-6 py-4 text-center bg-indigo-50/10">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-indigo-600">1 {p.uom} = {p.conversionRate} {p.recipeUom || '?'}</span>
                          <span className="text-[9px] text-slate-400 italic">Konversi Resep</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { 
                              setIsEdit(true); 
                              setSelectedId(p.id); 
                              setFormData({ 
                                name: p.name, 
                                itemGroupId: p.itemGroupId, 
                                uom: p.uom, 
                                buyPrice: p.buyPrice === 0 ? '' : String(p.buyPrice),
                                recipeUom: p.recipeUom || '',
                                conversionRate: String(p.conversionRate || 1)
                              }); 
                              setShowModal(true); 
                            }} 
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Edit2 size={15}/>
                          </button>
                          <button onClick={async () => { if(confirm('Hapus item?')) { await fetch(`http://localhost:3000/product/${p.id}`, {method:'DELETE'}); fetchData(); } }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={15}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* MODAL TAMBAH/EDIT (Updated with Recipe Conversion Fields) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 pt-8 pb-4 border-b border-slate-50">
              <h2 className="text-xl font-semibold text-slate-900">{isEdit ? 'Ubah Item' : 'Item Baru'}</h2>
              <p className="text-slate-500 text-xs mt-1">Lengkapi detail produk dan satuan konversi resep.</p>
            </div>
            <form onSubmit={handleSaveProduct} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1 tracking-wide">Nama Produk</label>
                <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase ml-1 tracking-wide">Kategori</label>
                  <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium outline-none cursor-pointer" value={formData.itemGroupId} onChange={e => setFormData({...formData, itemGroupId: e.target.value})}>
                    <option value="">Pilih...</option>
                    {itemGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase ml-1 tracking-wide">Satuan Stok</label>
                  <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium outline-none cursor-pointer" value={formData.uom} onChange={e => setFormData({...formData, uom: e.target.value})}>
                    {['BTL', 'KG', 'GR', 'LTR', 'ML', 'PACK', 'PCS', 'BOX', 'CAN'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1 tracking-wide">Harga Beli Standar</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400 font-mono tracking-tighter">Rp</span>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-mono font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all" value={formatNumberWithDot(formData.buyPrice)} onChange={handlePriceChange} placeholder="0" />
                </div>
              </div>

              {/* --- NEW SECTION: RECIPE CONVERSION --- */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <RefreshCw size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Konversi Resep</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Unit Resep</label>
                        <input 
                          placeholder="ml / gr" 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
                          value={formData.recipeUom} 
                          onChange={e => setFormData({...formData, recipeUom: e.target.value.toUpperCase()})} 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Isi per {formData.uom}</label>
                        <input 
                          type="number"
                          placeholder="700" 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
                          value={formData.conversionRate} 
                          onChange={e => setFormData({...formData, conversionRate: e.target.value})} 
                        />
                    </div>
                </div>
                <p className="text-[9px] text-slate-500 italic px-1">
                    Contoh: 1 {formData.uom || 'Unit'} isi {formData.conversionRate || '...'} {formData.recipeUom || '...'}
                    *Kosongkan jika satuan resep sama dengan satuan stok (1 {formData.uom} = 1 {formData.uom})
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-semibold shadow-indigo-100 shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Simpan Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 2: ITEM GROUP MANAGEMENT (Unchanged) */}
      <section className="pt-8 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><LayoutGrid size={20} /></div>
          <h2 className="text-xl font-semibold text-slate-800">Item Groups</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Add Group */}
          <div className="lg:col-span-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-200/60 h-fit">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Tambah Group</h3>
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const res = await fetch('http://localhost:3000/item-group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: e.target.gName.value, majorGroup: e.target.gMajor.value }),
              });
              if(res.ok) { e.target.reset(); fetchData(); }
            }} className="space-y-4">
              <input name="gName" required placeholder="Nama group..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/20" />
              <select name="gMajor" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer">
                <option value="BAR">BAR</option>
                <option value="KITCHEN">KITCHEN</option>
                <option value="OTHER">OTHER</option>
              </select>
              <button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">Simpan Group</button>
            </form>
          </div>

          {/* Group Chips List */}
          <div className="lg:col-span-8 flex flex-wrap gap-3">
            {itemGroups.map((g) => (
              <div key={g.id} className={`group flex items-center gap-4 border px-4 py-2.5 rounded-xl transition-all ${editingGroupId === g.id ? 'border-indigo-400 bg-indigo-50/30' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                {editingGroupId === g.id ? (
                  <div className="flex items-center gap-2">
                    <input className="bg-white border border-indigo-200 rounded-lg px-2 py-1 text-sm font-medium outline-none w-32" value={editGroupData.name} onChange={e => setEditGroupData({...editGroupData, name: e.target.value})} />
                    <button onClick={async () => { await fetch(`http://localhost:3000/item-group/${g.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(editGroupData)}); setEditingGroupId(null); fetchData(); }} className="p-1 bg-indigo-600 text-white rounded-md"><Check size={14}/></button>
                    <button onClick={() => setEditingGroupId(null)} className="p-1 bg-slate-200 text-slate-500 rounded-md"><X size={14}/></button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">{g.majorGroup}</span>
                      <span className="text-sm font-medium text-slate-700">{g.name}</span>
                    </div>
                    <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingGroupId(g.id); setEditGroupData({name:g.name, majorGroup:g.majorGroup}); }} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={13}/></button>
                      <button onClick={async () => { if(confirm('Hapus group?')) { await fetch(`http://localhost:3000/item-group/${g.id}`, {method:'DELETE'}); fetchData(); } }} className="p-1 text-slate-300 hover:text-red-500"><X size={13}/></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}