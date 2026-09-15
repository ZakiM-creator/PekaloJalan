import React from 'react';
import { X, Star, MapPin, Clock, Tag, ExternalLink, Bookmark, Sparkles, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PlaceDetailModal = () => {
  const { selectedPlaceModal, setSelectedPlaceModal, bookmarks, toggleBookmark, setActiveTab, setChatMessages } = useApp();

  if (!selectedPlaceModal) return null;

  const place = selectedPlaceModal;
  const isBookmarked = bookmarks.includes(place.id);

  const handleAskAIAboutPlace = () => {
    setSelectedPlaceModal(null);
    setActiveTab('ai-planner');
    
    // Append prompt to AI chat
    const userPrompt = `Tolong masukkan ${place.name} ke dalam rencana liburan saya di Pekalongan. Berikan saran waktu terbaik mengunjunginya dan rute tempat wisata/kuliner terdekat darinya.`;
    
    setChatMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: userPrompt,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        
        {/* Top Header Bar */}
        <div className="relative h-56 sm:h-64 w-full bg-slate-950 shrink-0">
          <img
            src={place.image}
            alt={place.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

          {/* Close button */}
          <button
            onClick={() => setSelectedPlaceModal(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/80 text-slate-300 hover:text-white border border-slate-700/80 z-20 backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Bookmark Button */}
          <button
            onClick={() => toggleBookmark(place.id)}
            className={`absolute top-4 right-16 p-2 rounded-full backdrop-blur-md border transition-all z-20 ${
              isBookmarked
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-950/80 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-slate-950' : ''}`} />
          </button>

          {/* Title Overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-10 space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 uppercase tracking-wide">
              {place.category}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-white drop-shadow-md">
              {place.name}
            </h2>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-sm">{place.rating} / 5.0</p>
                <p className="text-[10px] text-slate-400">({place.reviewsCount} Ulasan)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-emerald-400 text-sm truncate">{place.priceRange.split('/')[0]}</p>
                <p className="text-[10px] text-slate-400">Perkiraan Biaya</p>
              </div>
            </div>

            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-xs truncate">{place.openingHours}</p>
                <p className="text-[10px] text-slate-400">Jam Operasional</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Deskripsi Destinasi</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {place.description}
            </p>
          </div>

          {/* Location & Address */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Lokasi & Alamat</h3>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-sm text-slate-300">
              <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{place.address}</p>
                <a
                  href={place.locationMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4"
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
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Fasilitas Tersedia</h3>
              <div className="flex flex-wrap gap-2">
                {place.facilities.map((fac, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{fac}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {place.tags && place.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Label Kategori</h3>
              <div className="flex flex-wrap gap-1.5">
                {place.tags.map((t, idx) => (
                  <span key={idx} className="px-2.5 py-0.5 rounded-full text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer CTA */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleAskAIAboutPlace}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs sm:text-sm hover:from-amber-400 hover:to-orange-500 transition-all shadow-md shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Masukkan Tempat Ini ke AI Trip Planner</span>
          </button>

          <a
            href={place.locationMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-700"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Petunjuk Arah</span>
          </a>
        </div>

      </div>
    </div>
  );
};
