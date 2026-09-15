import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CategoryChips } from '../components/CategoryChips';
import { PlaceCard } from '../components/PlaceCard';
import { Search, LayoutGrid, ListFilter, SlidersHorizontal, Compass, X } from 'lucide-react';

export const DirectoryPage = () => {
  const { filteredPlaces, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, categories } = useApp();
  const [sortBy, setSortBy] = useState('rating'); // 'rating' | 'name' | 'price-asc' | 'price-desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Sort logic
  const sortedPlaces = [...filteredPlaces].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'price-asc') return (a.estimatedCost || 0) - (b.estimatedCost || 0);
    if (sortBy === 'price-desc') return (b.estimatedCost || 0) - (a.estimatedCost || 0);
    return 0;
  });

  const activeCategoryObj = categories.find(c => c.id === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Info */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>Eksplorasi Kota Batik Pekalongan</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-white">
          {selectedCategory === 'all' 
            ? 'Direktori Semua Tempat Wisata & Kuliner' 
            : `Kategori: ${activeCategoryObj?.name || selectedCategory}`}
        </h1>

        <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
          Temukan tempat wisata budaya, kuliner megono, cafe kekinian, hingga toko batik terkurasi di Kota Pekalongan.
        </p>
      </div>

      {/* Controls & Filter Bar */}
      <div className="space-y-4 glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-amber-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama tempat, lokasi, fasilitas, atau kata kunci..."
            className="w-full pl-12 pr-10 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 8 Categories Chips */}
        <CategoryChips />

        {/* Sort & View Mode Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
          
          <div className="text-slate-400">
            Menampilkan <span className="font-bold text-amber-400">{sortedPlaces.length}</span> tempat terkurasi
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Selector */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-amber-300 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="rating" className="bg-slate-900 text-white">Rating Tertinggi</option>
                <option value="name" className="bg-slate-900 text-white">Nama (A-Z)</option>
                <option value="price-asc" className="bg-slate-900 text-white">Biaya Terendah</option>
                <option value="price-desc" className="bg-slate-900 text-white">Biaya Tertinggi</option>
              </select>
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Daftar"
              >
                <ListFilter className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Places Display Container */}
      {sortedPlaces.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {sortedPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 glass-panel rounded-3xl border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto text-2xl font-serif">
            🔍
          </div>
          <h3 className="text-xl font-bold font-serif text-white">Tempat Tidak Ditemukan</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Maaf, kami tidak menemukan tempat yang sesuai dengan pencarian "{searchQuery}". Coba kata kunci lain atau pilih kategori berbeda.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all"
          >
            Reset Semua Filter
          </button>
        </div>
      )}

    </div>
  );
};
