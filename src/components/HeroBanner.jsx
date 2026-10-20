import React from 'react';
import { Search, Sparkles, MapPin, Compass, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const HeroBanner = () => {
  const { searchQuery, setSearchQuery, setActiveTab, places, categories } = useApp();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveTab('directory');
  };

  return (
    <div className="relative overflow-hidden pt-8 pb-12 sm:py-16 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          
          {/* Badge Lomba */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 text-indigo-800 animate-pulse" />
            <span>Jambore Pemuda Kota Pekalongan 2026 — Fitur Unggulan AI Trip Planner</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-serif tracking-tight text-slate-900 leading-[1.15]">
            Jelajah Pesona <br className="hidden sm:inline" />
            <span className="text-indigo-800">
              Kota Batik Pekalongan
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-sans">
            Temukan rekomendasi kuliner Megono, Soto Tauto, wisata religi bersejarah, serta toko batik terkurasi. Susun itinerary perjalanan otomatis dalam hitungan detik bersama AI Assistant.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto relative pt-2">
            <div className="relative flex items-center shadow-lg">
              <Search className="w-5 h-5 text-indigo-800 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Soto Tauto, Museum Batik, Hotel, Cafe..."
                className="w-full pl-12 pr-28 py-3.5 sm:py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 backdrop-blur-md transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-1.5 shadow-md"
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
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-700 text-white border border-slate-900 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition-all duration-200 group"
            >
              <Sparkles className="w-4 h-4 text-indigo-200 group-hover:rotate-12 transition-transform" />
              <span>Coba AI Trip Planner Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('directory')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-700 text-white border border-slate-900 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition-all duration-200"
            >
              <Compass className="w-4 h-4 text-indigo-200" />
              <span>Lihat Semua Direktori</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-6 text-left">
            <div className="glass-card p-3 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-800">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 font-serif">{places.length}+</p>
                <p className="text-xs text-slate-500">Destinasi Terkurasi</p>
              </div>
            </div>

            <div className="glass-card p-3 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-800">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 font-serif">Gemini AI</p>
                <p className="text-xs text-slate-500">Conversational Planner</p>
              </div>
            </div>

            <div className="glass-card p-3 rounded-xl border border-slate-200 flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 font-serif">{categories.length} Kategori</p>
                <p className="text-xs text-slate-500">Lengkap Khas Pekalongan</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
