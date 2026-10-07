/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileUp, ChevronDown, FileSpreadsheet, ClipboardList, 
  History as HistoryIcon, RefreshCw 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast'; // Tambahan utilitas global toast
import { fetchApi } from '../../../utils/api'; // Menggunakan utilitas global API

/* --- UI COMPONENTS IMPORT --- */
import PageHeader from '@/components/ui/PageHeader';
import RequestForm from './components/RequestForm';
import RequestHistory from './components/RequestHistory';
import { ShoppingCart } from 'lucide-react';
/* --- AKHIR UI COMPONENTS IMPORT --- */

export default function AdminOutletRequestPage() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [products, setProducts] = useState<any[]>([]);
  const [itemGroups, setItemGroups] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]); 
  const [selectedOutletId, setSelectedOutletId] = useState<string>(''); 
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [importSuggestions, setImportSuggestions] = useState<any[]>([]); 
  const [currentUser, setCurrentUser] = useState<any>(null);

  const importMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // --- AKHIR STATE MANAGEMENT ---

  // --- LIFECYCLE & EVENT LISTENERS ---
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      if (user.role === 'ADMINOUTLET') {
        setSelectedOutletId(user.outletId);
      }
    }

    fetchData();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (importMenuRef.current && !importMenuRef.current.contains(event.target as Node)) {
        setShowImportMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // --- AKHIR LIFECYCLE ---

  // --- FETCH DATA (API CALLS) ---
  const fetchData = async () => {
    try {
      // Menggunakan fetchApi global (otomatis menyisipkan token)
      const [prodRes, groupRes, outletRes] = await Promise.all([
        fetchApi('/product'), 
        fetchApi('/item-group'), 
        fetchApi('/outlet') 
      ]);
      setProducts(await prodRes.json());
      setItemGroups(await groupRes.json());
      setOutlets(await outletRes.json());
    } catch (err) { 
      toast.error("Gagal mengambil data produk dan outlet."); 
    }
  };
  // --- AKHIR FETCH DATA ---

  // --- EXCEL IMPORT LOGIC & SMART MATCHING ---
  const PRODUCT_ALIASES: Record<string, string> = {
    'COKE': 'COLA', 'COCA COLA': 'COLA', 'JACK D': 'JACK DANIELS', 'JAGER': 'JAGERMEISTER'
  };

  const sanitize = (str: string) => str.toUpperCase().replace(/\s+/g, ' ').trim();

  const getSimilarityScore = (importName: string, dbName: string) => {
    const s1 = sanitize(importName);
    const s2 = sanitize(dbName);
    const aliasName = PRODUCT_ALIASES[s1];
    if (aliasName === s2 || s1 === s2) return 1.0; 
    
    const getGrams = (s: string) => {
      const grams = [];
      for (let i = 0; i < s.length - 1; i++) grams.push(s.substring(i, i + 2));
      return grams;
    };
    
    const g1 = getGrams(s1);
    const g2 = getGrams(s2);
    const intersection = g1.filter(x => g2.includes(x)).length;
    const total = g1.length + g2.length;
    return total === 0 ? 0 : (2.0 * intersection) / total;
  };

  const handleDownloadTemplate = () => {
    const templateData = [{ 'Nama Barang': 'JAGERMEISTER 700ML', 'Quantity': 5, 'Satuan': 'BTL', 'Catatan': 'Segera dikirim' }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Request");
    XLSX.writeFile(wb, "Template_Purchase_Request.xlsx");
    setShowImportMenu(false);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) return toast.error("File Excel kosong!");

        const newSuggestions: any[] = [];
        const confirmedItems: any[] = [];

        data.forEach((row: any) => {
          const rowName = row['Nama Barang'] || '';
          let bestMatch: any = null;
          let highestScore = 0;
          
          products.forEach(p => {
            const score = getSimilarityScore(rowName, p.name);
            if (score > highestScore) { highestScore = score; bestMatch = p; }
          });
          
          const itemBase = { name: rowName, quantity: Number(row['Quantity']) || 1, uom: row['Satuan'] || 'PCS', notes: row['Catatan'] || '' };
          
          if (highestScore > 0.85) {
            confirmedItems.push({ ...itemBase, productId: bestMatch.id, itemGroupId: bestMatch.itemGroupId, itemGroupName: bestMatch.itemGroup?.name, uom: bestMatch.uom, isNew: false });
          } else if (highestScore > 0.25) {
            newSuggestions.push({ ...itemBase, suggestion: bestMatch, score: Math.round(highestScore * 100) });
          } else {
            confirmedItems.push({ ...itemBase, productId: null, itemGroupId: '', isNew: true });
          }
        });
        
        setCart(prev => [...prev, ...confirmedItems]);
        setShowImportMenu(false);
        
        if (newSuggestions.length > 0) {
            setImportSuggestions(newSuggestions);
        } else {
            toast.success(`Berhasil mengimpor ${confirmedItems.length} item`);
        }
        
      } catch (err) { 
        toast.error("Gagal memproses file Excel"); 
      } finally { 
        if (fileInputRef.current) fileInputRef.current.value = ''; 
      }
    };
    reader.readAsBinaryString(file);
  };
  // --- AKHIR EXCEL IMPORT LOGIC ---

  // --- SUBMIT REQUEST LOGIC ---
  const addToCart = (product?: any) => {
    const newItem = product ? {
      productId: product.id, name: product.name, itemGroupId: product.itemGroupId, itemGroupName: product.itemGroup?.name || 'Umum',
      uom: product.uom || 'PCS', quantity: 1, notes: '', isNew: false 
    } : {
      productId: null, name: searchTerm, itemGroupId: '', itemGroupName: '', uom: 'PCS', quantity: 1, notes: '', isNew: true 
    };
    setCart([...cart, newItem]);
    setSearchTerm('');
  };

  const handleSendRequest = async () => {
    if (cart.length === 0 || !selectedOutletId) {
        return toast.error("Pilih outlet dan minimal 1 item untuk dipesan!");
    }

    const cleanedItems = cart.map(item => ({
      productId: item.productId || undefined, name: item.name, quantity: Number(item.quantity), uom: item.uom,
      itemGroupName: item.itemGroupName || 'Umum', itemGroupId: item.itemGroupId || undefined, notes: item.notes || ''
    }));

    setLoading(true);
    try {
      // Menggunakan fetchApi global
      const response = await fetchApi('/purchasing/pr/create', {
        method: 'POST', 
        body: JSON.stringify({ outletId: selectedOutletId, items: cleanedItems }),
      });
      
      if (response.ok) { 
        setCart([]); 
        if (currentUser?.role !== 'ADMINOUTLET') setSelectedOutletId(''); 
        toast.success("Request berhasil dikirim!"); 
        setActiveTab('history'); 
      } else {
        const errorData = await response.json();
        toast.error("Gagal: " + (Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message));
      }
    } catch (error) { 
      toast.error("Koneksi gagal saat mengirim request"); 
    } finally { 
      setLoading(false); 
    }
  };
  // --- AKHIR SUBMIT REQUEST LOGIC ---

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-600 relative selection:bg-indigo-100">
      <div className="w-full p-4 md:p-5 pb-24 space-y-5">
        
        {/* --- SECTION: HEADER & NAVIGATION --- */}
        <PageHeader 
          title="Purchase" highlight="Request" 
          description="Manage and synchronize your outlet inventory requirements with central warehouse."
          moduleName="Outlet Operations" icon={<ShoppingCart size={14} className="text-indigo-600" />}
        >
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            
            {/* Import Menu Dropdown */}
            <div className="relative" ref={importMenuRef}>
              <button onClick={() => setShowImportMenu(!showImportMenu)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all active:scale-95 shadow-sm group">
                <FileUp size={14} className="text-indigo-600 group-hover:scale-110 transition-transform" /> Actions & Imports
                <ChevronDown size={14} className={`transition-transform duration-300 ${showImportMenu ? 'rotate-180' : ''}`} />
              </button>
              
              <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" className="hidden" />

              {showImportMenu && (
                <div className="absolute right-0 sm:left-0 mt-2 w-64 bg-white border border-slate-100 rounded-xl shadow-xl z-[100] overflow-hidden animate-in zoom-in-95 origin-top-left">
                  <button onClick={handleDownloadTemplate} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-semibold text-slate-600 hover:bg-indigo-50/50 transition-colors border-b border-slate-50 text-left">
                    <FileSpreadsheet size={16} className="text-indigo-500" /> Download Template
                  </button>
                  <button onClick={() => { fileInputRef.current?.click(); setShowImportMenu(false); }} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-semibold text-slate-600 hover:bg-emerald-50/50 transition-colors text-left">
                    <FileUp size={16} className="text-emerald-500" /> Upload Excel File
                  </button>
                </div>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-xl h-fit shadow-inner">
              <button onClick={() => setActiveTab('form')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${activeTab === 'form' ? 'bg-white text-indigo-600 shadow-sm translate-y-[-1px]' : 'text-slate-500 hover:text-slate-800'}`}><ClipboardList size={14} /> Request Form</button>
              <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm translate-y-[-1px]' : 'text-slate-500 hover:text-slate-800'}`}><HistoryIcon size={14} /> History</button>
            </div>
          </div>
        </PageHeader>
        {/* --- AKHIR SECTION: HEADER --- */}

        {/* --- SECTION: MAIN CONTENT RENDERER --- */}
        {activeTab === 'form' ? (
          <RequestForm 
            searchTerm={searchTerm} setSearchTerm={setSearchTerm} products={products} addToCart={addToCart} 
            selectedOutletId={selectedOutletId} setSelectedOutletId={setSelectedOutletId} currentUser={currentUser} 
            outlets={outlets} cart={cart} setCart={setCart} itemGroups={itemGroups} handleSendRequest={handleSendRequest} loading={loading} 
          />
        ) : (
          <RequestHistory />
        )}
        {/* --- AKHIR SECTION: MAIN CONTENT --- */}

      </div>

      {/* --- SECTION: SYNC CONFLICTS MODAL --- */}
      {importSuggestions.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-8 border-b border-slate-50 bg-indigo-50/30 text-center">
              <div className="flex items-center justify-center gap-3 text-indigo-600 mb-2">
                  <RefreshCw size={24} className="animate-spin-slow" />
                  <h2 className="text-xl font-light tracking-tight text-slate-900">Sync <span className="font-semibold">Conflicts</span></h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">Similar items detected in inventory. Please link them.</p>
            </div>
            <div className="max-h-[350px] overflow-y-auto p-6 space-y-3 bg-slate-50/50">
              {importSuggestions.map((item, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 hover:border-indigo-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Spreadsheet Record</span>
                        <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest block mb-2 px-2 py-0.5 bg-indigo-50 rounded border border-indigo-100">Match {item.score}%</span>
                      <button onClick={() => { 
                          const linkedItem = { productId: item.suggestion.id, name: item.suggestion.name, itemGroupId: item.suggestion.itemGroupId, itemGroupName: item.suggestion.itemGroup?.name, uom: item.suggestion.uom || item.uom, quantity: item.quantity, notes: item.notes, isNew: false }; 
                          setCart(prev => [...prev, linkedItem]); 
                          setImportSuggestions(prev => prev.filter((_, i) => i !== idx)); 
                          if(importSuggestions.length === 1) toast.success("Semua item berhasil dihubungkan!"); 
                        }} 
                        className="bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-md hover:bg-slate-900 transition-all active:scale-95"
                      >
                          Use Connect
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 bg-white border-t border-slate-100">
              <button onClick={() => { 
                  const manualItems = importSuggestions.map(s => ({...s, productId: null, isNew: true})); 
                  setCart(prev => [...prev, ...manualItems]); 
                  setImportSuggestions([]); 
                  toast.success("Item ditambahkan sebagai produk baru");
                }} 
                className="w-full py-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-slate-800 transition-colors hover:bg-slate-50 rounded-lg"
              >
                  Ignore & Add as New
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- AKHIR SECTION: SYNC CONFLICTS MODAL --- */}

    </div>
  );
}