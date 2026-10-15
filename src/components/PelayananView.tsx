import React, { useState, useEffect } from "react";
import { ChurchEvent, MenuTab } from "../types";
import { ArrowRight, Users, Sparkles, Heart, HelpCircle, CalendarDays, CheckCheck } from "lucide-react";

interface PelayananViewProps {
  onChangeTab: (tab: MenuTab) => void;
  onSelectEvent: (event: ChurchEvent) => void;
}

export default function PelayananView({ onChangeTab, onSelectEvent }: PelayananViewProps) {
  const [showJoinCommunityModal, setShowJoinCommunityModal] = useState(false);
  const [communitySubmitted, setCommunitySubmitted] = useState(false);
  const [comForm, setComForm] = useState({ name: "", contact: "", note: "" });
  const [events, setEvents] = useState<ChurchEvent[]>([]);

  useEffect(() => {
    fetch("/api/church-events")
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error("Error fetching church events:", err));
  }, []);

  // Menampilkan hingga 3 kegiatan mendatang dari semua kategori
  const upcomingEvents = events.slice(0, 3);

  const handleComSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCommunitySubmitted(true);
  };

  return (
    <div className="w-full">
      {/* 1. HERO BANNER SECTION (Image 3 layout) */}
      <section className="relative flex min-h-[65vh] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-905 to-indigo-950">
        <div className="absolute inset-0 z-0">
          {/* Intense warm/golden background of praise & worship */}
          <img
            src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1600&h=900"
            alt="Komisi Youth"
            className="h-full w-full object-cover object-center opacity-30 mix-blend-color-dodge scale-102"
            referrerPolicy="no-referrer"
          />
          {/* Multi-layered dark vignetting to highlight text */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-indigo-950" />
        </div>

        {/* Hero content details */}
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center text-white space-y-6">
          <span className="font-mono text-xs font-bold tracking-widest text-[#a5b4fc] uppercase">
            YOUTH
          </span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
            Bangkit. Bersinar. Berdampak.
          </h1>
          <p className="mx-auto max-w-2xl text-slate-300 font-sans text-sm sm:text-base leading-relaxed">
            Komunitas pemuda dan remaja yang bersemangat untuk mengenal Tuhan lebih dalam, 
            membangun persahabatan yang otentik, dan membawa perubahan positif bagi generasi ini.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => {
                setShowJoinCommunityModal(true);
                setCommunitySubmitted(false);
              }}
              id="btn-community-join"
              className="w-full sm:w-auto rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-indigo-750 cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Gabung Komunitas Kami</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onChangeTab("jadwal_ibadah")}
              id="btn-community-schedule"
              className="w-full sm:w-auto rounded-full border-2 border-white/60 bg-white/5 backdrop-blur-sm px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Lihat Jadwal</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. SERVICES CONTENT GRID (CONNECT GROUPS & IGNITE YOUTH) */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          
          {/* Card 1: Connect Groups (White, friendly) */}
          <div className="md:col-span-1 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Connect Groups
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Bertumbuh bersama dalam kelompok kecil. Tempat murni untuk berbagi cerita kehidupan, merajut doa bersama, dan merayakan persahabatan sejati di tengah kesibukan harian Anda.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => {
                  setShowJoinCommunityModal(true);
                  setCommunitySubmitted(false);
                }}
                className="text-xs font-bold tracking-widest text-indigo-600 hover:text-indigo-750 uppercase flex items-center space-x-1 cursor-pointer"
              >
                <span>Cari Kelompok Sel</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Ignite Youth Service (Solid Navy Blue block, Image 3 featured layout) */}
          <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-indigo-700 to-indigo-950 p-8 md:p-10 text-white flex flex-col justify-between relative overflow-hidden shadow-md">
            {/* Soft geometric lighting effect */}
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10">
              <Sparkles className="h-80 w-80 text-white" />
            </div>

            <div className="space-y-4 relative z-10">
              <span className="font-mono text-[10px] font-bold tracking-widest text-[#fcd34d] uppercase border border-[#fcd34d]/40 bg-[#fcd34d]/10 px-2.5 py-1 rounded">
                IBADAH MINGGUAN
              </span>
              <h3 className="font-display text-3xl font-bold text-white">
                Komisi Youth
              </h3>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-xl">
                Ibadah yang didesain khusus untuk jiwa muda. Pujian yang dinamis, firman yang relevan dengan pergumulan anak muda masa kini, dan komunitas hangat yang siap menyambut kehadiran Anda.
              </p>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/20 relative z-10">
              <div className="flex items-center space-x-2.5">
                <CalendarDays className="h-5 w-5 text-indigo-300" />
                <span className="text-sm font-semibold text-slate-105">Setiap Sabtu, 17:00 WIB</span>
              </div>
              <button
                onClick={() => onChangeTab("jadwal_ibadah")}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-indigo-600 shadow hover:bg-slate-100 active:scale-95 cursor-pointer flex items-center space-x-1.5 transition-all text-center"
              >
                <span>Lihat Alamat Ruangan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 3. UPCOMING EVENTS (Kegiatan Mendatang) */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 mb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-slate-900">
              Kegiatan Mendatang
            </h2>
            <p className="text-sm text-slate-505 mt-1">
              Jangan lewatkan momen seru bersama komunitas.
            </p>
          </div>
          <button
            onClick={() => onChangeTab("kegiatan")}
            className="text-xs font-bold tracking-widest text-indigo-600 hover:text-indigo-750 flex items-center space-x-1 uppercase cursor-pointer"
          >
            <span>Lihat Semua Kegiatan</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Events cards grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {upcomingEvents.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm text-slate-500 italic">
              Belum ada kegiatan yang dijadwalkan...
            </div>
          ) : upcomingEvents.map((ev) => (
            <div 
              key={ev.id}
              onClick={() => onSelectEvent(ev)}
              className="group rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
            >
              {/* Image & Date Badge overlay */}
              <div className="relative h-48 overflow-hidden bg-slate-100">
                <img
                  src={ev.image}
                  alt={ev.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {/* Custom Date Overlay */}
                <div className="absolute top-4 right-4 bg-white rounded-lg px-3 py-1.5 shadow-sm flex flex-col items-center justify-center border border-slate-100">
                  <span className="font-display text-sm font-extrabold text-indigo-600">
                    {ev.date.split(" ")[0]}
                  </span>
                  <span className="font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                    {ev.date.split(" ")[1]}
                  </span>
                </div>
              </div>

              {/* Card Context */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="font-mono text-[9px] font-bold tracking-widest text-indigo-600 uppercase border border-indigo-100 bg-indigo-50 px-2 py-0.5 rounded">
                    {ev.category}
                  </span>
                  <h3 className="font-display text-lg font-bold text-slate-900 group-hover:text-indigo-650 transition-colors">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                    {ev.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  <span>Daftar / Detail</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community Form Modal */}
      {showJoinCommunityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl transition-all border border-slate-200">
            {/* Header */}
            <div className="bg-indigo-950 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-white">Gabung Komisi Youth</h3>
                <p className="text-xs text-slate-300">Bergabung dengan generasi muda berdampak</p>
              </div>
              <button 
                onClick={() => setShowJoinCommunityModal(false)}
                className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {!communitySubmitted ? (
                <form onSubmit={handleComSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Nama Lengkap
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan nama Anda"
                      value={comForm.name}
                      onChange={(e) => setComForm({ ...comForm, name: e.target.value })}
                      className="w-full rounded-md border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Nomor WhatsApp atau Instagram ID
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: 0812xxxxxx atau @username"
                      value={comForm.contact}
                      onChange={(e) => setComForm({ ...comForm, contact: e.target.value })}
                      className="w-full rounded-md border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Mengapa Anda Tertarik Bergabung? (Opsional)
                    </label>
                    <textarea 
                      placeholder="Tulis pesan singkat Anda..."
                      value={comForm.note}
                      onChange={(e) => setComForm({ ...comForm, note: e.target.value })}
                      className="w-full rounded-md border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-800 min-h-[80px]"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full rounded-full bg-indigo-600 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700 cursor-pointer"
                  >
                    Kirim Formulir Komunitas
                  </button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 animate-pulse">
                    <CheckCheck className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-slate-800 text-lg">Sampai Jumpa di Persekutuan!</h4>
                    <p className="text-sm text-slate-500 px-4 leading-relaxed">
                      Formulir komunitas milik <strong className="text-slate-800">{comForm.name}</strong> berhasil terkirim. Tim Youth Leaders kami akan segera merespon kontak Anda (<strong className="text-slate-800">{comForm.contact}</strong>) maksimal dalam 24 jam!
                    </p>
                  </div>
                  <div className="pt-4">
                    <button 
                      onClick={() => setShowJoinCommunityModal(false)}
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
