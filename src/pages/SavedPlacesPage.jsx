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
      <div className="space-y-2 border-b border-slate-200 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-100">
          <Bookmark className="w-3.5 h-3.5 text-indigo-800 fill-indigo-800" />
          <span>Koleksi Pribadi</span>
        </div>

        <h1 className="text-3xl font-bold font-serif text-slate-900">
          Tempat Impian Tersimpan ({savedPlaces.length})
        </h1>

        <p className="text-slate-500 text-xs sm:text-sm">
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
        <div className="text-center py-20 glass-panel rounded-3xl border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-800 flex items-center justify-center mx-auto">
            <Bookmark className="w-8 h-8 text-indigo-800" />
          </div>

          <h3 className="text-xl font-bold font-serif text-slate-900">Belum Ada Tempat Tersimpan</h3>

          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Jelajahi direktori tempat di Kota Pekalongan dan klik ikon penanda (bookmark) pada kartu tempat untuk menyimpannya di sini.
          </p>

          <button
            onClick={() => setActiveTab('directory')}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-all inline-flex items-center gap-2 shadow-md"
          >
            <Compass className="w-4 h-4" />
            <span>Jelajahi Direktori Tempat</span>
          </button>
        </div>
      )}

    </div>
  );
};
