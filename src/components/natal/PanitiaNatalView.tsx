import React, { useCallback, useEffect, useState } from "react";
import { Users, ScanLine, ClipboardCheck, LogOut, ArrowLeft, TreePine } from "lucide-react";
import { NatalPeserta } from "../../types";
import { usePanitiaAuth } from "../../hooks/usePanitiaAuth";
import LoginView from "../LoginView";
import PesertaPanel from "./PesertaPanel";
import ScanPanel from "./ScanPanel";
import DaftarHadirPanel from "./DaftarHadirPanel";

type Tab = "peserta" | "scan" | "hadir";

interface Props {
  onBack: () => void;
}

export default function PanitiaNatalView({ onBack }: Props) {
  const { user, checking, login, logout, authFetch } = usePanitiaAuth();
  const [tab, setTab] = useState<Tab>("peserta");
  const [peserta, setPeserta] = useState<NatalPeserta[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/natal/peserta?_t=${Date.now()}`);
      if (res.status === 401) { logout(); return; }
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) setPeserta(list);
      }
    } catch { /* jaringan error, coba lagi di polling berikutnya */ }
    setLoading(false);
  }, [authFetch, logout]);

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  // Daftar hadir auto-refresh agar sinkron dengan petugas scan di perangkat lain
  useEffect(() => {
    if (!user || tab !== "hadir") return;
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [user, tab, refresh]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Memverifikasi sesi...
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView
        onLogin={login}
        onBack={onBack}
        title="Panitia Natal"
        subtitle="GKMI ICHTUS · Undangan & Daftar Hadir"
        submitLabel="Masuk sebagai Panitia"
        note="Akses terbatas untuk panitia Natal"
      />
    );
  }

  const tabs: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: "peserta", label: "Peserta Undangan", Icon: Users },
    { id: "scan", label: "Scan Barcode", Icon: ScanLine },
    { id: "hadir", label: "Daftar Hadir", Icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-red-700 via-red-600 to-green-700 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} title="Kembali ke website" className="rounded-lg p-2 hover:bg-white/10 cursor-pointer">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <TreePine className="h-7 w-7" />
            <div>
              <h1 className="text-lg font-extrabold leading-tight">Panitia Natal</h1>
              <p className="text-xs text-white/80">GKMI ICHTUS · login sebagai {user.username}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/25 cursor-pointer">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); if (id !== "scan") refresh(); }}
              className={`flex items-center gap-2 whitespace-nowrap rounded-t-xl px-4 py-2.5 text-sm font-bold cursor-pointer transition-colors ${
                tab === id ? "bg-slate-50 text-red-700" : "text-white/85 hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "peserta" && <PesertaPanel peserta={peserta} setPeserta={setPeserta} authFetch={authFetch} onChanged={refresh} />}
        {tab === "scan" && <ScanPanel authFetch={authFetch} onCheckedIn={refresh} />}
        {tab === "hadir" && <DaftarHadirPanel peserta={peserta} setPeserta={setPeserta} loading={loading} onRefresh={refresh} authFetch={authFetch} />}
      </main>
    </div>
  );
}
