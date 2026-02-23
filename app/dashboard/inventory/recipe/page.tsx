/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, Plus, Edit2, Trash2, Save, ChefHat, Loader2, 
  Package, Layers, X, Settings2, ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  Maximize2, Minimize2
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

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [newMajorName, setNewMajorName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMajorId, setSelectedMajorId] = useState('');

  // --- LOGIKA COLLAPSE TABEL UTAMA ---
  // Default isTableVisible = true agar tabel terlihat saat load pertama
  const [isTableVisible, setIsTableVisible] = useState(true); 
  // expandedIds tetap kosong agar baris resep di dalam tabel defaultnya tertutup
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    sku: '', name: '', majorGroupId: '', menuGroupId: '',
    type: 'FINISHED', uom: 'Portion', qFactor: 0, yieldQty: 1
  });
  const [recipeItems, setRecipeItems] = useState<any[]>([]);

  const showNotif = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchGroups = useCallback(async () => {
    try {
      const [majorRes, groupRes] = await Promise.all([
        fetch('http://localhost:3000/menu/major-group/all'),
        fetch('http://localhost:3000/menu/menu-group/all')
      ]);
      setMajorGroups(await majorRes.json());
      setMenuGroups(await groupRes.json());
    } catch (err) { console.error("Gagal load groups", err); }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [menuRes, prodRes] = await Promise.all([
        fetch('http://localhost:3000/menu'),
        fetch('http://localhost:3000/product')
      ]);
      setMenus(await menuRes.json());
      setProducts(await prodRes.json());
      await fetchGroups();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [fetchGroups]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData, recipeItems: recipeItems.map(it => ({ ingredientId: it.ingredientId, quantity: Number(it.quantity), uom: it.uom })) };
      const url = isEdit ? `http://localhost:3000/menu/${currentId}` : 'http://localhost:3000/menu';
      const res = await fetch(url, { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { 
        showNotif(isEdit ? "Resep berhasil diperbarui!" : "Resep baru berhasil disimpan!");
        setShowModal(false); 
        fetchData(); 
      }
    } catch (error) { showNotif("Gagal menyimpan resep", 'error'); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus resep "${name}"?`)) return;
    try {
      const res = await fetch(`http://localhost:3000/menu/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotif(`Resep "${name}" berhasil dihapus!`);
        fetchData();
      }
    } catch (error) { showNotif("Gagal menghapus resep", 'error'); }
  };

  const handleEdit = (menu: any) => {
    setIsEdit(true);
    setCurrentId(menu.id);
    setFormData({
      sku: menu.sku, name: menu.name, majorGroupId: menu.majorGroupId,
      menuGroupId: menu.menuGroupId, type: menu.type, uom: menu.uom,
      qFactor: menu.qFactor, yieldQty: menu.yieldQty
    });
    setRecipeItems(menu.recipeItems.map((ri: any) => ({
      ingredientId: ri.ingredientId, name: ri.ingredient?.name, quantity: ri.quantity,
      uom: ri.uom, buyPrice: Number(ri.ingredient?.buyPrice || 0),
      conversionRate: Number(ri.ingredient?.conversionRate || 1),
      cost: (Number(ri.ingredient?.buyPrice || 0) / Number(ri.ingredient?.conversionRate || 1)) * ri.quantity
    })));
    setShowModal(true);
  };

  const addIngredient = (p: any) => {
    if (recipeItems.find(item => item.ingredientId === p.id)) return;
    setRecipeItems([...recipeItems, {
      ingredientId: p.id, name: p.name, quantity: 1, uom: p.recipeUom || p.uom, 
      buyPrice: Number(p.buyPrice), conversionRate: Number(p.conversionRate) || 1,
      cost: Number(p.buyPrice) / (Number(p.conversionRate) || 1)
    }]);
  };

  const updateItemQty = (index: number, qty: number) => {
    const updated = [...recipeItems];
    updated[index].quantity = qty;
    updated[index].cost = (updated[index].buyPrice / updated[index].conversionRate) * qty;
    setRecipeItems(updated);
  };

  const handleAddMajorGroup = async () => {
    if (!newMajorName.trim()) return;
    try {
      const res = await fetch('http://localhost:3000/menu/major-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMajorName })
      });
      if (res.ok) {
        setNewMajorName('');
        showNotif(`Major Group "${newMajorName}" ditambah!`);
        fetchGroups();
      }
    } catch (err) { showNotif("Gagal menambah Major Group", 'error'); }
  };

  const handleAddMenuGroup = async () => {
    if (!newGroupName.trim() || !selectedMajorId) {
      showNotif("Lengkapi data group!", 'error');
      return;
    }
    try {
      const res = await fetch('http://localhost:3000/menu/menu-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, majorGroupId: selectedMajorId })
      });
      if (res.ok) {
        setNewGroupName('');
        showNotif(`Menu Group "${newGroupName}" ditambah!`);
        fetchGroups();
      }
    } catch (err) { showNotif("Gagal menambah Menu Group", 'error'); }
  };

  const handleDeleteGroup = async (type: 'major' | 'menu', id: string, name: string) => {
    if (!confirm(`Hapus grup "${name}"?`)) return;
    try {
      const endpoint = type === 'major' ? `major-group/${id}` : `menu-group/${id}`;
      const res = await fetch(`http://localhost:3000/menu/${endpoint}`, { method: 'DELETE' });
      if (res.ok) {
        showNotif(`Grup "${name}" dihapus!`);
        fetchGroups();
      }
    } catch (err) { showNotif("Gagal menghapus grup", 'error'); }
  };

  const subtotalIngredients = recipeItems.reduce((sum, item) => sum + item.cost, 0);
  const finalHpp = subtotalIngredients + (subtotalIngredients * (formData.qFactor || 0) / 100);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(ingredientSearch.toLowerCase()));
  }, [products, ingredientSearch]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10 px-4 text-slate-700 relative">
      
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-10 right-10 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right duration-300 ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={20}/> : <AlertCircle className="text-red-500" size={20}/>}
          <p className="text-sm font-bold">{notification.message}</p>
        </div>
      )}

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
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {majorGroups.map((mg) => (
            <button key={mg.id} onClick={() => setActiveTab(mg.name)} className={`px-6 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === mg.name ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {mg.name}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type="text" placeholder="Cari menu..." className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs focus:ring-1 ring-indigo-200" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* --- BAGIAN TABEL UTAMA DENGAN LOGIKA SEMBUNYI TOTAL --- */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-800">Daftar Menu {activeTab}</span>
          </div>
          {/* Tombol untuk Sembunyikan/Tampilkan Seluruh Isi Tabel */}
          <button 
            onClick={() => setIsTableVisible(!isTableVisible)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold uppercase text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
          >
            {isTableVisible ? <><Minimize2 size={12}/> Sembunyikan List</> : <><Maximize2 size={12}/> Tampilkan List</>}
          </button>
        </div>

        {/* Tabel hanya muncul jika isTableVisible === true */}
        {isTableVisible && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
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
                    <tr className="hover:bg-slate-50/50 cursor-pointer group transition-colors" onClick={() => toggleExpand(m.id)}>
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
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id, m.name); }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
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
        )}
      </div>

      {/* --- SETUP MAJOR & MENU GROUPS --- */}
      {/* Bagian ini akan naik otomatis jika tabel di atas disembunyikan */}
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
              <input placeholder="Nama Major..." className="flex-1 bg-slate-50 px-3 py-1.5 rounded-lg text-xs outline-none border border-transparent focus:border-slate-200" value={newMajorName} onChange={(e) => setNewMajorName(e.target.value)} />
              <button onClick={handleAddMajorGroup} className="bg-slate-800 text-white p-1.5 rounded-lg hover:bg-slate-900"><Plus size={16}/></button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {majorGroups.map(mg => (
                <div key={mg.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-[11px] group">
                  <span>{mg.name}</span>
                  <button onClick={() => handleDeleteGroup('major', mg.id, mg.name)} className="text-slate-300 group-hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Package size={14}/> Menu Groups</h3>
            <div className="space-y-2">
              <select className="w-full bg-slate-50 px-3 py-1.5 rounded-lg text-xs outline-none border border-transparent focus:border-slate-200" value={selectedMajorId} onChange={(e) => setSelectedMajorId(e.target.value)}>
                <option value="">Pilih Major Group...</option>
                {majorGroups.map(mg => <option key={mg.id} value={mg.id}>{mg.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input placeholder="Nama Menu Group..." className="flex-1 bg-slate-50 px-3 py-1.5 rounded-lg text-xs outline-none border border-transparent focus:border-slate-200" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
                <button onClick={handleAddMenuGroup} className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700"><Plus size={16}/></button>
              </div>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {menuGroups.map(g => (
                <div key={g.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-[11px] group">
                  <span>{g.name} <span className="text-[9px] text-slate-400 ml-1">({g.majorGroup?.name})</span></span>
                  <button onClick={() => handleDeleteGroup('menu', g.id, g.name)} className="text-slate-300 group-hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Builder (Tetap Sama) */}
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
               {/* Konten modal di sini... */}
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