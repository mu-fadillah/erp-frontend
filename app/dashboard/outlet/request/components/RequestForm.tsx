/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React from 'react';
import { Search, Plus, X, Building2, ShoppingCart, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import BentoCard from '@/components/ui/BentoCard';
import AnimatedWrapper from '@/components/ui/AnimatedWrapper';

interface RequestFormProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  products: any[];
  addToCart: (product?: any) => void;
  selectedOutletId: string;
  setSelectedOutletId: (val: string) => void;
  currentUser: any;
  outlets: any[];
  cart: any[];
  setCart: (cart: any[]) => void;
  itemGroups: any[];
  handleSendRequest: () => void;
  loading: boolean;
}

export default function RequestForm({
  searchTerm, setSearchTerm, products, addToCart, selectedOutletId,
  setSelectedOutletId, currentUser, outlets, cart, setCart,
  itemGroups, handleSendRequest, loading
}: RequestFormProps) {
  return (
    <AnimatedWrapper delay="500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* --- KOLOM KIRI: DISCOVERY & DESTINATION --- */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* --- KARTU PENCARIAN PRODUK (DISCOVERY) --- */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 relative z-[60] group !overflow-visible">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-4">Discovery</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                placeholder="Search products..." 
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-300 transition-all text-sm font-semibold" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
              
              {/* Dropdown Hasil Pencarian Produk */}
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
          {/* --- AKHIR KARTU PENCARIAN PRODUK --- */}

          {/* --- KARTU PILIH OUTLET (DESTINATION) --- */}
          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative z-[10] overflow-hidden group">
            <div className="absolute bottom-0 right-0 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
              <Building2 size={140}/>
            </div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-4">Destination</label>
            <div className="relative">
              <select 
                required 
                value={selectedOutletId} 
                onChange={(e) => setSelectedOutletId(e.target.value)} 
                disabled={currentUser?.role === 'ADMINOUTLET'}
                className={`w-full border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all appearance-none relative z-10 ${
                  currentUser?.role === 'ADMINOUTLET' 
                    ? 'bg-white/5 text-white/50 cursor-not-allowed' 
                    : 'bg-white/10 text-white focus:ring-2 focus:ring-white/20 cursor-pointer'
                }`}
              >
                {currentUser?.role !== 'ADMINOUTLET' && <option value="" className="text-slate-900">Choose Origin Outlet...</option>}
                {outlets.map(o => <option key={o.id} value={o.id} className="text-slate-900">{o.name.toUpperCase()}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none z-20" size={16} />
            </div>
          </div>
          {/* --- AKHIR KARTU PILIH OUTLET --- */}

        </div>
        {/* --- AKHIR KOLOM KIRI --- */}


        {/* --- KOLOM KANAN: TABEL DRAFT CART --- */}
        <div className="lg:col-span-8">
          <BentoCard noPadding className="flex flex-col h-full min-h-[500px]">
            
            {/* Header Tabel Draft */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2.5 rounded-lg text-indigo-600 shadow-sm"><ShoppingCart size={16}/></div>
                <div>
                  <h3 className="text-lg font-light text-slate-900 tracking-tight">Draft <span className="font-semibold">Request</span></h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.1em]">Total queuing: {cart.length} items</p>
                </div>
              </div>
              {cart.length > 0 && (
                <button 
                  onClick={() => { setCart([]); if(currentUser?.role !== 'ADMINOUTLET') setSelectedOutletId(''); }} 
                  className="text-[10px] font-semibold text-rose-400 hover:text-rose-600 uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all hover:bg-rose-50 border border-transparent hover:border-rose-100"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {/* Area Tabel */}
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
                          
                          {/* Info Item */}
                          <td className={`px-4 py-4 rounded-l-lg border-y border-l transition-colors ${isUnknown ? 'border-rose-100' : 'border-slate-100 group-hover:border-indigo-100'}`}>
                            <div className="space-y-3">
                              {isUnknown ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 text-rose-500 mb-1 font-semibold text-[9px] uppercase tracking-widest">
                                    <AlertCircle size={12} className="animate-pulse" /> Unknown Item
                                  </div>
                                  <div className="relative">
                                    <div className="flex items-center bg-white border border-rose-100 rounded-lg px-3 py-2 shadow-sm focus-within:border-rose-400 transition-all">
                                      <Search size={14} className="text-slate-300 mr-2" />
                                      <input className="flex-1 text-xs font-semibold outline-none bg-transparent" value={item.name} placeholder="Manual input..." onChange={(e) => { const n=[...cart]; n[idx].name=e.target.value; setCart(n); }} />
                                    </div>
                                    {item.name.length > 1 && (
                                      <div className="absolute z-50 w-full bg-white border border-slate-100 shadow-xl mt-1.5 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                                        {products.filter(p => p.name.toLowerCase().includes(item.name.toLowerCase())).map(p => (
                                          <div key={p.id} onClick={() => { const n=[...cart]; n[idx] = { ...n[idx], productId: p.id, name: p.name, itemGroupId: p.itemGroupId, itemGroupName: p.itemGroup?.name, uom: p.uom, isNew: false }; setCart(n); }} className="p-2.5 text-xs font-semibold hover:bg-indigo-50 cursor-pointer flex justify-between border-b border-slate-50 text-slate-600">
                                            <span>{p.name}</span><span className="text-indigo-600 uppercase text-[9px]">Connect</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{item.name}</p>
                                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">{item.itemGroupName || 'General'}</p>
                                </div>
                              )}
                              
                              {/* Opsi Satuan & Kategori */}
                              <div className="flex gap-2">
                                <select disabled={!item.isNew} className={`text-[9px] font-semibold px-2 py-1 rounded border-none outline-none appearance-none transition-all ${item.isNew ? 'bg-slate-900 text-white cursor-pointer' : 'bg-slate-200/50 text-slate-400'}`} value={item.itemGroupId} onChange={(e) => { const selectedId = e.target.value; const n = [...cart]; n[idx].itemGroupId = selectedId; n[idx].itemGroupName = itemGroups.find(g => g.id === selectedId)?.name; setCart(n); }}>
                                  <option value="">CATEGORY</option>
                                  {itemGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                                <select disabled={!item.isNew} className={`text-[9px] font-semibold px-2 py-1 rounded border-none outline-none appearance-none transition-all ${item.isNew ? 'bg-indigo-100 text-indigo-700 cursor-pointer' : 'bg-slate-200/50 text-slate-400'}`} value={item.uom} onChange={(e) => { const n=[...cart]; n[idx].uom=e.target.value; setCart(n); }}>
                                  {['PCS', 'PACK', 'BTL', 'KG', 'CAN', 'GR', 'ML', 'LTR'].map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div>
                            </div>
                          </td>
                          
                          {/* Quantity Input */}
                          <td className={`px-3 py-4 text-center border-y transition-colors ${isUnknown ? 'border-rose-100' : 'border-slate-100 group-hover:border-indigo-100'}`}>
                            <input type="number" className="w-20 p-2.5 bg-white border border-slate-100 rounded-lg text-center font-semibold text-indigo-600 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm" value={item.quantity} onChange={(e) => { const n=[...cart]; n[idx].quantity=Number(e.target.value); setCart(n); }} />
                          </td>
                          
                          {/* Notes Input */}
                          <td className={`px-4 py-4 border-y transition-colors ${isUnknown ? 'border-rose-100' : 'border-slate-100 group-hover:border-indigo-100'}`}>
                            <input placeholder="Notes..." className="w-full p-2.5 bg-white border border-slate-100 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300 shadow-sm text-slate-600 placeholder:text-slate-300" value={item.notes} onChange={(e) => { const n=[...cart]; n[idx].notes=e.target.value; setCart(n); }} />
                          </td>
                          
                          {/* Hapus Baris */}
                          <td className={`px-3 py-4 text-right rounded-r-lg border-y border-r transition-colors ${isUnknown ? 'border-rose-100' : 'border-slate-100 group-hover:border-indigo-100'}`}>
                            <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 duration-300">
                              <X size={16}/>
                            </button>
                          </td>

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

            {/* Action Footer Button */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
              <button 
                onClick={handleSendRequest} 
                disabled={loading || cart.length === 0} 
                className={`w-full py-4 rounded-xl font-semibold text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:translate-y-0 translate-y-[-1px] ${cart.length > 0 ? 'bg-slate-900 text-white hover:bg-indigo-600 hover:shadow-indigo-500/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'Complete & Send Request'}
              </button>
            </div>
            
          </BentoCard>
        </div>
        {/* --- AKHIR KOLOM KANAN --- */}
        
      </div>
    </AnimatedWrapper>
  );
}