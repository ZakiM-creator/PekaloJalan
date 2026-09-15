import React from 'react';
import { Search, Sparkles, MapPin, Compass, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const HeroBanner = () => {
  const { searchQuery, setSearchQuery, setActiveTab, places } = useApp();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveTab('directory');
  };

  return (
    <div className="relative overflow-hidden pt-8 pb-12 sm:py-16 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800/60">
      {/* Decorative Glow Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-amber-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-72 h-72 bg-orange-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          
          {/* Badge Lomba */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Jambore Pemuda Kota Pekalongan 2026 — Fitur Unggulan AI Trip Planner</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-serif tracking-tight text-white leading-[1.15]">
            Jelajah Pesona <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              Kota Batik Pekalongan
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-sans">
            Temukan rekomendasi kuliner Megono, Soto Tauto, wisata religi bersejarah, serta toko batik terkurasi. Susun itinerary perjalanan otomatis dalam hitungan detik bersama AI Assistant.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto relative pt-2">
            <div className="relative flex items-center shadow-2xl shadow-amber-500/10">
              <Search className="w-5 h-5 text-amber-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Soto Tauto, Museum Batik, Hotel, Cafe..."
                className="w-full pl-12 pr-28 py-3.5 sm:py-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 backdrop-blur-md transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 text-xs font-bold hover:from-amber-400 hover:to-orange-500 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <span>Cari Tempat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => setActiveTab('ai-planner')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-bold text-xs sm:text-sm hover:opacity-95 transition-all shadow-lg shadow-amber-500/25 group"
            >
              <Sparkles className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform" />
              <span>Coba AI Trip Planner Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('directory')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold transition-all"
            >
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Lihat Semua Direktori</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-6 text-left">
            <div className="glass-card p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-white font-serif">{places.length}+</p>
                <p className="text-[11px] text-slate-400">Destinasi Terkurasi</p>
              </div>
            </div>

            <div className="glass-card p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-white font-serif">Gemini AI</p>
                <p className="text-[11px] text-slate-400">Conversational Planner</p>
              </div>
            </div>

            <div className="glass-card p-3 rounded-xl border border-slate-800 flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-white font-serif">8 Kategori</p>
                <p className="text-[11px] text-slate-400">Lengkap Khas Pekalongan</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
