import { ArrowRight, Calendar, Users, HeartHandshake, Check } from "lucide-react";
import React, { useState, useEffect } from "react";
import { MenuTab } from "../types";

interface BerandaViewProps {
  onChangeTab: (tab: MenuTab) => void;
  onJoinCommunity: () => void;
}

export default function BerandaView({ onChangeTab, onJoinCommunity }: BerandaViewProps) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinStep, setJoinStep] = useState(1);
  const [formData, setFormData] = useState({ name: "", wa: "", location: "Jakarta Pusat" });
  const [weeklyTheme, setWeeklyTheme] = useState(() => localStorage.getItem("weeklyTheme") || "");

  useEffect(() => {
    fetch("/api/theme")
      .then((r) => r.json())
      .then((data) => {
        if (data.weeklyTheme) {
          setWeeklyTheme(data.weeklyTheme);
          localStorage.setItem("weeklyTheme", data.weeklyTheme);
        }
      })
      .catch(() => {});
  }, []);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinStep(2);
  };

  return (
    <div className="relative w-full">
      {/* 1. HERO BANNER SECTION (Image 2 representation) */}
      <section className="relative flex min-h-[85vh] w-full items-center justify-center overflow-hidden bg-indigo-950">
        {/* Background photo of Church interior with heavy dark/blue styling */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&q=80&w=1920&h=1080"
            alt="Interior GKMI ICHTUS"
            className="h-full w-full object-cover object-center opacity-40 mix-blend-luminosity scale-105"
            referrerPolicy="no-referrer"
          />
          {/* Subtle radial/linear gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-transparent to-indigo-950/70" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center text-white space-y-8">
          <div className="inline-flex items-center space-x-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="font-mono text-xs font-semibold tracking-wider text-indigo-300 uppercase">
              {weeklyTheme ? `Minggu ini: "${weeklyTheme}"` : "Memuat tema..."}
            </span>
          </div>

          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
            Selamat Datang di GKMI ICHTUS SURABAYA
          </h1>

          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-300 font-sans leading-relaxed">
            Kami mengundang Anda untuk bergabung dalam komunitas yang saling mengasihi, 
            bertumbuh bersama dalam iman, dan membawa terang bagi sesama.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => {
                setShowJoinModal(true);
                setJoinStep(1);
              }}
              id="hero-btn-bergabung"
              className="w-full sm:w-auto rounded-full bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Bergabung Bersama Kami</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onChangeTab("jadwal_ibadah")}
              id="hero-btn-lihat-jadwal"
              className="w-full sm:w-auto rounded-full border-2 border-white/80 bg-white/5 backdrop-blur-sm px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/15 hover:border-white active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Lihat Jadwal</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. CORE VALUE FEATURES (Gotong Royong & Growth) */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <span className="font-mono text-xs font-bold tracking-widest text-indigo-600 uppercase">
            NILAI-NILAI UTAMA KAMI
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl text-slate-900">
            Mengapa Bersekutu Bersama GKMI ICHTUS?
          </h2>
          <p className="mx-auto max-w-2xl text-slate-500 text-sm sm:text-base">
            Kami berkomitmen mendampingi setiap individu bertumbuh secara utuh melalui persekutuan yang berakar kuat dan mengabdi tulus bagi sesama.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-all group hover:-translate-y-1">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-indigo-950 mb-3">
              Komunitas Otentik (Connect)
            </h3>
            <p className="text-sm leading-relaxed text-slate-500">
              Menghadirkan relasi persaudaraan yang tulus melalui kelompok kecil (Connect Group). Di mana kita bisa saling bertumbuh dan memberikan tumpuan satu sama lain.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-all group hover:-translate-y-1">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-indigo-950 mb-3">
              Pelayanan Sosial (Serve)
            </h3>
            <p className="text-sm leading-relaxed text-slate-500">
              Mengejawantahkan kasih Kristus melalui pengabdian tulus. Kami secara berkesinambungan menyelenggarakan program pembagian bantuan dan kemanusiaan bagi lingkungan sekitar.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-all group hover:-translate-y-1">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-indigo-950 mb-3">
              Kehidupan yang Bertumbuh (Grow)
            </h3>
            <p className="text-sm leading-relaxed text-slate-500">
              Melalui program pembinaan spiritual "Kelas Dasar Kekristenan" dan pelayanan yang diselenggarakan secara modular untuk seluruh jenjang usia dan keluarga Anda.
            </p>
          </div>
        </div>
      </section>

      {/* 3. VERSE BANNER (High-contrast quote) */}
      <section className="bg-indigo-900 text-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center space-y-4">
          <p className="font-serif italic text-xl sm:text-2xl text-slate-200">
            "Sebab di mana dua atau tiga orang berkumpul dalam nama-Ku, di situ Aku ada di tengah-tengah mereka."
          </p>
          <p className="font-mono text-xs font-semibold tracking-widest text-[#a5b4fc] uppercase">
            — Matius 18:20
          </p>
        </div>
      </section>

      {/* Interactive Modal untuk Pilihan Bergabung */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl transition-all border border-slate-200">
            {/* Header */}
            <div className="bg-indigo-950 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold uppercase tracking-wider">Gabung Kelompok Sel</h3>
                <p className="text-xs text-slate-300">Temukan keluarga rohani terdekat untuk bertumbuh bersama</p>
              </div>
              <button 
                onClick={() => setShowJoinModal(false)}
                className="rounded-full p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {joinStep === 1 ? (
                <form onSubmit={handleJoinSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Nama Lengkap
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan nama Anda"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-md border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Nomor WhatsApp
                    </label>
                    <input 
                      type="tel" 
                      required
                      placeholder="Contoh: 081234567890"
                      value={formData.wa}
                      onChange={(e) => setFormData({ ...formData, wa: e.target.value })}
                      className="w-full rounded-md border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Wilayah Domisili
                    </label>
                    <select 
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full rounded-md border border-slate-200 p-2.5 text-sm outline-none bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-700"
                    >
                      <option>Surabaya Pusat</option>
                      <option>Surabaya Selatan</option>
                      <option>Surabaya Timur</option>
                      <option>Surabaya Barat</option>
                      <option>Surabaya Utara</option>
                      <option>Sidoarjo</option>
                      <option>Gresik</option>
                    </select>
                  </div>


                  <button 
                    type="submit"
                    className="w-full rounded-full bg-indigo-600 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700 cursor-pointer transition-all"
                  >
                    Kirim Data Penempatan
                  </button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Check className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-slate-800 text-lg">Pendaftaran Sukses!</h4>
                    <p className="text-sm text-slate-500 px-4 leading-relaxed">
                      Terima kasih <strong className="text-slate-850">{formData.name}</strong>, tim pelayanan kami akan segera menghubungi Anda di <strong className="text-slate-850">{formData.wa}</strong> untuk penempatan kelompok sel <strong className="text-slate-850">{formData.location}</strong>.
                    </p>
                  </div>
                  <div className="pt-4">
                    <button 
                      onClick={() => setShowJoinModal(false)}
                      className="rounded-full bg-slate-100 px-6 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
