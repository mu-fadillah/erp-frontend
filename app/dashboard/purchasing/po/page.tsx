/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Send, 
  RefreshCcw, 
  ArrowRightLeft, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  PackageCheck,
  ClipboardList,
  Layers
} from 'lucide-react';

/* ===================================================================================
   UI COMPONENTS IMPORT
   Centralized components to maintain design consistency across the ERP system.
=================================================================================== */
import PageHeader from '@/components/ui/PageHeader';
import AnimatedWrapper from '@/components/ui/AnimatedWrapper';
import BentoCard from '@/components/ui/BentoCard';
import EmptyState from '@/components/ui/EmptyState';

export default function PurchasingUnifiedPage() {
  /* ===================================================================================
     STATE MANAGEMENT
     Handles core data (POs, suppliers), UI states (tabs, modals), and inline edits.
  =================================================================================== */
  const [activeTab, setActiveTab] = useState<'po' | 'receiving'>('po');
  const [poList, setPoList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingSupplier, setSendingSupplier] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  const [targetItem, setTargetItem] = useState<any>(null); 
  
  const [itemPrices, setItemPrices] = useState<{ [key: string]: number }>({});
  const [expandedVendors, setExpandedVendors] = useState<{ [key: string]: boolean }>({});

  const API_URL = 'http://localhost:3000';

  /* ===================================================================================
     LIFECYCLE HOOKS
     Fetches PO list and suppliers on initial mount.
  =================================================================================== */
  useEffect(() => {
    fetchPOList();
    fetchSuppliers();
  }, []);

  /* ===================================================================================
     API DATA FETCHERS
     Retrieves current POs and available suppliers from the backend.
  =================================================================================== */
  const fetchPOList = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/purchasing/po/list`);
      const data = await res.json();
      
      // Sort ascending by outlet name to prevent jumping items
      const sortedData = data.sort((a: any, b: any) => {
        const nameA = a.outlet?.name || 'Central';
        const nameB = b.outlet?.name || 'Central';
        return nameA.localeCompare(nameB);
      });

      setPoList(sortedData);
      
      const initialPrices: { [key: string]: number } = {};
      data.forEach((po: any) => {
        po.items.forEach((it: any) => {
          if (it.price) initialPrices[it.id] = it.price;
        });
      });
      setItemPrices(initialPrices);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_URL}/purchasing/suppliers`); 
      const data = await res.json();
      setAllSuppliers(data);
    } catch (err) { 
      console.error(err); 
    }
  };

  /* ===================================================================================
     DATA TRANSFORMATION (useMemo)
     Groups flat PO items by Supplier. Respects the active tab (PO vs Receiving).
  =================================================================================== */
  const groupedPOs = useMemo(() => {
    const groups: { [key: string]: any } = {};
    
    // Filter based on active tab
    const filteredList = poList.filter(po => {
      if (activeTab === 'po') return po.status !== 'RECEIVED';
      if (activeTab === 'receiving') return po.status === 'RECEIVED' || po.status === 'SENT';
      return true;
    });

    filteredList.forEach((po: any) => {
      const sName = po.supplier?.name || 'Unassigned';
      if (!groups[sName]) {
        groups[sName] = { 
          supplierName: sName, 
          supplierId: po.supplierId,
          items: [], 
          hasPendingDrafts: false,
          totalValue: 0 
        };
      }
      
      const itemsWithMeta = po.items.map((it: any) => {
        const currentPrice = itemPrices[it.id] || it.price || 0;
        groups[sName].totalValue += (it.quantity * currentPrice);
        const outletName = it.prItem?.purchaseRequest?.outlet?.name || po.outlet?.name || 'Central';

        return { 
          ...it, 
          poId: po.id,
          poStatus: po.status, 
          orderNumber: po.orderNumber,
          referenceNo: po.referenceNo, 
          outletName: outletName,
          majorGroup: it.product?.majorGroup || it.prItem?.product?.majorGroup || 'OTHER',
          itemGroupName: it.product?.itemGroup?.name || it.prItem?.product?.itemGroup?.name || '-',
          originalRequestDate: it.prItem?.createdAt || po.createdAt,
          outletNote: it.prItem?.notes || it.notes 
        };
      });

      groups[sName].items.push(...itemsWithMeta);
      if (po.status === 'PENDING') groups[sName].hasPendingDrafts = true;
    });

    return Object.values(groups).sort((a: any, b: any) => a.supplierName.localeCompare(b.supplierName));
  }, [poList, itemPrices, activeTab]);

  /* ===================================================================================
     ACTION HANDLERS
     Functions for formatting numbers, toggling UI states, and processing backend POSTs.
  =================================================================================== */
  const formatNumber = (val: number | string) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, '')) : val;
    return num.toLocaleString('id-ID');
  };

  const toggleVendor = (vendorName: string) => {
    setExpandedVendors(prev => ({ ...prev, [vendorName]: !prev[vendorName] }));
  };

  const handlePriceChange = (itemId: string, value: string) => {
    const numValue = parseInt(value.replace(/\D/g, '')) || 0;
    setItemPrices(prev => ({ ...prev, [itemId]: numValue }));
  };

  const handleFinalizeAndSend = async (supplierName: string) => {
    if (!confirm(`Terbitkan PO Resmi untuk ${supplierName}?`)) return;
    setSendingSupplier(supplierName);
    try {
      const res = await fetch(`${API_URL}/purchasing/po/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierName, prices: itemPrices })
      });
      if (res.ok) {
        await fetchPOList();
      }
    } catch (err) {
      alert("Gagal memproses PO.");
    } finally { 
      setSendingSupplier(null); 
    }
  };

  const moveSupplier = async (supplierName: string) => {
    if (!targetItem) return;
    try {
      const res = await fetch(`${API_URL}/purchasing/po/move-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [targetItem.id], newSupplierName: supplierName })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setTargetItem(null);
        await fetchPOList();
      }
    } catch (err) {
      alert("Gagal memindahkan item.");
    }
  };

  /* ===================================================================================
     UI HELPER COMPONENTS
     Returns mapped colors and icons based on status strings.
  =================================================================================== */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
            <Clock size={10} /> Draft
          </span>
        );
      case 'SENT':
      case 'OFFICIAL':
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
            <CheckCircle2 size={10} /> Official
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
            <PackageCheck size={10} /> Received
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
            {status}
          </span>
        );
    }
  };

  /* ===================================================================================
     MAIN RENDER
  =================================================================================== */
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-600">
      
      {/* 0.5cm spacing layout applied via p-4 md:p-5 */}
      <div className="w-full p-4 md:p-5 pb-24 space-y-5">
        
        {/* === HEADER COMPONENT === */}
        <PageHeader 
          title="Purchasing" 
          highlight="Control" 
          description="Manage PO creation, assign vendors, and monitor receiving status."
          moduleName="Supply Chain Management"
          icon={<Layers size={14} className="text-indigo-600" />}
        >
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            {/* Tab Navigation inside Header */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-xl h-fit shadow-inner">
              <button 
                onClick={() => setActiveTab('po')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${activeTab === 'po' ? 'bg-white text-indigo-600 shadow-sm translate-y-[-1px]' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <ClipboardList size={14} /> PO Management
              </button>
              <button 
                onClick={() => setActiveTab('receiving')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${activeTab === 'receiving' ? 'bg-white text-indigo-600 shadow-sm translate-y-[-1px]' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <PackageCheck size={14} /> Receiving Monitor
              </button>
            </div>
            {/* Refresh Button */}
            <button onClick={fetchPOList} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </PageHeader>

        {/* === MAIN CONTENT AREA === */}
        <AnimatedWrapper delay="500">
          {loading ? (
             <EmptyState 
               icon={<RefreshCcw size={48} className="animate-spin text-indigo-400" />} 
               title="Syncing data..." 
             />
          ) : groupedPOs.length > 0 ? (
            
            /* LOOP THROUGH VENDORS/SUPPLIERS */
            <div className="space-y-5">
              {groupedPOs.map((group: any, idx: number) => {
                const isExpanded = expandedVendors[group.supplierName] || false;
                
                return (
                  <BentoCard key={idx} noPadding>
                    {/* Vendor Header Accordion */}
                    <div 
                      onClick={() => toggleVendor(group.supplierName)}
                      className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-indigo-50/30 transition-colors cursor-pointer border-b border-transparent"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors border ${isExpanded ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-slate-50 text-indigo-500 border-slate-200/60'}`}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-3">
                            {group.supplierName}
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-md font-semibold tracking-widest border border-slate-200">
                              {group.items.length} Items
                            </span>
                          </h3>
                          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-1">
                            Total Value: <span className="text-indigo-600 font-bold ml-1">Rp {formatNumber(group.totalValue)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-4 md:mt-0">
                        {/* Process PO Button (Visible only in PO tab if drafts exist) */}
                        {activeTab === 'po' && group.hasPendingDrafts && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFinalizeAndSend(group.supplierName);
                            }}
                            disabled={!!sendingSupplier}
                            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-[10px] font-bold tracking-widest uppercase hover:bg-indigo-600 transition-all disabled:bg-slate-300 shadow-md"
                          >
                            <Send size={14} />
                            {sendingSupplier === group.supplierName ? 'Processing...' : 'Issue PO'}
                          </button>
                        )}
                        <div className="p-2 text-slate-300">
                          {isExpanded ? <ChevronUp size={20} className="text-indigo-400" /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>

                    {/* Table per Vendor */}
                    <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[5000px] opacity-100 border-t border-slate-100' : 'max-h-0 opacity-0'}`}>
                      <div className="overflow-x-auto px-4 md:px-6 pb-6 pt-2">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] opacity-80">
                              <th className="px-4 pb-2 w-32">Document</th>
                              <th className="px-4 pb-2 w-32">Outlet</th>
                              <th className="px-4 pb-2 text-center w-28">Category</th>
                              <th className="px-4 pb-2">Product Info</th>
                              <th className="px-4 pb-2 text-center w-24">Qty</th>
                              <th className="px-4 pb-2 w-44">Price/Unit</th>
                              <th className="px-4 pb-2 text-right w-36">Subtotal</th>
                              {activeTab === 'po' && <th className="px-4 pb-2 text-center w-16">Switch</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((item: any) => {
                              const isDraft = item.poStatus === 'PENDING';
                              return (
                                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors bg-white">
                                  
                                  {/* Document Column */}
                                  <td className="px-4 py-3.5 border-y border-l border-slate-100 rounded-l-lg group-hover:border-indigo-100 transition-colors">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-700">{item.referenceNo || '-'}</span>
                                      <span className="text-[9px] text-slate-400 font-semibold tracking-widest mt-0.5">#{item.orderNumber}</span>
                                    </div>
                                  </td>
                                  
                                  {/* Outlet Column */}
                                  <td className="px-4 py-3.5 border-y border-slate-100 group-hover:border-indigo-100 transition-colors">
                                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                      {item.outletName}
                                    </span>
                                  </td>
                                  
                                  {/* Category Column */}
                                  <td className="px-4 py-3.5 text-center border-y border-slate-100 group-hover:border-indigo-100 transition-colors">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest ${
                                        item.majorGroup === 'BAR' ? 'text-blue-600 bg-blue-50 border border-blue-100' : 
                                        item.majorGroup === 'KITCHEN' ? 'text-rose-600 bg-rose-50 border border-rose-100' : 'text-slate-500 bg-slate-100 border border-slate-200'
                                      }`}>
                                        {item.majorGroup}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-semibold uppercase whitespace-nowrap">
                                        {item.itemGroupName}
                                      </span>
                                    </div>
                                  </td>
                                  
                                  {/* Product Column */}
                                  <td className="px-4 py-3.5 border-y border-slate-100 group-hover:border-indigo-100 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-semibold text-slate-800 leading-tight">{item.product?.name}</p>
                                      {getStatusBadge(item.poStatus)}
                                    </div>
                                    {item.outletNote && (
                                      <p className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-1 rounded flex items-center gap-1.5 border border-amber-100 w-fit">
                                        <AlertCircle size={10}/> {item.outletNote}
                                      </p>
                                    )}
                                  </td>
                                  
                                  {/* Qty Column */}
                                  <td className="px-4 py-3.5 text-center border-y border-slate-100 group-hover:border-indigo-100 transition-colors">
                                    <div className="flex flex-col items-center">
                                      <span className="text-sm font-bold text-slate-800">{item.quantity}</span>
                                      <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">{item.uom}</span>
                                    </div>
                                  </td>
                                  
                                  {/* Price Input Column */}
                                  <td className="px-4 py-3.5 border-y border-slate-100 group-hover:border-indigo-100 transition-colors">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400">Rp</span>
                                      <input 
                                        type="text"
                                        disabled={!isDraft}
                                        className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-indigo-700 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:text-slate-600 disabled:pl-6"
                                        value={formatNumber(itemPrices[item.id] || 0)}
                                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                      />
                                    </div>
                                  </td>
                                  
                                  {/* Subtotal Column */}
                                  <td className={`px-4 py-3.5 text-sm text-right text-slate-900 font-bold border-y border-slate-100 group-hover:border-indigo-100 transition-colors ${activeTab === 'receiving' ? 'border-r rounded-r-lg' : ''}`}>
                                    Rp {formatNumber((itemPrices[item.id] || 0) * item.quantity)}
                                  </td>
                                  
                                  {/* Move Vendor Action (Only in PO Tab) */}
                                  {activeTab === 'po' && (
                                    <td className="px-4 py-3.5 text-center border-y border-r border-slate-100 rounded-r-lg group-hover:border-indigo-100 transition-colors">
                                      <button 
                                        onClick={(e) => { 
                                          e.stopPropagation();
                                          setTargetItem(item); 
                                          setIsModalOpen(true); 
                                        }}
                                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        title="Move to another vendor"
                                      >
                                        <ArrowRightLeft size={16} />
                                      </button>
                                    </td>
                                  )}
                                  
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </BentoCard>
                );
              })}
            </div>
          ) : (
            
             /* EMPTY STATE (No Data) */
             <EmptyState 
               icon={<ClipboardList size={56} />} 
               title="No purchase orders found for this tab" 
             />
             
          )}
        </AnimatedWrapper>
      </div>

      {/* ===================================================================================
         MODAL: VENDOR SWITCH
         Allows users to move a specific item to a different supplier.
      =================================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-light text-slate-900 mb-1 tracking-tight">Switch <span className="font-semibold">Vendor</span></h2>
            <p className="text-xs text-slate-400 mb-6">Select a new supplier for: <br/><span className="font-semibold text-slate-800">{targetItem?.product?.name}</span></p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {allSuppliers.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => moveSupplier(s.name)}
                  className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-xs font-semibold text-slate-700 transition-all flex justify-between items-center group"
                >
                  {s.name}
                  <ChevronDown size={14} className="-rotate-90 text-slate-300 group-hover:text-indigo-500" />
                </button>
              ))}
            </div>
            
            <button onClick={() => setIsModalOpen(false)} className="w-full mt-6 py-3 text-[10px] font-bold tracking-widest text-slate-400 hover:text-slate-800 transition-all uppercase hover:bg-slate-50 rounded-lg">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}