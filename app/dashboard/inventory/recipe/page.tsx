/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Edit2, Trash2, Save, ChefHat, Loader2, 
  Package, Layers, X, Settings2, ChevronDown, ChevronUp
} from 'lucide-react';

export default function RecipePage() {
  const [menus, setMenus] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [majorGroups, setMajorGroups] = useState<any[]>([]);
  const [menuGroups, setMenuGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('BAR');
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');

  // State untuk expand baris resep di tabel
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    sku: '', name: '', majorGroupId: '', menuGroupId: '',
    type: 'FINISHED', uom: 'Portion', qFactor: 0, yieldQty: 1
  });
  const [recipeItems, setRecipeItems] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [menuRes, prodRes, majorRes, groupRes] = await Promise.all([
        fetch('http://localhost:3000/menu'),
        fetch('http://localhost:3000/product'),
        fetch('http://localhost:3000/menu/major-group/all'),
        fetch('http://localhost:3000/menu/menu-group/all')
      ]);
      setMenus(await menuRes.json());
      setProducts(await prodRes.json());
      setMajorGroups(await majorRes.json());
      setMenuGroups(await groupRes.json());
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleEdit = (menu: any) => {
    setIsEdit(true);
    setCurrentId(menu.id);
    setFormData({
      sku: menu.sku,
      name: menu.name,
      majorGroupId: menu.majorGroupId,
      menuGroupId: menu.menuGroupId,
      type: menu.type,
      uom: menu.uom,
      qFactor: menu.qFactor,
      yieldQty: menu.yieldQty
    });
    
    const items = menu.recipeItems.map((ri: any) => {
      const buyPrice = Number(ri.ingredient?.buyPrice || 0);
      const conv = Number(ri.ingredient?.conversionRate || 1);
      return {
        ingredientId: ri.ingredientId,
        name: ri.ingredient?.name,
        quantity: ri.quantity,
        uom: ri.uom,
        buyPrice: buyPrice,
        conversionRate: conv,
        cost: (buyPrice / conv) * ri.quantity
      };
    });
    setRecipeItems(items);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus resep ini?')) return;
    try {
      const res = await fetch(`http://localhost:3000/menu/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (error) { console.error(error); }
  };

  const addIngredient = (p: any) => {
    if (recipeItems.find(item => item.ingredientId === p.id)) return;
    setRecipeItems([...recipeItems, {
      ingredientId: p.id, name: p.name, quantity: 1,
      uom: p.recipeUom || p.uom, buyPrice: Number(p.buyPrice),
      conversionRate: Number(p.conversionRate) || 1,
      cost: Number(p.buyPrice) / (Number(p.conversionRate) || 1)
    }]);
  };

  const updateItemQty = (index: number, qty: number) => {
    const updated = [...recipeItems];
    updated[index].quantity = qty;
    updated[index].cost = (updated[index].buyPrice / updated[index].conversionRate) * qty;
    setRecipeItems(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData, recipeItems: recipeItems.map(it => ({ ingredientId: it.ingredientId, quantity: Number(it.quantity), uom: it.uom })) };
      const url = isEdit ? `http://localhost:3000/menu/${currentId}` : 'http://localhost:3000/menu';
      const res = await fetch(url, { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setShowModal(false); fetchData(); }
    } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
  };

  const subtotalIngredients = recipeItems.reduce((sum, item) => sum + item.cost, 0);
  const finalHpp = subtotalIngredients + (subtotalIngredients * (formData.qFactor || 0) / 100);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(ingredientSearch.toLowerCase()));
  }, [products, ingredientSearch]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10 px-4 text-slate-700">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Recipe Master</h1>
          <p className="text-slate-500 text-xs">Kelola bahan baku dan kalkulasi HPP otomatis.</p>
        </div>
        <button onClick={() => { setIsEdit(false); setRecipeItems([]); setShowModal(true); }} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all text-sm">
          <Plus size={16}/> Menu Baru
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          {majorGroups.map((mg) => (
            <button key={mg.id} onClick={() => setActiveTab(mg.name)} className={`px-6 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === mg.name ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {mg.name}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type="text" placeholder="Cari menu..." className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs focus:ring-1 ring-indigo-200" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Main Table */}      
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
              <th className="px-6 py-3 w-10"></th>
              <th className="px-2 py-3 font-semibold uppercase">SKU / Nama Menu</th>
              <th className="px-6 py-3 text-center font-semibold uppercase">Grup</th>
              <th className="px-6 py-3 text-right font-semibold uppercase">Q-Factor</th>
              <th className="px-6 py-3 text-right font-semibold uppercase text-indigo-600">Total HPP</th>
              <th className="px-6 py-3 text-center font-semibold uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400 italic">Memuat data...</td></tr>
            ) : menus.filter(m => m.majorGroup?.name === activeTab && m.name.toLowerCase().includes(searchTerm.toLowerCase())).map((m) => (
              <React.Fragment key={m.id}>
                {/* Clickable row to show detail */}
                <tr 
                  className="hover:bg-slate-50/50 cursor-pointer group transition-colors" 
                  onClick={() => toggleExpand(m.id)}
                >
                  <td className="px-6 py-3 text-slate-400">
                    {expandedIds.includes(m.id) ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400">{m.sku}</span>
                      <span className="font-semibold text-slate-700">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center italic text-slate-500">{m.menuGroup?.name}</td>
                  <td className="px-6 py-3 text-right text-slate-500 font-medium">{m.qFactor}%</td>
                  <td className="px-6 py-3 text-right font-bold text-slate-800">Rp {Number(m.totalAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(m); }} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={14}/></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
                {/* Detail Recipe Items - Visible ONLY when expanded */}
                {expandedIds.includes(m.id) && (
                  <tr className="bg-slate-50/30">
                    <td colSpan={6} className="px-10 py-4 border-y border-slate-100">
                      <div className="grid grid-cols-2 gap-8 animate-in fade-in duration-300">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Komposisi Bahan</p>
                          {m.recipeItems?.map((ri: any, i: number) => (
                            <div key={i} className="flex justify-between py-1 border-b border-slate-100 text-[11px]">
                              <span className="text-slate-600">{ri.ingredient?.name}</span>
                              <span className="font-semibold text-slate-500">{ri.quantity} {ri.uom}</span>
                            </div>
                          ))}
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-[11px] self-start">
                           <div className="flex justify-between mb-1 text-slate-500"><span>Bahan Baku</span><span>Rp {Math.round(m.totalAmount / (1 + m.qFactor/100)).toLocaleString()}</span></div>
                           <div className="flex justify-between mb-2 text-orange-500"><span>Q-Factor ({m.qFactor}%)</span><span>+ Rp {Math.round(m.totalAmount - (m.totalAmount / (1 + m.qFactor/100))).toLocaleString()}</span></div>
                           <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-indigo-600">
                             <span>TOTAL HPP</span><span>Rp {Number(m.totalAmount).toLocaleString()}</span>
                           </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Group Setup - Always Visible (Static) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-widest">
            <Settings2 size={14} className="text-indigo-600"/> Setup Major & Menu Groups
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers size={14}/> Major Groups</h3>
            <div className="flex gap-2">
              <input placeholder="Nama Major Baru..." className="flex-1 bg-slate-50 px-3 py-1.5 rounded-lg text-xs outline-none border border-transparent focus:border-slate-200" />
              <button className="bg-slate-800 text-white p-1.5 rounded-lg hover:bg-slate-900"><Plus size={16}/></button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {majorGroups.map(mg => (
                <div key={mg.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-[11px] group">
                  <span>{mg.name}</span>
                  <button className="text-slate-300 group-hover:text-red-500"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Package size={14}/> Menu Groups</h3>
            <div className="space-y-2">
              <select className="w-full bg-slate-50 px-3 py-1.5 rounded-lg text-xs outline-none border border-transparent focus:border-slate-200">
                <option>Pilih Major Group...</option>
                {majorGroups.map(mg => <option key={mg.id}>{mg.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input placeholder="Nama Menu Group Baru..." className="flex-1 bg-slate-50 px-3 py-1.5 rounded-lg text-xs outline-none border border-transparent focus:border-slate-200" />
                <button className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700"><Plus size={16}/></button>
              </div>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {menuGroups.map(g => (
                <div key={g.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-[11px] group">
                  <span>{g.name} <span className="text-[9px] text-slate-400 ml-1">({g.majorGroup?.name})</span></span>
                  <button className="text-slate-300 group-hover:text-red-500"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Builder */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-slate-100">
            <div className="px-8 py-4 border-b flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <ChefHat size={18} className="text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-800">{isEdit ? 'Update Menu' : 'Tambah Menu Baru'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={18}/></button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-72 border-r bg-slate-50/50 p-5 flex flex-col gap-5 overflow-y-auto">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Informasi</p>
                  <input className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[11px] outline-none" placeholder="Nama Menu" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <select className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[11px] outline-none" value={formData.majorGroupId} onChange={e => setFormData({...formData, majorGroupId: e.target.value})}>
                    <option value="">Pilih Major...</option>
                    {majorGroups.map(mg => <option key={mg.id} value={mg.id}>{mg.name}</option>)}
                  </select>
                  <select className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[11px] outline-none" value={formData.menuGroupId} onChange={e => setFormData({...formData, menuGroupId: e.target.value})}>
                    <option value="">Pilih Grup...</option>
                    {menuGroups.filter(g => g.majorGroupId === formData.majorGroupId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Bahan Baku</p>
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    <input type="text" placeholder="Cari bahan..." className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] outline-none" value={ingredientSearch} onChange={e => setIngredientSearch(e.target.value)} />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    {filteredProducts.map(p => (
                      <button key={p.id} onClick={() => addIngredient(p)} className="w-full text-left p-2 bg-white border border-slate-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all text-[11px] font-medium truncate">
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-white">
                <div className="flex-1 p-6 overflow-y-auto space-y-2 scrollbar-thin">
                  {recipeItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 border border-slate-100 rounded-xl bg-white group hover:border-indigo-100">
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold text-slate-700">{item.name}</p>
                        <p className="text-[9px] text-slate-400">Rp {Math.round(item.buyPrice / item.conversionRate).toLocaleString()} / {item.uom}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-slate-50 rounded border border-slate-100">
                          <input type="number" className="w-12 bg-transparent p-1 text-center font-bold text-[11px] outline-none" value={item.quantity} onChange={e => updateItemQty(idx, Number(e.target.value))} />
                          <span className="pr-2 text-[9px] font-bold text-slate-400">{item.uom}</span>
                        </div>
                        <p className="w-20 text-right text-[11px] font-bold">Rp {Math.round(item.cost).toLocaleString()}</p>
                        <button onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 border-t bg-slate-50/30 flex justify-between items-center">
                  <div className="flex gap-6">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Q-Factor %</span>
                      <input type="number" className="w-16 border rounded p-1 text-xs font-bold outline-none" value={formData.qFactor} onChange={e => setFormData({...formData, qFactor: Number(e.target.value)})} />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-indigo-600 uppercase block mb-1">Total HPP</span>
                      <p className="text-xl font-bold text-slate-900">Rp {Math.round(finalHpp).toLocaleString()}</p>
                    </div>
                  </div>
                  <button onClick={handleSave} disabled={isSubmitting || recipeItems.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50">
                    {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <><Save size={14}/> SIMPAN</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}