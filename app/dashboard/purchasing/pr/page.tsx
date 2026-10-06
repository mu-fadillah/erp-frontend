/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronDown, 
  ShoppingCart, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  History,
  Clock,
  Building2,
  PackageSearch
} from 'lucide-react';
import toast from 'react-hot-toast'; // Tambahan utilitas global toast
import { fetchApi } from '../../../utils/api'; // Menggunakan utilitas global API

/* --- UI COMPONENTS IMPORT --- */
import PageHeader from '@/components/ui/PageHeader';
import AnimatedWrapper from '@/components/ui/AnimatedWrapper';
import BentoCard from '@/components/ui/BentoCard';
import EmptyState from '@/components/ui/EmptyState';
/* --- AKHIR UI COMPONENTS IMPORT --- */

export default function PurchasingPRListPage() {
  // --- STATE MANAGEMENT ---
  const [prItems, setPrItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState<string>('BAR');
  const [expandedOutlets, setExpandedOutlets] = useState<Record<string, boolean>>({});

  const router = useRouter(); 
  // --- AKHIR STATE MANAGEMENT ---

  // --- LIFECYCLE & FETCH DATA ---
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchSuppliers(), fetchPRItems()]);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const fetchPRItems = async () => {
    try {
      const res = await fetchApi('/purchasing/pr/pending');
      const data = await res.json();
      
      // Safeguard jika response bukan array
      if (!Array.isArray(data)) {
        setPrItems([]);
        return;
      }

      setPrItems(data.map((item: any) => ({
        ...item,
        supplierName: item.lastSupplierName || '',
        price: item.priceHistory?.[0]?.price || 0,
        isChecked: false
      })));
    } catch (err) { 
      toast.error("Gagal memuat Purchase Request."); 
      setPrItems([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetchApi('/purchasing/suppliers');
      const data = await res.json();

      // Safeguard jika response bukan array
      if (!Array.isArray(data)) {
        setSuppliers([]);
        return;
      }

      setSuppliers(data);
    } catch (err) { 
      toast.error("Gagal memuat daftar Supplier."); 
      setSuppliers([]);
    }
  };
  // --- AKHIR LIFECYCLE & FETCH DATA ---

  // --- DATA TRANSFORMATION (GROUPING BY OUTLET & DEPT) ---
  const groupedData = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = { 
      BAR: {}, 
      KITCHEN: {}, 
      OTHER: {} 
    };

    prItems.forEach(item => {
      const major = item.product?.majorGroup || 'OTHER';
      const outletName = item.purchaseRequest?.outlet?.name || 'TANPA OUTLET';
      
      const targetGroup = groups[major] || groups.OTHER;
      
      if (!targetGroup[outletName]) {
        targetGroup[outletName] = [];
      }
      targetGroup[outletName].push(item);
    });

    return groups;
  }, [prItems]);
  // --- AKHIR DATA TRANSFORMATION ---

  // --- ACTION HANDLERS ---
  const updateItemState = (id: string, field: string, value: any) => {
    setPrItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const toggleOutlet = (outletKey: string) => {
    setExpandedOutlets(prev => ({ ...prev, [outletKey]: !prev[outletKey] }));
  };

  const formatRupiah = (val: number | string) => {
    if (!val || val === 0) return '';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleCreatePOMassal = async () => {
    const selectedItems = prItems.filter((i: any) => i.isChecked);
    const invalidItems = selectedItems.filter(i => !i.supplierName || !i.price || i.price <= 0);
    
    if (invalidItems.length > 0) {
      toast.error(`Mohon lengkapi Supplier dan Harga untuk ${invalidItems.length} item.`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetchApi('/purchasing/po/create-massal', {
        method: 'POST',
        body: JSON.stringify({ 
          items: selectedItems.map(i => ({
            id: i.id,
            productId: i.productId,
            quantity: i.quantity,
            uom: i.uom,
            supplierName: i.supplierName,
            price: Number(i.price),
            notes: i.notes,
            outletId: i.purchaseRequest?.outletId 
          }))
        }),
      });

      if (res.ok) {
        toast.success(`Sukses, item sudah dipindahkan ke draft PO.`);
        router.push('/dashboard/purchasing/po');
      } else {
        const errData = await res.json();
        toast.error(`Gagal: ${errData.message || 'Terjadi kesalahan sistem'}`);
      }
    } catch (err) { 
      toast.error("Koneksi ke server terputus."); 
    } finally { 
      setActionLoading(false); 
    }
  };
  // --- AKHIR ACTION HANDLERS ---

  // --- RENDER PREPARATION ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-400 font-medium tracking-widest uppercase text-xs">Memuat Permintaan Barang...</p>
      </div>
    );
  }

  const currentTabOutlets = groupedData[activeDepartment] || {};
  const currentTabTotalItems = Object.values(currentTabOutlets).flat().length;
  // --- AKHIR RENDER PREPARATION ---

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-600 selection:bg-indigo-100">
      
      {/* Hidden datalist for supplier autocomplete */}
      <datalist id="supplier-options">
        {suppliers.map((s: any) => <option key={s.id} value={s.name} />)}
      </datalist>

      <div className="w-full p-4 md:p-5 pb-24 md:pb-24 space-y-5">
        
        {/* --- HEADER COMPONENT --- */}
        <PageHeader 
          title="Purchase" 
          highlight="List" 
          description="Review outlet requests, assign suppliers, and create draft purchase orders efficiently."
          moduleName="Supply Chain Management"
          icon={<ShoppingCart size={14} className="text-indigo-600" />}
        >
          <div className="flex bg-slate-200/50 p-1.5 rounded-xl h-fit shadow-inner overflow-x-auto hide-scrollbar">
            {['BAR', 'KITCHEN', 'OTHER'].map((dept) => (
              <button 
                key={dept}
                onClick={() => setActiveDepartment(dept)} 
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300 whitespace-nowrap ${
                  activeDepartment === dept ? 'bg-white text-indigo-600 shadow-sm translate-y-[-1px]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {dept === 'BAR' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                {dept === 'KITCHEN' && <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>}
                {dept === 'OTHER' && <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>}
                {dept === 'OTHER' ? 'GENERAL & OTHERS' : `${dept} DEPARTMENT`}
              </button>
            ))}
          </div>
        </PageHeader>
        {/* --- AKHIR HEADER COMPONENT --- */}

        {/* --- MAIN CONTENT WRAPPER --- */}
        <AnimatedWrapper delay="500">
          {currentTabTotalItems === 0 ? (
            
             /* --- EMPTY STATE --- */
             <EmptyState 
               icon={<PackageSearch size={56} />} 
               title="No pending requests in this department" 
             />
             /* --- AKHIR EMPTY STATE --- */
             
          ) : (
            
            /* --- BENTO CARD CONTAINER FOR TABLES --- */
            <BentoCard noPadding>
              
              {/* Tab Title Area */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div>
                  <h3 className="text-lg font-light text-slate-900 tracking-tight">
                    {activeDepartment === 'OTHER' ? 'General' : activeDepartment} <span className="font-medium">Requests</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.1em]">
                    {currentTabTotalItems} items need processing
                  </p>
                </div>
              </div>

              {/* --- OUTLET LOOP & ACCORDION --- */}
              <div>
                {Object.entries(currentTabOutlets).map(([outletName, items], index) => {
                  const outletIdKey = `${activeDepartment}-${outletName}`;
                  const isOutletExpanded = expandedOutlets[outletIdKey] !== false;

                  return (
                    <div key={outletName} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      
                      {/* Accordion Toggle Button */}
                      <button 
                        onClick={() => toggleOutlet(outletIdKey)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-indigo-50/30 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg border border-slate-200/60 shadow-sm group-hover:border-indigo-200 transition-colors">
                            <Building2 size={14} className="text-indigo-500" />
                          </div>
                          <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                            {outletName}
                          </span>
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded-full border border-slate-200 uppercase tracking-widest">
                            {items.length} Items
                          </span>
                        </div>
                        <ChevronDown size={16} className={`text-slate-300 transition-transform duration-300 ${isOutletExpanded ? 'rotate-180 text-indigo-400' : ''}`} />
                      </button>

                      {/* Outlet Items Table */}
                      <div className={`overflow-hidden transition-all duration-300 ${isOutletExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="overflow-x-auto px-6 pb-6 pt-1">
                          <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead>
                              <tr className="text-[10px] uppercase font-semibold text-slate-400 tracking-[0.2em] opacity-80">
                                <th className="px-3 pb-2 w-10 text-center">Select</th>
                                <th className="px-4 pb-2 w-36">Request Date</th>
                                <th className="px-4 pb-2">Product Info</th>
                                <th className="px-3 pb-2 text-center w-16">Stock</th>
                                <th className="px-3 pb-2 text-center w-20">Req Qty</th>
                                <th className="px-4 pb-2 w-44">Price Est.</th>
                                <th className="px-4 pb-2 w-52">Supplier target</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item) => (
                                <tr key={item.id} className={`group transition-all duration-300 ${item.isChecked ? 'bg-indigo-50/50 shadow-sm shadow-indigo-100' : 'bg-white hover:bg-slate-50/50'}`}>
                                  
                                  {/* Checkbox Column */}
                                  <td className={`px-3 py-3.5 text-center rounded-l-lg border-y border-l transition-colors ${item.isChecked ? 'border-indigo-200' : 'border-slate-200 group-hover:border-indigo-100'}`}>
                                    <div className="relative flex items-center justify-center">
                                      <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer accent-indigo-600 transition-all" 
                                        checked={item.isChecked} 
                                        onChange={() => updateItemState(item.id, 'isChecked', !item.isChecked)}
                                      />
                                    </div>
                                  </td>
                                  
                                  {/* Date Column */}
                                  <td className={`px-4 py-3.5 border-y transition-colors ${item.isChecked ? 'border-indigo-200' : 'border-slate-200 group-hover:border-indigo-100'}`}>
                                    <div className="flex flex-col space-y-0.5">
                                      <span className="text-slate-700 font-medium text-xs">
                                        {new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Product Info Column */}
                                  <td className={`px-4 py-3.5 border-y transition-colors ${item.isChecked ? 'border-indigo-200' : 'border-slate-200 group-hover:border-indigo-100'}`}>
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-slate-800 text-sm leading-tight">{item.product?.name}</span>
                                      <span className="text-[9px] text-slate-400 mt-0.5 uppercase font-medium tracking-widest">SKU: {item.product?.sku || '-'}</span>
                                      {item.notes && (
                                        <div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded-md border border-amber-100/50">
                                          <AlertCircle size={12} className="shrink-0" />
                                          <span className="font-medium">{item.notes}</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Current Stock Column */}
                                  <td className={`px-3 py-3.5 text-center border-y transition-colors ${item.isChecked ? 'border-indigo-200' : 'border-slate-200 group-hover:border-indigo-100'}`}>
                                    <div className="inline-flex flex-col items-center px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md min-w-[36px]">
                                      <span className="text-sm font-semibold text-slate-600">{item.currentStock}</span>
                                    </div>
                                  </td>

                                  {/* Quantity Column */}
                                  <td className={`px-3 py-3.5 text-center border-y transition-colors ${item.isChecked ? 'border-indigo-200' : 'border-slate-200 group-hover:border-indigo-100'}`}>
                                    <div className="flex flex-col items-center justify-center">
                                      <span className="text-sm font-semibold text-slate-900">{item.quantity}</span>
                                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{item.uom}</span>
                                    </div>
                                  </td>

                                  {/* Price Estimate Column */}
                                  <td className={`px-4 py-3.5 border-y transition-colors ${item.isChecked ? 'border-indigo-200' : 'border-slate-200 group-hover:border-indigo-100'}`}>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400">Rp</span>
                                      <input 
                                        type="text" 
                                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-indigo-700 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        placeholder="0"
                                        value={formatRupiah(item.price)}
                                        onChange={(e) => updateItemState(item.id, 'price', e.target.value.replace(/\./g, ''))}
                                      />
                                    </div>
                                    {item.priceHistory?.length > 0 && (
                                      <div className="mt-1.5 flex items-center gap-1 text-[9px] text-slate-400 font-medium">
                                        <History size={10} />
                                        Last: Rp {formatRupiah(item.priceHistory[0].price)}
                                      </div>
                                    )}
                                  </td>

                                  {/* Supplier Input Column */}
                                  <td className={`px-4 py-3.5 rounded-r-lg border-y border-r transition-colors ${item.isChecked ? 'border-indigo-200' : 'border-slate-200 group-hover:border-indigo-100'}`}>
                                    <input 
                                      list="supplier-options" 
                                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400"
                                      placeholder="Assign supplier..."
                                      value={item.supplierName}
                                      onChange={(e) => updateItemState(item.id, 'supplierName', e.target.value)}
                                    />
                                  </td>

                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* --- AKHIR OUTLET LOOP & ACCORDION --- */}

            </BentoCard>
            /* --- AKHIR BENTO CARD CONTAINER --- */

          )}
        </AnimatedWrapper>
        {/* --- AKHIR MAIN CONTENT WRAPPER --- */}

      </div>

      {/* --- FLOATING ACTION MENU --- */}
      {prItems.some((i: any) => i.isChecked) && (
        <div className="fixed bottom-5 right-5 md:bottom-5 md:right-5 flex items-center gap-4 bg-white p-2.5 pr-2.5 pl-5 rounded-[2rem] shadow-2xl shadow-indigo-500/20 border border-slate-100 animate-in slide-in-from-bottom-10 z-[100]">
          <div className="pr-4 border-r border-slate-100 flex flex-col justify-center">
            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-[0.2em] mb-0.5">Ready to draft</p>
            <p className="text-lg font-bold text-indigo-600 leading-none">
              {prItems.filter(i => i.isChecked).length} <span className="text-xs text-slate-400 font-medium">items</span>
            </p>
          </div>
          <button 
            onClick={handleCreatePOMassal} 
            disabled={actionLoading}
            className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-[1.5rem] font-semibold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-slate-900/20"
          >
            {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            {actionLoading ? 'Processing...' : 'Create PO Draft'}
          </button>
        </div>
      )}
      {/* --- AKHIR FLOATING ACTION MENU --- */}

    </div>
  );
}