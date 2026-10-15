export interface Registration {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  eventId: string;
  eventTitle: string;
  createdAt: string;
}

export interface WorshipSession {
  id: string;
  title: string;
  time: string;
  location: string;
}

export interface ChurchEvent {
  id: string;
  title: string;
  category: "RETREAT" | "WORSHIP" | "SOCIAL ACTION" | "KELAS PERTUMBUHAN" | "PRAYER" | "DIGITAL";
  date: string; // e.g. "24 OKT" or "05 NOV"
  fullDate: string; // e.g. "24 Oktober 2024"
  description: string;
  timeRange?: string; // e.g. "18:30 - 20:00 WIB"
  location?: string;
  trainer?: string;
  image?: string;
}

export type MenuTab = "beranda" | "jadwal_ibadah" | "pelayanan" | "kegiatan" | "detail_kegiatan" | "admin";

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  schedule: string;
  location: string;
  icon: string;
}

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  weeklyTheme: string;
}
