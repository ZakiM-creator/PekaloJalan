import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PlaceFormModal } from '../components/PlaceFormModal';
import { PlacesNotice } from '../components/PlacesNotice';
import { Plus, Edit, Star, MapPin } from 'lucide-react';

export const ManagerPage = () => {
  const { user, myPlaces, categories, dataReady, handleCreatePlace, handleEditPlace } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);

  const openCreate = () => {
    setEditingPlace(null);
    setIsModalOpen(true);
  };

  const openEdit = (place) => {
    setEditingPlace(place);
    setIsModalOpen(true);
  };

  const submitPlace = async (payload) => {
    if (editingPlace) {
      await handleEditPlace(editingPlace.id, payload);
    } else {
      await handleCreatePlace(payload);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Pengelola Wisata
            </span>
            <span className="text-xs text-slate-400">| {user.email}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white">Kelola Tempat Saya</h1>
          <p className="text-xs text-slate-400">
            Anda dapat menambah tempat baru dan mengubah tempat milik Anda. Penghapusan tempat dilakukan oleh admin.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={!dataReady}
          title={dataReady ? undefined : 'Database belum siap. Perbaiki koneksi lalu klik Coba lagi.'}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-orange-500 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Tempat</span>
        </button>
      </div>

      <PlacesNotice />

      {myPlaces.length === 0 ? (
        <div className="glass-panel rounded-3xl border border-slate-800 p-10 text-center space-y-2">
          <MapPin className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm font-semibold text-white">Belum ada tempat atas nama Anda</p>
          <p className="text-xs text-slate-400">
            Klik "Tambah Tempat" untuk membuat tempat baru, atau minta admin menghubungkan tempat yang sudah ada ke email Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {myPlaces.map((place) => {
            const categoryObj = categories.find((c) => c.id === place.category);
            return (
              <div key={place.id} className="glass-card rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
                <img src={place.image} alt={place.name} className="h-36 w-full object-cover" />
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-white text-sm">{place.name}</h2>
                    <div className="flex items-center gap-1 font-bold text-amber-400 text-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{place.rating}</span>
                    </div>
                  </div>
                  <span className="self-start px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    {categoryObj ? categoryObj.name : place.category}
                  </span>
                  <p className="text-xs text-slate-400 line-clamp-2">{place.address}</p>
                  <div className="mt-auto pt-2">
                    <button
                      onClick={() => openEdit(place)}
                      disabled={!dataReady}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold border border-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Ubah Data</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PlaceFormModal
        open={isModalOpen}
        place={editingPlace}
        categories={categories}
        onClose={() => setIsModalOpen(false)}
        onSubmit={submitPlace}
      />
    </div>
  );
};
