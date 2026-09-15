import React from 'react';
import { Compass, Sparkles, Heart } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Footer = () => {
  const { setActiveTab } = useApp();

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center font-bold text-slate-950 font-serif text-lg">
                P
              </div>
              <span className="text-xl font-bold font-serif text-white">PekaloJalan</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              Portal Rekomendasi Wisata terkurasi & Asisten AI Trip Planner otomatis pertama di Kota Pekalongan. Memudahkan wisatawan dan warga lokal merencanakan perjalanan wisata budaya, religi, dan kuliner khas Pekalongan.
            </p>
            <div className="pt-1 text-[11px] text-amber-400/90 font-medium">
              🏆 Dikembangkan untuk Lomba Teknologi Piranti Lunak — Jambore Pemuda Kota Pekalongan 2026.
            </div>
          </div>

          {/* Col 2: Navigasi Cepat */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white font-serif uppercase tracking-wider">Navigasi Utama</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => setActiveTab('home')} className="hover:text-amber-300 transition-colors">
                  Beranda Utama
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('directory')} className="hover:text-amber-300 transition-colors">
                  Direktori 8 Kategori Tempat
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('ai-planner')} className="hover:text-amber-300 transition-colors flex items-center gap-1">
                  <span>AI Trip Planner Chat</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('saved')} className="hover:text-amber-300 transition-colors">
                  Tempat Impian Tersimpan
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('admin')} className="hover:text-amber-300 transition-colors">
                  Panel Pengelola (Admin)
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Kategori Khas */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white font-serif uppercase tracking-wider">Kategori Ikonik</h4>
            <ul className="space-y-2 text-slate-400">
              <li>• Wisata Budaya & Museum Batik</li>
              <li>• Kuliner Street Food (Soto Tauto & Megono)</li>
              <li>• Wisata Religi & Masjid Agung</li>
              <li>• Oleh-oleh & Toko Batik IBC</li>
              <li>• Resto & Penginapan Nyaman</li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© 2026 PekaloJalan. Seluruh Hak Cipta Dilindungi.</p>
          <div className="flex items-center gap-1">
            <span>Dibuat dengan bangga untuk Kota Pekalongan</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          </div>
        </div>

      </div>
    </footer>
  );
};
