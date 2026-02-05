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
  ClipboardList
} from 'lucide-react';

export default function PurchasingUnifiedPage() {
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

  useEffect(() => {
    fetchPOList();
    fetchSuppliers();
  }, []);

  const fetchPOList = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/purchasing/po/list`);
      const data = await res.json();
      
      // Sortir Ascending berdasarkan nama Outlet agar tidak lompat-lompat
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

  // --- LOGIKA PENGELOMPOKKAN PO ---
  const groupedPOs = useMemo(() => {
    const groups: { [key: string]: any } = {};
    
    // Filter berdasarkan tab aktif
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
          referenceNo: po.referenceNo, // Mengambil Nomor SJ dari Purchasing Header
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
  
  return (
    <div className="p-8 pb-40 max-w-[1600px] mx-auto bg-slate-50 min-h-screen font-sans">
      {/* Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Purchasing Control</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola pembuatan PO dan monitor kedatangan barang.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-200/50 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button 
              onClick={() => setActiveTab('po')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'po' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ClipboardList size={14} /> PO Management
            </button>
            <button 
              onClick={() => setActiveTab('receiving')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'receiving' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <PackageCheck size={14} /> Receiving Monitor
            </button>
          </div>
          <button onClick={fetchPOList} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Konten Utama */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCcw className="animate-spin" />
            <p className="font-medium">Memuat data...</p>
          </div>
        ) : groupedPOs.length > 0 ? (
          groupedPOs.map((group: any, idx: number) => {
            const isExpanded = expandedVendors[group.supplierName] || false;
            return (
              <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div 
                  onClick={() => toggleVendor(group.supplierName)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Building2 size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-3">
                        {group.supplierName}
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold">
                          {group.items.length} Items
                        </span>
                      </h3>
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-tighter mt-0.5">
                        Total Nilai: <span className="text-slate-900 font-bold">Rp {formatNumber(group.totalValue)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {activeTab === 'po' && group.hasPendingDrafts && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFinalizeAndSend(group.supplierName);
                        }}
                        disabled={!!sendingSupplier}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-bold hover:bg-indigo-700 transition-all disabled:bg-slate-300 shadow-md shadow-indigo-100"
                      >
                        <Send size={12} />
                        {sendingSupplier === group.supplierName ? 'Processing...' : 'SEND OFFICIAL PO'}
                      </button>
                    )}
                    <div className="p-2 text-slate-300">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">No. SJ / Order</th>
                          <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Outlet</th>
                          <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Group</th>
                          <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Product Name</th>
                          <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Qty</th>
                          <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Price/Unit</th>
                          <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Subtotal</th>
                          {activeTab === 'po' && <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Move</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {group.items.map((item: any) => {
                          const isDraft = item.poStatus === 'PENDING';
                          return (
                            <tr key={item.id} className="group hover:bg-slate-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-700">{item.referenceNo || '-'}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">#{item.orderNumber}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-[10px] font-bold text-indigo-500 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                                  {item.outletName}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                                    item.majorGroup === 'BAR' ? 'text-blue-600 bg-blue-50' : 
                                    item.majorGroup === 'KITCHEN' ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-100'
                                  }`}>
                                    {item.majorGroup}
                                  </span>
                                  <span className="text-[10px] text-slate-400 uppercase whitespace-nowrap">
                                    {item.itemGroupName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-sm font-semibold text-slate-700">{item.product?.name}</p>
                                  {getStatusBadge(item.poStatus)}
                                </div>
                                {item.outletNote && (
                                  <p className="text-[10px] italic text-slate-400 flex items-center gap-1">
                                    <AlertCircle size={10}/> {item.outletNote}
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-bold text-slate-700">{item.quantity}</span>
                                <span className="text-[10px] text-slate-400 ml-1 uppercase">{item.uom}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="relative max-w-[120px]">
                                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-slate-300">Rp</span>
                                  <input 
                                    type="text"
                                    disabled={!isDraft}
                                    className="w-full pl-5 pr-2 py-1 bg-transparent border-b border-transparent focus:border-indigo-300 text-sm text-slate-600 outline-none transition-all disabled:text-slate-500"
                                    value={formatNumber(itemPrices[item.id] || 0)}
                                    onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-right text-slate-900 font-bold">
                                Rp {formatNumber((itemPrices[item.id] || 0) * item.quantity)}
                              </td>
                              {activeTab === 'po' && (
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation();
                                      setTargetItem(item); 
                                      setIsModalOpen(true); 
                                    }}
                                    className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
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
                )}
              </div>
            );
          })
        ) : (
          <div className="py-24 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
            <ClipboardList className="mx-auto text-slate-200 mb-3" size={48} />
            <p className="text-slate-400 text-sm font-medium">Tidak ada data untuk tab ini.</p>
          </div>
        )}
      </div>

      {/* MODAL VENDOR SWITCH */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Pindah Vendor</h2>
            <p className="text-xs text-slate-500 mb-6">Pilih vendor baru untuk item: <br/><span className="font-bold text-slate-800">{targetItem?.product?.name}</span></p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {allSuppliers.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => moveSupplier(s.name)}
                  className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 text-xs font-medium transition-all flex justify-between items-center group"
                >
                  {s.name}
                  <ChevronDown size={14} className="-rotate-90 text-slate-300 group-hover:text-indigo-500" />
                </button>
              ))}
            </div>
            <button onClick={() => setIsModalOpen(false)} className="w-full mt-6 py-3 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-all uppercase">Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}