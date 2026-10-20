import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CategoryChips } from '../components/CategoryChips';
import { PlaceCard } from '../components/PlaceCard';
import { Search, LayoutGrid, ListFilter, SlidersHorizontal, Compass, X, MapPin, Navigation } from 'lucide-react';
import { getKecamatan, getKelurahan, getCoords, haversineKm } from '../utils/geo.js';

export const DirectoryPage = () => {
  const { filteredPlaces, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, categories } = useApp();
  const [sortBy, setSortBy] = useState('rating'); // 'rating' | 'name' | 'price-asc' | 'price-desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [kecamatan, setKecamatan] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [posisi, setPosisi] = useState(null); // { lat, lng } posisi pengguna
  const [statusPosisi, setStatusPosisi] = useState(''); // '' | 'mencari' | 'ditolak' | 'tidak-didukung'

  // Daftar kecamatan dan kelurahan diambil dari data yang ada
  const daftarKecamatan = [...new Set(filteredPlaces.map(getKecamatan).filter(Boolean))].sort();
  const daftarKelurahan = [...new Set(
    filteredPlaces.filter((p) => !kecamatan || getKecamatan(p) === kecamatan).map(getKelurahan).filter(Boolean)
  )].sort();

  const tempatTerfilter = filteredPlaces.filter((p) =>
    (!kecamatan || getKecamatan(p) === kecamatan) && (!kelurahan || getKelurahan(p) === kelurahan)
  );

  const jarakKe = (p) => {
    const c = getCoords(p);
    return posisi && c ? haversineKm(posisi, c) : null;
  };

  const mintaPosisi = () => {
    if (!navigator.geolocation) { setStatusPosisi('tidak-didukung'); return; }
    setStatusPosisi('mencari');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPosisi({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStatusPosisi(''); },
      () => { setStatusPosisi('ditolak'); setSortBy('rating'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const gantiUrutan = (nilai) => {
    setSortBy(nilai);
    if (nilai === 'nearest' && !posisi) mintaPosisi();
  };

  // Sort logic
  // Harga 0 dengan hargaTersedia === false berarti "belum diketahui", bukan gratis.
  // Pada urutan harga, tempat tanpa harga selalu diletakkan paling bawah.
  const hargaTidakDiketahui = (p) => p.hargaTersedia === false;
  const byName = (a, b) => a.name.localeCompare(b.name);

  const sortedPlaces = [...tempatTerfilter].sort((a, b) => {
    if (sortBy === 'nearest') {
      const ja = jarakKe(a);
      const jb = jarakKe(b);
      if (ja == null && jb == null) return byName(a, b);
      if (ja == null) return 1; // tanpa koordinat selalu di bawah
      if (jb == null) return -1;
      return (ja - jb) || byName(a, b);
    }
    if (sortBy === 'name') return byName(a, b);
    if (sortBy === 'rating') return ((b.rating || 0) - (a.rating || 0)) || byName(a, b);
    if (sortBy === 'price-asc' || sortBy === 'price-desc') {
      const unknownA = hargaTidakDiketahui(a);
      const unknownB = hargaTidakDiketahui(b);
      if (unknownA !== unknownB) return unknownA ? 1 : -1;
      const diff = (a.estimatedCost || 0) - (b.estimatedCost || 0);
      return (sortBy === 'price-asc' ? diff : -diff) || byName(a, b);
    }
    return 0;
  });

  const activeCategoryObj = categories.find(c => c.id === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Info */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-semibold border border-indigo-100">
          <Compass className="w-3.5 h-3.5 text-indigo-800" />
          <span>Eksplorasi Kota Batik Pekalongan</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-slate-900">
          {selectedCategory === 'all' 
            ? 'Direktori Semua Tempat Wisata & Kuliner' 
            : `Kategori: ${activeCategoryObj?.name || selectedCategory}`}
        </h1>

        <p className="text-slate-500 text-xs sm:text-sm max-w-2xl">
          Temukan tempat wisata budaya, kuliner megono, cafe kekinian, hingga toko batik terkurasi di Kota Pekalongan.
        </p>
      </div>

      {/* Controls & Filter Bar */}
      <div className="space-y-4 glass-panel p-4 sm:p-5 rounded-2xl border border-slate-200">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-indigo-800 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama tempat, lokasi, fasilitas, atau kata kunci..."
            className="w-full pl-12 pr-10 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-900"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 8 Categories Chips */}
        <CategoryChips />

        {/* Filter Kecamatan & Kelurahan */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <MapPin className="w-3.5 h-3.5 text-indigo-800" />
            <span className="text-slate-500">Kecamatan:</span>
            <select
              value={kecamatan}
              onChange={(e) => { setKecamatan(e.target.value); setKelurahan(''); }}
              className="bg-transparent text-indigo-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-white text-slate-900">Semua</option>
              {daftarKecamatan.map((k) => (
                <option key={k} value={k} className="bg-white text-slate-900">{k}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <MapPin className="w-3.5 h-3.5 text-indigo-800" />
            <span className="text-slate-500">Kelurahan:</span>
            <select
              value={kelurahan}
              onChange={(e) => setKelurahan(e.target.value)}
              className="bg-transparent text-indigo-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-white text-slate-900">Semua</option>
              {daftarKelurahan.map((k) => (
                <option key={k} value={k} className="bg-white text-slate-900">{k}</option>
              ))}
            </select>
          </div>
          {(kecamatan || kelurahan) && (
            <button
              onClick={() => { setKecamatan(''); setKelurahan(''); }}
              className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 border border-slate-200"
            >
              Hapus filter wilayah
            </button>
          )}
          {sortBy === 'nearest' && statusPosisi === 'mencari' && (
            <span className="flex items-center gap-1.5 text-slate-500"><Navigation className="w-3.5 h-3.5 text-indigo-800" />Mencari lokasi Anda...</span>
          )}
          {statusPosisi === 'ditolak' && (
            <span className="text-red-600">Lokasi tidak bisa diakses. Izinkan akses lokasi di browser lalu pilih lagi.</span>
          )}
          {statusPosisi === 'tidak-didukung' && (
            <span className="text-red-600">Browser ini tidak mendukung lokasi.</span>
          )}
        </div>

        {/* Sort & View Mode Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs">
          
          <div className="text-slate-500">
            Menampilkan <span className="font-bold text-indigo-800">{sortedPlaces.length}</span> tempat terkurasi
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Selector */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-800" />
              <span className="text-slate-500">Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => gantiUrutan(e.target.value)}
                className="bg-transparent text-indigo-800 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="rating" className="bg-white text-slate-900">Rating Tertinggi</option>
                <option value="name" className="bg-white text-slate-900">Nama (A-Z)</option>
                <option value="price-asc" className="bg-white text-slate-900">Biaya Terendah</option>
                <option value="price-desc" className="bg-white text-slate-900">Biaya Tertinggi</option>
                <option value="nearest" className="bg-white text-slate-900">Terdekat dari Saya</option>
              </select>
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-slate-900 text-white font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-slate-900 text-white font-bold' : 'text-slate-500 hover:text-slate-900'
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
            <PlaceCard key={place.id} place={place} jarakKm={sortBy === 'nearest' ? jarakKe(place) : null} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 glass-panel rounded-3xl border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-800 flex items-center justify-center mx-auto text-2xl font-serif">
            🔍
          </div>
          <h3 className="text-xl font-bold font-serif text-slate-900">Tempat Tidak Ditemukan</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Maaf, kami tidak menemukan tempat yang sesuai dengan pencarian "{searchQuery}". Coba kata kunci lain atau pilih kategori berbeda.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setKecamatan('');
              setKelurahan('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-all"
          >
            Reset Semua Filter
          </button>
        </div>
      )}

    </div>
  );
};
