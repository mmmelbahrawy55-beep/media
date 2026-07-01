import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Play, Film, Cloud, Shield, CheckCircle, X, VideoIcon, Eye, Loader2, Grid3X3, Sparkles, Image as ImageIcon } from 'lucide-react';

function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [senderName, setSenderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showSecretLogin, setShowSecretLogin] = useState(false);
  const [secretPassword, setSecretPassword] = useState('');
  const [secretError, setSecretError] = useState('');
  const [showGallery, setShowGallery] = useState(false);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect file type
  const isImageFile = (file: File) => file.type.startsWith('image/');
  const isVideoFile = (file: File) => file.type.startsWith('video/');

  const handleLogoClick = () => {
    const nc = logoClicks + 1;
    setLogoClicks(nc);
    if (nc >= 5) { setShowSecretLogin(true); setLogoClicks(0); }
    setTimeout(() => setLogoClicks(0), 3000);
  };

  const handleSecretLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretPassword.trim() === '123') {
      localStorage.setItem('admin_auth', 'true');
      setTimeout(() => { window.location.href = '/admin'; }, 200);
    } else {
      setSecretError('كلمة المرور غير صحيحة');
    }
  };

  const fetchGalleryItems = async () => {
    setGalleryLoading(true); setShowGallery(true);
    try {
      const r = await fetch('/api/media');
      const d = await r.json();
      // Only show items uploaded by admin (source=admin) - these are public gallery items
      setGalleryItems(d.filter((item: any) => item.source === 'admin'));
    } catch (e) { console.error(e); }
    finally { setGalleryLoading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (isImageFile(f) || isVideoFile(f))) {
      setSelectedFile(f);
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
      setError('');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(f));
    } else setError('الرجاء اختيار ملف صورة أو فيديو فقط');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const formatSize = (b: number) => b ? (b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`) : '--';
  
  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null); setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileType = (file: File) => isImageFile(file) ? 'image' : 'video';

  const handleUpload = async () => {
    if (!selectedFile) { setError('الرجاء اختيار ملف'); return; }
    if (!title.trim()) { setError('الرجاء إدخال اسم'); return; }
    setUploading(true); setUploadProgress(10); setError('');
    try {
      const reader = new FileReader();
      reader.onprogress = (ev) => { if (ev.lengthComputable) setUploadProgress(Math.round(ev.loaded / ev.total * 50)); };
      reader.onload = async () => {
        setUploadProgress(50);
        const base64 = (reader.result as string).split(',')[1];
        setUploadProgress(60);
        const uRes = await fetch('/api/upload', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({fileName:selectedFile.name, fileBase64:base64, contentType:selectedFile.type}) });
        setUploadProgress(80);
        const uData = await uRes.json();
        if (!uRes.ok) throw new Error(uData.error || 'فشل رفع الملف');
        
        const ft = senderName ? `[من: ${senderName}] ${title}` : `[عميل] ${title}`;
        const fd = description ? `${description}\n\n---\nمرسل بواسطة: ${senderName || 'عميل'}` : `مرسل بواسطة: ${senderName || 'عميل'}`;
        setUploadProgress(90);
        const sRes = await fetch('/api/media', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title:ft, description:fd, url:uData.url, file_name:selectedFile.name, size:selectedFile.size, type:getFileType(selectedFile), source:'client'}) });
        if (!sRes.ok) throw new Error('فشل الحفظ');
        setUploadProgress(100);
        setTimeout(() => setUploaded(true), 500);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) { setError(err.message || 'حدث خطأ'); setUploadProgress(0); }
    finally { setUploading(false); }
  };

  const resetForm = () => { clearFile(); setTitle(''); setDescription(''); setSenderName(''); setUploaded(false); setError(''); setUploadProgress(0); };

  // SUCCESS SCREEN
  if (uploaded) return (
    <div className="min-h-screen bg-[#07080f] flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-md w-full">
        <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.2,type:"spring",stiffness:200}} className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
          <CheckCircle className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">تم الرفع بنجاح!</h2>
        <p className="text-gray-500 mb-8">شكراً لك! تم استلام الملف وسيتم مراجعته قريباً.</p>
        <button onClick={resetForm} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl font-medium shadow-lg transition-all">
          <Upload className="w-5 h-5" /><span>رفع ملف آخر</span>
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07080f] overflow-hidden" dir="rtl">
      {/* BG */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute top-1/3 -left-32 w-[450px] h-[450px] bg-fuchsia-600/10 rounded-full blur-[120px] animate-pulse" style={{animationDelay:'2s'}} />
        <div className="absolute -bottom-20 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[130px] animate-pulse" style={{animationDelay:'4s'}} />
        <div className="absolute inset-0 opacity-[0.02]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize:'60px 60px'}} />
      </div>

      {/* HEADER */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          <nav className="flex items-center justify-between">
            <motion.button onClick={handleLogoClick} whileHover={{scale:1.02}} whileTap={{scale:0.98}} className="flex items-center gap-3 cursor-pointer select-none group">
              <div className="relative">
                <div className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-[2px] shadow-xl shadow-violet-500/20 group-hover:shadow-violet-500/35 transition-shadow">
                  <div className="w-full h-full rounded-[14px] bg-[#0a0b14] flex items-center justify-center">
                    <span className="text-[19px] font-black tracking-tight">
                      <span className="bg-gradient-to-br from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">A</span><span className="text-white">L</span>
                    </span>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-xl opacity-0 group-hover:opacity-25 transition-opacity duration-400" />
              </div>
              <div className="text-right">
                <h1 className="text-[19px] font-black leading-none tracking-wide"><span className="bg-gradient-to-l from-violet-300 via-fuchsia-300 to-white bg-clip-text text-transparent">ALBAHRAWI</span></h1>
                <p className="text-[9px] font-semibold text-white/25 tracking-[0.3em] uppercase mt-0.5">Media Platform</p>
              </div>
            </motion.button>
            <button onClick={fetchGalleryItems} className="group inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md text-white/80 hover:text-white rounded-xl text-sm font-medium transition-all border border-white/[0.06] hover:border-white/[0.15]">
              <Grid3X3 className="w-[17px] h-[17px] text-violet-400/70 group-hover:text-violet-400 transition-colors" /><span>عرض الميديا</span>
            </button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 pt-14 sm:pt-24 pb-6 sm:pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5}}>
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] mb-10">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-white/50 font-medium">منصة رفع الصور والفيديوهات الاحترافية</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </motion.div>
          <motion.h1 initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.1}} className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black leading-[1.1] mb-7 tracking-tight">
            <span className="text-white">شاركنا </span>
            <span className="relative inline-block">
              <span className="bg-gradient-to-l from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">إبداعك</span>
              <svg className="absolute -bottom-1.5 left-0 w-full" viewBox="0 0 200 10" fill="none"><path d="M2 6C40 1 160 1 198 6" stroke="url(#ug)" strokeWidth="2.5" strokeLinecap="round"/><defs><linearGradient id="ug" x1="0%" y1="0%" x2="100%" y2="0%"><stop stopColor="#8B5CF6" stopOpacity="0.4"/><stop offset="50%" stopColor="#D946EF" stopOpacity="0.9"/><stop stopColor="#EC4899" stopOpacity="0.4"/></linearGradient></defs></svg>
            </span>
            <br className="hidden sm:block" />
            <span className="text-white/85">مع </span>
            <span className="bg-gradient-to-l from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">البحراوي</span>
          </motion.h1>
          <motion.p initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.2}} className="text-base sm:text-lg text-white/35 max-w-lg mx-auto mb-10 leading-relaxed font-light">
            منصة متكاملة لرفع ومشاركة الصور والفيديوهات بكل سهولة وأمان تام.
          </motion.p>
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.3}} className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {[{icon:'cloud',label:'تخزين سحابي آمن'},{icon:'shield',label:'تشفير متقدم'},{icon:null,label:'صور + فيديوهات ⚡'}].map((item,i)=>(
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.05]">
                {item.icon==='cloud'&&<Cloud className="w-4 h-4 text-violet-400/60" />}
                {item.icon==='shield'&&<Shield className="w-4 h-4 text-violet-400/60" />}
                <span className="text-xs sm:text-sm text-white/45 font-medium">{item.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* UPLOAD CARD */}
      <main className="relative z-10 pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} transition={{delay:0.4,duration:0.6}} className="bg-white/[0.02] backdrop-blur-2xl rounded-3xl border border-white/[0.07] shadow-2xl shadow-black/30 overflow-hidden">
            <div className="px-6 sm:px-8 py-5 border-b border-white/[0.05] bg-white/[0.01]">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-violet-500/15 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">رفع صورة أو فيديو</h2>
                  <p className="text-white/30 text-xs mt-0.5">اختر ملف صورة أو فيديو واملأ البيانات</p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 space-y-5">
              {error && (<motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="p-3.5 rounded-xl bg-red-500/8 border border-red-500/15 text-red-400 text-sm flex items-center gap-2.5"><X className="w-4 h-4 flex-shrink-0" />{error}</motion.div>)}
              
              {/* Drop Zone */}
              <div onDragOver={(e)=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} onClick={()=>fileInputRef.current?.click()} className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-11 text-center cursor-pointer transition-all duration-300 ${dragOver?'border-violet-500/60 bg-violet-500/[0.06] scale-[1.01]':selectedFile?'border-emerald-500/30 bg-emerald-500/[0.03]':'border-white/[0.08] hover:border-violet-500/30 hover:bg-white/[0.015]'}`}>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
                {!selectedFile ? (
                  <>
                    <motion.div className="w-18 h-18 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/8 to-fuchsia-500/8 border border-violet-500/10 flex items-center justify-center mb-4" whileHover={{scale:1.05}}>
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-7 h-7 text-violet-400/50" />
                        <VideoIcon className="w-7 h-7 text-fuchsia-400/50" />
                      </div>
                    </motion.div>
                    <p className="text-white/90 font-semibold text-base mb-1.5">اسحب صورة أو فيديو هنا</p>
                    <p className="text-white/25 text-xs">PNG, JPG, GIF, WebP, MP4, WebM, MOV — حتى 500 ميجابايت</p>
                  </>
                ) : (
                  <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="space-y-4">
                    <div className="flex items-center justify-center gap-3.5">
                      <div className={`w-13 h-13 rounded-xl ${isImageFile(selectedFile)?'bg-blue-500/8 border-blue-500/15':'bg-emerald-500/8 border-emerald-500/15'} flex items-center justify-center`}>
                        {isImageFile(selectedFile)?<ImageIcon className="w-6 h-6 text-blue-400" />:<Play className="w-6 h-6 text-emerald-400" fill="currentColor" />}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white text-sm">{selectedFile.name}</p>
                        <p className={`text-xs font-medium ${isImageFile(selectedFile)?'text-blue-400/80':'text-emerald-400/80'}`}>{formatSize(selectedFile.size)} • {isImageFile(selectedFile)?'صورة':'فيديو'}</p>
                      </div>
                      <button onClick={(e)=>{e.stopPropagation();clearFile()}} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors mr-auto"><X className="w-4 h-4" /></button>
                    </div>
                    {/* Preview */}
                    {previewUrl && (
                      <div className="relative max-w-sm mx-auto rounded-xl overflow-hidden bg-black/50 border border-white/5">
                        {isImageFile(selectedFile) ? (
                          <img src={previewUrl} alt="Preview" className="w-full max-h-[280px] object-contain" />
                        ) : (
                          <video src={previewUrl} controls className="w-full max-h-[240px] object-contain" preload="metadata" />
                        )}
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white/70 text-[11px] px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10"><Eye className="w-3 h-3" /> معاينة</div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-[13px] font-semibold text-white/70 mb-1.5">اسم الملف <span className="text-violet-400">*</span></label><input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="مثال: عرض المنتج" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/10 outline-none transition-all text-right text-white text-sm placeholder:text-white/15" /></div>
                <div><label className="block text-[13px] font-semibold text-white/70 mb-1.5">اسمك <span className="text-white/25 font-normal text-[11px]">(اختياري)</span></label><input type="text" value={senderName} onChange={e=>setSenderName(e.target.value)} placeholder="اسمك أو اسم الشركة" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] focus:border-violet-500/40 outline-none transition-all text-right text-white text-sm placeholder:text-white/15" /></div>
              </div>
              <div><label className="block text-[13px] font-semibold text-white/70 mb-1.5">وصف <span className="text-white/25 font-normal text-[11px]">(اختياري)</span></label><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="أضف وصفاً..." rows={3} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] focus:border-violet-500/40 outline-none transition-all resize-none text-right text-white text-sm placeholder:text-white/15" /></div>

              {/* Progress */}
              {uploading && (<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} className="space-y-2.5"><div className="flex items-center justify-between text-[13px]"><span className="text-violet-300/90 font-medium flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري الرفع...</span><span className="text-white/40 font-mono">{uploadProgress}%</span></div><div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${uploadProgress}%`}} className="h-full bg-gradient-to-l from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300" /></div></motion.div>)}

              {/* Submit */}
              <button onClick={handleUpload} disabled={!selectedFile||uploading||!title.trim()} className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-l from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20 transition-all duration-300 flex items-center justify-center gap-2.5 text-[15px] active:scale-[0.99]">{uploading?(<><Loader2 className="w-5 h-5 animate-spin" /><span>جاري الرفع... ({uploadProgress}%)</span></>):(<><Cloud className="w-5 h-5" /><span>رفع إلى السحابة ⚡</span></>)}</button>
              <p className="text-center text-[11px] text-white/20 flex items-center justify-center gap-1.5"><Shield className="w-3 h-3" />ملفاتك محمية ومشفرة بنهاية إلى نهاية</p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8"><div className="max-w-7xl mx-auto px-4 text-center"><p className="text-white/20 text-xs tracking-wide">© 2025 ALBAHRAWI — All Rights Reserved</p></div></footer>

      {/* SECRET LOGIN MODAL */}
      <AnimatePresence>{showSecretLogin&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={()=>{setShowSecretLogin(false);setSecretError('')}}><motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}} className="bg-[#0d0e18] border border-white/[0.08] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="bg-gradient-to-l from-violet-600 to-fuchsia-600 px-6 py-7 text-center"><div className="w-16 h-16 mx-auto rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/20"><Film className="w-8 h-8 text-white" /></div><h3 className="text-xl font-bold text-white">الدخول الخاص</h3><p className="text-white/60 text-sm mt-1">لوحة تحكم البحراوي</p></div>
        <form onSubmit={handleSecretLogin} className="p-6 space-y-4">{secretError&&<p className="text-red-400 text-sm text-center bg-red-500/8 p-2.5 rounded-xl border border-red-500/10">{secretError}</p>}<input type="password" value={secretPassword} onChange={e=>{setSecretPassword(e.target.value);setSecretError('')}} placeholder="كلمة المرور..." className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-violet-500/40 outline-none text-center text-lg tracking-[0.2em] text-white placeholder:text-white/15" autoFocus /><div className="flex gap-3"><button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-l from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all text-sm">دخول ✓</button><button type="button" onClick={()=>{setShowSecretLogin(false);setSecretError('')}} className="px-5 py-3 rounded-xl font-medium text-white/40 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all text-sm">إلغاء</button></div></form>
      </motion.div></motion.div>)}</AnimatePresence>

      {/* GALLERY MODAL */}
      <AnimatePresence>{showGallery&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg" onClick={()=>{setShowGallery(false);setPlayingVideo(null);setPreviewImage(null)}}><motion.div initial={{scale:0.96,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.96,opacity:0}} className="bg-[#0c0d16] border border-white/[0.07] rounded-3xl shadow-2xl w-full max-w-5xl max-h-[88vh] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] flex-shrink-0"><div className="flex items-center gap-3"><Grid3X3 className="w-5 h-5 text-violet-400" /><h3 className="text-base font-bold text-white">الميديا المتاحة</h3><span className="text-xs text-white/30">{galleryItems.length} عنصر</span></div><button onClick={()=>{setShowGallery(false);setPlayingVideo(null);setPreviewImage(null)}} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70"><X className="w-5 h-5" /></button></div>
        <div className="flex-1 overflow-y-auto p-6">
          {galleryLoading?(<div className="flex flex-col items-center justify-center py-16"><div className="w-10 h-10 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4"></div><p className="text-white/40 text-sm">جاري التحميل...</p></div>):galleryItems.length===0?(<div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4"><ImageIcon className="w-7 h-7 text-white/15" /></div><h3 className="text-white/60 font-semibold mb-2">لا توجد عناصر حالياً</h3><p className="text-white/25 text-sm">سيتم إضافة عناصر قريباً</p></div>):(
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {galleryItems.map((item,i)=>(
                <motion.div key={item.id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} onClick={()=>item.type==='image'?setPreviewImage(item):setPlayingVideo(item)} className={`group relative rounded-2xl overflow-hidden ${item.type==='image'?'aspect-square':'aspect-video'} bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/20 hover:bg-white/[0.04] transition-all duration-250 cursor-pointer`}>
                  {item.type==='image'?(
                    <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  ):(
                    <div className="w-full h-full bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 flex items-center justify-center"><Play className="w-11 h-11 text-violet-400/40 group-hover:text-violet-400 group-hover:scale-110 transition-all duration-250" fill="currentColor" /></div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                    <h4 className="font-semibold text-white text-xs truncate">{item.title.replace(/\[(عميل|من:[^\]]*)\]\s*/g,'')}</h4>
                    <div className="flex items-center gap-2 mt-1"><span className={`text-[10px] px-1.5 py-0.5 rounded ${item.type==='image'?'bg-blue-500/20 text-blue-300':'bg-emerald-500/20 text-emerald-300'}`}>{item.type==='image'?'📷 صورة':'🎬 فيديو'}</span><span className="text-[10px] text-white/40">{formatSize(item.size||0)}</span></div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div></motion.div>)}</AnimatePresence>

      {/* IMAGE PREVIEW MODAL */}
      <AnimatePresence>{previewImage&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={()=>setPreviewImage(null)}><motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="bg-[#0c0d16] border border-white/[0.08] rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 bg-white/[0.03]"><h4 className="font-semibold text-white truncate max-w-md text-sm">{previewImage.title.replace(/\[(عميل|من:[^\]]*)\]\s*/g,'')}</h4><button onClick={()=>setPreviewImage(null)} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70"><X className="w-5 h-5" /></button></div>
        <img src={previewImage.url} alt={previewImage.title} className="max-w-full max-h-[70vh] object-contain mx-auto" />
        <div className="px-5 py-3 bg-white/[0.03] flex items-center justify-between text-[12px] text-white/35"><span>{formatSize(previewImage.size||0)}</span><a href={previewImage.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-medium transition-colors">فتح بالحجم الكامل ↗</a></div>
      </motion.div></motion.div>)}</AnimatePresence>

      {/* VIDEO PLAYER IN GALLERY */}
      <AnimatePresence>{playingVideo&&showGallery&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={()=>setPlayingVideo(null)}><motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="bg-[#0c0d16] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 bg-white/[0.03]"><h4 className="font-semibold text-white truncate max-w-md text-sm">{playingVideo.title.replace(/\[(عميل|من:[^\]]*)\]\s*/g,'')}</h4><button onClick={()=>setPlayingVideo(null)} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70"><X className="w-5 h-5" /></button></div>
        <video src={playingVideo.url} controls autoPlay className="w-full aspect-video bg-black" />
      </motion.div></motion.div>)}</AnimatePresence>
    </div>
  );
}

export default HomePage;
