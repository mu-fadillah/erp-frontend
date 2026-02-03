/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  User, 
  MapPin,
  Loader2,
  X
} from 'lucide-react';

export default function OutletSetupPage() {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State [cite: 2026-01-29]
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    picName: '',
    address: ''
  });

  const API_URL = 'http://localhost:3000/outlet';

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      const data = await res.json();
      setOutlets(data);
    } catch (err) {
      console.error("Gagal memuat data outlet", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `${API_URL}/${editingId}` : API_URL;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        closeModal();
        fetchOutlets();
      } else {
        alert("Gagal menyimpan. Pastikan nama outlet belum digunakan.");
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi ke server.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus outlet ini secara permanen?")) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) fetchOutlets();
    } catch (err) {
      alert("Gagal menghapus data.");
    }
  };

  const openModal = (outlet?: any) => {
    if (outlet) {
      setEditingId(outlet.id);
      setFormData({ 
        name: outlet.name, 
        picName: outlet.picName || '', 
        address: outlet.address || '' 
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', picName: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const filteredOutlets = outlets.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.picName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8">
      {/* Header & Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Master Outlet</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Registrasi dan manajemen lokasi operasional Camden Group</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          TAMBAH OUTLET
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Cari berdasarkan nama atau PIC..."
          className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 transition-all text-sm font-bold shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Menghubungkan ke Database...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOutlets.map((outlet) => (
            <div key={outlet.id} className="bg-white rounded-3xl border-2 border-slate-50 p-6 hover:border-indigo-200 transition-all group relative shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  <Building2 size={28} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openModal(outlet)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(outlet.id)} className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="font-black text-slate-900 uppercase tracking-tight text-xl mb-6 leading-tight">{outlet.name}</h3>
              
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                    <User size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PIC</span>
                    <span className="text-xs font-black text-slate-700">{outlet.picName || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                    <MapPin size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alamat</span>
                    <span className="text-xs font-medium text-slate-500 leading-relaxed">{outlet.address || 'Belum diatur'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-black text-slate-900 uppercase tracking-tight">
                {editingId ? 'Edit Data Outlet' : 'Registrasi Outlet'}
              </h2>
              <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-slate-400 hover:text-rose-500 shadow-sm transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nama Outlet</label>
                <input 
                  required
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 transition-all text-sm font-bold"
                  placeholder="Contoh: Camden Sudirman"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nama PIC</label>
                <input 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 transition-all text-sm font-bold"
                  placeholder="Penanggung Jawab"
                  value={formData.picName}
                  onChange={(e) => setFormData({...formData, picName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Alamat Lengkap</label>
                <textarea 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 transition-all text-sm font-medium h-28 resize-none shadow-inner"
                  placeholder="Jl. Raya No..."
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                ></textarea>
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-[1.5rem] font-black text-sm transition-all shadow-xl shadow-indigo-100 active:scale-[0.98] mt-4 uppercase tracking-widest"
              >
                {editingId ? 'PERBARUI DATA' : 'SIMPAN OUTLET'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}