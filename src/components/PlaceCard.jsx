import React from 'react';
import { Star, MapPin, Clock, Bookmark, ArrowUpRight, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PlaceCard = ({ place }) => {
  const { bookmarks, toggleBookmark, setSelectedPlaceModal, categories } = useApp();
  const isBookmarked = bookmarks.includes(place.id);

  const categoryObj = categories.find(c => c.id === place.category);
  const categoryName = categoryObj ? categoryObj.name : place.category;

  return (
    <div className="group glass-card rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10">
      
      {/* Top Image Section */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-900">
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
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Category Pill */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-950/80 text-amber-300 border border-amber-500/30 backdrop-blur-md">
            {categoryName}
          </span>
          {place.featured && (
            <span className="px-2 py-1 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950">
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
              ? 'bg-amber-500 text-slate-950 border-amber-400'
              : 'bg-slate-950/60 text-slate-300 border-slate-700/60 hover:text-white hover:bg-slate-900'
          }`}
          title={isBookmarked ? 'Hapus dari Simpanan' : 'Simpan Tempat'}
        >
          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-slate-950' : ''}`} />
        </button>

        {/* Rating Overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-900/90 text-amber-400 border border-slate-700 text-xs font-bold backdrop-blur-md">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{place.rating}</span>
          <span className="text-[10px] text-slate-400 font-normal">({place.reviewsCount})</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 
            onClick={() => setSelectedPlaceModal(place)}
            className="text-base sm:text-lg font-bold text-white font-serif group-hover:text-amber-300 transition-colors cursor-pointer line-clamp-1"
          >
            {place.name}
          </h3>

          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {place.description}
          </p>
        </div>

        {/* Details snippet */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center gap-2 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{place.address}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
              <Tag className="w-3.5 h-3.5" />
              <span>{place.priceRange}</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[120px]">{place.openingHours.split('(')[0]}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={() => setSelectedPlaceModal(place)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold transition-all border border-slate-700 hover:border-amber-400 group/btn"
          >
            <span>Lihat Detail & Peta</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </button>
        </div>

      </div>

    </div>
  );
};
