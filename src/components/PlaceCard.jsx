import React from 'react';
import { Star, MapPin, Clock, Bookmark, ArrowUpRight, Tag, Navigation } from 'lucide-react';
import { getMapUrl, formatKm } from '../utils/geo.js';
import { useApp } from '../context/AppContext';

export const PlaceCard = ({ place, jarakKm = null }) => {
  const { bookmarks, toggleBookmark, setSelectedPlaceModal, categories } = useApp();
  const isBookmarked = bookmarks.includes(place.id);

  const categoryObj = categories.find(c => c.id === place.category);
  const categoryName = categoryObj ? categoryObj.name : place.category;

  return (
    <div className="group glass-card rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      
      {/* Top Image Section */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-white">
        <img
          src={place.image}
          alt={place.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?q=80&w=800&auto=format&fit=crop';
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

        {/* Category Pill */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 text-indigo-800 border border-indigo-100 backdrop-blur-md">
            {categoryName}
          </span>
          {place.featured && (
            <span className="px-2 py-1 rounded-full text-xs font-extrabold bg-slate-900 text-white">
              Populer Pekalongan
            </span>
          )}
        </div>

        {/* Bookmark Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(place.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border transition-all z-10 ${
            isBookmarked
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white/90 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-white'
          }`}
          title={isBookmarked ? 'Hapus dari Simpanan' : 'Simpan Tempat'}
        >
          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-white' : ''}`} />
        </button>

        {/* Rating Overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white text-indigo-800 border border-slate-300 text-xs font-bold backdrop-blur-md">
          {place.rating > 0 ? (
            <>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{place.rating}</span>
              <span className="text-xs text-slate-500 font-normal">({place.reviewsCount})</span>
            </>
          ) : (
            <>
              <Star className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600 font-medium">Belum ada rating</span>
            </>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 
            onClick={() => setSelectedPlaceModal(place)}
            className="text-base sm:text-lg font-bold text-slate-900 font-serif group-hover:text-indigo-900 transition-colors cursor-pointer line-clamp-1"
          >
            {place.name}
          </h3>

          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
            {place.description}
          </p>
        </div>

        {/* Details snippet */}
        <div className="space-y-2 pt-2 border-t border-slate-200 text-xs text-slate-500">
          <div className="flex items-center gap-2 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-800 shrink-0" />
            <span className="truncate">{place.address}</span>
          </div>
          {jarakKm != null && (
            <div className="flex items-center gap-2 text-indigo-800 font-semibold">
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              <span>{formatKm(jarakKm)} dari lokasi Anda (garis lurus)</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
              <Tag className="w-3.5 h-3.5" />
              <span>{place.priceRange}</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3 text-slate-500" />
              <span className="truncate max-w-[120px]">{place.openingHours.split('(')[0]}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-stretch gap-2">
          <button
            onClick={() => setSelectedPlaceModal(place)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 text-xs font-bold transition-all border border-slate-300 hover:border-slate-900 group/btn"
          >
            <span>Lihat Detail & Peta</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </button>
          <a
            href={getMapUrl(place)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Buka di Google Maps"
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 text-xs font-bold transition-all border border-slate-300 hover:border-slate-900"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Maps</span>
          </a>
        </div>

      </div>

    </div>
  );
};
