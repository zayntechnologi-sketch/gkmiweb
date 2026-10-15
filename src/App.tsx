import React, { useState, useEffect } from "react";
import { MenuTab, ChurchEvent, ThemeSettings } from "./types";
import Header from "./components/Header";
import Footer from "./components/Footer";
import BerandaView from "./components/BerandaView";
import JadwalIbadahView from "./components/JadwalIbadahView";
import PelayananView from "./components/PelayananView";
import KegiatanView from "./components/KegiatanView";
import DetailKegiatanView from "./components/DetailKegiatanView";
import AdminView from "./components/AdminView";
import LoginView from "./components/LoginView";
import { useAdminAuth } from "./hooks/useAdminAuth";

function applyThemeToRoot(theme: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty("--theme-primary", theme.primaryColor);
  root.style.setProperty("--theme-secondary", theme.secondaryColor);
  root.style.setProperty("--theme-accent", theme.accentColor);
  root.style.setProperty("--theme-bg", theme.backgroundColor);
  root.style.setProperty("--theme-text", theme.textColor);
  root.style.setProperty("--theme-font", theme.fontFamily);
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<MenuTab>("beranda");
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const { user, checking, login } = useAdminAuth();

  // Load theme on app startup
  useEffect(() => {
    fetch("/api/theme")
      .then(res => res.json())
      .then((theme: ThemeSettings) => {
        applyThemeToRoot(theme);
      })
      .catch(() => {
        // Use defaults if theme fetch fails
        console.warn("Gagal memuat tema, menggunakan default.");
      });
  }, []);

  const handleSelectEvent = (event: ChurchEvent) => {
    setSelectedEvent(event);
    setCurrentTab("detail_kegiatan");
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToActivities = () => {
    setCurrentTab("kegiatan");
    setSelectedEvent(null);
  };

  const handleTabChange = (tab: MenuTab) => {
    setCurrentTab(tab);
    setSelectedEvent(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // If accessing admin but not logged in yet (and still checking), wait
  if (currentTab === "admin" && checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex items-center space-x-3 text-slate-400">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Memverifikasi sesi...</span>
        </div>
      </div>
    );
  }

  // Show login if admin tab is active but not authenticated
  if (currentTab === "admin" && !user) {
    return (
      <LoginView
        onLogin={login}
        onBack={() => handleTabChange("beranda")}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-bg select-none">
      
      {/* 1. BRAND GLOBAL NAV HEADER */}
      <Header 
        currentTab={currentTab} 
        onChangeTab={handleTabChange}
        onOpenAdmin={() => handleTabChange("admin")}
      />

      {/* 2. DYNAMIC CONTENT RENDERING RAILS */}
      <main className="flex-grow">
        {currentTab === "beranda" && (
          <BerandaView 
            onChangeTab={handleTabChange}
            onJoinCommunity={() => handleTabChange("pelayanan")}
          />
        )}

        {currentTab === "jadwal_ibadah" && (
          <JadwalIbadahView />
        )}

        {currentTab === "pelayanan" && (
          <PelayananView 
            onChangeTab={handleTabChange}
            onSelectEvent={handleSelectEvent}
          />
        )}

        {currentTab === "kegiatan" && (
          <KegiatanView 
            onSelectEvent={handleSelectEvent}
          />
        )}

        {currentTab === "detail_kegiatan" && selectedEvent && (
          <DetailKegiatanView 
            event={selectedEvent}
            onBack={handleBackToActivities}
          />
        )}

        {currentTab === "admin" && (
          <AdminView onBack={() => handleTabChange("beranda")} />
        )}
      </main>

      {/* 3. FOOTER SIGNBOARD */}
      <Footer currentTab={currentTab} onChangeTab={handleTabChange} />
    </div>
  );
}
