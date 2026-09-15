import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { uploadImageFile } from '../services/firebaseService';
import { 
  Lock, User, LogOut, Plus, Edit, Trash2, ShieldCheck, MapPin, Image as ImageIcon, Star, CheckCircle2, AlertCircle, X 
} from 'lucide-react';

export const AdminPage = () => {
  const { 
    adminUser, handleAdminLogin, handleAdminLogout, places, categories, handleCreatePlace, handleEditPlace, handleRemovePlace 
  } = useApp();

  // Login state
  const [email, setEmail] = useState('admin@pekalojalan.com');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'wisata',
    description: '',
    address: '',
    locationMapUrl: '',
    image: '',
    rating: 4.7,
    reviewsCount: 150,
    priceRange: 'Rp 15.000 - Rp 50.000',
    estimatedCost: 30000,
    openingHours: '08:00 - 17:00 WIB',
    facilitiesStr: 'Area Parkir, Musala, Wi-Fi, Toilet',
    tagsStr: 'Pekalongan, Rekomendasi, Populer',
    featured: false
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState('');

  // Submit Login
  const onLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await handleAdminLogin(email, password);
    } catch (err) {
      setLoginError(err.message || 'Login gagal.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingPlaceId(null);
    setFormData({
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
      featured: false
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (place) => {
    setEditingPlaceId(place.id);
    setFormData({
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
      featured: Boolean(place.featured)
    });
    setIsModalOpen(true);
  };

  // Handle Image File Selection
  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadImageFile(file);
      setFormData(prev => ({ ...prev, image: url }));
    } catch (err) {
      alert("Gagal mengunggah gambar");
    } finally {
      setUploadingImage(false);
    }
  };

  // Submit Save Place Form
  const handleSavePlaceSubmit = async (e) => {
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
      facilities: formData.facilitiesStr.split(',').map(s => s.trim()).filter(Boolean),
      tags: formData.tagsStr.split(',').map(s => s.trim()).filter(Boolean),
      featured: formData.featured
    };

    if (editingPlaceId) {
      await handleEditPlace(editingPlaceId, payload);
    } else {
      await handleCreatePlace(payload);
    }

    setIsModalOpen(false);
  };

  // Handle Delete
  const handleDelete = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data tempat "${name}"?`)) {
      await handleRemovePlace(id);
    }
  };

  // --- RENDER LOGIN VIEW ---
  if (!adminUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-6 h-6 text-slate-950" />
            </div>
            <h1 className="text-2xl font-bold font-serif text-white">Login Admin PekaloJalan</h1>
            <p className="text-xs text-slate-400">Masuk untuk mengelola data tempat dan direktori wisata Kota Pekalongan.</p>
          </div>

          {/* Demo Hint Box */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Akses Kredensial Demo Pengujian:</span>
            </div>
            <p><strong>Email:</strong> admin@pekalojalan.com</p>
            <p><strong>Password:</strong> admin123</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={onLoginSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Email Admin</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-sm hover:from-amber-400 hover:to-orange-500 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {loginLoading ? 'Memverifikasi...' : 'Login Pengelola'}
            </button>
          </form>

        </div>
      </div>
    );
  }

  // --- RENDER ADMIN DASHBOARD VIEW ---
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Sesi Admin Aktif
            </span>
            <span className="text-xs text-slate-400">| {adminUser.email}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white">
            Panel Pengelolaan Data PekaloJalan
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-orange-500 transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tempat Baru</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <p className="text-xs text-slate-400">Total Tempat</p>
          <p className="text-2xl font-bold text-white font-serif">{places.length}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <p className="text-xs text-slate-400">Kategori Terdaftar</p>
          <p className="text-2xl font-bold text-amber-400 font-serif">{categories.length}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <p className="text-xs text-slate-400">Destinasi Populer</p>
          <p className="text-2xl font-bold text-orange-400 font-serif">{places.filter(p => p.featured).length}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <p className="text-xs text-slate-400">Mode Penyimpanan</p>
          <p className="text-xs font-bold text-emerald-400 mt-2">Firebase & Local Sync</p>
        </div>
      </div>

      {/* Places Data Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold font-serif text-white">Daftar Tempat Wisata & Kuliner</h2>
          <span className="text-xs text-slate-400">Total: {places.length} Data</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Gambar</th>
                <th className="py-3 px-4">Nama & Lokasi</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Harga Est.</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4 text-right">Aksi Kelola</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {places.map((place) => {
                const categoryObj = categories.find(c => c.id === place.category);
                return (
                  <tr key={place.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4">
                      <img
                        src={place.image}
                        alt={place.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-800"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-white text-sm">{place.name}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs">{place.address}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {categoryObj ? categoryObj.name : place.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-medium">
                      {place.priceRange}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-bold text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{place.rating}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(place)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-slate-700 transition-all"
                          title="Edit Tempat"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(place.id, place.name)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-red-500 hover:text-white text-slate-300 border border-slate-700 transition-all"
                          title="Hapus Tempat"
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

      {/* ADD / EDIT MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold font-serif text-white">
                {editingPlaceId ? 'Ubah Data Tempat' : 'Tambah Tempat Wisata / Kuliner Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlaceSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Nama Tempat *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="mis. Museum Batik Pekalongan"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Kategori (1 dari 8) *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Deskripsi Lengkap *</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Jelaskan daya tarik, keunikan, dan sejarah tempat ini..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Alamat Lengkap</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Jl. Jetayu No.1, Pekalongan Utara"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">URL Google Maps</label>
                  <input
                    type="url"
                    value={formData.locationMapUrl}
                    onChange={(e) => setFormData({ ...formData, locationMapUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Image Input Section */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>URL Gambar / Unggah File</span>
                  {uploadingImage && <span className="text-amber-400 text-[10px]">Mengunggah...</span>}
                </label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                  <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer font-semibold flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>File</span>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                  </label>
                </div>

                {formData.image && (
                  <img src={formData.image} alt="Preview" className="h-20 w-full object-cover rounded-xl mt-2 border border-slate-800" />
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Teks Kisaran Harga</label>
                  <input
                    type="text"
                    value={formData.priceRange}
                    onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
                    placeholder="Rp 15.000 / orang"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Estimasi Biaya (Angka)</label>
                  <input
                    type="number"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-semibold text-slate-300">Jam Buka</label>
                  <input
                    type="text"
                    value={formData.openingHours}
                    onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                    placeholder="08:00 - 17:00 WIB"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Fasilitas (Dipisah Koma)</label>
                  <input
                    type="text"
                    value={formData.facilitiesStr}
                    onChange={(e) => setFormData({ ...formData, facilitiesStr: e.target.value })}
                    placeholder="Parkir, Musala, Wi-Fi"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Label/Tags (Dipisah Koma)</label>
                  <input
                    type="text"
                    value={formData.tagsStr}
                    onChange={(e) => setFormData({ ...formData, tagsStr: e.target.value })}
                    placeholder="Batik, Edukasi, Populer"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 rounded accent-amber-500"
                />
                <label htmlFor="featured" className="font-semibold text-amber-300 cursor-pointer">
                  Tampilkan sebagai Destinasi Populer di Beranda
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold hover:from-amber-400 hover:to-orange-500 shadow-md shadow-amber-500/20"
                >
                  Simpan Tempat
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
