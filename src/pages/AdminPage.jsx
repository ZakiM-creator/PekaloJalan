import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { PlaceFormModal } from '../components/PlaceFormModal';
import { PlacesNotice } from '../components/PlacesNotice';
import { listManagers, addManager, removeManager, explainFirebaseError } from '../services/firebaseService';
import { Plus, Edit, Trash2, Star, AlertCircle, UserPlus, X } from 'lucide-react';

export const AdminPage = () => {
  const {
    user, places, categories, dataReady, handleCreatePlace, handleEditPlace, handleRemovePlace
  } = useApp();

  // Formulir tempat
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [actionError, setActionError] = useState('');

  // Pengelola wisata
  const [managers, setManagers] = useState([]);
  const [managersError, setManagersError] = useState('');
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [managerBusy, setManagerBusy] = useState(false);

  const refreshManagers = useCallback(async () => {
    try {
      setManagers(await listManagers());
      setManagersError('');
    } catch (err) {
      setManagersError(explainFirebaseError(err));
    }
  }, []);

  useEffect(() => {
    refreshManagers();
  }, [refreshManagers]);

  const openCreate = () => {
    setEditingPlace(null);
    setIsModalOpen(true);
  };

  const openEdit = (place) => {
    setEditingPlace(place);
    setIsModalOpen(true);
  };

  const submitPlace = async (payload) => {
    setActionError('');
    if (editingPlace) {
      await handleEditPlace(editingPlace.id, payload);
    } else {
      await handleCreatePlace(payload);
    }
  };

  const onDelete = async (place) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data tempat "${place.name}"?`)) return;
    setActionError('');
    try {
      await handleRemovePlace(place.id);
    } catch (err) {
      setActionError(explainFirebaseError(err));
    }
  };

  const onAddManager = async (e) => {
    e.preventDefault();
    setManagerBusy(true);
    setManagersError('');
    try {
      await addManager(newManagerEmail, user.email);
      setNewManagerEmail('');
      await refreshManagers();
    } catch (err) {
      setManagersError(explainFirebaseError(err));
    } finally {
      setManagerBusy(false);
    }
  };

  const onRemoveManager = async (email) => {
    if (!window.confirm(`Cabut akses pengelola untuk ${email}?`)) return;
    setManagerBusy(true);
    setManagersError('');
    try {
      await removeManager(email);
      await refreshManagers();
    } catch (err) {
      setManagersError(explainFirebaseError(err));
    } finally {
      setManagerBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 sm:p-6 rounded-3xl border border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Sesi Admin Aktif
            </span>
            <span className="text-xs text-slate-500">| {user.email}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">Panel Pengelolaan Data PekaloJalan</h1>
        </div>
        <button
          onClick={openCreate}
          disabled={!dataReady}
          title={dataReady ? undefined : 'Database belum siap. Perbaiki koneksi lalu klik Coba lagi.'}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Tempat Baru</span>
        </button>
      </div>

      <PlacesNotice />

      {actionError && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-200">
          <p className="text-xs text-slate-500">Total Tempat</p>
          <p className="text-2xl font-bold text-slate-900 font-serif">{places.length}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-200">
          <p className="text-xs text-slate-500">Kategori Terdaftar</p>
          <p className="text-2xl font-bold text-indigo-800 font-serif">{categories.length}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-200">
          <p className="text-xs text-slate-500">Destinasi Populer</p>
          <p className="text-2xl font-bold text-indigo-800 font-serif">{places.filter((p) => p.featured).length}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-200">
          <p className="text-xs text-slate-500">Pengelola Wisata</p>
          <p className="text-2xl font-bold text-emerald-700 font-serif">{managers.length}</p>
        </div>
      </div>

      {/* Kelola pengelola */}
      <div className="glass-panel rounded-3xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold font-serif text-slate-900">Pengelola Wisata</h2>
          <p className="text-xs text-slate-500">
            Daftarkan email Google pengelola. Setelah login, pengelola hanya bisa menambah dan mengubah tempat miliknya.
          </p>
        </div>

        <form onSubmit={onAddManager} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={newManagerEmail}
            onChange={(e) => setNewManagerEmail(e.target.value)}
            placeholder="email-pengelola@gmail.com"
            required
            className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400"
          />
          <button
            type="submit"
            disabled={managerBusy}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 text-xs font-bold border border-slate-300 transition-all disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>Daftarkan Pengelola</span>
          </button>
        </form>

        {managersError && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
            {managersError}
          </div>
        )}

        {managers.length === 0 ? (
          <p className="text-xs text-slate-500">Belum ada pengelola terdaftar.</p>
        ) : (
          <ul className="divide-y divide-slate-200 text-xs">
            {managers.map((m) => (
              <li key={m.email} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-slate-700 font-semibold">{m.email}</p>
                  <p className="text-slate-500">
                    {places.filter((p) => (p.managerEmail || '').toLowerCase() === m.email).length} tempat
                  </p>
                </div>
                <button
                  onClick={() => onRemoveManager(m.email)}
                  disabled={managerBusy}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-red-600 hover:text-white text-slate-600 border border-slate-300 transition-all disabled:opacity-50"
                  title="Cabut akses pengelola"
                  aria-label={`Cabut akses ${m.email}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tabel tempat */}
      <div className="glass-panel rounded-3xl border border-slate-200 overflow-hidden shadow-lg">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold font-serif text-slate-900">Daftar Tempat Wisata & Kuliner</h2>
          <span className="text-xs text-slate-500">Total: {places.length} Data</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Gambar</th>
                <th className="py-3 px-4">Nama & Lokasi</th>
                <th className="py-3 px-4 whitespace-nowrap">Kategori</th>
                <th className="py-3 px-4">Pengelola</th>
                <th className="py-3 px-4">Harga Est.</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4 text-right">Aksi Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {places.map((place) => {
                const categoryObj = categories.find((c) => c.id === place.category);
                return (
                  <tr key={place.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <img src={place.image} alt={place.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 text-sm">{place.name}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs">{place.address}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-100">
                        {categoryObj ? categoryObj.name : place.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{place.managerEmail || 'Belum ada'}</td>
                    <td className="py-3 px-4 text-emerald-700 font-medium">{place.priceRange}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-bold text-indigo-800">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{place.rating}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(place)}
                          disabled={!dataReady}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-600 border border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Edit Tempat"
                          aria-label={`Edit ${place.name}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(place)}
                          disabled={!dataReady}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-red-600 hover:text-white text-slate-600 border border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Hapus Tempat"
                          aria-label={`Hapus ${place.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PlaceFormModal
        open={isModalOpen}
        place={editingPlace}
        categories={categories}
        onClose={() => setIsModalOpen(false)}
        onSubmit={submitPlace}
        allowFeatured
        showManagerField
      />
    </div>
  );
};
