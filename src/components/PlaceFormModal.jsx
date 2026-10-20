import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadImageFile, explainFirebaseError } from '../services/firebaseService';
import { generatePlaceDescription } from '../services/geminiService';

const DEFAULT_FORM = {
  name: '',
  category: 'wisata',
  description: '',
  address: 'Kota Pekalongan, Jawa Tengah',
  locationMapUrl: 'https://maps.google.com/?q=Kota+Pekalongan',
  image: 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?q=80&w=800&auto=format&fit=crop',
  rating: 4.8,
  reviewsCount: 120,
  priceRange: 'Rp 15.000 - Rp 45.000',
  estimatedCost: 25000,
  openingHours: '08:00 - 21:00 WIB',
  facilitiesStr: 'Area Parkir, Musala, Toilet, Wi-Fi',
  tagsStr: 'Kota Batik, Populer',
  featured: false,
  managerEmail: ''
};

const fromPlace = (place) => ({
  name: place.name,
  category: place.category,
  description: place.description,
  address: place.address,
  locationMapUrl: place.locationMapUrl || '',
  image: place.image,
  rating: place.rating,
  reviewsCount: place.reviewsCount,
  priceRange: place.priceRange,
  estimatedCost: place.estimatedCost || 25000,
  openingHours: place.openingHours,
  facilitiesStr: place.facilities ? place.facilities.join(', ') : '',
  tagsStr: place.tags ? place.tags.join(', ') : '',
  featured: Boolean(place.featured),
  managerEmail: place.managerEmail || ''
});

const inputClass = 'w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 transition-colors';

/**
 * Formulir tambah / ubah tempat, dipakai bersama oleh Admin dan Pengelola Wisata.
 * allowFeatured    : true hanya untuk admin (menandai Destinasi Populer)
 * showManagerField : true hanya untuk admin (menentukan pengelola tempat)
 */
