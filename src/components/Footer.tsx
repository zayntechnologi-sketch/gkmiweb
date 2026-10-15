import { BRANDS } from "../data";
import { Mail, Phone, MapPin, Heart, ChevronRight } from "lucide-react";
import { MenuTab } from "../types";

interface FooterProps {
  currentTab: MenuTab;
  onChangeTab: (tab: MenuTab) => void;
}

export default function Footer({ currentTab, onChangeTab }: FooterProps) {
  return (
    <footer className="w-full bg-white text-slate-600 py-12 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          
          {/* Col 1: About */}
          <div className="space-y-4">
            <h3 className="font-display text-lg font-bold text-indigo-600 tracking-wide uppercase">
              {BRANDS.logo}
            </h3>
            <p className="text-sm leading-relaxed text-slate-500">
              {BRANDS.footerSub}
            </p>
            <p className="text-xs text-slate-400">
              {BRANDS.footerText}
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-4">
            <h4 className="font-display text-xs font-bold tracking-widest text-slate-850 uppercase">
              Tautan Cepat
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button 
                  onClick={() => onChangeTab("beranda")} 
                  className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                >
                  <ChevronRight className="h-3.5 w-3.5 mr-1" /> Tentang Kami
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onChangeTab("jadwal_ibadah")} 
                  className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                >
                  <ChevronRight className="h-3.5 w-3.5 mr-1" /> Hubungi Kami
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onChangeTab("pelayanan")} 
                  className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                >
                  <ChevronRight className="h-3.5 w-3.5 mr-1" /> Donasi
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal stuff */}
          <div className="space-y-4">
            <h4 className="font-display text-xs font-bold tracking-widest text-slate-850 uppercase">
              Legal
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-slate-500 hover:text-indigo-600 transition-colors cursor-default">
                  Privasi
                </span>
              </li>
              <li>
                <span className="text-slate-500 hover:text-indigo-600 transition-colors cursor-default">
                  Syarat & Ketentuan
                </span>
              </li>
            </ul>
          </div>

          {/* Col 4: Reach out */}
          <div className="space-y-4">
            <h4 className="font-display text-xs font-bold tracking-widest text-slate-850 uppercase">
              Hubungi Kami
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-2.5">
                <MapPin className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <span className="text-slate-500 leading-relaxed">
                  Ruko Graha Asri (K-27), Jl. Ngagel Rejo No.173-183, Ngagel, Kec. Wonokromo, Kota Surabaya, Jawa Timur
                </span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Phone className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="text-slate-500">+62 0000000 </span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Mail className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="text-slate-500">gkmiichtus@gmail.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Line */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-center flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p className="uppercase tracking-widest font-bold">© 2026 {BRANDS.logo} • All Rights Reserved</p>
          <p className="flex items-center justify-center">
            Dibuat dengan <Heart className="h-3.5 w-3.5 mx-1 text-red-500 fill-red-500" /> untuk Kemuliaan-Nya.
          </p>
        </div>

      </div>
    </footer>
  );
}
