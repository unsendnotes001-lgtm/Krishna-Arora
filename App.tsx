
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, LedgerStats, PaymentMethod, User } from './types';
import StatCard from './components/StatCard';
import TransactionForm from './components/TransactionForm';
import { analyzeLedger } from './services/geminiService';

// --- SHOP CONFIGURATION (Change these for your shop) ---
const SHOP_CONFIG = {
  name: "VIKAS PUSTAK BHANDAR",
  tagline: "Specialist in Academic & Competitive Books",
  address: "Shop No. 12, Main Market, Gandhi Chowk, New Delhi - 110001",
  phone: "+91 98765-43210",
  email: "vikasbooks@gmail.com",
  gstin: "07AAAAA0000A1Z5"
};

const App: React.FC = () => {
  // --- Auth & Profile State ---
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kitab_khata_user');
    return saved ? JSON.parse(saved) : null;
  });

  // --- Core Data State ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('kitab_khata_data_v6');
    return saved ? JSON.parse(saved) : [];
  });

  // --- UI States ---
  const [isAdding, setIsAdding] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'uploading'>('synced');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [manualLoginName, setManualLoginName] = useState('');

  // --- Google Identity initialization ---
  useEffect(() => {
    const handleCredentialResponse = (response: any) => {
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        const newUser: User = {
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
          id: payload.sub
        };
        setUser(newUser);
        localStorage.setItem('kitab_khata_user', JSON.stringify(newUser));
        setSyncStatus('uploading');
        setTimeout(() => setSyncStatus('synced'), 2000);
      } catch (e) {
        console.error("Authentication failed", e);
      }
    };

    const google = (window as any).google;
    if (!user && google) {
      google.accounts.id.initialize({
        client_id: "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com", 
        callback: handleCredentialResponse,
        auto_select: false
      });
      google.accounts.id.renderButton(
        document.getElementById("google-login-target"),
        { theme: "outline", size: "large", width: 320, shape: "pill" }
      );
    }
  }, [user]);

  // --- Local Persistence & Theme ---
  useEffect(() => {
    if (user) {
      setSyncStatus('uploading');
      const timer = setTimeout(() => {
        localStorage.setItem('kitab_khata_data_v6', JSON.stringify(transactions));
        setSyncStatus('synced');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [transactions, user]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // --- Data Logic ---
  const stats: LedgerStats = useMemo(() => {
    return transactions.reduce((acc, t) => ({
      totalSales: acc.totalSales + t.totalPrice,
      totalReceived: acc.totalReceived + t.amountPaid,
      totalPending: acc.totalPending + t.balance,
      transactionCount: acc.transactionCount + 1
    }), { totalSales: 0, totalReceived: 0, totalPending: 0, transactionCount: 0 });
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return transactions
      .filter(t => t.customerName.toLowerCase().includes(term) || t.bookTitle.toLowerCase().includes(term))
      .sort((a, b) => sortOrder === 'desc' 
        ? new Date(b.date).getTime() - new Date(a.date).getTime() 
        : new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, searchTerm, sortOrder]);

  const { customerRecords, customerStats } = useMemo(() => {
    if (!selectedCustomer) return { customerRecords: [], customerStats: { total: 0, paid: 0, due: 0 } };
    const records = transactions.filter(t => t.customerName === selectedCustomer);
    const stats = records.reduce((acc, r) => ({
      total: acc.total + r.totalPrice,
      paid: acc.paid + r.amountPaid,
      due: acc.due + r.balance
    }), { total: 0, paid: 0, due: 0 });
    return { customerRecords: records, customerStats: stats };
  }, [transactions, selectedCustomer]);

  // --- Handlers ---
  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLoginName.trim()) return;
    const newUser: User = {
      name: manualLoginName,
      email: `${manualLoginName.toLowerCase().replace(' ', '.')}@shop.local`,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(manualLoginName)}&background=2563eb&color=fff`,
      id: `local-${Date.now()}`
    };
    setUser(newUser);
    localStorage.setItem('kitab_khata_user', JSON.stringify(newUser));
  };

  const handleSave = (data: Omit<Transaction, 'id' | 'balance' | 'status'>) => {
    const balance = data.totalPrice - data.amountPaid;
    const status = balance <= 0 ? 'Paid' : (data.amountPaid === 0 ? 'Unpaid' : 'Partial');
    
    if (editingTransaction) {
      setTransactions(transactions.map(t => t.id === editingTransaction.id ? { ...data, id: t.id, balance, status: status as any } : t));
      setEditingTransaction(null);
    } else {
      setTransactions([{ ...data, id: crypto.randomUUID(), balance, status: status as any }, ...transactions]);
    }
    setIsAdding(false);
  };

  const exportToCSV = () => {
    const rows = [
      ["Date", "Customer", "Item", "Total Price", "Amount Paid", "Balance Due", "Method"],
      ...transactions.map(t => [t.date, t.customerName, t.bookTitle, t.totalPrice, t.amountPaid, t.balance, t.paymentMethod])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ledger_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const logout = () => {
    if (confirm("Logout current session?")) {
      setUser(null);
      localStorage.removeItem('kitab_khata_user');
      window.location.reload();
    }
  };

  // --- Guarded View: Login (Fixes 401 Bug) ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-10 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-blue-500/30">
            <i className="fas fa-book-journal-whills text-white text-4xl"></i>
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">KitabKhata Pro</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Digital Ledger for Modern Shops</p>
          </div>
          <div className="space-y-6">
            <div id="google-login-target" className="flex justify-center"></div>
            <div className="w-full flex items-center py-2">
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
              <span className="px-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">OR USE SHOP LOGIN</span>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
            </div>
            <form onSubmit={handleManualLogin} className="space-y-3">
               <input 
                type="text" 
                placeholder="Enter Your Name (e.g. Vikas Ji)" 
                required
                value={manualLoginName}
                onChange={(e) => setManualLoginName(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold dark:text-white text-center"
               />
               <button type="submit" className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white font-black rounded-2xl hover:bg-black transition uppercase text-xs tracking-widest">
                 Open Shop Ledger
               </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Dashboard View ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[60] no-print px-6">
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4 cursor-pointer" onClick={() => setSelectedCustomer(null)}>
            <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <i className="fas fa-book-journal-whills text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter">KITAB KHATA</h1>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span> {syncStatus}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
              <i className={`fas ${isDarkMode ? 'fa-sun text-amber-500' : 'fa-moon text-blue-500'}`}></i>
            </button>
            <button onClick={exportToCSV} className="hidden md:flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition">
              <i className="fas fa-file-export"></i>
              <span>Export CSV</span>
            </button>
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={logout}>
              <img src={user.picture} className="w-10 h-10 rounded-full border-2 border-slate-100 dark:border-slate-800" alt="Profile" />
              <div className="hidden lg:block text-right">
                <p className="text-xs font-black text-slate-800 dark:text-white leading-none mb-1">{user.name}</p>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Shop Manager</p>
              </div>
            </div>
            <button onClick={() => { setEditingTransaction(null); setIsAdding(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 transform active:scale-95 transition">
              <i className="fas fa-plus mr-2"></i> New Bill
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 mt-8 pb-20 no-print">
        {!selectedCustomer ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Sales" value={`₹${stats.totalSales.toLocaleString()}`} icon="fa-chart-line" colorClass="bg-blue-600" />
              <StatCard title="Received" value={`₹${stats.totalReceived.toLocaleString()}`} icon="fa-wallet" colorClass="bg-emerald-600" />
              <StatCard title="Pending" value={`₹${stats.totalPending.toLocaleString()}`} icon="fa-hourglass-half" colorClass="bg-rose-500" />
              <StatCard title="Total Bills" value={stats.transactionCount} icon="fa-receipt" colorClass="bg-slate-700" />
            </section>

            {/* AI Insight */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
               <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600">
                      <i className="fas fa-wand-sparkles"></i>
                    </div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">AI Business Samiksha</h2>
                  </div>
                  {aiInsight ? (
                    <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-medium italic text-slate-600 dark:text-slate-300">
                      {aiInsight}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">Get insights about your debtors and popular books in simple Hinglish using Gemini AI.</p>
                  )}
               </div>
               <button 
                 onClick={async () => { setIsAnalyzing(true); const res = await analyzeLedger(transactions); setAiInsight(res); setIsAnalyzing(false); }}
                 disabled={isAnalyzing || transactions.length === 0}
                 className="px-8 py-4 bg-slate-900 dark:bg-blue-600 text-white font-black rounded-2xl shadow-xl disabled:opacity-50"
               >
                 {isAnalyzing ? <i className="fas fa-circle-notch fa-spin"></i> : 'Run AI Analysis'}
               </button>
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
               <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Recent Sales</h2>
                  <div className="relative w-64">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm outline-none" />
                  </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                      <tr>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {filteredTransactions.map(t => (
                         <tr key={t.id} onClick={() => setSelectedCustomer(t.customerName)} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition cursor-pointer group">
                           <td className="px-8 py-8 text-sm font-black text-slate-400">{t.date}</td>
                           <td className="px-8 py-8">
                             <span className="text-base font-black text-slate-800 dark:text-white block group-hover:text-blue-600 transition">{t.customerName}</span>
                           </td>
                           <td className="px-8 py-8 text-sm font-bold text-slate-600 dark:text-slate-400">{t.bookTitle}</td>
                           <td className="px-8 py-8 text-right font-black text-xl text-rose-500">₹{t.balance.toLocaleString()}</td>
                           <td className="px-8 py-8 text-center">
                             <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                               t.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                               t.status === 'Partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                               'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                             }`}>
                               {t.status}
                             </span>
                           </td>
                           <td className="px-8 py-8 text-right">
                              <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={(e) => { e.stopPropagation(); setEditingTransaction(t); setIsAdding(true); }} className="p-2 text-blue-500"><i className="fas fa-pen"></i></button>
                                <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete record?')) setTransactions(transactions.filter(x => x.id !== t.id)); }} className="p-2 text-rose-500"><i className="fas fa-trash"></i></button>
                              </div>
                           </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        ) : (
          /* Customer Detail View */
          <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-500">
             <div className="flex items-center justify-between">
                <button onClick={() => setSelectedCustomer(null)} className="flex items-center space-x-3 text-slate-400 hover:text-blue-500 font-black uppercase text-xs tracking-widest transition">
                   <i className="fas fa-arrow-left"></i> <span>Back to Ledger</span>
                </button>
                <button onClick={() => window.print()} className="bg-slate-900 dark:bg-slate-800 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center space-x-3">
                   <i className="fas fa-print"></i> <span>Print Account</span>
                </button>
             </div>

             <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-slate-900 p-16 text-white flex flex-col md:flex-row items-end justify-between gap-12 relative">
                   <div className="relative z-10">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mb-3 opacity-70">Party Statement:</h2>
                      <h1 className="text-6xl font-black mb-4 tracking-tighter uppercase leading-none">{selectedCustomer}</h1>
                      <p className="font-bold italic text-slate-400 text-lg">Verified Customer Account Record</p>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full md:w-auto relative z-10">
                      <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex flex-col items-center">
                        <p className="text-[10px] font-black text-slate-400 mb-2 uppercase">Total Bill</p>
                        <p className="text-3xl font-black">₹{customerStats.total.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex flex-col items-center">
                        <p className="text-[10px] font-black text-emerald-400 mb-2 uppercase">Paid</p>
                        <p className="text-3xl font-black text-emerald-400">₹{customerStats.paid.toLocaleString()}</p>
                      </div>
                      <div className="bg-rose-500/10 backdrop-blur-md p-6 rounded-3xl border border-rose-500/20 flex flex-col items-center border-2">
                        <p className="text-[10px] font-black text-rose-300 mb-2 uppercase">Current Due</p>
                        <p className="text-4xl font-black text-rose-500">₹{customerStats.due.toLocaleString()}</p>
                      </div>
                   </div>
                </div>
                <div className="p-12">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                         <th className="pb-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                         <th className="pb-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                         <th className="pb-10 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Bill Value</th>
                         <th className="pb-10 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Paid</th>
                         <th className="pb-10 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {customerRecords.map(r => (
                         <tr key={r.id}>
                           <td className="py-10 text-sm font-black text-slate-400">{r.date}</td>
                           <td className="py-10">
                             <span className="font-black text-slate-800 dark:text-white block text-xl">{r.bookTitle}</span>
                           </td>
                           <td className="py-10 text-right font-bold text-lg">₹{r.totalPrice.toLocaleString()}</td>
                           <td className="py-10 text-right font-black text-emerald-600 text-lg">₹{r.amountPaid.toLocaleString()}</td>
                           <td className="py-10 text-right font-black text-rose-600 text-3xl tracking-tighter">₹{r.balance.toLocaleString()}</td>
                         </tr>
                       ))}
                     </tbody>
                     <tfoot>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <td colSpan={4} className="py-16 px-10 text-right text-xs font-black uppercase text-slate-400 tracking-widest">Grand Payable Outstanding Balance:</td>
                          <td className="py-16 px-10 text-right font-black text-7xl text-rose-600 tracking-tighter">₹{customerStats.due.toLocaleString()}</td>
                        </tr>
                     </tfoot>
                   </table>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Entry Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 no-print">
          <div className="w-full max-w-2xl animate-in zoom-in duration-300">
            <TransactionForm 
              onSave={handleSave} 
              onCancel={() => { setIsAdding(false); setEditingTransaction(null); }} 
              initialData={editingTransaction}
            />
          </div>
        </div>
      )}

      {/* ENHANCED PROFESSIONAL PRINT VIEW */}
      <div className="print-only p-12 print-container text-slate-900 bg-white min-h-screen font-serif">
        {/* SHOP HEADER WITH LOGO */}
        <div className="flex justify-between items-start mb-16 border-b-8 border-slate-900 pb-12">
           <div className="flex items-center space-x-8">
              <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-lg">
                 <i className="fas fa-book-journal-whills text-white text-5xl"></i>
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tighter mb-1 uppercase leading-none">{SHOP_CONFIG.name}</h1>
                <p className="text-sm font-bold text-blue-600 uppercase tracking-[0.3em] mb-3">{SHOP_CONFIG.tagline}</p>
                <div className="space-y-1 text-xs font-bold text-slate-600 uppercase tracking-widest">
                   <p><i className="fas fa-location-dot mr-2"></i>{SHOP_CONFIG.address}</p>
                   <p><i className="fas fa-phone mr-2"></i>PH: {SHOP_CONFIG.phone} | EMAIL: {SHOP_CONFIG.email}</p>
                   <p className="text-slate-400 mt-2 font-black">GSTIN: {SHOP_CONFIG.gstin}</p>
                </div>
              </div>
           </div>
           <div className="text-right flex flex-col items-end">
             <div className="bg-slate-900 text-white px-6 py-3 rounded-xl mb-4">
                <p className="text-2xl font-black uppercase tracking-widest">Account Bill</p>
             </div>
             <p className="text-lg font-bold">DATE: {new Date().toLocaleDateString('en-IN')}</p>
             <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-2 border-t border-blue-100 pt-2">KitabKhata Pro Verified</p>
           </div>
        </div>

        {selectedCustomer && (
          <div>
            <div className="mb-16 grid grid-cols-2 gap-20">
               <div className="bg-slate-50 p-12 rounded-[3.5rem] border-2 border-slate-200">
                 <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6">Party Information:</h2>
                 <h3 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4">{selectedCustomer}</h3>
                 <div className="h-1.5 w-32 bg-slate-900"></div>
               </div>
               <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white flex flex-col justify-center shadow-2xl">
                  <div className="grid grid-cols-2 gap-10 text-center">
                    <div className="border-r border-white/10">
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Total Value</p>
                       <p className="text-3xl font-black text-white">₹{customerStats.total.toLocaleString()}</p>
                    </div>
                    <div>
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Amount Paid</p>
                       <p className="text-3xl font-black text-emerald-400">₹{customerStats.paid.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-10 pt-10 border-t border-white/10 text-center">
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Grand Total Net Due</p>
                     <p className="text-7xl font-black text-rose-500 tracking-tighter">₹{customerStats.due.toLocaleString()}</p>
                  </div>
               </div>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-8 text-left text-[11px] font-black uppercase tracking-widest border border-slate-900">DATE</th>
                  <th className="p-8 text-left text-[11px] font-black uppercase tracking-widest border border-slate-900">BOOK / ITEM DESCRIPTION</th>
                  <th className="p-8 text-right text-[11px] font-black uppercase tracking-widest border border-slate-900">PRICE</th>
                  <th className="p-8 text-right text-[11px] font-black uppercase tracking-widest border border-slate-900">PAID</th>
                  <th className="p-8 text-right text-[11px] font-black uppercase tracking-widest border border-slate-900">BALANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y-4 divide-slate-100">
                {customerRecords.map(r => (
                  <tr key={r.id}>
                    <td className="p-8 border border-slate-200 text-base font-bold text-slate-600">{r.date}</td>
                    <td className="p-8 border border-slate-200 font-black text-slate-900 text-2xl uppercase tracking-tight">{r.bookTitle}</td>
                    <td className="p-8 border border-slate-200 text-right font-bold text-xl">₹{r.totalPrice.toLocaleString()}</td>
                    <td className="p-8 border border-slate-200 text-right font-bold text-xl text-emerald-700">₹{r.amountPaid.toLocaleString()}</td>
                    <td className="p-8 border border-slate-200 text-right font-black text-rose-600 text-4xl tracking-tighter">₹{r.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td colSpan={4} className="p-16 text-right font-black uppercase text-slate-500 tracking-[0.5em] text-xs">Total Grand Outstanding Payable:</td>
                  <td className="p-16 text-right font-black text-8xl text-rose-600 tracking-tighter">₹{customerStats.due.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-32 flex justify-between items-start gap-32 px-10">
               <div className="flex-1 space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-900 inline-block pb-2">Business Terms:</h4>
                  <ul className="text-[10px] font-bold text-slate-500 space-y-2 list-none italic">
                    <li className="flex items-center"><i className="fas fa-circle text-[4px] mr-3"></i> Certified credit statement for accounting.</li>
                    <li className="flex items-center"><i className="fas fa-circle text-[4px] mr-3"></i> Please settle your balance due by next month.</li>
                    <li className="flex items-center"><i className="fas fa-circle text-[4px] mr-3"></i> No return policy on educational goods.</li>
                  </ul>
               </div>
               <div className="flex-1 grid grid-cols-2 gap-32 text-center pt-10">
                  <div className="space-y-6">
                    <div className="h-0.5 bg-slate-300"></div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Party Signature</p>
                  </div>
                  <div className="space-y-6">
                    <div className="h-0.5 bg-slate-900"></div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">Authorized Merchant</p>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
