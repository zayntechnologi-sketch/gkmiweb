import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, QrCode, Pencil, Trash2, Printer, Download, X, Check, AlertCircle } from "lucide-react";
import { NatalPeserta } from "../../types";
import { buildCardDataUrl, downloadDataUrl, printCards, safeFilename, sortByNomor } from "./barcode";

interface Props {
  peserta: NatalPeserta[];
  setPeserta: React.Dispatch<React.SetStateAction<NatalPeserta[]>>;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onChanged: () => void;
}

/** Saran nomor berikutnya: angka terbesar + 1, mempertahankan jumlah digit (mis. 007 -> 008). */
function nextNomor(list: NatalPeserta[]): string {
  let max = 0;
  let pad = 3;
  for (const p of list) {
    if (/^\d+$/.test(p.nomor)) {
      const n = parseInt(p.nomor, 10);
      if (n >= max) { max = n; pad = Math.max(pad, p.nomor.length); }
    }
  }
  return String(max + 1).padStart(pad, "0");
}

export default function PesertaPanel({ peserta, setPeserta, authFetch, onChanged }: Props) {
  const [nama, setNama] = useState("");
  const [nomor, setNomor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<NatalPeserta | null>(null);
  const [preview, setPreview] = useState<{ p: NatalPeserta; url: string } | null>(null);

  useEffect(() => {
    if (!nomor) setNomor(nextNomor(peserta));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peserta]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? peserta.filter(p => p.nama.toLowerCase().includes(q) || p.nomor.toLowerCase().includes(q))
      : peserta;
    return sortByNomor(list);
  }, [peserta, search]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !nomor.trim()) { setError("Nama dan nomor peserta wajib diisi."); return; }
    setSaving(true);
    setError(null);
    const res = await authFetch("/api/natal/peserta", {
      method: "POST",
      body: JSON.stringify({ nama: nama.trim(), nomor: nomor.trim() })
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(data.error || "Gagal menambahkan peserta."); return; }
    // Langsung tambahkan ke daftar di layar tanpa perlu menunggu refresh
    const nextList = [...peserta.filter(p => p.id !== data.id), data];
    setPeserta(nextList);
    setNama("");
    setNomor(nextNomor(nextList));
    onChanged();
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const res = await authFetch(`/api/natal/peserta/${editing.id}`, {
      method: "PUT",
      body: JSON.stringify({ nama: editing.nama, nomor: editing.nomor })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data.error || "Gagal menyimpan perubahan."); return; }
    setPeserta(prev => prev.map(p => (p.id === editing.id ? { ...p, ...data } : p)));
    setEditing(null);
    onChanged();
  };

  const handleDelete = async (p: NatalPeserta) => {
    if (!confirm(`Hapus peserta "${p.nama}" (No. ${p.nomor})? Barcode-nya tidak akan berlaku lagi.`)) return;
    const res = await authFetch(`/api/natal/peserta/${p.id}`, { method: "DELETE" });
    if (!res.ok) { alert("Gagal menghapus peserta."); return; }
    setPeserta(prev => prev.filter(item => item.id !== p.id));
    onChanged();
  };

  const openPreview = async (p: NatalPeserta) => {
    setPreview({ p, url: await buildCardDataUrl(p) });
  };

  return (
    <div className="space-y-6">
      {/* Form tambah peserta */}
      <form onSubmit={handleAdd} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Tambah Peserta Undangan</h2>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">No. Peserta</label>
            <input
              value={nomor}
              onChange={e => setNomor(e.target.value)}
              placeholder="001"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Nama Peserta</label>
            <input
              value={nama}
              onChange={e => setNama(e.target.value)}
              placeholder="Nama lengkap peserta"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 self-end rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> {saving ? "Menyimpan..." : "Tambah"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">Barcode dibuat otomatis untuk setiap peserta yang ditambahkan.</p>
      </form>

      {/* Daftar peserta */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-800">Peserta Undangan ({peserta.length})</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama / nomor..."
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-red-500 sm:w-60"
              />
            </div>
            <button
              onClick={() => printCards(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              title="Cetak semua barcode yang tampil"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Cetak Semua</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 w-28">No.</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3 w-28">Status</th>
                <th className="px-4 py-3 w-40 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  {peserta.length === 0 ? "Belum ada peserta. Tambahkan peserta di atas." : "Tidak ada peserta yang cocok."}
                </td></tr>
              )}
              {filtered.map(p => {
                const isEdit = editing?.id === p.id;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                      {isEdit ? (
                        <input value={editing.nomor} onChange={e => setEditing({ ...editing, nomor: e.target.value })}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1" />
                      ) : p.nomor}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {isEdit ? (
                        <input value={editing.nama} onChange={e => setEditing({ ...editing, nama: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1" />
                      ) : p.nama}
                    </td>
                    <td className="px-4 py-3">
                      {p.hadir
                        ? <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">Hadir</span>
                        : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">Belum</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {isEdit ? (
                          <>
                            <button onClick={handleSaveEdit} title="Simpan" className="rounded-lg p-2 text-green-600 hover:bg-green-50 cursor-pointer"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEditing(null)} title="Batal" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openPreview(p)} title="Lihat barcode" className="rounded-lg p-2 text-red-600 hover:bg-red-50 cursor-pointer"><QrCode className="h-4 w-4" /></button>
                            <button onClick={() => setEditing({ ...p })} title="Edit" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(p)} title="Hapus" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal preview barcode */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4" onClick={() => setPreview(null)}>
          <div className="max-h-[95vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Barcode Peserta</h3>
              <button onClick={() => setPreview(null)} className="rounded-lg p-1.5 hover:bg-slate-100 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <img src={preview.url} alt={`Barcode ${preview.p.nama}`} className="w-full rounded-lg border border-slate-200" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => downloadDataUrl(preview.url, safeFilename(preview.p))}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 cursor-pointer"
              >
                <Download className="h-4 w-4" /> Unduh PNG
              </button>
              <button
                onClick={() => printCards([preview.p])}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Cetak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
