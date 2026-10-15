import { useState, useEffect } from "react";
import { GALLERY_PHOTOS } from "../data";
import { ChurchEvent } from "../types";
import { ChevronLeft, ChevronRight, ArrowRight, BookOpen } from "lucide-react";

interface KegiatanViewProps {
  onSelectEvent: (event: ChurchEvent) => void;
}

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  hasEvent?: boolean;
  eventDetails?: { time: string; title: string; loc: string };
  rawEvent?: ChurchEvent;
}

export default function KegiatanView({ onSelectEvent }: KegiatanViewProps) {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  
  // Realtime Calendar States
  const [currentDate] = useState(new Date());
  const [displayMonth, setDisplayMonth] = useState(currentDate.getMonth());
  const [displayYear, setDisplayYear] = useState(currentDate.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number>(currentDate.getDate());

  useEffect(() => {
    fetch("/api/church-events")
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error(err));
  }, []);

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const shortMonths = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
  
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(displayYear, displayMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
  
  const prevMonthPadding: CalendarDay[] = Array.from({ length: firstDayOfMonth }, () => ({
    day: 0, isCurrentMonth: false
  }));

  const currentMonthDays: CalendarDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    // Map event to calendar. Example DB format: "15 OKT 2026" or "27 MEI"
    // We check if the event date string contains the day number and the short month name.
    const monthShort = shortMonths[displayMonth];
    const event = events.find(ev => {
       const dateStr = ev.date.toUpperCase();
       // Check if day exists as whole word and month exists
       const dayMatch = new RegExp(`\\b0?${day}\\b`).test(dateStr);
       const monthMatch = dateStr.includes(monthShort);
       // Fallback: if it's just "27 MEI" or something similar
       return dayMatch && monthMatch;
    });

    return {
      day,
      isCurrentMonth: true,
      hasEvent: !!event,
      eventDetails: event ? { time: event.timeRange || "TBA", title: event.title, loc: event.location } : undefined,
      rawEvent: event
    };
  });

  const nextMonthPaddingDays = 42 - (prevMonthPadding.length + currentMonthDays.length);
  const nextMonthPadding: CalendarDay[] = Array.from({ length: nextMonthPaddingDays > 6 ? nextMonthPaddingDays - 7 : nextMonthPaddingDays }, () => ({
    day: 0, isCurrentMonth: false
  }));

  const allCalendarDays = [...prevMonthPadding, ...currentMonthDays, ...nextMonthPadding];
  const activeDayInfo = currentMonthDays.find((d) => d.day === selectedDay && d.hasEvent);

  const growthClassEvent = events.find((e) => e.id === "kelas_dasar_kekristenan") || events[0];

  const handlePrevMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear(displayYear - 1);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(displayYear + 1);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
    setSelectedDay(1);
  };

  return (
    <div className="w-full">
      {/* 1. HERO BANNER SECTION */}
      <section className="relative flex min-h-[50vh] w-full items-center justify-center overflow-hidden bg-indigo-950 text-white">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&q=80&w=1600&h=900"
            alt="Kegiatan Komunitas"
            className="h-full w-full object-cover object-center opacity-30 mix-blend-overlay scale-102"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-indigo-950/80" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center space-y-4">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
            Kegiatan Komunitas
          </h1>
          <p className="mx-auto max-w-2xl text-slate-300 font-sans text-sm sm:text-base leading-relaxed">
            Bertumbuh bersama dalam kasih dan pelayanan. Temukan berbagai kegiatan untuk memperdalam iman dan membangun komunitas yang kuat.
          </p>
        </div>
      </section>

      {/* 2. CALENDAR & COURSE BANNER MAIN COLUMNS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          
          {/* Calendar Widget Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Calendar Header block */}
              <div className="bg-indigo-950 p-4.5 text-white flex items-center justify-between">
                <span className="font-display font-medium text-sm tracking-widest uppercase">
                  {monthNames[displayMonth]} {displayYear}
                </span>
                <div className="flex space-x-2">
                  <button onClick={handlePrevMonth} className="rounded hover:bg-white/10 p-1 text-white/80 cursor-pointer">
                    <ChevronLeft className="h-4.5 w-4.5" />
                  </button>
                  <button onClick={handleNextMonth} className="rounded hover:bg-white/10 p-1 text-white/80 cursor-pointer">
                    <ChevronRight className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Days labels */}
              <div className="grid grid-cols-7 text-center bg-white border-b border-slate-100 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>MIN</span>
                <span>SEN</span>
                <span>SEL</span>
                <span>RAB</span>
                <span>KAM</span>
                <span>JUM</span>
                <span>SAB</span>
              </div>

              {/* Days numbers grid */}
              <div className="grid grid-cols-7 text-center bg-white p-2">
                {allCalendarDays.map((item, idx) => {
                  const isSelected = item.isCurrentMonth && item.day === selectedDay;
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (item.isCurrentMonth) {
                          setSelectedDay(item.day);
                        }
                      }}
                      className={`relative h-11 w-full flex flex-col items-center justify-center rounded text-xs transition-all pointer-events-auto ${
                        !item.isCurrentMonth 
                          ? "text-slate-300 pointer-events-none" 
                          : "text-slate-700 hover:bg-slate-50 font-medium"
                      } ${
                        isSelected 
                          ? "bg-indigo-50 border-2 border-indigo-600 font-bold text-indigo-650" 
                          : ""
                      }`}
                    >
                      <span>{item.isCurrentMonth ? item.day : ""}</span>
                      
                      {/* Event Dot helper */}
                      {item.hasEvent && (
                        <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-indigo-600 shadow-sm animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Agenda box */}
              <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-3">
                <span className="font-mono text-[9px] font-bold tracking-widest text-indigo-600 uppercase border border-indigo-200 bg-indigo-50 px-2.5 py-1 rounded inline-block">
                  KEGIATAN HARI INI ({selectedDay} {shortMonths[displayMonth]})
                </span>
                {activeDayInfo?.eventDetails ? (
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-display font-semibold text-slate-900 text-sm">
                        {activeDayInfo.eventDetails.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {activeDayInfo.eventDetails.loc}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 whitespace-nowrap bg-white px-2.5 py-1 rounded border border-slate-100">
                        {activeDayInfo.eventDetails.time}
                      </span>
                      {activeDayInfo.rawEvent && (
                        <button
                          onClick={() => onSelectEvent(activeDayInfo.rawEvent!)}
                          className="text-[10px] font-bold tracking-widest text-indigo-500 hover:text-indigo-700 uppercase flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Detail</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Tidak ada jadwal kegiatan khusus untuk hari ini. Silakan pilih tanggal lain yang memiliki penanda indigo.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Growth Class Banner Promo Card */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col h-full justify-between">
              <div>
                {/* Gradient-lit card header */}
                <div className="h-40 bg-gradient-to-br from-[#e0e7ff] via-[#c7d2fe] to-[#e0e7ff] relative p-6 flex flex-col justify-end">
                  <div className="absolute top-4 left-4 bg-white/40 backdrop-blur-md border border-white/30 rounded-full h-10 w-10 flex items-center justify-center text-indigo-900 shadow-sm">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[9px] font-bold tracking-widest text-[#4338ca] uppercase bg-white/70 px-2 py-1 rounded w-max">
                    KELAS PERTUMBUHAN
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                    Dasar Kekristenan
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Mulai Selasa, 15 Oktober, setiap Selasa malam. Mari perdalam fondasi iman Anda melalui sesi interaktif yang dinamis.
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0">
                <button
                  onClick={() => growthClassEvent && onSelectEvent(growthClassEvent)}
                  id="btn-promo-class"
                  className="w-full flex items-center justify-center space-x-2 rounded-full border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-600 shadow-sm hover:bg-indigo-50 cursor-pointer transition-all disabled:opacity-50"
                  disabled={!growthClassEvent}
                >
                  <span>Daftar Sekarang</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. GALERI JEMAAT / KOMUNITAS */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 mb-16 space-y-6">
        <div className="flex items-end justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Galeri Komunitas
            </h2>
            <p className="text-sm text-slate-501 mt-1">
              Momen kebersamaan dalam pelayanan kasih.
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-default">
            Lihat Semua
          </span>
        </div>

        {/* Gallery items grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {GALLERY_PHOTOS.map((photo) => (
            <div 
              key={photo.id}
              className="group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:shadow-md"
            >
              <div className="h-44 overflow-hidden bg-slate-100">
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-4 bg-white">
                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                  {photo.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
