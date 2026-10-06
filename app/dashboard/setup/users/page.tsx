/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Shield, KeyRound, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchApi } from '../../../utils/api'; // Menggunakan utilitas global API

// --- KONFIGURASI HAK AKSES ---
const PERMISSION_LIST = [
  { id: 'finance-report', label: 'Financial Report' },
  { id: 'finance-sales', label: 'Sales Analysis' },
  { id: 'purchasing-pr', label: 'List Request (PR)' },
  { id: 'purchasing-po', label: 'Purchase Order (PO)' },
  { id: 'inventory-item', label: 'Item List' },
  { id: 'inventory-adjust', label: 'Inventory Adjustment' },
  { id: 'inventory-recipe', label: 'Menu List' },
  { id: 'production-kitchen', label: 'Kitchen Production' },
  { id: 'outlet-request', label: 'Request Order (Outlet)' },
  { id: 'outlet-receiving', label: 'Receiving (Outlet)' },
  { id: 'report-in', label: 'Report In (Barang Masuk)' },
  { id: 'setup-outlet', label: 'Outlet Management' },
  { id: 'setup-supplier', label: 'Supplier Management' },
  { id: 'setup-users', label: 'User Management' },
];
// --- AKHIR KONFIGURASI HAK AKSES ---

export default function UserManagementPage() {
  // --- STATE MANAGEMENT ---
  const [users, setUsers] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'ADMINOUTLET',
    outletId: '',
    permissions: [] as string[],
  });
  // --- AKHIR STATE MANAGEMENT ---

  // --- FETCH DATA (API CALLS) ---
  const fetchUsers = async () => {
    try {
      const res = await fetchApi('/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Gagal memuat data pengguna.");
    }
  };

  const fetchOutlets = async () => {
    try {
      const res = await fetchApi('/outlet');
      const data = await res.json();
      setOutlets(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Gagal memuat data outlet.");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchOutlets();
  }, []);
  // --- AKHIR FETCH DATA ---

  // --- LOGIKA FORM & PERMISSIONS ---
  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        username: user.username,
        password: '', // Kosongkan agar tidak terisi hash, opsional untuk diisi ulang
        role: user.role,
        outletId: user.outletId || '',
        permissions: user.permissions || [],
      });
    } else {
      setEditingId(null);
      setFormData({ username: '', password: '', role: 'ADMINOUTLET', outletId: '', permissions: [] });
    }
    setIsModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const selectAllPermissions = () => {
    setFormData(prev => ({ ...prev, permissions: PERMISSION_LIST.map(p => p.id) }));
  };

  const clearPermissions = () => {
    setFormData(prev => ({ ...prev, permissions: [] }));
  };
  // --- AKHIR LOGIKA FORM & PERMISSIONS ---

  // --- SUBMIT & DELETE HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/users/${editingId}` : '/users';
    const method = editingId ? 'PATCH' : 'POST';

    // Bersihkan payload sebelum dikirim
    const payload = { ...formData };
    if (!payload.password) delete payload.password; // Jangan kirim jika tidak diubah
    if (payload.role !== 'ADMINOUTLET') payload.outletId = ''; // Reset outlet jika bukan admin outlet

    try {
      const res = await fetchApi(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
        toast.success(editingId ? "Data pengguna diperbarui" : "Pengguna baru berhasil dibuat");
      } else {
        const err = await res.json();
        toast.error(`Gagal: ${err.message || 'Terjadi kesalahan sistem'}`);
      }
    } catch (err) {
      toast.error("Kesalahan koneksi ke server.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengguna ini secara permanen?')) return;
    
    try {
      const res = await fetchApi(`/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
        toast.success("Pengguna berhasil dihapus");
      } else {
        const err = await res.json();
        toast.error(`Gagal menghapus: ${err.message || ''}`);
      }
    } catch (err) {
      toast.error("Kesalahan koneksi ke server.");
    }
  };
  // --- AKHIR SUBMIT & DELETE HANDLERS ---

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      
      {/* --- HEADER SECTION --- */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Manajemen Pengguna</h2>
          <p className="text-sm text-slate-500">Kelola akses, role, dan akun karyawan</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Tambah User
        </button>
      </div>
      {/* --- AKHIR HEADER SECTION --- */}

      {/* --- TABLE CONTENT (DAFTAR USER) --- */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Username</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Outlet / Lokasi</th>
              <th className="p-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-medium text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold uppercase">
                    {user.username.charAt(0)}
                  </div>
                  {user.username}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    user.role === 'SUPERADMIN' ? 'bg-red-100 text-red-700' :
                    user.role === 'OFFICE' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4 text-slate-600">
                  {user.outlet?.name || '-'}
                </td>
                <td className="p-4 flex justify-end gap-2">
                  <button onClick={() => handleOpenModal(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* --- AKHIR TABLE CONTENT --- */}

      {/* --- MODAL FORM (TAMBAH/EDIT USER) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Shield className="text-indigo-600" size={20} />
                {editingId ? 'Edit User Profile' : 'Buat User Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="userForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Baris Username & Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Username</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center justify-between">
                      <span>Password</span>
                      {editingId && <span className="text-[10px] font-normal text-slate-400 text-transform: none">(Isi jika ingin ubah)</span>}
                    </label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        required={!editingId}
                        type="password" 
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Baris Role & Outlet */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Role</label>
                    <select 
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                    >
                      <option value="SUPERADMIN">SUPERADMIN</option>
                      <option value="OFFICE">OFFICE (Pusat)</option>
                      <option value="ADMINOUTLET">ADMIN OUTLET</option>
                    </select>
                  </div>
                  
                  {formData.role === 'ADMINOUTLET' && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Penempatan Outlet</label>
                      <select 
                        required
                        value={formData.outletId}
                        onChange={e => setFormData({...formData, outletId: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                      >
                        <option value="">Pilih Outlet...</option>
                        {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Blok Konfigurasi RBAC Permissions */}
                {formData.role !== 'SUPERADMIN' && (
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-xs font-bold text-slate-500 uppercase block">Konfigurasi Akses Menu (Permissions)</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={selectAllPermissions} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Pilih Semua</button>
                        <button type="button" onClick={clearPermissions} className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">Hapus Semua</button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {PERMISSION_LIST.map((perm) => {
                        const isChecked = formData.permissions.includes(perm.id);
                        return (
                          <div 
                            key={perm.id} 
                            onClick={() => togglePermission(perm.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                              isChecked ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {isChecked ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-slate-300" />}
                            <span className="text-sm font-semibold">{perm.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border rounded-xl hover:bg-slate-50">Batal</button>
              <button form="userForm" type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">
                {editingId ? 'Simpan Perubahan' : 'Buat User'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- AKHIR MODAL FORM --- */}
      
    </div>
  );
}