import React, { useState, useCallback, useEffect } from "react";
import {
  Clock, MapPin, Plus, Pencil, Trash2, Save, X, CheckCircle2,
  CalendarDays, Heart, Sparkles, Star, Music, BookOpen, Users,
  ChevronRight, AlertCircle, LayoutDashboard, RefreshCw, Shield,
  LogOut, ImagePlus, Image as ImageIcon, Loader2
} from "lucide-react";
import { useAdminAuth } from "../hooks/useAdminAuth";

// ─── Types ────────────────────────────────────────────────────
interface WorshipSession { id: string; title: string; time: string; location: string; }
interface ChurchEvent {
  id: string; title: string; category: string; date: string;
  fullDate: string; description: string; timeRange?: string;
  location?: string; trainer?: string; image?: string;
}
interface ServiceItem {
  id: string; title: string; description: string; schedule: string;
  location: string; icon: string; image?: string;
}
interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  weeklyTheme: string;
}
type AdminSection = "jadwal" | "pelayanan" | "kegiatan" | "tema";

const EVENT_CATEGORIES = ["RETREAT", "WORSHIP", "SOCIAL ACTION", "KELAS PERTUMBUHAN", "PRAYER", "DIGITAL"];
const ICON_OPTIONS = ["Heart", "Users", "Sparkles", "Star", "Music", "BookOpen", "CalendarDays"];

function categoryBadge(cat: string) {
  const m: Record<string, string> = {
    "RETREAT": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "WORSHIP": "bg-purple-50 text-purple-700 border-purple-200",
    "SOCIAL ACTION": "bg-orange-50 text-orange-700 border-orange-200",
    "KELAS PERTUMBUHAN": "bg-blue-50 text-blue-700 border-blue-200",
    "PRAYER": "bg-indigo-50 text-indigo-700 border-indigo-200",
    "DIGITAL": "bg-cyan-50 text-cyan-700 border-cyan-200",
  };
  return m[cat] || "bg-slate-50 text-slate-700 border-slate-200";
}

