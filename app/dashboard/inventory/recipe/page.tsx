/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, Plus, Edit2, Trash2, Save, ChefHat, Loader2, 
  Package, Layers, X, Settings2, ChevronDown, ChevronUp,
  AlertCircle, RefreshCw, CheckCircle2, LayoutGrid, Minimize2, Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast'; // Tambahan utilitas global
import { fetchApi } from '../../../utils/api'; // Menggunakan utilitas global API

export default function RecipePage() {
  // --- STATE MANAGEMENT ---
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

  // UI States
  const [isTableVisible, setIsTableVisible] = useState(true); 
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  // State Setup Groups
  const [newMajorName, setNewMajorName] = useState('');
  const [newMenuGroupName, setNewMenuGroupName] = useState('');
  const [selectedMajorForGroup, setSelectedMajorForGroup] = useState('');

  // State Form Resep
  const [formData, setFormData] = useState({
    sku: '', name: '', majorGroupId: '', menuGroupId: '',
    type: 'FINISHED', uom: 'Portion', qFactor: 0, yieldQty: 1
  });
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  // --- AKHIR STATE MANAGEMENT ---

  // --- FETCH DATA LOGIC ---
  const fetchGroups = useCallback(async () => {
    try {
      const [majorRes, groupRes] = await Promise.all([
        fetchApi('/menu/major-group/all'),
        fetchApi('/menu/menu-group/all')
      ]);
      setMajorGroups(await majorRes.json());
      setMenuGroups(await groupRes.json());
    } catch (err) { 
        toast.error("Gagal memuat kategori grup.");
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [menuRes, prodRes] = await Promise.all([
        fetchApi('/menu'),
        fetchApi('/product')
      ]);
      setMenus(await menuRes.json());
      setProducts(await prodRes.json());
      await fetchGroups();
    } catch (err) { 
        toast.error("Gagal memuat data Master Resep.");
    } finally { 
        setLoading(false); 
    }
  }, [fetchGroups]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);
  // --- AKHIR FETCH DATA ---


  // --- SETUP GROUPS LOGIC ---
  const handleAddMajorGroup = async () => {
    if (!newMajorName.trim()) return;
    try {
      const res = await fetchApi('/menu/major-group', {
        method: 'POST',
        body: JSON.stringify({ name: newMajorName })
      });
      if (res.ok) {
        setNewMajorName('');
        toast.success(`Major Group "${newMajorName}" berhasil ditambah!`);
        fetchGroups();
      } else {
        toast.error("Gagal menambah Major Group.");
      }
    } catch (error) { 
        toast.error("Kesalahan koneksi."); 
    }
  };

  const handleAddMenuGroup = async () => {
    if (!newMenuGroupName.trim() || !selectedMajorForGroup) {
      return toast.error("Lengkapi data group!");
    }
    try {
      const res = await fetchApi('/menu/menu-group', {
        method: 'POST',
        body: JSON.stringify({ name: newMenuGroupName, majorGroupId: selectedMajorForGroup })
      });
      if (res.ok) {
        setNewMenuGroupName('');
        toast.success(`Menu Group "${newMenuGroupName}" berhasil ditambah!`);
        fetchGroups();
      } else {
        toast.error("Gagal menambah Menu Group.");
      }
    } catch (error) { 
        toast.error("Kesalahan koneksi."); 
    }
  };

  const handleDeleteGroup = async (type: 'major' | 'menu', id: string, name?: string) => {
    if (!confirm(`Hapus grup ${name ? `"${name}"` : 'ini'}?`)) return;
    try {
      const endpoint = type === 'major' ? `major-group/${id}` : `menu-group/${id}`;
      const res = await fetchApi(`/menu/${endpoint}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Grup berhasil dihapus!`);
        fetchGroups();
      } else {
        toast.error("Gagal menghapus grup.");
      }
    } catch (error) { 
        toast.error("Kesalahan koneksi."); 
    }
  };
  // --- AKHIR SETUP GROUPS ---


  // --- RECIPE FORM & MODAL LOGIC ---
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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
      ingredientId: ri.ingredientId, 
      name: ri.ingredient?.name, 
      quantity: ri.quantity,
      uom: ri.uom, 
      buyPrice: Number(ri.ingredient?.buyPrice || 0),
      conversionRate: Number(ri.ingredient?.conversionRate || 1),
      cost: (Number(ri.ingredient?.buyPrice || 0) / Number(ri.ingredient?.conversionRate || 1)) * ri.quantity
    })));
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus resep "${name}"?`)) return;
    try {
      const res = await fetchApi(`/menu/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Resep "${name}" berhasil dihapus!`);
        fetchData();
      } else {
        toast.error("Gagal menghapus resep.");
      }
    } catch (error) { 
        toast.error("Kesalahan koneksi."); 
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { 
        ...formData, 
        recipeItems: recipeItems.map(it => ({ ingredientId: it.ingredientId, quantity: Number(it.quantity), uom: it.uom })) 
      };
      const url = isEdit ? `/menu/${currentId}` : '/menu';
      
      const res = await fetchApi(url, { 
        method: isEdit ? 'PATCH' : 'POST', 
        body: JSON.stringify(payload) 
      });
      
      if (res.ok) { 
        toast.success(isEdit ? "Resep berhasil diperbarui!" : "Resep baru berhasil disimpan!");
        setShowModal(false); 
        fetchData(); 
      } else {
        toast.error("Gagal menyimpan resep.");
      }
    } catch (error) { 
        toast.error("Terjadi kesalahan koneksi."); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

  const handleAddIngredient = (p: any) => {
    if (recipeItems.find(item => item.ingredientId === p.id)) {
        return toast.error("Bahan ini sudah ada di dalam resep.");
    }
    setRecipeItems([...recipeItems, {
      ingredientId: p.id, 
      name: p.name, 
      quantity: 1, 
      uom: p.recipeUom || p.uom, 
      buyPrice: Number(p.buyPrice), 
      conversionRate: Number(p.conversionRate) || 1,
      cost: Number(p.buyPrice) / (Number(p.conversionRate) || 1)
    }]);
  };

  const handleUpdateItemQty = (index: number, qty: number) => {
    const updated = [...recipeItems];
    updated[index].quantity = qty;
    updated[index].cost = (updated[index].buyPrice / updated[index].conversionRate) * qty;
    setRecipeItems(updated);
  };
  // --- AKHIR RECIPE FORM & MODAL LOGIC ---


  // --- CALCULATIONS & FILTERS ---
  const subtotalIngredients = recipeItems.reduce((sum, item) => sum + item.cost, 0);
  const finalHpp = subtotalIngredients + (subtotalIngredients * (formData.qFactor || 0) / 100);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(ingredientSearch.toLowerCase()));
  }, [products, ingredientSearch]);
  // --- AKHIR CALCULATIONS & FILTERS ---


  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 px-4 sm:px-6 text-slate-700 relative">
      
      {/* --- HEADER SECTION --- */}
      <section className="space-y-8 mt-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Recipe Master</h1>
            <p className="text-slate-500 text-sm font-medium">Kelola bahan baku dan kalkulasi HPP otomatis secara real-time.</p>
          </div>
          <button 
            onClick={() => { setIsEdit(false); setRecipeItems([]); setShowModal(true); }} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Plus size={18}/> Menu Baru
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs font-medium text-indigo-700">
              <AlertCircle size={20} className="text-indigo-400" />
              <p>HPP dihitung otomatis berdasarkan <b>Harga Beli Terakhir</b> bahan baku di Inventory List.</p>
            </div>
        </div>

        {/* Toolbar & Filter */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full">
            {majorGroups.map((mg) => (
              <button 
                key={mg.id} 
                onClick={() => setActiveTab(mg.name)} 
                className={`px-6 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === mg.name ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {mg.name}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Cari menu..." 
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm focus:ring-2 ring-indigo-500/10 transition-all shadow-sm" 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>
      </section>
      {/* --- AKHIR HEADER SECTION --- */}


      {/* --- SECTION: MAIN TABLE DAFTAR MENU --- */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        
        {/* Table Toolbar Sembunyikan/Tampilkan */}
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-800">Daftar Menu {activeTab}</span>
          </div>
          <button 
            onClick={() => setIsTableVisible(!isTableVisible)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold uppercase text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
          >
            {isTableVisible ? <><Minimize2 size={12}/> Sembunyikan List</> : <><Maximize2 size={12}/> Tampilkan List</>}
          </button>
        </div>

        {/* Tabel Konten Utama */}
        {isTableVisible && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="overflow-x-auto">
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
                            <span className="text-[10px] text-indigo-600 font-bold tracking-widest">{m.sku}</span>
                            <span className="font-semibold text-slate-700 text-sm">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                            <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-medium text-slate-500">{m.menuGroup?.name}</span>
                        </td>
                        <td className="px-6 py-3 text-right text-slate-500 font-medium">{m.qFactor}%</td>
                        <td className="px-6 py-3 text-right font-bold text-slate-800">Rp {Number(m.totalAmount || 0).toLocaleString()}</td>
                        <td className="px-6 py-3 text-center">
                          <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleEdit(m); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14}/></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id, m.name); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Accordion Detail Resep */}
                      {expandedIds.includes(m.id) && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={6} className="px-10 py-6 border-y border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in duration-300">
                              
                              {/* Rincian Komposisi */}
                              <div className="space-y-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Komposisi Bahan</p>
                                {m.recipeItems?.map((ri: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center py-1.5 text-xs">
                                    <span className="text-slate-600 font-medium">{ri.ingredient?.name}</span>
                                    <span className="font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100">{ri.quantity} {ri.uom}</span>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Kalkulasi Biaya (HPP) */}
                              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm self-start space-y-3">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Kalkulasi Biaya</p>
                                 <div className="flex justify-between text-xs text-slate-500 italic"><span>Bahan Baku</span><span>Rp {Math.round(m.totalAmount / (1 + m.qFactor/100)).toLocaleString()}</span></div>
                                 <div className="flex justify-between text-xs text-orange-500 italic"><span>Q-Factor ({m.qFactor}%)</span><span>+ Rp {Math.round(m.totalAmount - (m.totalAmount / (1 + m.qFactor/100))).toLocaleString()}</span></div>
                                 <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
                                   <span className="text-[10px] font-bold text-slate-400 uppercase">Total HPP</span>
                                   <span className="text-lg font-black text-indigo-600">Rp {Number(m.totalAmount).toLocaleString()}</span>
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
          </div>
        )}
      </div>
      {/* --- AKHIR SECTION: MAIN TABLE --- */}


      {/* --- SECTION: SETUP MAJOR & MENU GROUPS --- */}
      <section className="pt-12 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><LayoutGrid size={20} /></div>
          <h2 className="text-xl font-semibold text-slate-800">Setup Groups</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Major Groups Setup */}
          <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 space-y-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers size={14}/> Manage Major Groups</h3>
            <div className="flex gap-2">
              <input 
                placeholder="Nama Major..." 
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all" 
                value={newMajorName} onChange={(e) => setNewMajorName(e.target.value)}
              />
              <button onClick={handleAddMajorGroup} className="bg-slate-900 hover:bg-black text-white px-4 rounded-xl transition-all active:scale-95"><Plus size={20}/></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {majorGroups.map(mg => (
                <div key={mg.id} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-3 shadow-sm group">
                  {mg.name}
                  <button onClick={() => handleDeleteGroup('major', mg.id, mg.name)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={14}/></button>
                </div>
              ))}
            </div>
          </div>

          {/* Menu Groups Setup */}
          <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 space-y-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Package size={14}/> Manage Menu Groups</h3>
            <div className="space-y-3">
              <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none cursor-pointer" value={selectedMajorForGroup} onChange={(e) => setSelectedMajorForGroup(e.target.value)}>
                <option value="">Pilih Major...</option>
                {majorGroups.map(mg => <option key={mg.id} value={mg.id}>{mg.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input 
                  placeholder="Nama Menu Group..." 
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all" 
                  value={newMenuGroupName} onChange={(e) => setNewMenuGroupName(e.target.value)}
                />
                <button onClick={handleAddMenuGroup} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl transition-all active:scale-95"><Plus size={20}/></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {menuGroups.map(g => (
                <div key={g.id} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-3 shadow-sm group">
                  <span className="text-slate-400 font-bold mr-1">{g.majorGroup?.name} /</span> {g.name}
                  <button onClick={() => handleDeleteGroup('menu', g.id, g.name)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={14}/></button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
      {/* --- AKHIR SECTION: SETUP MAJOR & MENU GROUPS --- */}


      {/* --- SECTION: MODAL BUILDER RESEP --- */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-slate-100 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-8 py-5 border-b flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><ChefHat size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{isEdit ? 'Update Resep' : 'Tambah Menu Baru'}</h2>
                  <p className="text-[10px] font-medium text-slate-400">Pastikan komposisi bahan sudah sesuai takaran saji.</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"><X size={20}/></button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              
              {/* Kolom Kiri: Informasi Menu & Pencarian Bahan */}
              <div className="w-80 border-r bg-slate-50/50 p-6 flex flex-col gap-6 overflow-y-auto">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Informasi Menu</label>
                  <input className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/10" placeholder="Nama Menu" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <div className="grid grid-cols-1 gap-2">
                    <select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none cursor-pointer" value={formData.majorGroupId} onChange={e => setFormData({...formData, majorGroupId: e.target.value})}>
                      <option value="">Pilih Major...</option>
                      {majorGroups.map(mg => <option key={mg.id} value={mg.id}>{mg.name}</option>)}
                    </select>
                    <select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none cursor-pointer" value={formData.menuGroupId} onChange={e => setFormData({...formData, menuGroupId: e.target.value})}>
                      <option value="">Pilih Grup...</option>
                      {menuGroups.filter(g => g.majorGroupId === formData.majorGroupId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 border-t border-slate-200 pt-6">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-4">Pilih Bahan Baku</label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Cari bahan..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none" value={ingredientSearch} onChange={e => setIngredientSearch(e.target.value)} />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {filteredProducts.map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => handleAddIngredient(p)} 
                        className="w-full text-left p-3 bg-white border border-slate-200 rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all text-xs font-bold group flex justify-between items-center"
                      >
                        <span className="truncate">{p.name}</span>
                        <Plus size={14} className="text-indigo-400 group-hover:text-white" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Area Resep (Keranjang Komposisi) */}
              <div className="flex-1 flex flex-col bg-white">
                <div className="flex-1 p-8 overflow-y-auto space-y-3 scrollbar-thin">
                  {recipeItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center"><Package size={40} /></div>
                      <p className="text-sm font-medium italic">Belum ada bahan yang dipilih.</p>
                    </div>
                  ) : recipeItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-6 p-4 border border-slate-100 rounded-2xl bg-white shadow-sm hover:border-indigo-100 transition-all group">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] font-medium text-slate-400">Est. Price: Rp {Math.round(item.buyPrice / item.conversionRate).toLocaleString()} / {item.uom}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                          <input 
                            type="number" 
                            className="w-16 bg-transparent p-2 text-center font-black text-sm outline-none" 
                            value={item.quantity} 
                            onChange={e => handleUpdateItemQty(idx, Number(e.target.value))} 
                          />
                          <span className="pr-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {item.uom}
                          </span>
                        </div>
                        <p className="w-24 text-right text-sm font-black text-slate-700">
                          Rp {Math.round(item.cost).toLocaleString()}
                        </p>
                        <button 
                          onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))} 
                          className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Modal: Kalkulasi Total HPP */}
                <div className="p-8 border-t bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="flex gap-10">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Q-Factor Adjustment</span>
                      <div className="flex items-center gap-2">
                         <input type="number" className="w-20 bg-white border border-slate-200 rounded-xl p-2 text-sm font-black outline-none focus:ring-2 ring-indigo-500/10" value={formData.qFactor} onChange={e => setFormData({...formData, qFactor: Number(e.target.value)})} />
                         <span className="text-sm font-bold text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="h-10 w-[1px] bg-slate-200 hidden sm:block"></div>
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Estimated HPP</span>
                      <p className="text-2xl font-black text-slate-900 leading-none">Rp {Math.round(finalHpp).toLocaleString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleSave} 
                    disabled={isSubmitting || recipeItems.length === 0} 
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin"/> : <><Save size={20}/> SIMPAN RESEP</>}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- AKHIR SECTION: MODAL BUILDER RESEP --- */}

    </div>
  );
}