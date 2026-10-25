import React, { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, CheckCircle2, AlertTriangle, XCircle, Keyboard } from "lucide-react";
import { NatalPeserta } from "../../types";
import { formatWaktu } from "./barcode";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onCheckedIn: () => void;
}

type ScanResult =
  | { type: "ok"; peserta: NatalPeserta }
  | { type: "already"; peserta: NatalPeserta }
  | { type: "error"; message: string };

const READER_ID = "natal-qr-reader";

export default function ScanPanel({ authFetch, onCheckedIn }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ kode: string; at: number }>({ kode: "", at: 0 });
  const busyRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manual, setManual] = useState("");
  const [history, setHistory] = useState<{ nama: string; nomor: string; at: string; status: string }[]>([]);

  const checkIn = useCallback(async (raw: string) => {
    const kode = raw.trim();
    if (!kode || busyRef.current) return;
    // Hindari scan berulang untuk kode yang sama dalam 3 detik
    const now = Date.now();
    if (lastScanRef.current.kode === kode && now - lastScanRef.current.at < 3000) return;
    lastScanRef.current = { kode, at: now };
    busyRef.current = true;
    try {
      const res = await authFetch("/api/natal/checkin", { method: "POST", body: JSON.stringify({ kode }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ type: "error", message: data.error || "Gagal memproses barcode." });
      } else {
        const p: NatalPeserta = data.peserta;
        setResult({ type: data.status === "already" ? "already" : "ok", peserta: p });
        setHistory(h => [{ nama: p.nama, nomor: p.nomor, at: new Date().toISOString(), status: data.status }, ...h].slice(0, 10));
        if (data.status === "ok") {
          navigator.vibrate?.(150);
          onCheckedIn();
        }
      }
    } catch {
      setResult({ type: "error", message: "Tidak dapat terhubung ke server." });
    } finally {
      busyRef.current = false;
    }
  }, [authFetch, onCheckedIn]);

  const stopCamera = useCallback(async () => {
    const s = scannerRef.current;
    if (s) {
      try { if (s.isScanning) await s.stop(); s.clear(); } catch { /* abaikan */ }
    }
    scannerRef.current = null;
    setRunning(false);
  }, []);

  const startCamera = async () => {
    setCamError(null);
    try {
      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s }; } },
        decoded => { checkIn(decoded); },
        () => { /* frame tanpa barcode, abaikan */ }
      );
      setRunning(true);
    } catch (err: any) {
      scannerRef.current = null;
      setRunning(false);
      setCamError(
        "Kamera tidak dapat dibuka. Pastikan izin kamera diberikan dan situs diakses melalui HTTPS. " +
        (err?.message ? `(${err.message})` : "")
      );
    }
  };

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    lastScanRef.current = { kode: "", at: 0 }; // input manual selalu diproses
    checkIn(manual);
    setManual("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Kamera */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Scan Barcode Kehadiran</h2>
          {running ? (
            <button onClick={stopCamera} className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
              <CameraOff className="h-4 w-4" /> Matikan
            </button>
          ) : (
            <button onClick={startCamera} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 cursor-pointer">
              <Camera className="h-4 w-4" /> Buka Kamera
            </button>
          )}
        </div>

        <div className="relative overflow-hidden rounded-xl bg-slate-900" style={{ minHeight: 260 }}>
          <div id={READER_ID} className="w-full" />
          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Camera className="h-10 w-10" />
              <p className="text-sm">Tekan "Buka Kamera" untuk mulai scan</p>
            </div>
          )}
        </div>
        {camError && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{camError}</p>}

        <form onSubmit={submitManual} className="mt-4">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Keyboard className="h-3.5 w-3.5" /> Input manual / scanner USB
          </label>
          <div className="flex gap-2">
            <input
              value={manual}
              onChange={e => setManual(e.target.value)}
              placeholder="Kode barcode, mis. NTL-XXXXXXXXXX"
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-red-500"
            />
            <button type="submit" className="rounded-xl bg-slate-800 px-4 text-sm font-bold text-white hover:bg-slate-700 cursor-pointer">Check-in</button>
          </div>
        </form>
      </div>

      {/* Hasil */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Hasil Scan</h3>
          {!result && <p className="py-10 text-center text-slate-400">Belum ada barcode yang di-scan.</p>}
          {result?.type === "ok" && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
              <p className="mt-2 text-sm font-semibold text-green-700">Selamat datang! Kehadiran tercatat</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{result.peserta.nama}</p>
              <p className="mt-1 font-mono text-lg font-bold text-red-600">No. {result.peserta.nomor}</p>
            </div>
          )}
          {result?.type === "already" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
              <AlertTriangle className="mx-auto h-14 w-14 text-amber-500" />
              <p className="mt-2 text-sm font-semibold text-amber-700">Peserta sudah check-in sebelumnya</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{result.peserta.nama}</p>
              <p className="mt-1 font-mono text-lg font-bold text-red-600">No. {result.peserta.nomor}</p>
              <p className="mt-1 text-xs text-slate-500">Hadir pada {formatWaktu(result.peserta.waktuHadir)}</p>
            </div>
          )}
          {result?.type === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <XCircle className="mx-auto h-14 w-14 text-red-500" />
              <p className="mt-2 font-semibold text-red-700">{result.message}</p>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Riwayat Scan Terakhir</h3>
            <ul className="divide-y divide-slate-100 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span><span className="font-mono font-semibold text-slate-500">{h.nomor}</span> · {h.nama}</span>
                  <span className={h.status === "ok" ? "text-green-600" : "text-amber-600"}>
                    {h.status === "ok" ? "Hadir" : "Sudah"} · {formatWaktu(h.at)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