// ─── Toast ────────────────────────────────────────────────────
function Toast({ msg, type, onDone }: { msg: string; type: "success" | "error"; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center space-x-3 rounded-xl border px-5 py-4 shadow-2xl ${type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
      {type === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" /> : <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />}
      <span className="text-sm font-semibold">{msg}</span>
    </div>
  );
}

// ─── Confirm Delete Modal ────────────────────────────────────
function ConfirmModal({ item, onConfirm, onCancel }: { item: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-red-50 px-6 py-5 border-b border-red-100 flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-900">Konfirmasi Hapus</h3>
            <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Hapus <strong className="text-slate-900">"{item}"</strong>?
          </p>
          <div className="flex space-x-3">
            <button onClick={onCancel} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">Batal</button>
            <button onClick={onConfirm} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 cursor-pointer transition-colors">Ya, Hapus</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Image Uploader Component ─────────────────────────────────
interface ImageUploaderProps {
  currentImage?: string;
  onUploaded: (url: string) => void;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  label?: string;
}
function ImageUploader({ currentImage, onUploaded, authFetch, label = "Gambar" }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5 MB.");
      return;
    }
    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await authFetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Upload gagal."); }
      const data = await res.json();
      onUploaded(data.url);
      setPreview(data.url);
    } catch (e: any) {
      setError(e.message || "Upload gagal.");
      setPreview(currentImage || null);
    }
    setUploading(false);
  }, [authFetch, currentImage, onUploaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</label>
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        className="relative rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all overflow-hidden cursor-pointer group"
        style={{ minHeight: "140px" }}
      >
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <div className="flex items-center space-x-2 bg-white/90 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700">
                <ImagePlus className="h-3.5 w-3.5" />
                <span>Ganti Gambar</span>
              </div>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-400">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            ) : (
              <>
                <ImageIcon className="h-8 w-8 opacity-40" />
                <p className="text-xs font-medium">Klik atau seret gambar ke sini</p>
                <p className="text-[10px] text-slate-400">JPG, PNG, WEBP · Maks. 5 MB</p>
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
      {/* Also allow URL input as fallback */}
      {preview && (
        <input
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all"
          placeholder="Atau tempel URL gambar langsung..."
          value={preview.startsWith("/uploads/") || preview.startsWith("http") ? preview : ""}
          onChange={e => { setPreview(e.target.value); onUploaded(e.target.value); }}
        />
      )}
      {!preview && (
        <input
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all"
          placeholder="Atau tempel URL gambar langsung..."
          onChange={e => { if (e.target.value) { setPreview(e.target.value); onUploaded(e.target.value); } }}
        />
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────
function SectionHeader({ title, subtitle, count, onAdd }: { title: string; subtitle: string; count: number; onAdd: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle} · <span className="font-semibold text-indigo-600">{count} item</span></p>
      </div>
      <button onClick={onAdd} className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700 cursor-pointer transition-all active:scale-95">
        <Plus className="h-4 w-4" /><span>Tambah Baru</span>
      </button>
    </div>
  );
}

function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        {label}{req && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const ic = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400";

// ═══════════════════════════════════════════════════════════════
// JADWAL IBADAH PANEL
// ═══════════════════════════════════════════════════════════════
function JadwalPanel({ authFetch }: { authFetch: ReturnType<typeof useAdminAuth>["authFetch"] }) {
  const [sessions, setSessions] = useState<WorshipSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Partial<WorshipSession> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorshipSession | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/worship-sessions"); setSessions(await r.json()); }
    catch { showToast("Gagal memuat data.", "error"); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editItem?.title || !editItem.time || !editItem.location) return showToast("Semua field wajib diisi.", "error");
    setSaving(true);
    try {
      const url = isNew ? "/api/worship-sessions" : `/api/worship-sessions/${editItem.id}`;
      const r = await authFetch(url, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editItem) });
      if (!r.ok) throw new Error();
      showToast(isNew ? "Sesi berhasil ditambahkan!" : "Sesi berhasil diperbarui!");
      setEditItem(null); load();
    } catch { showToast("Gagal menyimpan.", "error"); }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await authFetch(`/api/worship-sessions/${deleteTarget.id}`, { method: "DELETE" });
      showToast(`"${deleteTarget.title}" dihapus.`); setDeleteTarget(null); load();
    } catch { showToast("Gagal menghapus.", "error"); }
  };

  return (
    <div>
      <SectionHeader title="Jadwal Ibadah Raya" subtitle="Sesi ibadah Minggu" count={sessions.length} onAdd={() => { setEditItem({ title: "", time: "", location: "" }); setIsNew(true); }} />
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s, idx) => (
            <div key={s.id} className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-indigo-200 hover:shadow-sm transition-all">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <span className="font-display text-sm font-bold text-indigo-600">{idx + 1}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{s.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="flex items-center space-x-1 text-xs text-indigo-600 font-mono font-bold"><Clock className="h-3 w-3" /><span>{s.time}</span></span>
                    <span className="flex items-center space-x-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /><span>{s.location}</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditItem({ ...s }); setIsNew(false); }} className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 cursor-pointer transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDeleteTarget(s)} className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 hover:border-red-300 cursor-pointer transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl"><CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">Belum ada data. Klik "Tambah Baru".</p></div>}
        </div>
      )}
      {editItem !== null && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-900">{isNew ? "Tambah Sesi Ibadah" : "Edit Sesi Ibadah"}</h3>
              <button onClick={() => setEditItem(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <Field label="Nama Sesi" req><input className={ic} placeholder="cth. Ibadah Umum 1" value={editItem.title || ""} onChange={e => setEditItem({ ...editItem, title: e.target.value })} /></Field>
              <Field label="Waktu" req><input className={ic} placeholder="cth. 07:00 WIB" value={editItem.time || ""} onChange={e => setEditItem({ ...editItem, time: e.target.value })} /></Field>
              <Field label="Lokasi" req><input className={ic} placeholder="cth. Auditorium Utama" value={editItem.location || ""} onChange={e => setEditItem({ ...editItem, location: e.target.value })} /></Field>
              <div className="flex space-x-3 pt-2">
                <button onClick={() => setEditItem(null)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Batal</button>
                <button onClick={save} disabled={saving} className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60">
                  <Save className="h-4 w-4" /><span>{saving ? "Menyimpan..." : "Simpan"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && <ConfirmModal item={deleteTarget.title} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PELAYANAN PANEL  (with image upload)
// ═══════════════════════════════════════════════════════════════
function PelayananPanel({ authFetch }: { authFetch: ReturnType<typeof useAdminAuth>["authFetch"] }) {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Partial<ServiceItem> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/service-items"); setItems(await r.json()); }
    catch { showToast("Gagal memuat data.", "error"); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editItem?.title || !editItem.description || !editItem.schedule || !editItem.location) return showToast("Semua field wajib diisi.", "error");
    setSaving(true);
    try {
      const url = isNew ? "/api/service-items" : `/api/service-items/${editItem.id}`;
      const r = await authFetch(url, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editItem) });
      if (!r.ok) throw new Error();
      showToast(isNew ? "Pelayanan ditambahkan!" : "Pelayanan diperbarui!");
      setEditItem(null); load();
    } catch { showToast("Gagal menyimpan.", "error"); }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await authFetch(`/api/service-items/${deleteTarget.id}`, { method: "DELETE" });
      showToast(`"${deleteTarget.title}" dihapus.`); setDeleteTarget(null); load();
    } catch { showToast("Gagal menghapus.", "error"); }
  };

  const IconComp = ({ name }: { name: string }) => {
    const icons: Record<string, React.ReactNode> = {
      Heart: <Heart className="h-4 w-4" />, Users: <Users className="h-4 w-4" />,
      Sparkles: <Sparkles className="h-4 w-4" />, Star: <Star className="h-4 w-4" />,
      Music: <Music className="h-4 w-4" />, BookOpen: <BookOpen className="h-4 w-4" />,
      CalendarDays: <CalendarDays className="h-4 w-4" />
    };
    return <>{icons[name] || <Heart className="h-4 w-4" />}</>;
  };

  return (
    <div>
      <SectionHeader title="Program Pelayanan" subtitle="Program & komunitas pelayanan" count={items.length} onAdd={() => { setEditItem({ title: "", description: "", schedule: "", location: "", icon: "Heart", image: "" }); setIsNew(true); }} />
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(s => (
            <div key={s.id} className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-indigo-200 hover:shadow-sm transition-all">
              {s.image && <img src={s.image} alt={s.title} className="w-full h-36 object-cover" />}
              <div className="p-5">
                <div className="flex items-start space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0"><IconComp name={s.icon} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{s.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">{s.description}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center space-x-1 text-xs text-indigo-600 font-medium"><Clock className="h-3 w-3" /><span>{s.schedule}</span></span>
                  <span className="flex items-center space-x-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /><span>{s.location}</span></span>
                </div>
              </div>
              <div className="absolute top-2 right-2 flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditItem({ ...s }); setIsNew(false); }} className="h-7 w-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-indigo-600 cursor-pointer shadow-sm"><Pencil className="h-3 w-3" /></button>
                <button onClick={() => setDeleteTarget(s)} className="h-7 w-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-red-600 cursor-pointer shadow-sm"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="col-span-2 text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl"><Heart className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">Belum ada data. Klik "Tambah Baru".</p></div>}
        </div>
      )}
      {editItem !== null && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-display font-bold text-slate-900">{isNew ? "Tambah Pelayanan" : "Edit Pelayanan"}</h3>
              <button onClick={() => setEditItem(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <Field label="Nama Pelayanan" req><input className={ic} placeholder="cth. Connect Groups" value={editItem.title || ""} onChange={e => setEditItem({ ...editItem, title: e.target.value })} /></Field>
              <Field label="Deskripsi" req><textarea className={`${ic} min-h-[80px] resize-none`} value={editItem.description || ""} onChange={e => setEditItem({ ...editItem, description: e.target.value })} /></Field>
              <Field label="Jadwal" req><input className={ic} placeholder="cth. Setiap Jumat, 19:00 WIB" value={editItem.schedule || ""} onChange={e => setEditItem({ ...editItem, schedule: e.target.value })} /></Field>
              <Field label="Lokasi" req><input className={ic} placeholder="cth. Seluruh wilayah Jakarta" value={editItem.location || ""} onChange={e => setEditItem({ ...editItem, location: e.target.value })} /></Field>
              <Field label="Ikon">
                <select className={`${ic} cursor-pointer`} value={editItem.icon || "Heart"} onChange={e => setEditItem({ ...editItem, icon: e.target.value })}>
                  {ICON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <ImageUploader
                currentImage={editItem.image}
                onUploaded={url => setEditItem(prev => ({ ...prev, image: url }))}
                authFetch={authFetch}
                label="Gambar Pelayanan"
              />
              <div className="flex space-x-3 pt-2">
                <button onClick={() => setEditItem(null)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Batal</button>
                <button onClick={save} disabled={saving} className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60">
                  <Save className="h-4 w-4" /><span>{saving ? "Menyimpan..." : "Simpan"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && <ConfirmModal item={deleteTarget.title} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// KEGIATAN PANEL  (with image upload)
// ═══════════════════════════════════════════════════════════════
function KegiatanPanel({ authFetch }: { authFetch: ReturnType<typeof useAdminAuth>["authFetch"] }) {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Partial<ChurchEvent> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChurchEvent | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/church-events"); setEvents(await r.json()); }
    catch { showToast("Gagal memuat data.", "error"); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editItem?.title || !editItem.category || !editItem.date || !editItem.fullDate || !editItem.description) return showToast("Field wajib: judul, kategori, tanggal, deskripsi.", "error");
    setSaving(true);
    try {
      const url = isNew ? "/api/church-events" : `/api/church-events/${editItem.id}`;
      const r = await authFetch(url, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editItem) });
      if (!r.ok) throw new Error();
      showToast(isNew ? "Kegiatan ditambahkan!" : "Kegiatan diperbarui!");
      setEditItem(null); load();
    } catch { showToast("Gagal menyimpan.", "error"); }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await authFetch(`/api/church-events/${deleteTarget.id}`, { method: "DELETE" });
      showToast(`"${deleteTarget.title}" dihapus.`); setDeleteTarget(null); load();
    } catch { showToast("Gagal menghapus.", "error"); }
  };

  return (
    <div>
      <SectionHeader title="Kegiatan Gereja" subtitle="Event & kegiatan komunitas" count={events.length}
        onAdd={() => { setEditItem({ title: "", category: "RETREAT", date: "", fullDate: "", description: "", location: "", image: "", timeRange: "", trainer: "" }); setIsNew(true); }} />
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev.id} className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-indigo-200 hover:shadow-sm transition-all gap-3">
              {ev.image && <img src={ev.image} alt={ev.title} className="h-full w-20 sm:w-28 object-cover shrink-0 self-stretch" />}
              <div className="flex items-center flex-1 min-w-0 py-4 pr-4 gap-4" style={{ paddingLeft: ev.image ? "0" : "1.25rem" }}>
                <div className="h-14 w-12 rounded-xl bg-indigo-600 flex flex-col items-center justify-center shrink-0 text-white">
                  <span className="font-display text-base font-bold leading-none">{ev.date?.split(" ")[0]}</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase opacity-80">{ev.date?.split(" ")[1]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`inline-block text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border mb-1 ${categoryBadge(ev.category)}`}>{ev.category}</span>
                  <p className="font-semibold text-slate-900 text-sm truncate">{ev.title}</p>
                  <p className="text-xs text-slate-500 truncate">{ev.location || ev.fullDate}</p>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => { setEditItem({ ...ev }); setIsNew(false); }} className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 cursor-pointer transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteTarget(ev)} className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 hover:border-red-300 cursor-pointer transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl"><CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">Belum ada data. Klik "Tambah Baru".</p></div>}
        </div>
      )}
      {editItem !== null && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-display font-bold text-slate-900">{isNew ? "Tambah Kegiatan" : "Edit Kegiatan"}</h3>
              <button onClick={() => setEditItem(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Judul Kegiatan" req><input className={ic} placeholder="cth. Awakening Camp 2026" value={editItem.title || ""} onChange={e => setEditItem({ ...editItem, title: e.target.value })} /></Field>
                </div>
                <Field label="Kategori" req>
                  <select className={`${ic} cursor-pointer`} value={editItem.category || "RETREAT"} onChange={e => setEditItem({ ...editItem, category: e.target.value })}>
                    {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Tanggal Singkat" req><input className={ic} placeholder="cth. 24 OKT" value={editItem.date || ""} onChange={e => setEditItem({ ...editItem, date: e.target.value })} /></Field>
                <div className="col-span-2">
                  <Field label="Tanggal Lengkap" req><input className={ic} placeholder="cth. 24 Oktober 2026" value={editItem.fullDate || ""} onChange={e => setEditItem({ ...editItem, fullDate: e.target.value })} /></Field>
                </div>
                <div className="col-span-2">
                  <Field label="Deskripsi" req><textarea className={`${ic} min-h-[80px] resize-none`} value={editItem.description || ""} onChange={e => setEditItem({ ...editItem, description: e.target.value })} /></Field>
                </div>
                <Field label="Lokasi"><input className={ic} placeholder="cth. Cipanas, Jawa Barat" value={editItem.location || ""} onChange={e => setEditItem({ ...editItem, location: e.target.value })} /></Field>
                <Field label="Jam (Opsional)"><input className={ic} placeholder="cth. 18:30 - 20:00 WIB" value={editItem.timeRange || ""} onChange={e => setEditItem({ ...editItem, timeRange: e.target.value })} /></Field>
                <div className="col-span-2">
                  <Field label="Pengajar (Opsional)"><input className={ic} placeholder="cth. Pdt. Andreas & Tim" value={editItem.trainer || ""} onChange={e => setEditItem({ ...editItem, trainer: e.target.value })} /></Field>
                </div>
                <div className="col-span-2">
                  <ImageUploader
                    currentImage={editItem.image}
                    onUploaded={url => setEditItem(prev => ({ ...prev, image: url }))}
                    authFetch={authFetch}
                    label="Gambar Kegiatan"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-2">
                <button onClick={() => setEditItem(null)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Batal</button>
                <button onClick={save} disabled={saving} className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60">
                  <Save className="h-4 w-4" /><span>{saving ? "Menyimpan..." : "Simpan Kegiatan"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && <ConfirmModal item={deleteTarget.title} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEMA PANEL (Theme Settings)
// ═══════════════════════════════════════════════════════════════
const FONT_OPTIONS = ["Inter", "Hanken Grotesk", "JetBrains Mono", "Georgia", "Times New Roman", "Arial", "Helvetica"];

function TemaPanel({ authFetch }: { authFetch: ReturnType<typeof useAdminAuth>["authFetch"] }) {
  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: "#4f46e5",
    secondaryColor: "#6366f1",
    accentColor: "#fbbf24",
    backgroundColor: "#f8fafc",
    textColor: "#0f172a",
    fontFamily: "Inter",
    weeklyTheme: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/theme");
      const data = await r.json();
      setTheme(data);
      // Apply theme to CSS variables
      applyTheme(data);
    } catch {
      showToast("Gagal memuat tema.", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyTheme = (t: ThemeSettings) => {
    const root = document.documentElement;
    root.style.setProperty("--theme-primary", t.primaryColor);
    root.style.setProperty("--theme-secondary", t.secondaryColor);
    root.style.setProperty("--theme-accent", t.accentColor);
    root.style.setProperty("--theme-bg", t.backgroundColor);
    root.style.setProperty("--theme-text", t.textColor);
    root.style.setProperty("--theme-font", t.fontFamily);
  };

  const handleChange = (field: keyof ThemeSettings, value: string) => {
    const updated = { ...theme, [field]: value };
    setTheme(updated);
    // Live preview
    applyTheme(updated);
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await authFetch("/api/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme)
      });
      if (!r.ok) throw new Error();
      showToast("Tema berhasil disimpan!");
    } catch {
      showToast("Gagal menyimpan tema.", "error");
    }
    setSaving(false);
  };

  const ic = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Pengaturan Tema</h2>
          <p className="text-sm text-slate-500 mt-0.5">Atur tema mingguan yang tampil di website</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={save} disabled={saving} className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer transition-all disabled:opacity-60">
            <Save className="h-3.5 w-3.5" /><span>{saving ? "Menyimpan..." : "Simpan Tema"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
      ) : (
        <div className="space-y-8">
          {/* Weekly Theme Text Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Tema Mingguan (Weekly Theme)</label>
            <input
              className={ic}
              placeholder="cth. Keluarga Kristen yang Menjadi Teladan"
              value={theme.weeklyTheme}
              onChange={(e) => handleChange("weeklyTheme", e.target.value)}
            />
          </div>

        </div>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN ADMIN VIEW
// ═══════════════════════════════════════════════════════════════
interface AdminViewProps {
  onBack: () => void;
}

export default function AdminView({ onBack }: AdminViewProps) {
  const [section, setSection] = useState<AdminSection>("jadwal");
  const { user, logout, authFetch } = useAdminAuth();

  const handleLogout = async () => {
    await logout();
    onBack();
  };

  const navItems: { key: AdminSection; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: "jadwal", label: "Jadwal Ibadah", icon: <Clock className="h-5 w-5" />, desc: "Sesi ibadah raya Minggu" },
    { key: "pelayanan", label: "Pelayanan", icon: <Heart className="h-5 w-5" />, desc: "Program & komunitas" },
    { key: "kegiatan", label: "Kegiatan", icon: <CalendarDays className="h-5 w-5" />, desc: "Event & kegiatan gereja" },
    { key: "tema", label: "Tema", icon: <Sparkles className="h-5 w-5" />, desc: "Pengaturan tampilan" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Top Bar */}
      <div className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-display text-sm font-bold text-slate-900">Panel Admin</span>
              <span className="hidden sm:inline text-slate-400 text-xs ml-1">· GKMI ICHTUS</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {user && (
              <div className="hidden sm:flex items-center space-x-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Shield className="h-3 w-3 text-indigo-600" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{user.username}</span>
              </div>
            )}
            <button onClick={onBack} className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all">
              <span className="hidden sm:inline">← Website</span>
              <span className="sm:hidden">← Kembali</span>
            </button>
            <button onClick={handleLogout} id="btn-admin-logout" className="flex items-center space-x-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 cursor-pointer transition-all">
              <LogOut className="h-3.5 w-3.5" /><span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white mb-4 shadow-lg shadow-indigo-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm">Dasbor Admin</p>
                  <p className="text-xs text-indigo-200">Konten Management</p>
                </div>
              </div>
              <p className="text-xs text-indigo-100 leading-relaxed">Kelola konten website gereja dengan mudah dan cepat.</p>
            </div>
            <nav className="space-y-1.5">
              {navItems.map(item => (
                <button key={item.key} id={`admin-nav-${item.key}`} onClick={() => setSection(item.key)}
                  className={`w-full flex items-center space-x-3 rounded-xl px-4 py-3 text-left transition-all cursor-pointer ${section === item.key ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50"}`}>
                  <span className={section === item.key ? "text-white" : "text-slate-400"}>{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className={`text-xs truncate ${section === item.key ? "text-indigo-200" : "text-slate-400"}`}>{item.desc}</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${section === item.key ? "text-white" : "text-slate-300"}`} />
                </button>
              ))}
            </nav>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Catatan:</strong> Perubahan disimpan langsung ke database dan tampil di website publik.
              </p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm min-h-[500px]">
              {section === "jadwal" && <JadwalPanel authFetch={authFetch} />}
              {section === "pelayanan" && <PelayananPanel authFetch={authFetch} />}
              {section === "kegiatan" && <KegiatanPanel authFetch={authFetch} />}
              {section === "tema" && <TemaPanel authFetch={authFetch} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
