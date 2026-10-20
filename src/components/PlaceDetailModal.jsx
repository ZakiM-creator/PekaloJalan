import React from 'react';
import { X, Star, MapPin, Clock, Tag, ExternalLink, Bookmark, Sparkles, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getMapUrl, getDirectionsUrl } from '../utils/geo.js';

export const PlaceDetailModal = () => {
  const { selectedPlaceModal, setSelectedPlaceModal, bookmarks, toggleBookmark, setActiveTab, setPendingAIPrompt } = useApp();

  if (!selectedPlaceModal) return null;

  const place = selectedPlaceModal;
  const isBookmarked = bookmarks.includes(place.id);

  const handleAskAIAboutPlace = () => {
    setSelectedPlaceModal(null);
    const userPrompt = `Tolong masukkan ${place.name} ke dalam rencana liburan saya di Pekalongan. Berikan saran waktu terbaik mengunjunginya dan rute tempat wisata/kuliner terdekat darinya.`;
    setPendingAIPrompt(userPrompt);
    setActiveTab('ai-planner');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-white/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-lg max-h-[90vh] flex flex-col">
        
        {/* Top Header Bar */}
        <div className="relative h-56 sm:h-64 w-full bg-slate-50 shrink-0">
          <img
            src={place.image}
            alt={place.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />

          {/* Close button */}
          <button
            onClick={() => setSelectedPlaceModal(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/90 text-slate-600 hover:text-slate-900 border border-slate-200 z-20 backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Bookmark Button */}
          <button
            onClick={() => toggleBookmark(place.id)}
            className={`absolute top-4 right-16 p-2 rounded-full backdrop-blur-md border transition-all z-20 ${
              isBookmarked
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white/90 text-slate-600 border-slate-300 hover:text-slate-900'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-white' : ''}`} />
          </button>

          {/* Title Overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-10 space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white uppercase tracking-wide">
              {place.category}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-900">
              {place.name}
            </h2>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-start gap-3 min-w-0">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {place.rating > 0 ? (
                  <>
                    <p className="font-bold text-slate-900 text-sm leading-tight">{place.rating} / 5.0</p>
                    <p className="text-xs text-slate-500 mt-0.5">({place.reviewsCount} Ulasan)</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-900 text-sm leading-tight">Belum ada rating</p>
                    <p className="text-xs text-slate-500 mt-0.5">Belum ada ulasan</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <Tag className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-emerald-700 text-sm leading-tight break-words whitespace-normal">{place.priceRange.split('/')[0]}</p>
                <p className="text-xs text-slate-500 mt-0.5">Perkiraan Biaya</p>
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <Clock className="w-5 h-5 text-indigo-800 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm leading-tight break-words whitespace-normal">{place.openingHours}</p>
                <p className="text-xs text-slate-500 mt-0.5">Jam Operasional</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider">Deskripsi Destinasi</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {place.description}
            </p>
          </div>

          {/* Location & Address */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider">Lokasi & Alamat</h3>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
              <MapPin className="w-5 h-5 text-indigo-800 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{place.address}</p>
                <a
                  href={getMapUrl(place)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-indigo-800 hover:text-indigo-900 underline underline-offset-4"
                >
                  <span>Buka di Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Facilities */}
          {place.facilities && place.facilities.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider">Fasilitas Tersedia</h3>
              <div className="flex flex-wrap gap-2">
                {place.facilities.map((fac, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-xs text-slate-600 border border-slate-300"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{fac}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {place.tags && place.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider">Label Kategori</h3>
              <div className="flex flex-wrap gap-1.5">
                {place.tags.map((t, idx) => (
                  <span key={idx} className="px-2.5 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-800 border border-indigo-100">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer CTA */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleAskAIAboutPlace}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-700 transition-all shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            <span>Masukkan Tempat Ini ke AI Trip Planner</span>
          </button>

          <a
            href={getDirectionsUrl(place)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs sm:text-sm border border-slate-300"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Petunjuk Arah</span>
          </a>
        </div>

      </div>
    </div>
  );
};
