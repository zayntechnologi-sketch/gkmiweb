import { useState, useEffect } from "react";
import { CheckCircle2, MapPin, Youtube, ExternalLink, Map, Navigation, Heart, Info } from "lucide-react";

export default function JadwalIbadahView() {
  const [directionsStatus, setDirectionsStatus] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/worship-sessions")
      .then((res) => res.json())
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching sessions:", err);
        setLoading(false);
      });
  }, []);

  const getDirections = () => {
    setDirectionsStatus("Mengalihkan ke navigasi peta...");
    setTimeout(() => {
      window.open(
        "https://maps.app.goo.gl/scsmRzQZYiyGycTL7",
        "_blank"
      );
      setDirectionsStatus(null);
    }, 1000);
  };

  const expectations = [
    "Suasana yang hangat dan bersahabat",
    "Pujian dan penyembahan kontemporer",
    "Pesan firman Tuhan yang relevan dan praktis",
  ];

  return (
    <div className="w-full">
      {/* HEADER HERO (with blur-tint background of church altar) */}
      <section className="relative bg-indigo-950 text-white py-16 px-4 md:py-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&q=80&w=1600&h=900"
            alt="Worship schedule head banner"
            className="h-full w-full object-cover object-center opacity-25 mix-blend-lighten scale-102"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-transparent to-indigo-950/80" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center space-y-4">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-305 mb-2">
            <Heart className="h-4.5 w-4.5 fill-indigo-455 text-indigo-305" />
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
            Jadwal Ibadah
          </h1>
          <p className="mx-auto max-w-2xl text-slate-300 font-sans text-sm sm:text-base leading-relaxed">
            Mari bergabung bersama kami dalam hadirat Tuhan. Temukan jadwal yang sesuai untuk Anda dan keluarga.
          </p>
        </div>
      </section>

      {/* CORE TIMETABLE & SIDEBAR COLUMNS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          
          {/* LEFT 2 COLUMNS: TABLE & EXTRA MEETINGS */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Table Area */}
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Jadwal Ibadah Raya (Minggu)
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-250 bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Sesi</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Waktu</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Lokasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500">
                          Memuat jadwal ibadah...
                        </td>
                      </tr>
                    ) : sessions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500">
                          Belum ada jadwal ibadah tersedia.
                        </td>
                      </tr>
                    ) : (
                      sessions.map((session, idx) => (
                        <tr 
                          key={session.id} 
                          className={`transition-colors hover:bg-slate-50 ${idx % 2 === 1 ? "bg-slate-50/40" : ""}`}
                        >
                          <td className="px-6 py-4 font-semibold text-slate-900">{session.title}</td>
                          <td className="px-6 py-4 font-mono text-sm font-bold text-indigo-600">
                            {session.time}
                          </td>
                          <td className="px-6 py-4 text-slate-600 text-sm">{session.location}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Midweek Services Area */}
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Jadwal Ibadah Tengah Minggu
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-250 bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-orange-100 text-orange-900 border-b border-orange-200">
                      <th className="px-6 py-4 text-sm font-bold uppercase tracking-wider">Ibadah</th>
                      <th className="px-6 py-4 text-sm font-bold uppercase tracking-wider">Hari / Jam</th>
                      <th className="px-6 py-4 text-sm font-bold uppercase tracking-wider">Tempat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900">Komisi Bapak</td>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-indigo-600">Senin, 18.00</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">Gereja</td>
                    </tr>
                    <tr className="transition-colors hover:bg-slate-50 bg-slate-50/40">
                      <td className="px-6 py-4 font-semibold text-slate-900">Komisi Perempuan</td>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-indigo-600">Senin, 18.00</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">Gereja</td>
                    </tr>
                    <tr className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900">Doa Puasa</td>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-indigo-600">Selasa, 17.30</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">Gereja</td>
                    </tr>
                    <tr className="transition-colors hover:bg-slate-50 bg-slate-50/40">
                      <td className="px-6 py-4 font-semibold text-slate-900">Lansia/Senior</td>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-indigo-600">Rabu, 18.00</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">Gereja</td>
                    </tr>
                    <tr className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900">P.A</td>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-indigo-600">Kamis, 18.00</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">Gereja</td>
                    </tr>
                    <tr className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900">Komisi Youth</td>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-indigo-600">Sabtu, 18.00</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">Gereja</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* RIGHT 1 COLUMN: FIRST TIME VISIT & LOCATION MAPS */}
          <div className="space-y-8">
            
            {/* Card 1: Pertama Kali Datang */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Pertama Kali Datang?
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Kami sangat senang menyambut Anda! Berikut adalah beberapa hal yang dapat Anda harapkan bagi kedatangan perdana Anda:
              </p>
              <ul className="space-y-3.5 pt-2">
                {expectations.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card 2: Lokasi Kami (Image 1 bottom-right card replacement) */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col">
              {/* Graphic Map Placeholder */}
              <div className="relative h-44 bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                <div className="absolute inset-0 bg-[#e2e8f0]/40 flex items-center justify-center overflow-hidden">
                  {/* Subtle vector-like grid lines */}
                  <div className="absolute w-full h-0.5 bg-slate-300 transform rotate-12 top-10" />
                  <div className="absolute w-full h-0.5 bg-slate-300 transform -rotate-12 top-32" />
                  <div className="absolute h-full w-0.5 bg-slate-300 transform rotate-45 left-20" />
                  <div className="absolute h-full w-0.5 bg-slate-300 transform rotate-45 left-44" />
                  <div className="absolute h-10 w-10 bg-indigo-600/10 rounded-full flex items-center justify-center animate-ping" />
                  <div className="relative h-12 w-12 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white">
                    <MapPin className="h-6 w-6" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-slate-650 flex items-center space-x-1">
                  <Map className="h-3 w-3" />
                  <span>Interactive Map</span>
                </div>
              </div>

              {/* Lokasi details address */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="font-display font-semibold text-slate-900 text-sm">Gereja GKMI ICHTUS</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Ruko Graha Asri (K-27), Jl. Ngagel Rejo No.173-183, Ngagel, Kec. Wonokromo, Kota Surabaya, Jawa Timur
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={getDirections}
                    id="btn-directions"
                    className="w-full flex items-center justify-center space-x-2 rounded-full border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-600 shadow-sm hover:bg-indigo-50 active:scale-95 cursor-pointer transition-all"
                  >
                    <Navigation className="h-4.5 w-4.5" />
                    <span>{directionsStatus || "Dapatkan Petunjuk Arah"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Hint Box */}
            <div className="rounded-xl border border-blue-50 bg-blue-50/50 p-4 flex items-start space-x-3 text-xs text-blue-700 leading-relaxed">
              <Info className="h-5 w-5 shrink-0 mt-0.5" />
              <span>Disarankan untuk tiba 10 menit sebelum mulainya ibadah agar dapat menikmati sapaan ramah jemaat kami secara rileks.</span>
            </div>

          </div>

        </div>
      </section>
    </div>
  );
}
