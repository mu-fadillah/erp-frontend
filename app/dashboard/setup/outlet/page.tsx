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
import toast from 'react-hot-toast';
import { fetchApi } from '../../../utils/api'; // Menggunakan utilitas global API

export default function OutletSetupPage() {
  // --- STATE MANAGEMENT ---
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    picName: '',
    address: ''
  });
  // --- AKHIR STATE MANAGEMENT ---

  // --- LIFECYCLE & FETCH DATA ---
  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/outlet');
      const data = await res.json();
      
      // Safeguard untuk array
      if (Array.isArray(data)) {
        setOutlets(data);
      } else {
        setOutlets([]);
      }
    } catch (err) {
      toast.error("Gagal memuat data outlet");
    } finally {
      setLoading(false);
    }
  };
  // --- AKHIR LIFECYCLE & FETCH DATA ---

  // --- SUBMIT & DELETE HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `/outlet/${editingId}` : '/outlet';

    try {
      const res = await fetchApi(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        closeModal();
        fetchOutlets();
        toast.success(editingId ? "Outlet berhasil diperbarui" : "Outlet berhasil ditambahkan");
      } else {
        const errData = await res.json();
        toast.error(errData.message || "Gagal menyimpan. Pastikan nama outlet belum digunakan.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan koneksi ke server.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus outlet ini secara permanen?")) return;
    try {
      const res = await fetchApi(`/outlet/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchOutlets();
        toast.success("Outlet berhasil dihapus");
      } else {
        toast.error("Gagal menghapus data outlet.");
      }
    } catch (err) {
      toast.error("Gagal menghapus data. Koneksi terputus.");
    }
  };
  // --- AKHIR SUBMIT & DELETE HANDLERS ---

  // --- MODAL HANDLERS ---
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
  // --- AKHIR MODAL HANDLERS ---

  const filteredOutlets = outlets.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.picName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">Outlets</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage operational locations and point of contacts.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Filter outlet..."
              className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm w-full md:w-72 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all shadow-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 shadow-md shadow-indigo-200"
          >
            <Plus size={20} /> Add Outlet
          </button>
        </div>
      </div>
      {/* --- AKHIR HEADER SECTION --- */}


      {/* --- GRID CONTENT (DAFTAR OUTLET) --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/50 rounded-[2.5rem] border border-dashed border-slate-200">
          <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
          <p className="text-sm font-medium text-slate-400">Connecting to database...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredOutlets.map((outlet) => (
            
            /* --- KARTU OUTLET --- */
            <div key={outlet.id} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group relative">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  <Building2 size={24} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button onClick={() => openModal(outlet)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(outlet.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-slate-800 mb-6 truncate">{outlet.name}</h3>
              
              <div className="space-y-4 pt-5 border-t border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <User size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">PIC Manager</span>
                    <span className="text-sm font-medium text-slate-700">{outlet.picName || 'Unassigned'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <MapPin size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Address</span>
                    <span className="text-xs font-medium text-slate-500 leading-relaxed">{outlet.address || 'No address set'}</span>
                  </div>
                </div>
              </div>
            </div>
            /* --- AKHIR KARTU OUTLET --- */
            
          ))}
        </div>
      )}
      {/* --- AKHIR GRID CONTENT --- */}


      {/* --- MODAL FORM PEMBUATAN / EDIT OUTLET --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-800">
                    {editingId ? 'Edit Outlet' : 'Register Outlet'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Operational location details.</p>
                </div>
                <button onClick={closeModal} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* --- FORM INPUT --- */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-slate-500 ml-1">Outlet Name</label>
                  <input 
                    required
                    className="w-full mt-2 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all"
                    placeholder="e.g. Camden Sudirman"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 ml-1">PIC Manager</label>
                  <input 
                    className="w-full mt-2 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                    placeholder="Name of person in charge"
                    value={formData.picName}
                    onChange={(e) => setFormData({...formData, picName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 ml-1">Full Address</label>
                  <textarea 
                    rows={3}
                    className="w-full mt-2 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all resize-none"
                    placeholder="Complete address..."
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-semibold text-sm hover:bg-indigo-600 transition-all active:scale-[0.98] mt-4 shadow-lg shadow-slate-200 uppercase tracking-wider"
                >
                  {editingId ? 'Update Outlet' : 'Create Outlet'}
                </button>
              </form>
              {/* --- AKHIR FORM INPUT --- */}

            </div>
          </div>
        </div>
      )}
      {/* --- AKHIR MODAL FORM --- */}

    </div>
  );
}