/**
 * Efek suara & getar untuk hasil scan barcode, dibuat dengan Web Audio API
 * sehingga tidak butuh file audio tambahan.
 */
export type ScanFeedback = "ok" | "already" | "error";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Panggil saat ada interaksi user (klik) agar browser HP mengizinkan audio. */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  // Bunyi senyap singkat untuk "membuka" audio di iOS/Android
  const o = c.createOscillator();
  const g = c.createGain();
  g.gain.value = 0;
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.01);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.35) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export function playScanSound(kind: ScanFeedback) {
  if (kind === "ok") {
    // Ding-ding naik (berhasil)
    tone(880, 0, 0.14);
    tone(1318, 0.13, 0.28);
  } else if (kind === "already") {
    // Dua beep sedang (peringatan)
    tone(660, 0, 0.12, "triangle");
    tone(660, 0.18, 0.12, "triangle");
  } else {
    // Buzz rendah (gagal)
    tone(196, 0, 0.45, "square", 0.22);
  }
}

export function vibrateScan(kind: ScanFeedback) {
  if (!("vibrate" in navigator)) return;
  const pattern = kind === "ok" ? [120] : kind === "already" ? [80, 80, 80] : [300, 100, 300];
  try { navigator.vibrate(pattern); } catch { /* abaikan */ }
}

/** Mengucapkan teks (Bahasa Indonesia) jika browser mendukung. */
export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  } catch { /* abaikan */ }
}
