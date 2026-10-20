import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { CATEGORIES } from '../data/mockPlaces';
import {
  fetchPlaces, addPlace, updatePlace, deletePlace, seedInitialPlaces,
  loginWithGoogle, logout, subscribeAuth, resolveRole, explainFirebaseError
} from '../services/firebaseService';
import { ROLES, canAccessTab, isAdminEmail, normalizeEmail } from '../config/roles';

const AppContext = createContext();

const LEGACY_BOOKMARK_KEY = 'pekalojalan_bookmarks';
const DEFAULT_BOOKMARKS = ['place-1', 'place-17'];
const bookmarkKey = (uid) => `pekalojalan_bookmarks_${uid}`;
const roleCacheKey = (uid) => `pekalojalan_role_${uid}`;

const readBookmarks = (uid) => {
  try {
    const raw = localStorage.getItem(bookmarkKey(uid)) ?? localStorage.getItem(LEGACY_BOOKMARK_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_BOOKMARKS;
  } catch {
    return DEFAULT_BOOKMARKS;
  }
};

// Peran disimpan sementara di browser agar login berikutnya langsung tampil.
// Hanya untuk kecepatan tampilan. Hak akses sebenarnya tetap dijaga server (firestore.rules)
// dan peran selalu diperiksa ulang di latar belakang.
const readCachedRole = (uid) => {
  try {
    const value = localStorage.getItem(roleCacheKey(uid));
    return value === ROLES.MANAGER || value === ROLES.USER ? value : null;
  } catch {
    return null;
  }
};

const writeCachedRole = (uid, role) => {
  try {
    localStorage.setItem(roleCacheKey(uid), role);
  } catch {
    // penyimpanan dinonaktifkan: tidak masalah, hanya tanpa percepatan
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const elapsed = (since) => Math.round(performance.now() - since);

const createWelcomeMessage = () => ({
  id: 'welcome-1',
  role: 'model',
  text: 'Sugeng Rawuh & Selamat Datang di PekaloJalan AI Trip Planner! 🧳✨\n\nSaya adalah asisten AI pribadi Anda untuk menjelajahi keindahan Kota Pekalongan. Beritahu saya preferensi perjalanan Anda (contoh: *"Saya mau jalan-jalan 1 hari budget 150rb, suka kuliner dan museum batik"*), dan saya akan buatkan rencana perjalanan otomatis!',
  itinerary: null,
  timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
});

export const AppProvider = ({ children }) => {
  // Autentikasi
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin' | 'manager' | 'user' | null (belum login)
  const [authLoading, setAuthLoading] = useState(true);

  // Data tempat
  const [places, setPlaces] = useState([]);
  const [placesSource, setPlacesSource] = useState('firestore'); // 'firestore' | 'empty' | 'error'
  const [placesNotice, setPlacesNotice] = useState('');
  const [loading, setLoading] = useState(false);

  // Tampilan
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState(DEFAULT_BOOKMARKS);
  const [activeTab, setActiveTabState] = useState('home'); // 'home' | 'directory' | 'ai-planner' | 'saved' | 'manager' | 'admin'
  const [selectedPlaceModal, setSelectedPlaceModal] = useState(null);
  const [pendingAIPrompt, setPendingAIPrompt] = useState(null);
  const [chatMessages, setChatMessages] = useState(() => [createWelcomeMessage()]);

  const authSequence = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);
  const placesPrefetch = useRef(null); // { uid, promise }: data tempat yang dibaca bersamaan dengan peran

  // Pantau status login. Pembacaan peran dan data tempat dimulai bersamaan.
  useEffect(() => {
    const unsubscribe = subscribeAuth(async (firebaseUser) => {
      const sequence = ++authSequence.current;
      const isCurrent = () => sequence === authSequence.current;

      if (!firebaseUser) {
        placesPrefetch.current = null;
        setUser(null);
        setRole(null);
        setPlaces([]);
        setPlacesNotice('');
        setLoading(false);
        setActiveTabState('home');
        setSelectedPlaceModal(null);
        setPendingAIPrompt(null);
        setChatMessages([createWelcomeMessage()]);
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      const startedAt = performance.now();
      const uid = firebaseUser.uid;
      const isAdmin = Boolean(firebaseUser.emailVerified) && isAdminEmail(firebaseUser.email);
      const cachedRole = isAdmin ? null : readCachedRole(uid);

      // Dua pembacaan database dimulai sekaligus, tidak lagi berurutan
      const verification = resolveRole(firebaseUser);
      placesPrefetch.current = { uid, promise: fetchPlaces() };

      // Admin dan akun yang pernah login langsung masuk. Akun baru menunggu pembacaan peran (maksimal 4 detik).
      let initialRole;
      if (isAdmin) {
        initialRole = ROLES.ADMIN;
      } else if (cachedRole) {
        initialRole = cachedRole;
      } else {
        initialRole = (await verification).role;
      }

      if (!isCurrent()) return;

      setBookmarks(readBookmarks(uid));
      setLoading(true);
      setUser(firebaseUser);
      setRole(initialRole);
      setActiveTabState('home');
      setAuthLoading(false);
      console.info(`[PekaloJalan] peran "${initialRole}" siap dalam ${elapsed(startedAt)} ms`);

      // Pastikan peran dari database di latar belakang, dan coba ulang bila koneksi sempat gagal
      if (isAdmin) return;
      let result = await verification;
      for (let attempt = 1; !result.verified && attempt <= 3; attempt += 1) {
        await wait(4000);
        if (!isCurrent()) return;
        result = await resolveRole(firebaseUser);
      }
      if (!isCurrent() || !result.verified) return;
      writeCachedRole(uid, result.role);
      setRole(result.role);
      console.info(`[PekaloJalan] peran terverifikasi: "${result.role}" (${elapsed(startedAt)} ms)`);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Muat data tempat setelah login. Admin otomatis menyalin data awal bila database masih kosong.
  const hasSession = Boolean(user && role);
  const isAdminRole = role === ROLES.ADMIN;

  useEffect(() => {
    if (!hasSession) return undefined;
    let cancelled = false;

    const applyResult = (result) => {
      if (result.source === 'error') {
        setPlacesNotice(`Data dari database gagal dimuat. ${result.reason || 'Koneksi lambat atau terputus.'} Menampilkan data awal (hanya baca).`);
      } else if (result.source === 'empty' && !isAdminRole) {
        setPlacesNotice('Database belum disiapkan admin. Menampilkan data awal (hanya baca).');
      } else {
        setPlacesNotice('');
      }
      setPlaces(result.places);
      setPlacesSource(result.source);
    };

    // Database kosong: admin menyalin data awal satu kali, lalu data dibaca ulang
    const seedIfNeeded = async (result) => {
      if (result.source !== 'empty' || !isAdminRole) return { result, seedError: '' };
      try {
        await seedInitialPlaces();
        return { result: await fetchPlaces(), seedError: '' };
      } catch (err) {
        return { result, seedError: `Data awal belum bisa disalin ke database. ${explainFirebaseError(err)}` };
      }
    };

    const loadPlaces = async () => {
      const startedAt = performance.now();
      setLoading(true);
      setPlacesNotice('');

      const prefetched = placesPrefetch.current;
      const usePrefetched = reloadKey === 0 && prefetched && prefetched.uid === user.uid;
      const first = await (usePrefetched ? prefetched.promise : fetchPlaces());
      if (cancelled) return;

      const { result, seedError } = await seedIfNeeded(first);
      if (cancelled) return;

      applyResult(result);
      if (seedError) setPlacesNotice(seedError);
      setLoading(false);
      console.info(`[PekaloJalan] data tempat siap dalam ${elapsed(startedAt)} ms (sumber: ${result.source})`);

      // Gangguan sesaat tanpa penyebab pasti: coba sekali lagi di latar belakang
      if (result.source === 'error' && !result.reason) {
        await wait(3000);
        if (cancelled) return;
        const retry = await seedIfNeeded(await fetchPlaces());
        if (cancelled || retry.result.source === 'error') return;
        applyResult(retry.result);
        if (retry.seedError) setPlacesNotice(retry.seedError);
        console.info(`[PekaloJalan] data tempat berhasil dimuat pada percobaan ulang (sumber: ${retry.result.source})`);
      }
    };

    loadPlaces();
    return () => {
      cancelled = true;
    };
  }, [hasSession, isAdminRole, user, reloadKey]);

  const reloadPlaces = useCallback(() => setReloadKey((k) => k + 1), []);

  // Navigasi dengan penjagaan peran
  const setActiveTab = useCallback((tab) => {
    setActiveTabState(canAccessTab(role, tab) ? tab : 'home');
  }, [role]);

  // Bookmark disimpan per akun
  const toggleBookmark = (id) => {
    const next = bookmarks.includes(id) ? bookmarks.filter((b) => b !== id) : [...bookmarks, id];
    setBookmarks(next);
    if (user) {
      try {
        localStorage.setItem(bookmarkKey(user.uid), JSON.stringify(next));
      } catch {
        // penyimpanan penuh atau dinonaktifkan: bookmark tetap jalan selama sesi
      }
    }
  };

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
  };

  const handleLogout = async () => {
    await logout();
  };

  // Penjagaan sisi tampilan sebelum menulis data (server tetap menjadi penjaga utama)
  const assertCanWrite = () => {
    if (role !== ROLES.ADMIN && role !== ROLES.MANAGER) {
      throw new Error('Peran Anda tidak memiliki izin mengubah data.');
    }
    if (placesSource !== 'firestore') {
      throw new Error('Data tempat belum siap di database. Muat ulang halaman setelah admin menyiapkan database.');
    }
  };

  const ownerEmail = user ? normalizeEmail(user.email) : '';
  const isOwnPlace = (place) => Boolean(place) && normalizeEmail(place.managerEmail) === ownerEmail;

  const handleCreatePlace = async (placeData) => {
    assertCanWrite();
    const payload = role === ROLES.MANAGER
      ? { ...placeData, managerEmail: ownerEmail, featured: false }
      : { ...placeData, managerEmail: normalizeEmail(placeData.managerEmail) };
    const created = await addPlace(payload);
    setPlaces((prev) => [created, ...prev]);
    return created;
  };

  const handleEditPlace = async (id, placeData) => {
    assertCanWrite();
    if (role === ROLES.MANAGER && !isOwnPlace(places.find((p) => p.id === id))) {
      throw new Error('Anda hanya boleh mengubah tempat milik Anda.');
    }
    const payload = role === ROLES.MANAGER
      ? (({ managerEmail, featured, ...rest }) => rest)(placeData)
      : { ...placeData, managerEmail: normalizeEmail(placeData.managerEmail) };
    const updated = await updatePlace(id, payload);
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    return updated;
  };

  const handleRemovePlace = async (id) => {
    assertCanWrite();
    if (role !== ROLES.ADMIN) throw new Error('Hanya admin yang boleh menghapus tempat.');
    await deletePlace(id);
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  };

  const myPlaces = places.filter(isOwnPlace);

  const filteredPlaces = places.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.address.toLowerCase().includes(query) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(query)));
    return matchesCategory && matchesSearch;
  });

  return (
    <AppContext.Provider
      value={{
        // autentikasi
        user,
        role,
        authLoading,
        handleGoogleLogin,
        handleLogout,
        // data tempat
        places,
        myPlaces,
        placesSource,
        placesNotice,
        dataReady: placesSource === 'firestore',
        reloadPlaces,
        loading,
        categories: CATEGORIES,
        filteredPlaces,
        handleCreatePlace,
        handleEditPlace,
        handleRemovePlace,
        // tampilan
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        bookmarks,
        toggleBookmark,
        activeTab,
        setActiveTab,
        chatMessages,
        setChatMessages,
        selectedPlaceModal,
        setSelectedPlaceModal,
        pendingAIPrompt,
        setPendingAIPrompt
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
