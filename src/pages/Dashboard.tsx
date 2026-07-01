import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Play, Trash2, Share2, LogOut, X, Plus, Film, Clock, HardDrive, User, Check, Download, Search, VideoIcon, Loader2, Grid3X3, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MediaItem {
  id: number;
  title: string;
  description: string | null;
  url: string;
  file_name: string | null;
  size: number | null;
  type: string;
  source: string;
  created_at: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [playingVideo, setPlayingVideo] = useState<MediaItem | null>(null);
  const [previewImage, setPreviewImage] = useState<MediaItem | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'client' | 'admin'>('all');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    setIsAuthenticated(localStorage.getItem('admin_auth') === 'true'); 
    setIsAuthChecked(true); 
  }, []);

  const fetchItems = async () => {
    try { 
      const r = await fetch('/api/media'); 
      const d = await r.json(); 
      setItems(d); 
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };
  useEffect(() => { 
    if (isAuthenticated) fetchItems(); 
  }, [isAuthenticated]);

  const isImageFile = (f: File) => f.type.startsWith('image/');
  const isVideoFile = (f: File) => f.type.startsWith('video/');

  const handleDrop = (e: React.DragEvent) => { 
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (isImageFile(f) || isVideoFile(f))) {
      setSelectedFile(f);
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
    } 
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
    } 
  };

  const formatSize = (b: number) => b ? (b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`) : '--';
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  
  const isFromClient = (v: MediaItem) => v.source === 'client';
  const getSourceLabel = (v: MediaItem) => {
    const m = v.title.match(/\[من:\s*([^\]]+)\]/);
    return m ? m[1] : (v.source === 'client' ? 'عميل' : 'أدمن');
  };
  const getCleanTitle = (v: MediaItem) => v.title.replace(/\[(عميل|من:[^\]]*)\]\s*/g, '');

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const uRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: selectedFile.name, fileBase64: base64, contentType: selectedFile.type })
        });
        const uData = await uRes.json();
        if (!uRes.ok) throw new Error(uData.error);
        
        const sRes = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || selectedFile.name,
            description: description || null,
            url: uData.url,
            file_name: selectedFile.name,
            size: selectedFile.size,
            type: uData.type || 'video',
            source: 'admin'
          })
        });
        if (!sRes.ok) throw new Error('Failed');
        
        setShowUpload(false);
        setSelectedFile(null);
        setTitle('');
        setDescription('');
        fetchItems();
      };
      reader.readAsDataURL(selectedFile);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('حذف هذا العنصر؟')) return;
    setDeletingId(id);
    try {
      await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchItems();
    } finally {
      setDeletingId(null);
    }
  };

  const handleShare = async (v: MediaItem) => {
    try {
      await navigator.clipboard.writeText(v.url);
      setCopiedId(v.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      prompt('انسخ:', v.url);
    }
  };

  const handleDownload = async (v: MediaItem) => {
    setDownloadingId(v.id);
    try {
      const r = await fetch(v.url);
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = v.file_name || `file_${v.id}`;
      a.click();
    } catch {
      window.open(v.url, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    window.location.href = '/';
  };

  const totalSize = items.reduce((a, v) => a + (v.size || 0), 0);
  const clientItems = items.filter(isFromClient);
  const imageCount = items.filter(v => v.type === 'image').length;
  const videoCount = items.filter(v => v.type === 'video').length;

  const filteredItems = items.filter(v => {
    const q = searchQuery.toLowerCase();
    const match = !q || v.title.toLowerCase().includes(q) || v.file_name?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q);
    if (filterType !== 'all' && filterType !== v.type) return false;
    if (filterSource === 'client') return match && isFromClient(v);
    if (filterSource === 'admin') return match && !isFromClient(v);
    return match;
  });

  if (!isAuthChecked) return (
    <div className="min-h-screen bg-[#07080f] flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#07080f] flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0d0e18] border border-white/[0.08] rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center mb-5">
          <Film className="w-8 h-8 text-red-400/50" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">محمي</h2>
        <p className="text-white/35 text-sm mb-6">هذه الصفحة تتطلب تسجيل الدخول</p>
        <button onClick={() => window.location.href = '/'} className="px-6 py-3 rounded-xl bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white font-medium text-sm">
          العودة للرئيسية
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07080f] overflow-hidden" dir="rtl">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-600/12 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] bg-fuchsia-600/8 rounded-full blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <header className="relative z-10 bg-white/[0.02] backdrop-blur-xl border-b border-white/[0.06] sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-[2px] shadow-lg shadow-violet-500/20">
                <div className="w-full h-full rounded-[10px] bg-[#0a0b14] flex items-center justify-center">
                  <Film className="w-5 h-5 text-violet-400" />
                </div>
              </div>
              <div>
                <h1 className="text-base font-bold text-white">لوحة تحكم البحراوي</h1>
                <p className="text-[10px] text-white/30">ALBAHRAWI Admin Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href="/" className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white/90 rounded-xl text-sm transition-all border border-white/[0.06]">
                <Grid3X3 className="w-4 h-4" />
                <span>الصفحة الرئيسية</span>
              </a>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm transition-all border border-red-500/15">
                <LogOut className="w-4 h-4" />
                <span>خروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'إجمالي', value: items.length, icon: Film },
            { label: 'صور', value: imageCount, icon: ImageIcon, color: 'blue' },
            { label: 'فيديوهات', value: videoCount, icon: VideoIcon, color: 'emerald' },
            { label: 'من العملاء', value: clientItems.length, icon: User, color: 'amber' },
            { label: 'المساحة', value: formatSize(totalSize), icon: HardDrive }
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-4 border border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl bg-${s.color || 'violet'}-500/10 border border-${s.color || 'violet'}-500/10 flex items-center justify-center`}>
                  <s.icon className={`w-4.5 h-4.5 text-${s.color || 'violet'}-400/70`} />
                </div>
                <div>
                  <p className={`text-${s.color || 'violet'}-400/60 text-[10px] font-medium`}>{s.label}</p>
                  <p className="text-lg font-bold text-white">{s.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white/[0.02] backdrop-blur-2xl rounded-3xl border border-white/[0.07] shadow-2xl shadow-black/20 overflow-hidden">
          <div className="px-6 sm:px-8 py-5 border-b border-white/[0.05] bg-white/[0.01]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">الميديا المحفوظة</h2>
                <p className="text-white/30 text-xs mt-1">{filteredItems.length} من {items.length} عنصر</p>
              </div>
              <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98]">
                <Plus className="w-[18px] h-[18px]" />
                <span>رفع جديد</span>
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="w-full pr-9 pl-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] focus:border-violet-500/40 outline-none text-right text-sm text-white placeholder:text-white/20 transition-all" />
              </div>
              <div className="flex gap-2">
                <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
                  {[{ k: 'all', l: 'الكل' }, { k: 'image', l: '📷 صور' }, { k: 'video', l: '🎬 فيديو' }].map(f => (
                    <button key={f.k} onClick={() => setFilterType(f.k as any)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === f.k ? 'bg-violet-600 text-white' : 'text-white/40 hover:text-white/70'}`}>
                      {f.l}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
                  {[{ k: 'all', l: 'الكل' }, { k: 'client', l: 'العملاء' }, { k: 'admin', l: 'الأدمن' }].map(f => (
                    <button key={f.k} onClick={() => setFilterSource(f.k as any)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterSource === f.k ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/70'}`}>
                      {f.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
                <p className="text-white/35 text-sm">جاري التحميل...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/[0.02] flex items-center justify-center mb-4">
                  <Film className="w-10 h-10 text-white/10" />
                </div>
                <h3 className="text-white/50 font-semibold mb-2">{searchQuery || filterType !== 'all' || filterSource !== 'all' ? 'لا توجد نتائج' : 'لا توجد عناصر بعد'}</h3>
                <p className="text-white/25 text-sm mb-6">{searchQuery || filterType !== 'all' || filterSource !== 'all' ? 'حاول تغيير البحث أو الفلتر' : 'ابدأ برفع أول ملف'}</p>
                {!searchQuery && filterType === 'all' && filterSource === 'all' && (
                  <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium">
                    <Upload className="w-4 h-4" />
                    رفع الآن
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="group relative rounded-2xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-violet-500/15 transition-all duration-200 cursor-pointer" onClick={() => item.type === 'image' ? setPreviewImage(item) : setPlayingVideo(item)}>
                    <div className={`relative ${item.type === 'image' ? 'aspect-square' : 'aspect-video'} bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5`}>
                      {item.type === 'image' ? (
                        <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-11 h-11 text-violet-400/30 group-hover:text-violet-500 group-hover:scale-110 transition-all" fill="currentColor" />
                        </div>
                      )}
                      <div className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm ${item.type === 'image' ? 'bg-blue-500/80 text-white' : 'bg-emerald-500/80 text-white'}`}>
                        {item.type === 'image' ? '📷 صورة' : '🎬 فيديو'}
                      </div>
                      {isFromClient(item) && (
                        <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-500/80 text-white backdrop-blur-sm">
                          <User className="w-3 h-3 inline ml-1" />{getSourceLabel(item)}
                        </div>
                      )}
                    </div>
                    <div className="p-3.5">
                      <h3 className="font-semibold text-white/90 text-sm truncate group-hover:text-violet-300 transition-colors">{getCleanTitle(item)}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 text-[10px] text-white/25">
                          <Clock className="w-3 h-3" />{formatDate(item.created_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-white/25">{formatSize(item.size || 0)}</span>
                          <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} disabled={downloadingId === item.id} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-white/25 hover:text-emerald-400 transition-all disabled:opacity-40" title="تحميل">
                            {downloadingId === item.id ? <div className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-500 rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleShare(item); }} className="p-1.5 rounded-lg hover:bg-violet-500/10 text-white/25 hover:text-violet-400 transition-all" title="مشاركة">
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} disabled={deletingId === item.id} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/25 hover:text-red-400 transition-all disabled:opacity-40" title="حذف">
                            {deletingId === item.id ? <div className="w-3 h-3 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => !uploading && setShowUpload(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} className="bg-[#0c0d16] border border-white/[0.08] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">رفع صورة أو فيديو</h3>
                </div>
                <button onClick={() => !uploading && setShowUpload(false)} disabled={uploading} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 disabled:opacity-50">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-violet-500/50 bg-violet-500/[0.05]' : selectedFile ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-white/[0.08] hover:border-violet-500/30 hover:bg-white/[0.02]'}`}>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
                  {!selectedFile ? (
                    <>
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-500/5 border border-violet-500/10 flex items-center justify-center mb-3">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-7 h-7 text-blue-400/50" />
                          <VideoIcon className="w-7 h-7 text-emerald-400/50" />
                        </div>
                      </div>
                      <p className="text-white/70 font-medium text-sm mb-1">اسحب صورة أو فيديو هنا</p>
                      <p className="text-white/25 text-xs">PNG, JPG, GIF, MP4, WebM — حتى 500MB</p>
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${isImageFile(selectedFile) ? 'bg-blue-500/8 border-blue-500/15' : 'bg-emerald-500/8 border-emerald-500/15'} flex items-center justify-center`}>
                        {isImageFile(selectedFile) ? <ImageIcon className="w-6 h-6 text-blue-400" /> : <Play className="w-6 h-6 text-emerald-400" fill="currentColor" />}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white text-sm">{selectedFile.name}</p>
                        <p className={`text-xs font-medium ${isImageFile(selectedFile) ? 'text-blue-400/70' : 'text-emerald-400/70'}`}>{formatSize(selectedFile.size)} • {isImageFile(selectedFile) ? 'صورة' : 'فيديو'}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 mr-auto">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-white/70 mb-1.5">اسم الملف</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="أدخل اسم..." className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] focus:border-violet-500/40 outline-none text-right text-sm text-white placeholder:text-white/15" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-white/70 mb-1.5">وصف (اختياري)</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف..." rows={3} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] focus:border-violet-500/40 outline-none resize-none text-right text-sm text-white placeholder:text-white/15" />
                </div>
                <button onClick={handleUpload} disabled={!selectedFile || uploading || !title.trim()} className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-l from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-2 text-sm">
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري الرفع...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>رفع إلى السحابة ⚡</span>
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-white/15">المرفوع من هنا يظهر في "عرض الميديا" بالصفحة الرئيسية</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setPreviewImage(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} className="bg-[#0c0d16] border border-white/[0.08] rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 bg-white/[0.03]">
                <h3 className="font-semibold text-white truncate max-w-md text-sm">{getCleanTitle(previewImage)}</h3>
                <button onClick={() => setPreviewImage(null)} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <img src={previewImage.url} alt="" className="max-w-full max-h-[65vh] object-contain mx-auto" />
              <div className="px-5 py-3 bg-white/[0.03] flex items-center justify-between text-[12px] text-white/35">
                <span>{formatDate(previewImage.created_at)} • {formatSize(previewImage.size || 0)}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDownload(previewImage)} disabled={downloadingId === previewImage.id} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-medium disabled:opacity-50">
                    {downloadingId === previewImage.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        تحميل...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        تحميل
                      </>
                    )}
                  </button>
                  <button onClick={() => handleShare(previewImage)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-medium">
                    {copiedId === previewImage.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        تم النسخ
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        نسخ الرابط
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {playingVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg" onClick={() => setPlayingVideo(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} className="bg-[#0c0d16] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 bg-white/[0.03]">
                <h3 className="font-semibold text-white truncate max-w-md text-sm">{getCleanTitle(playingVideo)}</h3>
                <button onClick={() => setPlayingVideo(null)} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <video src={playingVideo.url} controls autoPlay className="w-full aspect-video bg-black" />
              <div className="px-5 py-3 bg-white/[0.03] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-[12px] text-white/35 space-x-2 space-x-reverse">
                  <span>{formatDate(playingVideo.created_at)}</span>
                  <span>&middot;</span>
                  <span>{formatSize(playingVideo.size || 0)}</span>
                  {isFromClient(playingVideo) && (
                    <>
                      <span>&middot;</span>
                      <span className="text-blue-400">من: {getSourceLabel(playingVideo)}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDownload(playingVideo)} disabled={downloadingId === playingVideo.id} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-medium disabled:opacity-50">
                    {downloadingId === playingVideo.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        تحميل...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        تحميل
                      </>
                    )}
                  </button>
                  <button onClick={() => handleShare(playingVideo)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-medium">
                    {copiedId === playingVideo.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        تم النسخ
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        نسخ الرابط
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Dashboard;
