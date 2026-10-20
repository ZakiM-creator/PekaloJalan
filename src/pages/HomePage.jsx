import React from 'react';
import { HeroBanner } from '../components/HeroBanner';
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
        
        {/* 2. Featured Places Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                Pilihan Terbaik
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
                Destinasi Unggulan Pekalongan
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              Tempat-tempat populer dengan ulasan positif dari wisatawan dan warga lokal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </section>

        {/* 3. AI Trip Planner Feature Spotlight Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-50/60 via-white to-white border border-indigo-100 p-6 sm:p-10 shadow-lg">
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-100">
                <Sparkles className="w-4 h-4 text-indigo-800" />
                <span>Teknologi Kecerdasan Buatan (AI)</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-bold font-serif text-slate-900 leading-tight">
                Bingung Mau Jalan-Jalan ke Mana? <br />
                Biar <span className="text-indigo-800">AI Trip Planner</span> yang Susunkan!
              </h2>

              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-xl">
                Cukup ketik keinginan Anda seperti berbincang dengan pemandu lokal. Sistem AI berbasis Google Gemini akan menganalisis preferensi kategori, budget, dan waktu Anda untuk menghasilkan linimasa perjalanan presisi.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Antarmuka Chat Conversational (Multi-turn)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Estimasi Biaya & Rute Terstruktur</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Dapat Direvisi Kapan Saja via Chat</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Bisa Dicetak / Disimpan ke PDF</span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => setActiveTab('ai-planner')}
                  className="px-6 py-3.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:opacity-95 transition-all shadow-lg flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Buka AI Trip Planner Sekarang</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 glass-card p-4 rounded-2xl border border-indigo-100 space-y-3">
              <div className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulasi Respons Chat AI</span>
              </div>
              
              <div className="p-3 rounded-xl bg-white/90 text-xs text-slate-600 space-y-2 border border-slate-200">
                <p className="font-semibold text-indigo-800">💬 Anda:</p>
                <p className="italic">"Saya ada waktu 1 hari di Pekalongan, budget 200rb untuk 2 orang. Suka soto tauto dan mau beli batik."</p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 text-xs text-indigo-800 space-y-1.5 border border-indigo-100">
                <p className="font-semibold text-indigo-800">🤖 PekaloJalan AI:</p>
                <p>"Siap Sedulur! Saya buatkan itinerary 1 hari: Pagi di Museum Batik (20rb), Makan Siang Soto Tauto Pak Amir (50rb), dan Sore belanja batik di IBC Wiradesa..."</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Highlight Kuliner Kaki Lima Pekalongan */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Khas Pekalongan</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
                Kuliner Kaki Lima & Street Food
              </h2>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('street-food');
                setActiveTab('directory');
              }}
              className="text-xs font-bold text-indigo-800 hover:text-indigo-900 flex items-center gap-1"
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
