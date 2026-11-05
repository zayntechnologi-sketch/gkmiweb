import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles, Volume2, VolumeX, Maximize2, Minimize2, RotateCcw,
  Search, X, Shuffle, Trophy, Monitor, Sliders, ArrowLeft, CheckCircle2,
  Users, Radio, Copy, Check
} from "lucide-react";
import { NatalPeserta } from "../../types";
import { sortByNomor } from "./barcode";

interface Props {
  peserta: NatalPeserta[];
  authFetch?: (url: string, opts?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
  onBack: () => void;
}

interface WinnerRecord {
  id: string;
  nomor: string;
  nama: string;
  hadir: boolean;
  wonAt: string;
  round: number;
}

interface StageSyncPayload {
  spinId?: string;
  winnerId?: string;
  targetDelta?: number;
  startAngle?: number;
  durationSec?: number;
  onlyHadir?: boolean;
  excludedIds?: string[];
  shuffleOrder?: string[] | null;
  dismissModalAt?: number;
  updatedAt: number;
}

const WHEEL_COLORS = [
  "#e11d48", "#2563eb", "#16a34a", "#d97706", "#7c3aed",
  "#0891b2", "#dc2626", "#4f46e5", "#059669", "#ea580c",
  "#9333ea", "#0284c7",
];

const WINNERS_STORAGE_KEY = "gkmi_natal_doorprize_winners";
const EXCLUDED_STORAGE_KEY = "gkmi_natal_doorprize_excluded";
const BROADCAST_CHANNEL_NAME = "gkmi_undian_natal_stage";

// Web Audio synthesizer untuk bunyi klik roda (tick) & fanfare pemenang
let audioCtx: AudioContext | null = null;
function getAudio(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function playTickSound() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(1150, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.028);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.03);
}

function playWinFanfare() {
  const ctx = getAudio();
  if (!ctx) return;
  const notes = [
    { f: 523.25, t: 0, d: 0.14 },    // C5
    { f: 659.25, t: 0.13, d: 0.14 }, // E5
    { f: 783.99, t: 0.26, d: 0.14 }, // G5
    { f: 1046.5, t: 0.40, d: 0.55 }, // C6
  ];
  for (const n of notes) {
    const start = ctx.currentTime + n.t;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(n.f, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.32, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, start + n.d);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + n.d + 0.02);
  }
}

