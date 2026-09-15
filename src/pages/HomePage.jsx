import React from 'react';
import { HeroBanner } from '../components/HeroBanner';
import { CategoryChips } from '../components/CategoryChips';
import { PlaceCard } from '../components/PlaceCard';
import { useApp } from '../context/AppContext';
import { Sparkles, Compass, Flame, ArrowRight, CheckCircle2 } from 'lucide-react';

export const HomePage = () => {
  const { places, setActiveTab, setSelectedCategory } = useApp();

  const featuredPlaces = places.filter(p => p.featured).slice(0, 6);
  const streetFoodPlaces = places.filter(p => p.category === 'street-food').slice(0, 3);

  return (
    <div className="space-y-12 pb-16">
      
      {/* 1. Hero Section */}
      <HeroBanner />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* 2. Category Selector */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-white">
              Jelajahi 8 Kategori Tempat
            </h2>
            <button
              onClick={() => setActiveTab('directory')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <CategoryChips />
        </section>

        {/* 3. Featured Places Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Pilihan Terbaik
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white">
                Destinasi Unggulan Pekalongan
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Tempat-tempat populer dengan ulasan positif dari wisatawan dan warga lokal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </section>

        {/* 4. AI Trip Planner Feature Spotlight Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 p-6 sm:p-10 shadow-2xl">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/20">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Teknologi Kecerdasan Buatan (AI)</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-bold font-serif text-white leading-tight">
                Bingung Mau Jalan-Jalan ke Mana? <br />
                Biar <span className="text-amber-400">AI Trip Planner</span> yang Susunkan!
              </h2>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
                Cukup ketik keinginan Anda seperti berbincang dengan pemandu lokal. Sistem AI berbasis Google Gemini akan menganalisis preferensi kategori, budget, dan waktu Anda untuk menghasilkan linimasa perjalanan presisi.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Antarmuka Chat Conversational (Multi-turn)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Estimasi Biaya & Rute Terstruktur</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dapat Direvisi Kapan Saja via Chat</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Bisa Dicetak / Disimpan ke PDF</span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => setActiveTab('ai-planner')}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-bold text-sm hover:opacity-95 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Buka AI Trip Planner Sekarang</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 glass-card p-4 rounded-2xl border border-amber-500/20 space-y-3">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulasi Respons Chat AI</span>
              </div>
              
              <div className="p-3 rounded-xl bg-slate-950/80 text-xs text-slate-300 space-y-2 border border-slate-800">
                <p className="font-semibold text-amber-300">💬 Anda:</p>
                <p className="italic">"Saya ada waktu 1 hari di Pekalongan, budget 200rb untuk 2 orang. Suka soto tauto dan mau beli batik."</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 text-xs text-amber-200 space-y-1.5 border border-amber-500/20">
                <p className="font-semibold text-amber-400">🤖 PekaloJalan AI:</p>
                <p>"Siap Sedulur! Saya buatkan itinerary 1 hari: Pagi di Museum Batik (20rb), Makan Siang Soto Tauto Pak Amir (50rb), dan Sore belanja batik di IBC Wiradesa..."</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Highlight Kuliner Kaki Lima Pekalongan */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Khas Pekalongan</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white">
                Kuliner Kaki Lima & Street Food
              </h2>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('street-food');
                setActiveTab('directory');
              }}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>Lihat Kuliner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {streetFoodPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};
