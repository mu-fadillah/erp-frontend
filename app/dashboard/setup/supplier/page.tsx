/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Mail, Phone, Edit2, Trash2, 
  Loader2, X, MapPin, Factory
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchApi } from '../../../utils/api'; // Menggunakan utilitas global API

export default function SupplierSetupPage() {
  // --- STATE MANAGEMENT ---
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    address: ''
  });
  // --- AKHIR STATE MANAGEMENT ---

  // --- FETCH DATA ---
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/supplier');
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Gagal mengambil data supplier");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);
  // --- AKHIR FETCH DATA ---

  // --- ACTION HANDLERS (EDIT, DELETE, SUBMIT) ---
  const handleEditClick = (supplier: any) => {
    setIsEditMode(true);
    setCurrentId(supplier.id);
    setFormData({
      name: supplier.name,
      email: supplier.email || '',
      phoneNumber: supplier.phoneNumber || '',
      address: supplier.address || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Hapus supplier "${name}"?`)) {
      try {
        const res = await fetchApi(`/supplier/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchSuppliers();
          toast.success("Supplier berhasil dihapus");
        } else {
          toast.error("Gagal menghapus supplier.");
        }
      } catch (err) {
        toast.error("Terjadi kesalahan koneksi ke server.");
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setCurrentId(null);
    setFormData({ name: '', email: '', phoneNumber: '', address: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEditMode ? `/supplier/${currentId}` : '/supplier';
      const method = isEditMode ? 'PATCH' : 'POST';
      
      const res = await fetchApi(url, {
        method,
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        closeModal();
        fetchSuppliers();
        toast.success(isEditMode ? "Supplier berhasil diperbarui" : "Supplier berhasil ditambahkan");
      } else {
        const errData = await res.json();
        toast.error(errData.message || "Gagal menyimpan data supplier.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };
  // --- AKHIR ACTION HANDLERS ---

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">Suppliers</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage your vendor directory and contact points.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Filter by name..."
              className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm w-full md:w-72 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all shadow-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setIsEditMode(false); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 shadow-md shadow-indigo-200"
          >
            <Plus size={20} /> Add New
          </button>
        </div>
      </div>
      {/* --- AKHIR HEADER SECTION --- */}

      {/* --- GRID CONTENT (DAFTAR SUPPLIER) --- */}
      {loading && suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/50 rounded-[2.5rem] border border-dashed border-slate-200">
          <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
          <p className="text-sm font-medium text-slate-400">Fetching supplier data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {suppliers
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((supplier) => (
            
            /* --- KARTU SUPPLIER --- */
            <div key={supplier.id} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group relative">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-semibold text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  {supplier.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button onClick={() => handleEditClick(supplier)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={18}/></button>
                  <button onClick={() => handleDelete(supplier.id, supplier.name)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-slate-800 mb-1 truncate">{supplier.name}</h3>
              <div className="flex items-center gap-1.5 text-slate-400 mb-6">
                <MapPin size={14} />
                <span className="text-xs font-medium truncate">{supplier.address || 'No address provided'}</span>
              </div>

              <div className="pt-5 border-t border-slate-50 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                  <Mail size={16} className="text-slate-300" />
                  <span className="truncate">{supplier.email || '-'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                  <Phone size={16} className="text-slate-300" />
                  <span>{supplier.phoneNumber || '-'}</span>
                </div>
              </div>
            </div>
            /* --- AKHIR KARTU SUPPLIER --- */
            
          ))}
        </div>
      )}
      {/* --- AKHIR GRID CONTENT --- */}

      {/* --- MODAL FORM PEMBUATAN / EDIT SUPPLIER --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-800">
                    {isEditMode ? 'Edit Supplier' : 'New Supplier'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Fill in the contact details below.</p>
                </div>
                <button onClick={closeModal} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X size={24}/></button>
              </div>

              {/* --- FORM INPUT --- */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-slate-500 ml-1">Supplier Name</label>
                  <input 
                    required
                    className="w-full mt-2 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-300"
                    placeholder="Enter company name..."
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 ml-1">Email</label>
                    <input 
                      type="email"
                      className="w-full mt-2 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 ml-1">Phone</label>
                    <input 
                      className="w-full mt-2 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                      placeholder="+62..."
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 ml-1">Address</label>
                  <textarea 
                    rows={3}
                    className="w-full mt-2 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all resize-none"
                    placeholder="Full office address..."
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-semibold text-sm hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 shadow-lg shadow-slate-200"
                >
                  {loading ? 'Processing...' : isEditMode ? 'Update Supplier' : 'Create Supplier'}
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