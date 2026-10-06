/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Package, RefreshCcw, ChevronRight, ChevronDown, ChevronUp,
  Loader2, ListChecks, XCircle, Building2, ClipboardCheck,
  MapPin, Calendar, Box, FileSpreadsheet
} from 'lucide-react';

/* ===================================================================================
   UI COMPONENTS IMPORT
=================================================================================== */
import PageHeader from '@/components/ui/PageHeader';
import AnimatedWrapper from '@/components/ui/AnimatedWrapper';
import BentoCard from '@/components/ui/BentoCard';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge'; // New Component ✅

/* ===================================================================================
   INTERFACES
=================================================================================== */
interface PurchasingItem {
  id: string;
  product: { name: string; code: string; sku?: string };
  quantity: number;
  receivedQuantity: number;
  uom?: string;
  prItem?: {
    createdAt: string;
    purchaseRequest?: { outlet?: { name: string } };
  };
}

interface POData {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  supplier: { name: string };
  outlet?: { name: string }; 
  items: PurchasingItem[];
}

export default function ReceivingPage() {
  /* ===================================================================================
     STATE MANAGEMENT
  =================================================================================== */
  const [activePOs, setActivePOs] = useState<POData[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiveData, setReceiveData] = useState<{ [key: string]: { amount: number; notes: string } }>({});
  const [suratJalan, setSuratJalan] = useState<{ [key: string]: string }>({});
  const [expandedPOs, setExpandedPOs] = useState<{ [key: string]: boolean }>({});
  
  const API_URL = 'http://localhost:3000';

  /* ===================================================================================
     DATA FETCHING
  =================================================================================== */
  const fetchActivePOs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/purchasing/po/list?status=SENT`);
      const data = await res.json();
      const onlySent = data
        .filter((po: any) => po.status === 'SENT')
        .sort((a: any, b: any) => b.orderNumber.localeCompare(a.orderNumber));
      setActivePOs(onlySent);
    } catch (err) {
      console.error("Error fetching POs:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => { fetchActivePOs(); }, [fetchActivePOs]);

  /* ===================================================================================
     EVENT HANDLERS
  =================================================================================== */
  const handleMatchAll = (po: POData) => {
    const updates = { ...receiveData };
    po.items.forEach(item => {
      const remaining = item.quantity - item.receivedQuantity;
      if (remaining > 0) updates[item.id] = { amount: remaining, notes: '' };
    });
    setReceiveData(updates);
  };

  const handleInputChange = (itemId: string, field: 'amount' | 'notes', value: string) => {
    setReceiveData(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { amount: 0, notes: '' }),
        [field]: field === 'amount' ? (parseInt(value) || 0) : value
      }
    }));
  };

  /* ===================================================================================
     SUBMISSION LOGIC
  =================================================================================== */
  const submitReceiving = async (poId: string) => {
    const sjNumber = suratJalan[poId];
    if (!sjNumber?.trim()) return alert("Nomor Surat Jalan (SJ) wajib diisi!");

    const po = activePOs.find(p => p.id === poId);
    const itemsToSubmit = po?.items
      .filter(item => (receiveData[item.id]?.amount || 0) > 0)
      .map(item => ({
        itemId: item.id,
        amount: receiveData[item.id].amount,
        notes: receiveData[item.id].notes || ''
      }));

    if (!itemsToSubmit || itemsToSubmit.length === 0) return alert("Input jumlah barang!");
    if (!confirm(`Konfirmasi penerimaan SJ: ${sjNumber}?`)) return;

    try {
      const res = await fetch(`${API_URL}/purchasing/po/receive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSubmit, referenceNo: sjNumber })
      });
      if (res.ok) {
        alert("Success!");
        setReceiveData({});
        setSuratJalan(prev => { const n = {...prev}; delete n[poId]; return n; });
        fetchActivePOs();
      }
    } catch (err) { alert("Error processing request"); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-600">
      <div className="w-full p-4 md:p-5 pb-24 space-y-5">

        {/* HEADER */}
        <PageHeader 
          title="Warehouse" highlight="Receiving" 
          description="Confirm incoming stock from suppliers."
          moduleName="Inventory Management"
          icon={<Box size={14} className="text-orange-600" />}
        >
          <button onClick={fetchActivePOs} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-orange-600 shadow-sm transition-all">
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </PageHeader>

        {/* MAIN LIST */}
        <AnimatedWrapper delay="500">
          {loading ? (
             <EmptyState icon={<Loader2 size={48} className="animate-spin text-orange-500" />} title="Syncing Inventory..." />
          ) : activePOs.length === 0 ? (
             <EmptyState icon={<Package size={56} />} title="No pending deliveries" />
          ) : (
            <div className="space-y-5">
              {activePOs.map((po) => {
                const isExpanded = expandedPOs[po.id] || false;
                return (
                  <BentoCard key={po.id} noPadding>
                    
                    {/* ACCORDION HEADER */}
                    <div onClick={() => setExpandedPOs(p => ({...p, [po.id]: !isExpanded}))} className="p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-slate-50/50 gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isExpanded ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                          <Building2 size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">{po.orderNumber}</span>
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{po.supplier?.name}</h2>
                          </div>
                          <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-widest">{po.items.length} Items</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isExpanded && (
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleMatchAll(po); }} className="text-[10px] font-bold text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-all uppercase flex items-center gap-1"><ListChecks size={14}/> Match All</button>
                            <button onClick={(e) => { e.stopPropagation(); setReceiveData({}); }} className="text-[10px] font-bold text-slate-400 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all uppercase flex items-center gap-1"><XCircle size={14}/> Clear</button>
                          </div>
                        )}
                        {isExpanded ? <ChevronUp className="text-slate-400" size={20} /> : <ChevronDown className="text-slate-300" size={20} />}
                      </div>
                    </div>

                    {/* TABLE AREA */}
                    <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[5000px] opacity-100 border-t border-slate-100' : 'max-h-0 opacity-0'}`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                              <th className="px-6 py-4 w-32">Order Date</th>
                              <th className="px-6 py-4">Item & Destination</th>
                              <th className="px-6 py-4 text-center w-28">Remaining</th>
                              <th className="px-6 py-4 text-center w-36">Receive</th>
                              <th className="px-6 py-4">Audit Note</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {po.items.map((item) => {
                              const remaining = item.quantity - item.receivedQuantity;
                              if (remaining <= 0) return null;
                              return (
                                <tr key={item.id} className="group hover:bg-slate-50/30 transition-colors">
                                  <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-600">{new Date(item.prItem?.createdAt || po.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                      <span className="text-[9px] text-slate-400">{new Date(item.prItem?.createdAt || po.createdAt).getFullYear()}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{item.product?.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <StatusBadge status={po.status} />
                                      <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase"><MapPin size={10} /> {item.prItem?.purchaseRequest?.outlet?.name || 'Central'}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 text-center text-sm font-bold text-orange-500">{remaining} <span className="text-[9px] text-slate-400">{item.uom}</span></td>
                                  <td className="px-6 py-5">
                                    <input type="number" value={receiveData[item.id]?.amount || ''} onChange={(e) => handleInputChange(item.id, 'amount', e.target.value)} className={`w-24 py-2 mx-auto block rounded-xl border-2 text-center font-bold text-sm transition-all outline-none ${(receiveData[item.id]?.amount || 0) > 0 ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-slate-200 bg-white'}`} placeholder="0" />
                                  </td>
                                  <td className="px-6 py-5">
                                    {(receiveData[item.id]?.amount || 0) > 0 ? (
                                      <div className="flex flex-col gap-2">
                                        {(receiveData[item.id]?.amount || 0) !== remaining && (
                                          <input type="text" value={receiveData[item.id]?.notes || ''} onChange={(e) => handleInputChange(item.id, 'notes', e.target.value)} placeholder="Reason..." className="w-full max-w-[200px] px-3 py-2 rounded-lg bg-rose-50 border border-rose-100 text-xs font-medium text-rose-700 outline-none" />
                                        )}
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-widest"><Calendar size={10} /> {new Date().toLocaleDateString('id-ID')}</div>
                                      </div>
                                    ) : <span className="text-[10px] text-slate-300 italic uppercase">Waiting...</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* ACTION FOOTER */}
                      <div className="p-5 md:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-4">
                        <div className="relative w-full sm:w-64">
                          <FileSpreadsheet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input type="text" placeholder="Nomor Surat Jalan (SJ)..." value={suratJalan[po.id] || ''} onChange={(e) => setSuratJalan({...suratJalan, [po.id]: e.target.value})} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 transition-all" />
                        </div>
                        <button onClick={() => submitReceiving(po.id)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-orange-500 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 group shadow-lg">
                          <ClipboardCheck size={16} /> Confirm Received <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </BentoCard>
                );
              })}
            </div>
          )}
        </AnimatedWrapper>
      </div>
    </div>
  );
}