export const PlaceFormModal = ({
  open, place, categories, onClose, onSubmit, allowFeatured = false, showManagerField = false
}) => {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }

  useEffect(() => {
    if (!open) return;
    setFormData(place ? fromPlace(place) : DEFAULT_FORM);
    setFormError('');
    setStatus(null);
  }, [open, place]);

  if (!open) return null;

  const setField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleAutoDescription = async () => {
    if (!formData.name.trim()) {
      setStatus({ type: 'error', message: 'Ketik nama tempat terlebih dahulu untuk membuat deskripsi AI.' });
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const desc = await generatePlaceDescription(formData.name, formData.category, formData.address);
      setField('description', desc);
      setStatus({ type: 'success', message: 'Deskripsi naratif khas Pekalongan berhasil dibuat oleh AI.' });
    } catch (err) {
      console.warn('AI error:', err);
      setStatus({ type: 'error', message: 'Deskripsi AI gagal dibuat. Tulis deskripsi secara manual.' });
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleImageFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadImageFile(file);
      setField('image', url);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Gagal mengunggah gambar.' });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) {
      setFormError('Nama dan deskripsi tempat wajib diisi.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      description: formData.description.trim(),
      address: formData.address.trim(),
      locationMapUrl: formData.locationMapUrl.trim() || `https://maps.google.com/?q=${encodeURIComponent(formData.name)}`,
      image: formData.image.trim(),
      rating: Number(formData.rating),
      reviewsCount: Number(formData.reviewsCount),
      priceRange: formData.priceRange.trim(),
      estimatedCost: Number(formData.estimatedCost),
      openingHours: formData.openingHours.trim(),
      facilities: formData.facilitiesStr.split(',').map((s) => s.trim()).filter(Boolean),
      tags: formData.tagsStr.split(',').map((s) => s.trim()).filter(Boolean)
    };
    // Kolom khusus admin hanya dikirim bila diizinkan, agar pengelola tidak mengubahnya
    if (allowFeatured) payload.featured = formData.featured;
    if (showManagerField) payload.managerEmail = formData.managerEmail.trim().toLowerCase();

    setSaving(true);
    setFormError('');
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setFormError(explainFirebaseError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold font-serif text-white">
            {place ? 'Ubah Data Tempat' : 'Tambah Tempat Wisata / Kuliner Baru'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {status && (
            <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
              status.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {status.type === 'success'
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <span>{status.message}</span>
              </div>
              <button type="button" onClick={() => setStatus(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white shrink-0" aria-label="Tutup pesan">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {formError && (
            <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Nama Tempat *</label>
              <input type="text" value={formData.name} onChange={(e) => setField('name', e.target.value)}
                placeholder="mis. Museum Batik Pekalongan" className={inputClass} required />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Kategori *</label>
              <select value={formData.category} onChange={(e) => setField('category', e.target.value)}
                className={`${inputClass} cursor-pointer`}>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300">Deskripsi Lengkap *</label>
              <button type="button" onClick={handleAutoDescription} disabled={isGeneratingDesc}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                title="Buat narasi budaya lokal Pekalongan dengan AI">
                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingDesc ? 'animate-spin' : ''}`} />
                <span>{isGeneratingDesc ? 'Menulis narasi...' : 'Auto Deskripsi AI'}</span>
              </button>
            </div>
            <textarea rows={3} value={formData.description} onChange={(e) => setField('description', e.target.value)}
              placeholder="Jelaskan daya tarik, keunikan, dan sejarah tempat ini..." className={inputClass} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Alamat Lengkap</label>
              <input type="text" value={formData.address} onChange={(e) => setField('address', e.target.value)}
                placeholder="Jl. Jetayu No.1, Pekalongan Utara" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">URL Google Maps</label>
              <input type="url" value={formData.locationMapUrl} onChange={(e) => setField('locationMapUrl', e.target.value)}
                placeholder="https://maps.google.com/..." className={inputClass} />
            </div>
          </div>

          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <label className="font-semibold text-slate-300 flex items-center justify-between">
              <span>URL Gambar / Unggah File</span>
              {uploadingImage && <span className="text-amber-400 text-xs">Mengunggah...</span>}
            </label>
            <div className="flex gap-2">
              <input type="text" value={formData.image} onChange={(e) => setField('image', e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-500" />
              <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer font-semibold flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>File</span>
                <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
              </label>
            </div>
            {formData.image && (
              <img src={formData.image} alt="Pratinjau" className="h-20 w-full object-cover rounded-xl mt-2 border border-slate-800" />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Teks Kisaran Harga</label>
              <input type="text" value={formData.priceRange} onChange={(e) => setField('priceRange', e.target.value)}
                placeholder="Rp 15.000 / orang" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Estimasi Biaya (Angka)</label>
              <input type="number" min="0" value={formData.estimatedCost} onChange={(e) => setField('estimatedCost', e.target.value)}
                className={inputClass} />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="font-semibold text-slate-300">Jam Buka</label>
              <input type="text" value={formData.openingHours} onChange={(e) => setField('openingHours', e.target.value)}
                placeholder="08:00 - 17:00 WIB" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Fasilitas (Dipisah Koma)</label>
              <input type="text" value={formData.facilitiesStr} onChange={(e) => setField('facilitiesStr', e.target.value)}
                placeholder="Parkir, Musala, Wi-Fi" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Label/Tags (Dipisah Koma)</label>
              <input type="text" value={formData.tagsStr} onChange={(e) => setField('tagsStr', e.target.value)}
                placeholder="Batik, Edukasi, Populer" className={inputClass} />
            </div>
          </div>

          {showManagerField && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Email Pengelola Tempat (opsional)</label>
              <input type="email" value={formData.managerEmail} onChange={(e) => setField('managerEmail', e.target.value)}
                placeholder="pengelola@gmail.com" className={inputClass} />
              <p className="text-[11px] text-slate-500">Hanya pengelola dengan email ini yang bisa mengubah tempat. Email harus sudah didaftarkan sebagai pengelola.</p>
            </div>
          )}

          {allowFeatured && (
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="featured" checked={formData.featured}
                onChange={(e) => setField('featured', e.target.checked)} className="w-4 h-4 rounded accent-amber-500" />
              <label htmlFor="featured" className="font-semibold text-amber-300 cursor-pointer">
                Tampilkan sebagai Destinasi Populer di Beranda
              </label>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold">
              Batal
            </button>
            <button type="submit" disabled={saving || uploadingImage}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold hover:from-amber-400 hover:to-orange-500 shadow-md shadow-amber-500/20 disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan Tempat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
