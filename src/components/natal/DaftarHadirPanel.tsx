import React, { useEffect, useMemo, useState } from "react";
import {
  Search, Users, UserCheck, UserX, RefreshCw, FileSpreadsheet,
  FileDown, Cloud, Check, Copy, ChevronDown, ChevronUp
} from "lucide-react";
import { NatalPeserta } from "../../types";
import { formatWaktu, sortByNomor } from "./barcode";
import { downloadDaftarHadirExcel } from "./excel";

interface Props {
  peserta: NatalPeserta[];
  loading: boolean;
  onRefresh: () => void;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}

type Filter = "semua" | "hadir" | "belum";

const APPS_SCRIPT_CODE = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Daftar Hadir") || ss.getSheets()[0];
  sheet.clearContents();

  // Judul & ringkasan
  sheet.getRange(1, 1).setValue("DAFTAR HADIR ACARA NATAL - GKMI ICHTUS").setFontWeight("bold").setFontSize(13);
  sheet.getRange(2, 1).setValue("Total: " + data.total + " | Hadir: " + data.hadir + " | Belum: " + (data.total - data.hadir) + " | Update: " + new Date().toLocaleString("id-ID"));

  // Header tabel
  var headers = [["No. Urut", "No. Peserta", "Nama Peserta", "Status Kehadiran", "Waktu Hadir", "Kode Barcode"]];
  sheet.getRange(4, 1, 1, 6).setValues(headers).setFontWeight("bold").setBackground("#b91c1c").setFontColor("#ffffff");

  // Data peserta (sudah diurutkan berdasarkan nomor peserta)
  var list = data.peserta || [];
  if (list.length > 0) {
    var rows = list.map(function(p, i) {
      var waktu = p.hadir && p.waktuHadir ? new Date(p.waktuHadir).toLocaleString("id-ID") : "-";
      return [i + 1, "'" + p.nomor, p.nama, p.hadir ? "HADIR" : "BELUM HADIR", waktu, p.kode];
    });
    sheet.getRange(5, 1, rows.length, 6).setValues(rows);
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}`;

export default function DaftarHadirPanel({ peserta, loading, onRefresh, authFetch }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");

  // Google Spreadsheet sync state
  const [showSheetBox, setShowSheetBox] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    authFetch("/api/natal/sheet-config")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d && typeof d.webhookUrl === "string") {
          setWebhookUrl(d.webhookUrl);
          setSavedUrl(d.webhookUrl);
        }
      })
      .catch(() => {});
  }, [authFetch]);

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

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await authFetch("/api/natal/sheet-config", {
        method: "PUT",
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncMsg({ ok: false, text: data.error || "Gagal menyimpan pengaturan." });
      } else {
        setSavedUrl(data.webhookUrl || "");
        const s = data.sync;
        setSyncMsg({
          ok: s ? !!s.ok : true,
          text: s?.message || "Tersimpan."
        });
      }
    } catch {
      setSyncMsg({ ok: false, text: "Tidak dapat menghubungi server." });
    }
    setSyncing(false);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await authFetch("/api/natal/sheet-sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncMsg({ ok: false, text: data.error || "Gagal sinkronisasi." });
      } else {
        setSyncMsg({ ok: true, text: data.message || "Spreadsheet berhasil diperbarui!" });
      }
    } catch {
      setSyncMsg({ ok: false, text: "Tidak dapat menghubungi server." });
    }
    setSyncing(false);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      {/* Box Pengaturan Google Spreadsheet Otomatis */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Google Spreadsheet Otomatis</h3>
                {savedUrl ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    ● Aktif
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                    Belum diatur
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Setiap peserta scan barcode / ditambah / diubah, Google Spreadsheet langsung ter-update otomatis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {savedUrl && (
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                Sinkronkan Sekarang
              </button>
            )}
            <button
              onClick={() => setShowSheetBox(v => !v)}
              className="flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
            >
              {showSheetBox ? "Tutup Pengaturan" : "Atur Spreadsheet"}
              {showSheetBox ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {syncMsg && (
          <p className={`mt-2.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${syncMsg.ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
            {syncMsg.text}
          </p>
        )}

        {showSheetBox && (
          <div className="mt-4 space-y-3 border-t border-emerald-200 pt-4">
            <form onSubmit={handleSaveWebhook} className="flex flex-col gap-2 sm:flex-row">
              <input
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="Tempel URL Web App Google Apps Script (https://script.google.com/macros/s/.../exec)"
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                disabled={syncing}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60 cursor-pointer"
              >
                {syncing ? "Menyimpan..." : "Simpan & Hubungkan"}
              </button>
            </form>

            <div>
              <button
                type="button"
                onClick={() => setShowGuide(g => !g)}
                className="text-xs font-bold text-emerald-800 underline cursor-pointer"
              >
                {showGuide ? "Sembunyikan cara menghubungkan ke Google Spreadsheet" : "Lihat cara menghubungkan ke Google Spreadsheet (1 menit, gratis)"}
              </button>

              {showGuide && (
                <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-700">
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Buka Google Spreadsheet baru di <b>sheets.google.com</b>.</li>
                    <li>Klik menu <b>Extensions (Ekstensi) → Apps Script</b>.</li>
                    <li>Hapus isi yang ada, lalu tempel kode di bawah ini dan klik ikon <b>Save</b>.</li>
                    <li>Klik <b>Deploy → New deployment</b>, pilih jenis <b>Web app</b>, bagian <i>Who has access</i> pilih <b>Anyone (Siapa saja)</b>, lalu klik <b>Deploy</b>.</li>
                    <li>Salin <b>Web app URL</b> (`https://script.google.com/macros/s/.../exec`) lalu tempel di kolom di atas.</li>
                  </ol>
                  <div className="relative mt-2">
                    <button
                      type="button"
                      onClick={copyScript}
                      className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-700 cursor-pointer"
                    >
                      {copied ? <><Check className="h-3 w-3" /> Disalin</> : <><Copy className="h-3 w-3" /> Salin Kode</>}
                    </button>
                    <pre className="max-h-52 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] text-slate-100">
                      {APPS_SCRIPT_CODE}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
            <button
              onClick={() => downloadDaftarHadirExcel(peserta)}
              title="Unduh file Microsoft Excel (.xlsx)"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-emerald-500 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" /> Download Excel (.xlsx)
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