export default function UndianNatalView({ peserta: propPeserta, authFetch, onRefresh, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const isObsUrl = urlParams.get("obs") === "1" || typeof (window as any).obsstudio !== "undefined";
  const isTransparentBg = urlParams.get("bg") === "transparent";

  // Daftar peserta live (diperbarui otomatis dari server setiap 2 detik)
  const [livePeserta, setLivePeserta] = useState<NatalPeserta[]>(propPeserta);
  useEffect(() => {
    if (propPeserta.length > 0 && !spinning) {
      setLivePeserta(propPeserta);
    }
  }, [propPeserta, spinning]);
  const peserta = livePeserta.length > 0 ? livePeserta : propPeserta;

  // Mode tampilan & filter
  const [projectorMode, setProjectorMode] = useState<boolean>(isObsUrl);
  const [onlyHadir, setOnlyHadir] = useState(false);
  const [sideTab, setSideTab] = useState<"peserta" | "pemenang">("peserta");
  const [search, setSearch] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRemoveWinner, setAutoRemoveWinner] = useState(true);
  const [durationSec, setDurationSec] = useState<number>(6);
  const [showObsModal, setShowObsModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Daftar ID yang dikeluarkan dari roda (karena sudah menang atau dihapus manual)
  const [excludedIds, setExcludedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(EXCLUDED_STORAGE_KEY) || "[]");
    } catch { return []; }
  });

  // Riwayat pemenang
  const [winners, setWinners] = useState<WinnerRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(WINNERS_STORAGE_KEY) || "[]");
    } catch { return []; }
  });

  // Urutan acak opsional untuk segmen roda
  const [shuffleOrder, setShuffleOrder] = useState<string[] | null>(null);

  // State putaran roda
  const [spinning, setSpinning] = useState(false);
  const rotationRef = useRef<number>(0); // radian
  const animFrameRef = useRef<number>(0);
  const lastTickIndexRef = useRef<number>(-1);
  const lastSpinIdRef = useRef<string>("");
  const lastDismissAtRef = useRef<number>(0);
  const [winnerModal, setWinnerModal] = useState<NatalPeserta | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    localStorage.setItem(EXCLUDED_STORAGE_KEY, JSON.stringify(excludedIds));
  }, [excludedIds]);

  useEffect(() => {
    localStorage.setItem(WINNERS_STORAGE_KEY, JSON.stringify(winners));
  }, [winners]);

  // Peserta aktif yang masuk ke dalam roda undian
  const activePool = useMemo(() => {
    const base = sortByNomor(peserta).filter(p => {
      if (onlyHadir && !p.hadir) return false;
      if (excludedIds.includes(p.id)) return false;
      return true;
    });
    if (!shuffleOrder) return base;
    const orderMap = new Map<string, number>(shuffleOrder.map((id, idx) => [id, idx]));
    return [...base].sort((a, b) => (orderMap.get(a.id) ?? 99999) - (orderMap.get(b.id) ?? 99999));
  }, [peserta, onlyHadir, excludedIds, shuffleOrder]);

  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activePool;
    return activePool.filter(
      p => p.nama.toLowerCase().includes(q) || p.nomor.toLowerCase().includes(q)
    );
  }, [activePool, search]);

  // Kirim state ke OBS (via BroadcastChannel lokal + API backend)
  const publishStageState = useCallback((payload: StageSyncPayload) => {
    try {
      channelRef.current?.postMessage(payload);
    } catch {}
    if (authFetch) {
      authFetch("/api/natal/undian-live", {
        method: "POST",
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }, [authFetch]);

  // Gambar roda undian di Canvas
  const drawWheel = useCallback((angleRad: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = size / 2 - 14;
    const wheelRadius = outerRadius - 12;

    ctx.clearRect(0, 0, size, size);

    // Bayangan & cincin luar emas
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    const ringGrad = ctx.createLinearGradient(0, 0, size, size);
    ringGrad.addColorStop(0, "#f59e0b");
    ringGrad.addColorStop(0.5, "#fde68a");
    ringGrad.addColorStop(1, "#b45309");
    ctx.fillStyle = ringGrad;
    ctx.fill();

    // Cincin gelap dalam
    ctx.beginPath();
    ctx.arc(cx, cy, wheelRadius + 4, 0, Math.PI * 2);
    ctx.fillStyle = "#090d16";
    ctx.fill();
    ctx.restore();

    const total = activePool.length;
    if (total === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, wheelRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#111827";
      ctx.fill();
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 20px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Belum ada peserta di roda", cx, cy);
      return;
    }

    const arc = (Math.PI * 2) / total;

    // Gambar tiap juring/sektor peserta (0 radian dimulai dari arah jam 12 / -PI/2)
    for (let i = 0; i < total; i++) {
      const startAngle = angleRad + i * arc - Math.PI / 2;
      const endAngle = startAngle + arc;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, wheelRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();

      if (total <= 180) {
        ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
        ctx.lineWidth = total > 80 ? 0.6 : 1.2;
        ctx.stroke();
      }

      // Teks nomor/nama pada juring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";

      const p = activePool[i];
      if (total <= 36) {
        const fontSize = total <= 16 ? 15 : 12;
        ctx.font = `bold ${fontSize}px Inter, monospace`;
        const label = `#${p.nomor} ${p.nama}`.slice(0, 20);
        ctx.fillText(label, wheelRadius - 16, 0);
      } else if (total <= 120) {
        ctx.font = "bold 11px monospace";
        ctx.fillText(`#${p.nomor}`, wheelRadius - 12, 0);
      } else if (i % Math.ceil(total / 90) === 0) {
        ctx.font = "bold 10px monospace";
        ctx.fillText(`#${p.nomor}`, wheelRadius - 10, 0);
      }
      ctx.restore();
    }

    // Titik-titik lampu panggung di cincin luar
    const dots = 36;
    for (let d = 0; d < dots; d++) {
      const a = (d * Math.PI * 2) / dots;
      const dx = cx + Math.cos(a) * (outerRadius - 6);
      const dy = cy + Math.sin(a) * (outerRadius - 6);
      ctx.beginPath();
      ctx.arc(dx, dy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = d % 2 === 0 ? "#fef3c7" : "#fbbf24";
      ctx.fill();
    }
  }, [activePool]);

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [drawWheel]);

  // Eksekusi animasi putaran roda (baik dipicu langsung maupun dari sinyal remote Console ke OBS)
  const runSpinAnimation = useCallback((
    chosenWinner: NatalPeserta,
    startAngle: number,
    totalDelta: number,
    spinDurationSec: number,
    shouldAutoRemove: boolean
  ) => {
    getAudio();
    setWinnerModal(null);
    setSpinning(true);

    const total = Math.max(1, activePool.length);
    const arc = (Math.PI * 2) / total;
    const durationMs = spinDurationSec * 1000;
    const startTime = performance.now();
    lastTickIndexRef.current = -1;

    cancelAnimationFrame(animFrameRef.current);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 4.5);
      const currentAngle = startAngle + totalDelta * eased;
      rotationRef.current = currentAngle;
      drawWheel(currentAngle);

      const norm = (((-currentAngle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const currentIdx = Math.floor(norm / arc) % total;
      if (currentIdx !== lastTickIndexRef.current) {
        lastTickIndexRef.current = currentIdx;
        if (soundOn) playTickSound();
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        if (soundOn) playWinFanfare();
        setWinnerModal(chosenWinner);
        setWinners(prev => [
          {
            id: chosenWinner.id,
            nomor: chosenWinner.nomor,
            nama: chosenWinner.nama,
            hadir: chosenWinner.hadir,
            wonAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            round: prev.length + 1,
          },
          ...prev,
        ]);
        if (shouldAutoRemove) {
          setExcludedIds(prev => (prev.includes(chosenWinner.id) ? prev : [...prev, chosenWinner.id]));
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [activePool.length, drawWheel, soundOn]);

  // Fungsi memutar roda dari tombol
  const spinWheel = useCallback(() => {
    if (spinning || activePool.length === 0) return;

    const total = activePool.length;
    const randBuf = new Uint32Array(1);
    window.crypto.getRandomValues(randBuf);
    const winnerIndex = randBuf[0] % total;
    const chosenWinner = activePool[winnerIndex];

    const arc = (Math.PI * 2) / total;
    const jitter = (Math.random() - 0.5) * arc * 0.65;
    const targetMod = ((Math.PI * 2) - (winnerIndex * arc + arc / 2) + jitter) % (Math.PI * 2);
    const currentMod = ((rotationRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let delta = targetMod - currentMod;
    if (delta < 0) delta += Math.PI * 2;

    const extraSpins = (durationSec >= 9 ? 11 : durationSec >= 6 ? 8 : 5) * Math.PI * 2;
    const startAngle = rotationRef.current;
    const totalDelta = extraSpins + delta;
    const spinId = "spin_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    lastSpinIdRef.current = spinId;

    // Kirim komando putaran ke OBS / Proyektor
    publishStageState({
      spinId,
      winnerId: chosenWinner.id,
      startAngle,
      targetDelta: totalDelta,
      durationSec,
      onlyHadir,
      excludedIds,
      shuffleOrder,
      updatedAt: Date.now(),
    });

    runSpinAnimation(chosenWinner, startAngle, totalDelta, durationSec, autoRemoveWinner);
  }, [spinning, activePool, durationSec, onlyHadir, excludedIds, shuffleOrder, autoRemoveWinner, publishStageState, runSpinAnimation]);

  // Terapkan komando sinkronisasi yang masuk (dari Console ke OBS/Proyektor)
  const applyIncomingStageState = useCallback((st: StageSyncPayload, currentPesertaList: NatalPeserta[]) => {
    if (!st) return;
    if (typeof st.onlyHadir === "boolean") setOnlyHadir(st.onlyHadir);
    if (Array.isArray(st.excludedIds)) setExcludedIds(st.excludedIds);
    if (st.shuffleOrder !== undefined) setShuffleOrder(st.shuffleOrder);

    if (st.dismissModalAt && st.dismissModalAt > lastDismissAtRef.current) {
      lastDismissAtRef.current = st.dismissModalAt;
      setWinnerModal(null);
    }

    if (
      st.spinId &&
      st.spinId !== lastSpinIdRef.current &&
      st.winnerId &&
      typeof st.targetDelta === "number" &&
      Date.now() - st.updatedAt < 15000
    ) {
      lastSpinIdRef.current = st.spinId;
      const found = currentPesertaList.find(p => p.id === st.winnerId);
      if (found) {
        runSpinAnimation(
          found,
          st.startAngle ?? rotationRef.current,
          st.targetDelta,
          st.durationSec || 6,
          true
        );
      }
    }
  }, [runSpinAnimation]);

  // Listener BroadcastChannel + Polling ringan untuk OBS Browser Source
  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current = ch;
      ch.onmessage = ev => {
        if (ev?.data) applyIncomingStageState(ev.data as StageSyncPayload, peserta);
      };
    }
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [applyIncomingStageState, peserta]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/natal/undian-live?_t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = await res.json();
        const list: NatalPeserta[] = Array.isArray(data.peserta) ? data.peserta : peserta;
        if (Array.isArray(data.peserta) && !spinning) {
          setLivePeserta(data.peserta);
        }
        if ((projectorMode || isObsUrl) && data.state) {
          applyIncomingStageState(data.state, list);
        }
      } catch {}
    };
    poll();
    const timer = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [projectorMode, isObsUrl, spinning, peserta, applyIncomingStageState]);

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const dismissWinnerModal = useCallback(() => {
    setWinnerModal(null);
    const now = Date.now();
    lastDismissAtRef.current = now;
    publishStageState({
      onlyHadir,
      excludedIds,
      shuffleOrder,
      dismissModalAt: now,
      updatedAt: now,
    });
  }, [onlyHadir, excludedIds, shuffleOrder, publishStageState]);

  // Shortcut keyboard: Space (Spin), P (Mode Proyektor), Esc (Tutup modal)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (winnerModal) {
          dismissWinnerModal();
        } else {
          spinWheel();
        }
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        setProjectorMode(v => !v);
      } else if (e.key === "Escape") {
        if (winnerModal) dismissWinnerModal();
        else if (showObsModal) setShowObsModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [spinWheel, winnerModal, showObsModal, dismissWinnerModal]);

  const handleShuffle = () => {
    if (spinning) return;
    const ids = activePool.map(p => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setShuffleOrder(ids);
    publishStageState({
      onlyHadir,
      excludedIds,
      shuffleOrder: ids,
      updatedAt: Date.now(),
    });
  };

  const handleResetRoster = () => {
    if (spinning) return;
    if (!confirm("Reset daftar roda undian? Semua peserta yang sebelumnya sudah menang/dikeluarkan akan masuk kembali ke dalam roda.")) return;
    setExcludedIds([]);
    setShuffleOrder(null);
    publishStageState({
      onlyHadir,
      excludedIds: [],
      shuffleOrder: null,
      updatedAt: Date.now(),
    });
    onRefresh();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const obsStageUrl = `${window.location.origin}/undian-natal?obs=1`;
  const obsTransparentUrl = `${window.location.origin}/undian-natal?obs=1&bg=transparent`;

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div
      className={`min-h-screen text-slate-100 flex flex-col select-none ${
        isTransparentBg ? "bg-transparent" : "bg-[#070a12]"
      }`}
    >
      {/* Top Stage Header — HANYA tampil di Mode Console (disembunyikan penuh di Mode Proyektor / OBS) */}
      {!projectorMode && (
        <header className="border-b border-white/10 bg-[#0b101d]/90 backdrop-blur px-4 py-3 lg:px-8">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
            {/* Brand Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                title="Kembali ke Panel Panitia Natal"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-amber-700/20 text-amber-400 shadow-inner">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold tracking-widest text-amber-400 uppercase">
                    PERAYAAN NATAL GKMI ICHTUS
                  </span>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                    STAGE MODE v3.2
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Doorprize Natal GKMI ICHTUS
                </h1>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Console vs Mode Proyektor */}
              <div className="flex rounded-xl border border-white/10 bg-[#111827] p-1 text-xs font-bold">
                <button
                  onClick={() => setProjectorMode(false)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 cursor-pointer transition ${
                    !projectorMode ? "bg-amber-500 text-slate-950 shadow" : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" /> Console
                </button>
                <button
                  onClick={() => setProjectorMode(true)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 cursor-pointer transition ${
                    projectorMode ? "bg-amber-500 text-slate-950 shadow" : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" /> Mode Proyektor
                  <span className="rounded bg-white/15 px-1 text-[10px]">P</span>
                </button>
              </div>

              {/* Tombol Sambungkan ke OBS */}
              <button
                onClick={() => setShowObsModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/15 px-3 py-2 text-xs font-extrabold text-purple-300 hover:bg-purple-500/25 cursor-pointer"
                title="Sambungkan ke OBS Studio (Browser Source)"
              >
                <Radio className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                <span>Sambungkan OBS</span>
              </button>

              {/* Filter Semua vs Hanya yang Hadir */}
              <div className="flex rounded-xl border border-white/10 bg-[#111827] p-1 text-xs font-bold">
                <button
                  onClick={() => {
                    setOnlyHadir(false);
                    publishStageState({ onlyHadir: false, excludedIds, shuffleOrder, updatedAt: Date.now() });
                  }}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 cursor-pointer transition ${
                    !onlyHadir ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" /> Semua ({peserta.length})
                </button>
                <button
                  onClick={() => {
                    setOnlyHadir(true);
                    publishStageState({ onlyHadir: true, excludedIds, shuffleOrder, updatedAt: Date.now() });
                  }}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 cursor-pointer transition ${
                    onlyHadir ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Hadir Saja ({peserta.filter(p => p.hadir).length})
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#111827] px-3 py-1.5 text-xs text-slate-300">
                Total di Roda: <span className="font-extrabold text-amber-400">{activePool.length} Peserta</span>
              </div>

              <button
                onClick={() => setSoundOn(s => !s)}
                title={soundOn ? "Matikan suara panggung" : "Nyalakan suara panggung"}
                className={`rounded-xl border p-2 cursor-pointer ${
                  soundOn
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border-white/10 bg-[#111827] text-slate-500"
                }`}
              >
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                Layar Panggung
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Tombol halus di pojok kanan atas saat Mode Proyektor (muncul saat hover) */}
      {projectorMode && !isObsUrl && (
        <button
          onClick={() => setProjectorMode(false)}
          title="Kembali ke Mode Console (Tekan P)"
          className="fixed right-4 top-4 z-30 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-bold text-slate-400 opacity-20 hover:opacity-100 transition cursor-pointer"
        >
          Console (P)
        </button>
      )}

      {/* Main Content */}
      <main className="mx-auto flex flex-1 w-full max-w-[1440px] flex-col lg:flex-row items-center justify-center gap-8 px-4 py-6 lg:px-8">
        {/* Roda Undian + 2 Tombol Utama */}
        <div className={`flex flex-col items-center justify-center ${projectorMode ? "w-full" : "lg:w-7/12"}`}>
          <div className="relative flex items-center justify-center">
            {/* Golden Pointer Pin at Top (12 o'clock) */}
            <div className="absolute -top-3 z-20 flex flex-col items-center drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]">
              <div className="h-5 w-5 rounded-full border-2 border-amber-200 bg-amber-500 shadow" />
              <div
                className="-mt-1 h-7 w-5 bg-gradient-to-b from-amber-400 to-amber-600"
                style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
              />
            </div>

            {/* Wheel Canvas */}
            <canvas
              ref={canvasRef}
              width={600}
              height={600}
              className={`rounded-full shadow-[0_0_85px_rgba(245,158,11,0.22)] ${
                projectorMode
                  ? "w-[360px] h-[360px] sm:w-[560px] sm:h-[560px]"
                  : "w-[320px] h-[320px] sm:w-[460px] sm:h-[460px]"
              }`}
            />

            {/* Center Hub Button */}
            <button
              onClick={spinWheel}
              disabled={spinning || activePool.length === 0}
              className="absolute z-10 flex h-24 w-24 sm:h-28 sm:w-28 flex-col items-center justify-center rounded-full border-4 border-amber-400/80 bg-gradient-to-b from-[#1e293b] to-[#090d16] text-white shadow-[0_0_30px_rgba(0,0,0,0.9)] hover:scale-105 active:scale-95 transition cursor-pointer disabled:opacity-60"
            >
              <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">STAGE</span>
              <span className="text-xl sm:text-2xl font-black tracking-wider text-white">SPIN</span>
              <span className="text-[10px] font-semibold text-slate-400">{activePool.length} TIKET</span>
            </button>
          </div>

          {/* Action Buttons Under Wheel (Tetap tampil di Mode Proyektor sesuai gambar) */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={spinWheel}
              disabled={spinning || activePool.length === 0}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 px-7 py-4 text-sm sm:text-base font-black tracking-wide text-slate-950 shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <span>{spinning ? "MEMUTAR RODA..." : "PUTAR RODA SEKARANG"}</span>
              <span className="rounded-md bg-black/20 px-2 py-0.5 text-[11px] font-bold text-amber-950">
                SPASI
              </span>
            </button>

            <button
              onClick={handleShuffle}
              disabled={spinning || activePool.length <= 1}
              className="flex items-center gap-2 rounded-2xl border border-white/15 bg-[#111827] px-5 py-4 text-xs sm:text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              <Shuffle className="h-4 w-4 text-amber-400" /> ACAK URUTAN
            </button>
          </div>

          {/* Shortcut hints hanya di Mode Console */}
          {!projectorMode && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
              <span><kbd className="rounded bg-white/10 px-1.5 py-0.5 text-slate-300">Space</kbd> Putar Roda</span>
              <span>•</span>
              <span><kbd className="rounded bg-white/10 px-1.5 py-0.5 text-slate-300">P</kbd> Mode Proyektor</span>
              <span>•</span>
              <span><kbd className="rounded bg-white/10 px-1.5 py-0.5 text-slate-300">Esc</kbd> Tutup Modal</span>
            </div>
          )}
        </div>

        {/* Right: Roster & Winner Console Panel (Hanya di Mode Console) */}
        {!projectorMode && (
          <div className="w-full lg:w-5/12 rounded-3xl border border-white/10 bg-[#0d1322] p-5 shadow-2xl flex flex-col max-h-[680px]">
            {/* Top Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setSideTab("peserta")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-extrabold cursor-pointer transition ${
                    sideTab === "peserta"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Daftar Peserta ({activePool.length})
                </button>
                <button
                  onClick={() => setSideTab("pemenang")}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold cursor-pointer transition ${
                    sideTab === "pemenang"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>Riwayat Pemenang</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-amber-300">
                    {winners.length}
                  </span>
                </button>
              </div>

              <button
                onClick={handleResetRoster}
                className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-amber-300 cursor-pointer"
                title="Kembalikan semua peserta yang sudah menang ke dalam roda"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Roster
              </button>
            </div>

            {sideTab === "peserta" ? (
              <>
                {/* Search Bar */}
                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Cari nomor kupon atau nama peserta..."
                      className="w-full rounded-xl border border-white/10 bg-[#070b14] py-2.5 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                {/* Participant Scroll List */}
                <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto pr-1 max-h-[340px]">
                  {filteredRoster.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      Tidak ada peserta yang cocok di dalam roda.
                    </div>
                  ) : (
                    filteredRoster.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-[#121a2d] px-3.5 py-2.5 hover:border-amber-500/30 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="rounded-md bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-mono text-xs font-extrabold text-amber-300">
                            #{p.nomor}
                          </span>
                          <span className="truncate text-xs sm:text-sm font-bold text-slate-100">
                            {p.nama}
                          </span>
                          <span className={`text-[11px] ${p.hadir ? "text-emerald-400" : "text-slate-500"}`}>
                            • {p.hadir ? "Hadir" : "Terdaftar"}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const next = [...excludedIds, p.id];
                            setExcludedIds(next);
                            publishStageState({ onlyHadir, excludedIds: next, shuffleOrder, updatedAt: Date.now() });
                          }}
                          title="Keluarkan dari roda undian"
                          className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Tab Riwayat Pemenang */
              <div className="mt-3 flex-1 flex flex-col">
                <div className="flex-1 space-y-2 overflow-y-auto pr-1 max-h-[380px]">
                  {winners.length === 0 ? (
                    <div className="py-14 text-center text-xs text-slate-500">
                      Belum ada pemenang yang diundi.
                    </div>
                  ) : (
                    winners.map((w, idx) => (
                      <div
                        key={`${w.id}-${idx}`}
                        className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                          <span className="rounded bg-amber-500 px-2 py-0.5 font-mono text-xs font-black text-slate-950">
                            #{w.nomor}
                          </span>
                          <span className="truncate text-sm font-extrabold text-white">
                            {w.nama}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-amber-200/80 shrink-0">
                          {w.wonAt}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {winners.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm("Hapus seluruh riwayat pemenang?")) setWinners([]);
                    }}
                    className="mt-3 self-end text-xs text-red-400 hover:underline cursor-pointer"
                  >
                    Bersihkan Riwayat Pemenang
                  </button>
                )}
              </div>
            )}

            {/* Bottom Stage Settings */}
            <div className="mt-4 space-y-2.5 border-t border-white/10 pt-3">
              <label className="flex items-center justify-between rounded-xl border border-white/5 bg-[#101728] px-3.5 py-2.5 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-slate-200">Hapus otomatis nomor yang sudah menang</p>
                  <p className="text-[11px] text-slate-400">Mencegah satu nomor menang lebih dari 1 kali</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoRemoveWinner}
                  onChange={e => setAutoRemoveWinner(e.target.checked)}
                  className="h-4 w-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>

              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#101728] px-3.5 py-2.5">
                <div>
                  <p className="text-xs font-bold text-slate-200">Durasi Putaran Panggung</p>
                  <p className="text-[11px] text-slate-400">Sesuaikan dengan ketegangan rundown acara</p>
                </div>
                <select
                  value={durationSec}
                  onChange={e => setDurationSec(Number(e.target.value))}
                  className="rounded-lg border border-amber-500/40 bg-[#070b14] px-3 py-1.5 text-xs font-bold text-amber-300 outline-none cursor-pointer"
                >
                  <option value={3}>Cepat (3 Detik)</option>
                  <option value={6}>Standar (6 Detik)</option>
                  <option value={10}>Dramatis (10 Detik)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Stage Footer — Hanya di Mode Console */}
      {!projectorMode && (
        <footer className="border-t border-white/5 px-6 py-2.5 text-[11px] text-slate-500 flex flex-wrap items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Algorithm: Secure Mersenne / Crypto Randomizer</span>
            <span>|</span>
            <span>OBS Live Sync: Active</span>
          </div>
          <div>GKMI ICHTUS • Stage Console Mode</div>
        </footer>
      )}

      {/* Modal Sambungkan ke OBS Studio */}
      {showObsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowObsModal(false)}
        >
          <div
            className="w-full max-w-xl rounded-3xl border border-purple-500/40 bg-[#0d1322] p-6 text-left shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Sambungkan ke OBS Studio</h3>
                  <p className="text-xs text-slate-400">Sinkron otomatis saat Anda memutar roda dari Console</p>
                </div>
              </div>
              <button onClick={() => setShowObsModal(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-bold text-amber-300">
                  1. URL OBS Browser Source (Latar Gelap Proyektor)
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={obsStageUrl}
                    className="flex-1 rounded-xl border border-white/10 bg-[#070a12] px-3 py-2.5 font-mono text-slate-200 outline-none"
                  />
                  <button
                    onClick={() => copyText("stage", obsStageUrl)}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 font-extrabold text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    {copiedKey === "stage" ? <><Check className="h-4 w-4" /> Disalin</> : <><Copy className="h-4 w-4" /> Salin URL</>}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-purple-300">
                  2. URL OBS Overlay Transparan (Untuk ditumpuk di atas kamera Live)
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={obsTransparentUrl}
                    className="flex-1 rounded-xl border border-white/10 bg-[#070a12] px-3 py-2.5 font-mono text-slate-200 outline-none"
                  />
                  <button
                    onClick={() => copyText("trans", obsTransparentUrl)}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-500 px-4 py-2.5 font-extrabold text-white hover:bg-purple-400 cursor-pointer"
                  >
                    {copiedKey === "trans" ? <><Check className="h-4 w-4" /> Disalin</> : <><Copy className="h-4 w-4" /> Salin URL</>}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#070a12] p-4 space-y-1.5 text-slate-300">
                <p className="font-bold text-white">Cara Pasang di OBS Studio:</p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                  <li>Di OBS Studio, klik <b>+</b> pada panel <b>Sources</b> → pilih <b>Browser</b>.</li>
                  <li>Tempel salah satu URL di atas pada kolom <b>URL</b>.</li>
                  <li>Isi <b>Width: 1920</b> dan <b>Height: 1080</b> → klik <b>OK</b>.</li>
                  <li>Saat Anda menekan <b>PUTAR RODA SEKARANG</b> di halaman Console ini, roda di OBS akan otomatis berputar secara real-time!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengumuman Pemenang */}
      {winnerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={dismissWinnerModal}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-[#161f35] to-[#090d16] p-8 text-center shadow-[0_0_90px_rgba(245,158,11,0.35)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
              <Trophy className="h-9 w-9" />
            </div>
            <p className="text-xs font-extrabold tracking-widest text-amber-400 uppercase">
              SELAMAT KEPADA PEMENANG DOORPRIZE NATAL
            </p>
            <div className="my-4 inline-block rounded-2xl border border-amber-400/50 bg-amber-500/15 px-6 py-2 font-mono text-3xl sm:text-4xl font-black text-amber-300">
              #{winnerModal.nomor}
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white break-words">
              {winnerModal.nama}
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Status Kehadiran: {winnerModal.hadir ? "✓ Sudah Hadir di Lokasi" : "Terdaftar"}
            </p>
            <div className="mt-7 flex justify-center gap-3">
              <button
                onClick={dismissWinnerModal}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 text-sm font-black text-slate-950 shadow-lg hover:brightness-110 cursor-pointer"
              >
                LANJUT UNDIAN (ESC)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
