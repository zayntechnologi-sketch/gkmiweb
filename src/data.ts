import { WorshipSession, ChurchEvent } from "./types";

export const WORSHIP_SESSIONS: WorshipSession[] = [
  {
    id: "session_1",
    title: "Ibadah Umum 1",
    time: "07:00 WIB",
    location: "Auditorium Utama"
  },
  {
    id: "session_2",
    title: "Ibadah Umum 2 & Sekolah Minggu",
    time: "09:30 WIB",
    location: "Auditorium Utama & Ruang Anak"
  },
  {
    id: "session_3",
    title: "Ibadah Pemuda (Youth)",
    time: "16:00 WIB",
    location: "Ruang Serbaguna"
  },
  {
    id: "session_4",
    title: "Ibadah Umum 3",
    time: "18:30 WIB",
    location: "Auditorium Utama"
  }
];

export const CHURCH_EVENTS: ChurchEvent[] = [
  {
    id: "awakening_camp_2026",
    title: "Awakening Camp 2026",
    category: "RETREAT",
    date: "24 OKT",
    fullDate: "24 Oktober 2026",
    description: "Tiga hari untuk me-refresh imanmu dan membangun persahabatan yang kuat di alam terbuka bersama seluruh jemaat pemuda.",
    location: "Cipanas, Jawa Barat",
    image: "https://images.unsplash.com/photo-1526976775609-08916724560d?auto=format&fit=crop&q=80&w=800&h=500"
  },
  {
    id: "praise_worship_night",
    title: "Praise & Worship Night",
    category: "WORSHIP",
    date: "05 NOV",
    fullDate: "05 November 2026",
    description: "Malam puji-pujian dan penyembahan yang intim. Mari rasakan hadirat Tuhan bersama-sama dipandu oleh tim pujian utama.",
    location: "Auditorium Utama Gedung A",
    image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&q=80&w=800&h=500"
  },
  {
    id: "youth_care_project",
    title: "Youth Care Project",
    category: "SOCIAL ACTION",
    date: "12 NOV",
    fullDate: "12 November 2026",
    description: "Tindakan nyata membagikan kasih Tuhan kepada masyarakat sekitar yang membutuhkan dengan pembagian sembako gratis.",
    location: "Kawasan Pemukiman Jakarta Pusat",
    image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800&h=500"
  },
  {
    id: "kelas_dasar_kekristenan",
    title: "Kelas Dasar Kekristenan",
    category: "KELAS PERTUMBUHAN",
    date: "15 OKT",
    fullDate: "Mulai Selasa, 15 Oktober 2026",
    description: "Membangun fondasi iman yang kuat dalam konteks kehidupan modern. Terbuka untuk semua jemaat baru dan siapa saja yang ingin bertumbuh.",
    timeRange: "18:30 - 20:00 WIB",
    location: "Ruang Komunitas, Lantai 2 (Gedung Utama GKMI ICHTUS)",
    trainer: "Pdt. Andreas & Tim",
    image: "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&q=80&w=800&h=500"
  }
];

export const GALLERY_PHOTOS = [
  {
    id: "g1",
    url: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=600&h=450",
    caption: "Amanah Pelayanan Kasih Pembagian Air & Makanan"
  },
  {
    id: "g2",
    url: "https://images.unsplash.com/photo-1490122417551-6ee9691429d0?auto=format&fit=crop&q=80&w=600&h=450",
    caption: "Ibadah Raya Mingguan Jemaat Bersatu"
  },
  {
    id: "g3",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=600&h=450",
    caption: "Pujian Jemaat Muda Mudi (Youth)"
  },
  {
    id: "g4",
    url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=600&h=450",
    caption: "Kelompok Sel / Hubungan Connect Groups"
  }
];

export const BRANDS = {
  logo: "GKMI ICHTUS",
  footerText: "© 2026 GKMI ICHTUS. Semua Hak Dilindungi. Memberkati Masyarakat melalui Kasih.",
  footerSub: "Membangun generasi yang takut akan Tuhan dan berdampak bagi bangsa."
};
