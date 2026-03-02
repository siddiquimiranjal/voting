import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Vote, Trophy, User, CheckCircle2, AlertCircle, ChevronRight, BarChart3, Settings, LogOut, Plus, Trash2, X, Upload, Image as ImageIcon, Loader2, Lock, Unlock, ShieldCheck, Power, Crown } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  is_locked: number;
}

interface Nominee {
  id: number;
  category_id: number;
  name: string;
  description: string;
  image_url: string;
  votes: number;
}

interface Result {
  category_name: string;
  nominee_name: string;
  votes: number;
  category_id: number;
}

export default function App() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Frontend Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}` })
      });
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [voterId, setVoterId] = useState('');
  const [view, setView] = useState<'vote' | 'results' | 'admin'>('vote');
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Admin states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newNominee, setNewNominee] = useState({ name: '', description: '', imageUrl: '', categoryId: '' });
  const [adminSelectedCategoryId, setAdminSelectedCategoryId] = useState<string>('');
  const [adminNominees, setAdminNominees] = useState<Nominee[]>([]);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': adminToken
          },
          body: JSON.stringify({ image: base64, fileName: file.name })
        });
        const data = await res.json();
        if (data.url) {
          setNewNominee(prev => ({ ...prev, imageUrl: data.url }));
          setMessage({ type: 'success', text: 'Image uploaded successfully' });
        } else {
          setMessage({ type: 'error', text: data.error || 'Upload failed' });
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'Upload failed' });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    fetchCategories();
    
    // Generate or retrieve anonymous voter ID
    let id = localStorage.getItem('voter_id');
    if (!id) {
      id = 'voter_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('voter_id', id);
    }
    setVoterId(id);

    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setAdminToken(savedToken);
      setIsAdminLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchNominees(selectedCategory.id);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (adminSelectedCategoryId) {
      fetchAdminNominees(parseInt(adminSelectedCategoryId));
    } else {
      setAdminNominees([]);
    }
  }, [adminSelectedCategoryId]);

  useEffect(() => {
    if (view === 'results' && isAdminLoggedIn) {
      fetchResults();
    }
  }, [view, isAdminLoggedIn]);

  const fetchAdminNominees = async (catId: number) => {
    const res = await fetch(`/api/nominees/${catId}`);
    const data = await res.json();
    setAdminNominees(data);
  };

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data);
  };

  const fetchNominees = async (catId: number) => {
    const res = await fetch(`/api/nominees/${catId}`);
    const data = await res.json();
    setNominees(data);
  };

  const fetchResults = async () => {
    const res = await fetch('/api/results', {
      headers: { 'Authorization': adminToken }
    });
    if (res.ok) {
      const data = await res.json();
      setResults(data);
    } else {
      setMessage({ type: 'error', text: 'Unauthorized to view results' });
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword })
    });
    const data = await res.json();
    if (data.success) {
      setAdminToken(data.token);
      setIsAdminLoggedIn(true);
      localStorage.setItem('admin_token', data.token);
      setAdminPassword('');
    } else {
      setMessage({ type: 'error', text: data.error });
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setAdminToken('');
    localStorage.removeItem('admin_token');
    setView('vote');
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': adminToken
      },
      body: JSON.stringify({ name: newCategoryName })
    });
    if (res.ok) {
      fetchCategories();
      setNewCategoryName('');
      setMessage({ type: 'success', text: 'Category added' });
    }
  };

  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const handleDeleteCategory = async (id: number) => {
    fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Button Click: Delete Category ID ${id}. Token present: ${!!adminToken}` }) });
    // Bypass confirm for debugging
    setIsDeleting(id);
    fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Proceeding to fetch delete for Category ID ${id}` }) });
    try {
      const res = await fetch(`/api/admin/categories/${id}/delete`, {
        method: 'POST',
        headers: { 'Authorization': adminToken }
      });
      fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Delete Category ID ${id} response status: ${res.status}` }) });
      console.log(`Delete category response status: ${res.status}`);
      if (res.ok) {
        console.log(`Successfully deleted category ID: ${id}`);
        if (adminSelectedCategoryId === id.toString()) {
          setAdminSelectedCategoryId('');
        }
        fetchCategories();
        setMessage({ type: 'success', text: 'Category deleted' });
      } else {
        const data = await res.json();
        console.error(`Failed to delete category ID: ${id}`, data);
        setMessage({ type: 'error', text: data.error || 'Failed to delete category' });
      }
    } catch (err: any) {
      fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Delete Category ID ${id} fetch error: ${err.message}` }) });
      console.error(`Network error deleting category: ${err}`);
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Delete Category ID ${id} finally block reached` }) });
      setIsDeleting(null);
    }
  };

  const handleToggleLock = async (id: number, currentLocked: boolean) => {
    try {
      const res = await fetch(`/api/admin/categories/${id}/toggle-lock`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': adminToken
        },
        body: JSON.stringify({ isLocked: !currentLocked })
      });
      if (res.ok) {
        fetchCategories();
        setMessage({ type: 'success', text: `Category ${!currentLocked ? 'LOCKED' : 'UNLOCKED'}` });
      } else {
        const errorData = await res.json();
        setMessage({ type: 'error', text: `Failed: ${errorData.error || 'Unknown error'}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to toggle lock' });
    }
  };

  const handleAddNominee = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/nominees', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': adminToken
      },
      body: JSON.stringify(newNominee)
    });
    if (res.ok) {
      setNewNominee({ name: '', description: '', imageUrl: '', categoryId: '' });
      if (adminSelectedCategoryId === newNominee.categoryId) {
        fetchAdminNominees(parseInt(newNominee.categoryId));
      }
      setMessage({ type: 'success', text: 'Nominee added' });
    }
  };

  const handleDeleteNominee = async (id: number) => {
    fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Button Click: Delete Nominee ID ${id}. Token present: ${!!adminToken}` }) });
    // Bypass confirm for debugging
    setIsDeleting(id);
    fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Proceeding to fetch delete for Nominee ID ${id}` }) });
    try {
      const res = await fetch(`/api/admin/nominees/${id}/delete`, {
        method: 'POST',
        headers: { 'Authorization': adminToken }
      });
      fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Delete Nominee ID ${id} response status: ${res.status}` }) });
      console.log(`Delete nominee response status: ${res.status}`);
      if (res.ok) {
        console.log(`Successfully deleted nominee ID: ${id}`);
        if (selectedCategory) fetchNominees(selectedCategory.id);
        if (adminSelectedCategoryId) fetchAdminNominees(parseInt(adminSelectedCategoryId));
        setMessage({ type: 'success', text: 'Nominee deleted' });
      } else {
        const data = await res.json();
        console.error(`Failed to delete nominee ID: ${id}`, data);
        setMessage({ type: 'error', text: data.error || 'Failed to delete nominee' });
      }
    } catch (err: any) {
      fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Delete Nominee ID ${id} fetch error: ${err.message}` }) });
      console.error(`Network error deleting nominee: ${err}`);
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Delete Nominee ID ${id} finally block reached` }) });
      setIsDeleting(null);
    }
  };

  const handleVote = async (nomineeId: number) => {
    if (!selectedCategory) return;

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: voterId,
          categoryId: selectedCategory.id,
          nomineeId
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Vote cast successfully!' });
        setTimeout(() => setMessage(null), 3000);
        setSelectedCategory(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to cast vote' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  return (
    <div className="min-h-screen bg-premium-black text-white font-sans selection:bg-gold selection:text-premium-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-premium-black/60 backdrop-blur-2xl border-b border-white/5 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 gold-gradient rounded-xl flex items-center justify-center shadow-xl shadow-gold/20">
              <div className="flex items-center text-premium-black font-black text-sm sm:text-base tracking-tighter">
                <span>PL</span>
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 mx-[-1px] fill-current" />
                <span>T</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight serif italic gold-text drop-shadow-sm">DZIRE <span className="text-white">2026</span></h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-gold/60 font-black">Excellence & Prestige</p>
            </div>
          </div>
          
          <nav className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto justify-center scrollbar-hide">
            <button 
              onClick={() => setView('vote')}
              className={`px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${view === 'vote' ? 'bg-white text-premium-black shadow-xl' : 'text-zinc-500 hover:text-white'}`}
            >
              Vote
            </button>
            {isAdminLoggedIn && (
              <button 
                onClick={() => setView('results')}
                className={`px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${view === 'results' ? 'bg-white text-premium-black shadow-xl' : 'text-zinc-500 hover:text-white'}`}
              >
                Results
              </button>
            )}
            <button 
              onClick={() => setView('admin')}
              className={`px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${view === 'admin' ? 'bg-white text-premium-black shadow-xl' : 'text-zinc-500 hover:text-white'}`}
            >
              {isAdminLoggedIn ? <Settings size={16} /> : 'Admin'}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl ${
              message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium">{message.text}</span>
          </motion.div>
        )}

        {view === 'vote' ? (
          <div className="space-y-10 sm:space-y-16 py-8">
            {!selectedCategory ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                <div className="col-span-full mb-4">
                  <h2 className="text-4xl sm:text-6xl font-bold tracking-tighter mb-4 serif italic gold-text">Choose Category</h2>
                  <p className="text-zinc-500 text-sm sm:text-base font-light tracking-wide max-w-2xl">Select an event to cast your vote for the most exceptional talent of the year.</p>
                </div>
                {categories.map((cat) => (
                  <motion.button
                    key={cat.id}
                    whileHover={cat.is_locked ? {} : { scale: 1.03, y: -5 }}
                    whileTap={cat.is_locked ? {} : { scale: 0.98 }}
                    onClick={() => !cat.is_locked && setSelectedCategory(cat)}
                    className={`group relative glass p-8 sm:p-10 rounded-[2.5rem] text-left overflow-hidden transition-all shadow-2xl ${cat.is_locked ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:border-gold/40'}`}
                  >
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[9px] sm:text-[10px] font-bold text-gold uppercase tracking-[0.3em] block">Event Category</span>
                        {cat.is_locked === 1 && (
                          <span className="bg-red-500/20 text-red-500 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-red-500/30">Locked</span>
                        )}
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold mb-6 serif italic leading-tight">{cat.name}</h3>
                      <div className={`flex items-center transition-colors text-[10px] uppercase font-bold tracking-widest ${cat.is_locked ? 'text-zinc-600' : 'text-zinc-500 group-hover:text-gold'}`}>
                        <span>{cat.is_locked ? 'Voting Closed' : 'Enter Selection'}</span>
                        {!cat.is_locked && <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />}
                      </div>
                    </div>
                    <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                      <Vote size={160} className="text-gold" />
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="space-y-10 sm:space-y-16">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="text-zinc-500 hover:text-gold flex items-center gap-3 mb-4 transition-colors text-[10px] uppercase font-bold tracking-widest"
                >
                  <ChevronRight size={16} className="rotate-180" />
                  Return to Events
                </button>
                
                <div className="mb-10 sm:mb-16">
                  <h2 className="text-4xl sm:text-7xl font-bold tracking-tighter mb-4 serif italic gold-text uppercase">{selectedCategory.name}</h2>
                  <p className="text-zinc-500 text-sm sm:text-base font-light tracking-wide">Select the individual who embodies excellence in this category.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
                  {nominees.map((nominee) => (
                    <motion.div
                      key={nominee.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-[3rem] overflow-hidden group shadow-2xl border-white/5 hover:border-gold/30 transition-all"
                    >
                      <div className="aspect-[4/5] overflow-hidden relative">
                        <img 
                          src={nominee.image_url} 
                          alt={nominee.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-premium-black via-premium-black/20 to-transparent opacity-80" />
                        <div className="absolute bottom-8 left-8 right-8">
                          <h3 className="text-2xl sm:text-3xl font-bold serif italic leading-tight mb-2">{nominee.name}</h3>
                          <p className="text-zinc-400 text-xs sm:text-sm font-light line-clamp-2 italic">{nominee.description}</p>
                        </div>
                      </div>
                      <div className="p-8">
                        <button 
                          onClick={() => handleVote(nominee.id)}
                          className="w-full gold-gradient text-premium-black font-bold py-4 rounded-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 text-xs uppercase tracking-widest shadow-lg shadow-gold/10"
                        >
                          <Vote size={18} />
                          Cast Vote
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : view === 'results' ? (
          <div className="space-y-10 sm:space-y-16 py-8">
            <div className="mb-10 sm:mb-16">
              <h2 className="text-4xl sm:text-6xl font-bold tracking-tighter mb-4 serif italic gold-text">Live Standings</h2>
              <p className="text-zinc-500 text-sm sm:text-base font-light tracking-wide">Real-time metrics of excellence across all categories.</p>
            </div>

            <div className="space-y-10 sm:space-y-16">
              {categories.map(cat => {
                const catResults = results.filter(r => r.category_id === cat.id);
                const maxVotes = Math.max(...catResults.map(r => r.votes), 1);

                return (
                  <div key={cat.id} className="glass p-8 sm:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <h3 className="text-2xl sm:text-4xl font-bold mb-10 serif italic flex items-center gap-4">
                      <BarChart3 className="text-gold" size={32} />
                      {cat.name}
                    </h3>
                    <div className="space-y-8 relative z-10">
                      {catResults.map((res, idx) => (
                        <div key={idx} className="space-y-4">
                          <div className="flex justify-between items-end gap-6">
                            <div className="flex items-center gap-4 sm:gap-6">
                              <span className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-[10px] sm:text-xs font-bold shrink-0 shadow-lg ${
                                idx === 0 ? 'gold-gradient text-premium-black' : 
                                idx === 1 ? 'bg-zinc-700 text-zinc-300' : 
                                'bg-zinc-800 text-zinc-500'
                              }`}>
                                {idx + 1}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-bold text-lg sm:text-xl serif italic tracking-wide truncate max-w-[150px] sm:max-w-none">{res.nominee_name}</span>
                                {idx === 0 && res.votes > 0 && <span className="text-[9px] uppercase tracking-[0.2em] text-gold font-bold mt-1">Current Leader</span>}
                              </div>
                              {idx === 0 && res.votes > 0 && <Trophy size={20} className="text-gold shrink-0 animate-pulse" />}
                            </div>
                            <div className="text-right">
                              <span className="gold-text font-bold text-lg sm:text-2xl">{res.votes}</span>
                              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-2">Votes</span>
                            </div>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(res.votes / maxVotes) * 100}%` }}
                              transition={{ duration: 1.5, ease: "circOut" }}
                              className="h-full gold-gradient shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-8">
            {!isAdminLoggedIn ? (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-8 sm:p-12 rounded-[2.5rem] shadow-2xl"
              >
                <h2 className="text-3xl sm:text-4xl font-bold mb-8 serif italic gold-text">Admin Portal</h2>
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gold mb-3">Security Key</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-gold/50 transition-all text-sm"
                    />
                  </div>
                  <button className="w-full gold-gradient text-premium-black font-bold py-4 rounded-2xl transition-all transform active:scale-[0.98] shadow-lg shadow-gold/10 uppercase tracking-widest text-xs">Authorize Access</button>
                </form>
              </motion.div>
            ) : (
              <div className="space-y-10 sm:space-y-16">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div>
                    <h2 className="text-4xl sm:text-5xl font-bold serif italic gold-text">Dashboard</h2>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mt-1">Management & Control</p>
                  </div>
                  <button onClick={handleAdminLogout} className="flex items-center gap-2 text-zinc-500 hover:text-gold text-[10px] uppercase tracking-widest font-bold transition-colors">
                    <LogOut size={18} /> Terminate Session
                  </button>
                </div>

                {/* Manage Categories */}
                <section className="glass p-8 sm:p-12 rounded-[3rem] shadow-2xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                    <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-3 serif italic">
                      <Settings className="text-gold" size={28} /> 
                      Event Controls
                    </h3>
                  </div>

                  <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-4 mb-12">
                    <input 
                      type="text" 
                      placeholder="Event Name (e.g. Solo Dance)"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold/50"
                    />
                    <button className="gold-gradient text-premium-black px-10 py-4 sm:py-0 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-gold/10">Add Event</button>
                  </form>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {categories.map(cat => (
                      <div key={cat.id} className="bg-white/5 border border-white/5 p-6 sm:p-8 rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 group hover:border-gold/20 transition-all">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl sm:text-2xl font-bold serif italic">{cat.name}</span>
                            {cat.is_locked === 0 && (
                              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20 animate-pulse">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full" /> Live
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">
                            Status: {cat.is_locked ? 'Voting Closed' : 'Accepting Votes'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          <button 
                            onClick={() => handleToggleLock(cat.id, cat.is_locked === 1)}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl transition-all font-bold text-[10px] uppercase tracking-widest border-2 ${
                              cat.is_locked 
                                ? 'bg-emerald-500 text-premium-black border-emerald-500 shadow-xl shadow-emerald-500/20 hover:scale-105' 
                                : 'bg-transparent text-red-500 border-red-500/30 hover:bg-red-500/10 hover:border-red-500'
                            }`}
                          >
                            {cat.is_locked ? (
                              <>
                                <Power size={16} /> Open Voting
                              </>
                            ) : (
                              <>
                                <Lock size={16} /> Close Voting
                              </>
                            )}
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(cat.id)} 
                            disabled={isDeleting === cat.id}
                            className="p-4 text-zinc-600 hover:text-red-500 transition-colors shrink-0 disabled:opacity-50 bg-white/5 rounded-2xl border border-transparent hover:border-red-500/20"
                          >
                            {isDeleting === cat.id ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Manage Nominees */}
                <section className="glass p-8 sm:p-12 rounded-[3rem] shadow-2xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                    <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-3 serif italic">
                      <User className="text-gold" size={28} /> 
                      Nominees
                    </h3>
                    <select 
                      value={adminSelectedCategoryId}
                      onChange={(e) => setAdminSelectedCategoryId(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gold/50 appearance-none min-w-[200px]"
                    >
                      <option value="" className="bg-premium-black">Select Category to Manage</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id} className="bg-premium-black">{cat.name}</option>)}
                    </select>
                  </div>

                  {adminSelectedCategoryId && (
                    <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {adminNominees.length > 0 ? (
                        adminNominees.map(nom => (
                          <div key={nom.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center gap-4 group hover:border-gold/20 transition-all">
                            <img src={nom.image_url} className="w-12 h-12 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{nom.name}</p>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{nom.votes} Votes</p>
                            </div>
                            <button 
                              onClick={() => handleDeleteNominee(nom.id)} 
                              disabled={isDeleting === nom.id}
                              className="text-zinc-600 hover:text-red-500 transition-colors shrink-0 p-2 disabled:opacity-50"
                            >
                              {isDeleting === nom.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="col-span-full text-center text-zinc-500 py-4 text-sm italic">No nominees in this category yet.</p>
                      )}
                    </div>
                  )}

                  <div className="w-full h-[1px] bg-white/5 my-10" />

                  <h4 className="text-lg font-bold mb-8 flex items-center gap-3 serif italic">
                    <Plus className="text-gold" size={20} /> 
                    Add New Nominee
                  </h4>
                  <form onSubmit={handleAddNominee} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Event Category</label>
                      <select 
                        value={newNominee.categoryId}
                        onChange={(e) => setNewNominee({...newNominee, categoryId: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 appearance-none"
                        required
                      >
                        <option value="" className="bg-premium-black">Select Category</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id} className="bg-premium-black">{cat.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="Candidate Name"
                        value={newNominee.name}
                        onChange={(e) => setNewNominee({...newNominee, name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold/50"
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2 space-y-4">
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Visual Identity</label>
                      <div 
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-[2rem] p-10 transition-all flex flex-col items-center justify-center gap-4 ${
                          dragActive ? 'border-gold bg-gold/5' : 'border-white/10 hover:border-gold/30'
                        }`}
                      >
                        {newNominee.imageUrl ? (
                          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-3xl overflow-hidden border border-gold/30 shadow-2xl">
                            <img src={newNominee.imageUrl} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setNewNominee({...newNominee, imageUrl: ''})}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-gold shadow-inner">
                              {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={28} />}
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold tracking-wide">Drag & Drop Asset</p>
                              <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">High resolution recommended</p>
                            </div>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              disabled={isUploading}
                            />
                          </>
                        )}
                      </div>
                      <input 
                        type="text" 
                        placeholder="Or provide direct asset URL"
                        value={newNominee.imageUrl}
                        onChange={(e) => setNewNominee({...newNominee, imageUrl: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs focus:outline-none focus:ring-1 focus:ring-gold/50"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Biography / Description</label>
                      <textarea 
                        placeholder="Describe the candidate's achievements..."
                        value={newNominee.description}
                        onChange={(e) => setNewNominee({...newNominee, description: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 min-h-[120px]"
                        required
                      />
                    </div>
                    <button className="gold-gradient text-premium-black py-5 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] md:col-span-2 shadow-xl shadow-gold/10 hover:shadow-gold/20 transition-all">Register Nominee</button>
                  </form>
                </section>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/5 p-16 text-center bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.4em] font-bold mb-4">
            DZIRE 2026
          </p>
          <div className="w-12 h-[1px] bg-gold/30 mx-auto mb-4" />
          <p className="text-zinc-500 text-[9px] uppercase tracking-widest italic">
            Powered by Prestige Digital Voting System
          </p>
        </div>
      </footer>
    </div>
  );
}
