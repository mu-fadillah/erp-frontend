/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { LayoutGrid, Check, X, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchApi } from '../../../../utils/api'; // Mundur 4 level dari folder components

interface ItemGroupManagerProps {
  itemGroups: any[];
  onRefresh: () => void;
}

export default function ItemGroupManager({ itemGroups, onRefresh }: ItemGroupManagerProps) {
  // State khusus untuk manajemen grup
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupData, setEditGroupData] = useState({ name: '', majorGroup: '' });

  const handleAddGroup = async (e: any) => {
    e.preventDefault();
    const res = await fetchApi('/item-group', {
      method: 'POST',
      body: JSON.stringify({ name: e.target.gName.value, majorGroup: e.target.gMajor.value }),
    });
    
    if (res.ok) { 
      e.target.reset(); 
      onRefresh(); 
      toast.success("Group berhasil ditambahkan");
    } else {
      toast.error("Gagal menambahkan Group");
    }
  };

  const handleUpdateGroup = async (id: string) => {
    const res = await fetchApi(`/item-group/${id}`, { 
        method: 'PATCH', 
        body: JSON.stringify(editGroupData)
    });
    
    if (res.ok) {
        setEditingGroupId(null); 
        onRefresh(); 
        toast.success("Group berhasil diubah");
    } else {
        toast.error("Gagal mengubah Group");
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (confirm('Hapus group?')) { 
      const res = await fetchApi(`/item-group/${id}`, { method: 'DELETE' }); 
      if (res.ok) {
          onRefresh(); 
          toast.success("Group dihapus");
      } else {
          toast.error("Gagal menghapus group");
      }
    } 
  };

  return (
    <section className="pt-8 border-t border-slate-100">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><LayoutGrid size={20} /></div>
        <h2 className="text-xl font-semibold text-slate-800">Item Groups</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form Tambah Group */}
        <div className="lg:col-span-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-200/60 h-fit">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Tambah Group</h3>
          <form onSubmit={handleAddGroup} className="space-y-4">
            <input name="gName" required placeholder="Nama group..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/20" />
            <select name="gMajor" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer">
              <option value="BAR">BAR</option>
              <option value="KITCHEN">KITCHEN</option>
              <option value="OTHER">OTHER</option>
            </select>
            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">Simpan Group</button>
          </form>
        </div>

        {/* Group Chips List */}
        <div className="lg:col-span-8 flex flex-wrap gap-3">
          {itemGroups.map((g) => (
            <div key={g.id} className={`group flex items-center gap-4 border px-4 py-2.5 rounded-xl transition-all ${editingGroupId === g.id ? 'border-indigo-400 bg-indigo-50/30' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
              {editingGroupId === g.id ? (
                <div className="flex items-center gap-2">
                  <input className="bg-white border border-indigo-200 rounded-lg px-2 py-1 text-sm font-medium outline-none w-32" value={editGroupData.name} onChange={e => setEditGroupData({...editGroupData, name: e.target.value})} />
                  <button onClick={() => handleUpdateGroup(g.id)} className="p-1 bg-indigo-600 text-white rounded-md"><Check size={14}/></button>
                  <button onClick={() => setEditingGroupId(null)} className="p-1 bg-slate-200 text-slate-500 rounded-md"><X size={14}/></button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">{g.majorGroup}</span>
                    <span className="text-sm font-medium text-slate-700">{g.name}</span>
                  </div>
                  <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingGroupId(g.id); setEditGroupData({name: g.name, majorGroup: g.majorGroup}); }} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={13}/></button>
                    <button onClick={() => handleDeleteGroup(g.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 size={13}/></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}