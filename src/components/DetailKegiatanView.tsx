import React, { useState, useEffect } from "react";
import { ChurchEvent, MenuTab, Registration } from "../types";
import { 
  ArrowLeft, Calendar, Clock, RotateCcw, MapPin, User, Send, 
  Trash2, Sparkles, AlertCircle, RefreshCw, CheckCircle 
} from "lucide-react";

interface DetailKegiatanViewProps {
  event: ChurchEvent;
  onBack: () => void;
}

export default function DetailKegiatanView({ event, onBack }: DetailKegiatanViewProps) {
  // Pendaftaran Form State
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formWa, setFormWa] = useState("");

  // Server state
  const [dbStatus, setDbStatus] = useState({ database: "Local JSON File", usingFallback: true });
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [submittingReg, setSubmittingReg] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch lists from database
  const fetchRegistrations = async () => {
    setLoadingRegs(true);
    try {
      const res = await fetch("/api/registrations");
      if (res.ok) {
        const data = await res.json();
        // filter by eventId
        const filtered = data.filter((r: Registration) => r.eventId === event.id);
        setRegistrations(filtered);
      }
    } catch (err) {
      console.error("Error fetching registrations:", err);
    } finally {
      setLoadingRegs(false);
    }
  };

  // Fetch db-status description
  const fetchDbStatus = async () => {
    try {
      const res = await fetch("/api/db-status");
      if (res.ok) {
        const data = await res.json();
        setDbStatus({ database: data.database, usingFallback: data.usingFallback });
      }
    } catch (err) {
      console.error("Error fetching DB status:", err);
    }
  };

  useEffect(() => {
    fetchRegistrations();
    fetchDbStatus();
  }, [event.id]);

  // Submit registration form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formWa.trim()) {
      setErrorMsg("Semua kolom formulir pendaftaran wajib diisi!");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmittingReg(true);

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          whatsapp: formWa,
          eventId: event.id,
          eventTitle: event.title
        })
      });

      if (response.ok) {
        setSuccessMsg("Pendaftaran Anda berhasil diproses dan disimpan di database!");
        setFormName("");
        setFormEmail("");
        setFormWa("");
        await fetchRegistrations(); // Reload
      } else {
        const errData = await response.json();
        setErrorMsg(errData.error || "Gagal melakukan pendaftaran.");
      }
    } catch (err) {
      setErrorMsg("Gagal menghubungi server. Periksa koneksi backend Anda.");
      console.error("Registration error:", err);
    } finally {
      setSubmittingReg(false);
    }
  };

  // Delete registration (helper to test MongoDB deletion easily!)
  const handleDeleteRegistration = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan/menghapus pendaftaran ini?")) return;
    try {
      const response = await fetch("/api/registrations/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        await fetchRegistrations();
      } else {
        alert("Gagal menghapus pendaftaran.");
      }
    } catch (err) {
      console.error("Deletion error:", err);
    }
  };

  const handleScrollToForm = () => {
    const el = document.getElementById("registration-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="w-full">
      {/* BREADCRUMB NAVIGATION RAILS */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 border-b border-slate-100 flex items-center justify-between">
        <button
          onClick={onBack}
          id="btn-back-to-activities"
          className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Kegiatan</span>
        </button>

        {/* Database usage status pill */}
        <div className="flex items-center space-x-2 rounded-full border border-slate-205 bg-slate-50 px-3.5 py-1.5 text-xs text-slate-650">
          <span className={`h-2 w-2 rounded-full ${dbStatus.usingFallback ? "bg-amber-500" : "bg-emerald-505"} animate-pulse`} />
          <span>Database: <strong className="text-slate-850">{dbStatus.database}</strong></span>
        </div>
      </div>

      {/* HEADER BANNER PHOTO HERO SECTION */}
      <section className="relative flex min-h-[50vh] w-full items-center justify-center overflow-hidden bg-indigo-950 text-white">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&q=80&w=1600&h=900"
            alt={event.title}
            className="h-full w-full object-cover object-center opacity-25 mix-blend-color-dodge scale-102"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-indigo-950/90" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center space-y-3">
          <span className="font-mono text-xs font-bold tracking-widest text-[#a5b4fc] uppercase">
            EDUKASI & PERTUMBUHAN
          </span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
            {event.title}
          </h1>
          <p className="mx-auto max-w-2xl text-slate-300 font-sans text-sm sm:text-base leading-relaxed">
            {event.description}
          </p>
        </div>
      </section>

      {/* DETAILED CONTENT SPLIT */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          
          {/* LEFT 8 COLUMNS: INFO & SUBMISSION TERMINAL */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* About the class */}
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Tentang Kelas Ini
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-slate-550">
                Kelas Dasar Kekristenan dirancang secara khusus untuk memberikan pemahaman menyeluruh tentang esensi iman Kristen, disajikan dengan relevansi untuk menjawab tantangan masa kini. Selama 6 minggu perjalanan, kita akan menggali doktrin inti, makna anugerah Tuhan, dan bagaimana menerapkannya dalam gotong royong komunitas kita sehari-hari.
              </p>
              <p className="text-sm sm:text-base leading-relaxed text-slate-550">
                Modul ini bukan sekadar kajian teologis teoritis, melainkan sebuah percakapan hangat yang interaktif. Kami percaya bahwa pertanyaan-pertanyaan sulit adalah pintu menuju iman yang lebih mendalam. Suasana kelas santai, terbuka, dan didesain ramah bagi profesional modern maupun anak muda yang sedang mencari kebenaran.
              </p>
            </div>

            {/* Target Audience */}
            <div className="space-y-4">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                Untuk Siapa Kelas Ini?
              </h3>
              <ul className="space-y-3 text-slate-705 text-sm">
                <li className="flex items-start space-x-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                  <span>Jemaat baru yang ingin memahami dasar doktrin alkitabiah GKMI ICHTUS.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                  <span>Individu yang sedang mencari atau memiliki banyak pertanyaan kritis tentang iman Kristen.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                  <span>Jemaat lama yang ingin menyegarkan kembali dasar-dasar teologia praktis mereka.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                  <span>Siapapun yang rindu bersekutu dalam kelompok belajar yang hangat, toleran, dan suportif.</span>
                </li>
              </ul>
            </div>

            {/* Registration Form (Image 5 bottom-left segment) */}
            <div id="registration-section" className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm space-y-6 scroll-mt-24">
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h3 className="font-display text-2xl font-bold text-slate-900 flex items-center space-x-2">
                  <Sparkles className="h-5.5 w-5.5 text-indigo-600 fill-indigo-200/50" />
                  <span>Daftar Sekarang</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Tempat terbatas. Silakan isi form di bawah ini untuk mengamankan kursi Anda.
                </p>
              </div>

              {/* Status Alert logs */}
              {successMsg && (
                <div className="rounded-lg bg-green-50 p-4 border border-green-150 flex items-start space-x-3 text-xs text-green-700">
                  <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}
              {errorMsg && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-150 flex items-start space-x-3 text-xs text-red-700">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Nama Lengkap
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan nama Anda"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded-md border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Email
                    </label>
                    <input 
                      type="email" 
                      required
                      placeholder="email@contoh.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full rounded-md border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nomor WhatsApp
                  </label>
                  <input 
                    type="tel" 
                    required
                    placeholder="+62 8xx xxxx xxxx"
                    value={formWa}
                    onChange={(e) => setFormWa(e.target.value)}
                    className="w-full rounded-md border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submittingReg}
                  id="btn-submit-registration"
                  className="w-full rounded-full bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all"
                >
                  <Send className="h-4 w-4" />
                  <span>{submittingReg ? "Pengiriman..." : "Kirim Pendaftaran"}</span>
                </button>
              </form>
            </div>

            {/* LIVE REGISTERED PARTICIPANTS LOG BOARD */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <div>
                  <h4 className="font-display font-semibold text-slate-900 text-base">Pendaftar Saat Ini</h4>
                  <p className="text-xs text-slate-400">Daftar jemaat yang terdaftar dari database MongoDB</p>
                </div>
                <button 
                  onClick={fetchRegistrations}
                  disabled={loadingRegs}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingRegs ? "animate-spin" : ""}`} />
                </button>
              </div>

              {loadingRegs ? (
                <p className="text-xs text-slate-400 italic py-4">Memuat data dari database...</p>
              ) : registrations.length > 0 ? (
                <div className="divide-y divide-slate-105 max-h-[300px] overflow-y-auto pr-2">
                  {registrations.map((reg) => (
                    <div key={reg.id} className="flex items-center justify-between py-3.5 text-xs text-slate-700">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 text-sm">{reg.name}</p>
                        <p className="text-slate-400">
                          {reg.email} • {reg.whatsapp}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteRegistration(reg.id)}
                        className="rounded-full border border-red-50 bg-red-50/20 p-2 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">Belum ada jemaat terdaftar. Mari jadilah yang pertama!</p>
              )}
            </div>

          </div>

          {/* RIGHT 4 COLUMNS: SIDEBAR DETAIL METADATA (Image 5 right column) */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-205 bg-white p-6 shadow-sm space-y-6">
              <h3 className="font-display font-semibold text-slate-900 text-base border-b border-slate-100 pb-3 uppercase tracking-wider">
                Detail Kegiatan
              </h3>
              
              <ul className="space-y-5">
                {/* 1. TANGGAL MULAI */}
                <li className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Tanggal Mulai
                    </span>
                    <span className="block text-sm font-semibold text-slate-800">
                      15 Oktober 2026
                    </span>
                  </div>
                </li>

                {/* 2. WAKTU */}
                <li className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Waktu
                    </span>
                    <span className="block text-sm font-semibold text-slate-800">
                      {event.timeRange || "18:30 - 20:00 WIB"}
                    </span>
                  </div>
                </li>

                {/* 3. DURASI & FREKUENSI */}
                <li className="flex items-start space-x-3">
                  <RotateCcw className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Durasi & Frekuensi
                    </span>
                    <span className="block text-sm font-semibold text-slate-800">
                      Setiap Selasa (6 Minggu)
                    </span>
                  </div>
                </li>

                {/* 4. LOKASI */}
                <li className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Lokasi
                    </span>
                    <span className="block text-sm font-semibold text-slate-800 font-sans">
                      {event.location || "Ruang Komunitas, Lantai 2"}
                    </span>
                  </div>
                </li>

                {/* 5. PENGAJAR */}
                <li className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Pengajar
                    </span>
                    <span className="block text-sm font-semibold text-slate-800">
                      {event.trainer || "Pdt. Andreas & Tim"}
                    </span>
                  </div>
                </li>
              </ul>

              {/* Call to action form navigator */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={handleScrollToForm}
                  id="btn-scroll-to-register"
                  className="w-full rounded-full bg-indigo-650 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-indigo-750 active:scale-95 cursor-pointer transition-all uppercase text-center tracking-widest"
                >
                  Daftar Sekarang
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
