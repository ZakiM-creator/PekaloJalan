import React from 'react';
import { useApp } from '../context/AppContext';
import { PlaceCard } from '../components/PlaceCard';
import { Bookmark, Compass, Sparkles } from 'lucide-react';

export const SavedPlacesPage = () => {
  const { places, bookmarks, setActiveTab } = useApp();

  const savedPlaces = places.filter(p => bookmarks.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="space-y-2 border-b border-slate-800 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/20">
          <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Koleksi Pribadi</span>
        </div>

        <h1 className="text-3xl font-bold font-serif text-white">
          Tempat Impian Tersimpan ({savedPlaces.length})
        </h1>

        <p className="text-slate-400 text-xs sm:text-sm">
          Daftar destinasi wisata, kuliner, dan penginapan khas Pekalongan yang Anda simpan untuk dikunjungi nanti.
        </p>
      </div>

      {savedPlaces.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 glass-panel rounded-3xl border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Bookmark className="w-8 h-8 text-amber-400" />
          </div>

          <h3 className="text-xl font-bold font-serif text-white">Belum Ada Tempat Tersimpan</h3>

          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Jelajahi direktori tempat di Kota Pekalongan dan klik ikon penanda (bookmark) pada kartu tempat untuk menyimpannya di sini.
          </p>

          <button
            onClick={() => setActiveTab('directory')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 text-xs font-bold hover:from-amber-400 hover:to-orange-500 transition-all inline-flex items-center gap-2 shadow-md shadow-amber-500/20"
          >
            <Compass className="w-4 h-4" />
            <span>Jelajahi Direktori Tempat</span>
          </button>
        </div>
      )}

    </div>
  );
};
