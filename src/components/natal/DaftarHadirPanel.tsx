import React, { useMemo, useState } from "react";
import { Search, Users, UserCheck, UserX, RefreshCw, FileDown } from "lucide-react";
import { NatalPeserta } from "../../types";
import { formatWaktu, sortByNomor } from "./barcode";

interface Props {
  peserta: NatalPeserta[];
  loading: boolean;
  onRefresh: () => void;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}

type Filter = "semua" | "hadir" | "belum";

export default function DaftarHadirPanel({ peserta, loading, onRefresh, authFetch }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");

  const totalHadir = peserta.filter(p => p.hadir).length;

  // Selalu diurutkan sesuai nomor peserta
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortByNomor(peserta).filter(p => {
      if (filter === "hadir" && !p.hadir) return false;
      if (filter === "belum" && p.hadir) return false;
      if (q && !p.nama.toLowerCase().includes(q) && !p.nomor.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [peserta, search, filter]);

  const toggleHadir = async (p: NatalPeserta) => {
    const msg = p.hadir
      ? `Batalkan status hadir untuk "${p.nama}"?`
      : `Tandai "${p.nama}" hadir secara manual?`;
    if (!confirm(msg)) return;
    const res = await authFetch(`/api/natal/peserta/${p.id}`, {
      method: "PUT",
      body: JSON.stringify({ hadir: !p.hadir })
    });
    if (!res.ok) { alert("Gagal memperbarui status."); return; }
    onRefresh();
  };

  const exportCsv = () => {
    const header = ["No. Peserta", "Nama", "Status", "Waktu Hadir"];
    const lines = sortByNomor(peserta).map(p =>
      [p.nomor, p.nama, p.hadir ? "Hadir" : "Belum Hadir", p.hadir ? formatWaktu(p.waktuHadir) : ""]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "daftar-hadir-natal.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const stat = (label: string, value: number, Icon: React.ElementType, cls: string) => (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${cls}`}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {stat("Total Undangan", peserta.length, Users, "bg-slate-100 text-slate-600")}
        {stat("Hadir", totalHadir, UserCheck, "bg-green-100 text-green-700")}
        {stat("Belum Hadir", peserta.length - totalHadir, UserX, "bg-red-100 text-red-600")}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-bold text-slate-800">Daftar Hadir</h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama peserta..."
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-red-500 sm:w-64"
              />
            </div>
            <div className="flex rounded-xl border border-slate-300 p-0.5 text-sm">
              {(["semua", "hadir", "belum"] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 font-semibold capitalize cursor-pointer ${filter === f ? "bg-red-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button onClick={onRefresh} title="Muat ulang" className="rounded-xl border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 cursor-pointer">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={exportCsv} title="Unduh CSV" className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
              <FileDown className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 w-28">No.</th>
                <th className="px-4 py-3">Nama Peserta</th>
                <th className="px-4 py-3 w-32">Status</th>
                <th className="px-4 py-3 w-40">Waktu Hadir</th>
                <th className="px-4 py-3 w-32 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Tidak ada data.</td></tr>
              )}
              {rows.map(p => (
                <tr key={p.id} className={p.hadir ? "bg-green-50/40" : ""}>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-700">{p.nomor}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nama}</td>
                  <td className="px-4 py-3">
                    {p.hadir
                      ? <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">✓ Hadir</span>
                      : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">Belum Hadir</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.hadir ? formatWaktu(p.waktuHadir) : "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleHadir(p)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${p.hadir ? "text-slate-500 hover:bg-slate-100" : "text-green-700 hover:bg-green-50"}`}
                    >
                      {p.hadir ? "Batalkan" : "Tandai Hadir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
          Diurutkan berdasarkan nomor peserta · diperbarui otomatis setiap 5 detik
        </p>
      </div>
    </div>
  );
}
