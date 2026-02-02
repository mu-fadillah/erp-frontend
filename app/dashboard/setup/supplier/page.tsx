/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { 
  Plus, Search, Mail, Phone, Edit2, Trash2, 
  UserPlus, Loader2, X, MapPin 
} from 'lucide-react';

export default function SupplierSetupPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    address: ''
  });

  const API_URL = 'http://localhost:3000/supplier';

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      console.error("Gagal mengambil data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ name: '', email: '', phoneNumber: '', address: '' });
        setIsModalOpen(false);
        fetchSuppliers();
      }
    } catch (err) {
      alert("Gagal menambah supplier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto bg-slate-50 min-h-screen">
      {/* Header & Filter (Sama seperti sebelumnya) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Supplier Database</h1>
          <p className="text-sm text-slate-500 font-medium">Data vendor untuk otomatisasi PO</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {/* Grid List Supplier */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((supplier) => (
          <div key={supplier.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black uppercase">
                {supplier.name.substring(0, 2)}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                <button className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
              </div>
            </div>
            <h3 className="font-bold text-slate-800 uppercase tracking-tight mb-4">{supplier.name}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center"><Mail size={12}/></div>
                {supplier.email || '-'}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center"><Phone size={12}/></div>
                {supplier.phoneNumber || '-'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add Supplier */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900">New Supplier</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100"><X size={20}/></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Supplier Name</label>
                  <input 
                    required
                    className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    placeholder="Contoh: PT. Sumber Makmur"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <input 
                      type="email"
                      className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      placeholder="sales@vendor.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input 
                      className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      placeholder="0812..."
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Office Address</label>
                  <textarea 
                    rows={3}
                    className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
                    placeholder="Alamat lengkap..."
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 mt-4"
                >
                  {loading ? 'Saving...' : 'Save Supplier'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}