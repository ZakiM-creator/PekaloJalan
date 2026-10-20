import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Peringatan bila data tempat gagal dimuat dari database, lengkap dengan tombol coba lagi.
export const PlacesNotice = () => {
  const { placesNotice, dataReady, reloadPlaces, loading } = useApp();

  if (!placesNotice) return null;

  return (
    <div
      role="alert"
      className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800 flex items-start gap-2"
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="flex-1">{placesNotice}</span>
      {!dataReady && (
        <button
          type="button"
          onClick={reloadPlaces}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-slate-900 hover:text-white text-indigo-800 font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Memuat...' : 'Coba lagi'}</span>
        </button>
      )}
    </div>
  );
};
