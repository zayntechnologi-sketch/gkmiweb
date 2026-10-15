import { useState, useEffect } from "react";
import { MenuTab } from "../types";
import { BRANDS } from "../data";
import { Settings, Menu, X } from "lucide-react";

interface HeaderProps {
  currentTab: MenuTab;
  onChangeTab: (tab: MenuTab) => void;
  onOpenAdmin: () => void;
}

export default function Header({ currentTab, onChangeTab, onOpenAdmin }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  }, [currentTab]);

  const tabs: { key: MenuTab; label: string }[] = [
    { key: "beranda", label: "Beranda" },
    { key: "jadwal_ibadah", label: "Jadwal Ibadah" },
    { key: "pelayanan", label: "Pelayanan" },
    { key: "kegiatan", label: "Kegiatan" }
  ];

  const handleTabClick = (key: MenuTab) => {
    onChangeTab(key);
    setIsMobileMenuOpen(false); // Close menu after clicking
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo */}
        <div 
          onClick={() => handleTabClick("beranda")} 
          className="flex cursor-pointer items-center space-x-3 select-none"
          id="church-logo"
        >
          <img
            src="/gkmi.svg"
            alt="Logo GKMI ICHTUS"
            className="h-14 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="font-display text-base font-extrabold tracking-tight text-slate-800 uppercase leading-tight">
              {BRANDS.logo}
            </span>
            <span className="text-[9px] font-bold tracking-widest text-indigo-600 uppercase leading-tight">
              Surabaya
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-8 h-full items-center">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.key || (tab.key === "kegiatan" && currentTab === "detail_kegiatan");
            return (
              <button
                key={tab.key}
                id={`nav-${tab.key}`}
                onClick={() => handleTabClick(tab.key)}
                className={`relative py-7 text-xs font-semibold uppercase tracking-widest transition-colors hover:text-indigo-600 cursor-pointer ${
                  isActive ? "text-indigo-600 font-bold" : "text-slate-500"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 h-0.5 w-full bg-indigo-600" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Call To Action area */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden lg:flex flex-col items-end mr-2 text-right">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 uppercase">Ibadah Raya Minggu</span>
            <span className="text-xs font-semibold text-slate-700">{weeklyTheme ? `Tema: "${weeklyTheme}"` : "Memuat tema..."}</span>
          </div>
          
          <button
            onClick={onOpenAdmin}
            id="btn-admin-panel"
            title="Panel Admin"
            className={`h-9 w-9 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
              currentTab === "admin"
                ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                : "border-slate-200 bg-white text-slate-400 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white absolute w-full shadow-lg">
          <nav className="flex flex-col px-4 pt-2 pb-6 space-y-2">
            <div className="py-3 px-2 mb-2 bg-indigo-50/50 rounded-lg">
              <p className="text-[10px] font-bold tracking-widest text-indigo-600 uppercase">Ibadah Raya Minggu</p>
              <p className="text-xs font-semibold text-slate-700">{weeklyTheme ? `Tema: "${weeklyTheme}"` : "Memuat tema..."}</p>
            </div>
            {tabs.map((tab) => {
              const isActive = currentTab === tab.key || (tab.key === "kegiatan" && currentTab === "detail_kegiatan");
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabClick(tab.key)}
                  className={`flex items-center w-full px-4 py-3 rounded-xl text-sm font-semibold uppercase tracking-widest transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
