import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, initializeFirestore, collection, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, doc, writeBatch
} from 'firebase/firestore';
import { getAuth, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { INITIAL_PLACES } from '../data/mockPlaces';
import { ROLES, isAdminEmail, normalizeEmail } from '../config/roles';

// Baca konfigurasi dari file .env (Vite)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain && firebaseConfig.appId
);

let db = null;
let auth = null;
let storage = null;
let initError = null;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    try {
      // Bila jalur utama Firestore tersendat (jaringan, proxy, antivirus), otomatis
      // beralih ke long polling alih-alih menunggu lama sebelum gagal.
      db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
    } catch {
      db = getFirestore(app); // sudah diinisialisasi sebelumnya (mis. saat hot reload)
    }
    auth = getAuth(app);
    storage = getStorage(app);
  } catch (err) {
    initError = err;
    console.error('Inisialisasi Firebase gagal:', err);
  }
}

export const firebaseReady = Boolean(auth && db);

export const FIREBASE_SETUP_MESSAGE = !isFirebaseConfigured
  ? 'Firebase belum dikonfigurasi. Isi variabel VITE_FIREBASE_* di file .env lalu jalankan ulang npm run dev.'
  : initError
    ? 'Firebase gagal dimulai. Periksa kembali nilai VITE_FIREBASE_* di file .env.'
    : '';

const requireDb = () => {
  if (!db) throw new Error(FIREBASE_SETUP_MESSAGE || 'Database belum siap.');
  return db;
};

// Ubah kode kesalahan Firebase menjadi pesan yang mudah dipahami
export const explainFirebaseError = (err) => {
  const code = err && err.code ? String(err.code) : '';
  if (code === 'permission-denied') {
    return 'Akses ditolak server. Pastikan aturan Firestore (firestore.rules) sudah dipublish dan email admin sudah diisi.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Jendela login ditutup sebelum selesai. Silakan coba lagi.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Popup login diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Domain ini belum diizinkan. Tambahkan di Firebase Console, Authentication, Settings, Authorized domains.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Login Google belum diaktifkan di Firebase Console (Authentication, Sign-in method).';
  }
  if (code === 'auth/network-request-failed' || code === 'unavailable') {
    return 'Koneksi internet bermasalah. Periksa jaringan lalu coba lagi.';
  }
  return (err && err.message) || 'Terjadi kesalahan tidak terduga.';
};

// --- Autentikasi (hanya Google, tanpa login palsu) ---

export const loginWithGoogle = async () => {
  if (!auth) throw new Error(FIREBASE_SETUP_MESSAGE);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

export const logout = async () => {
  if (auth) await signOut(auth);
};

// Memantau status login. Callback menerima user atau null.
export const subscribeAuth = (callback) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// Menentukan peran: admin (daftar email), pengelola (dokumen roles), selain itu pengguna.
// Hasil: { role, verified }. verified=false berarti peran belum bisa dipastikan
// dari database (koneksi lambat atau gagal), sehingga sementara dianggap Pengguna.
const ROLE_TIMEOUT_MS = 4000;

const withTimeout = (promise, ms, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);

export const resolveRole = async (user) => {
  if (!user || !user.email) return { role: ROLES.USER, verified: true };
  if (user.emailVerified && isAdminEmail(user.email)) return { role: ROLES.ADMIN, verified: true };
  if (!db) return { role: ROLES.USER, verified: false };

  try {
    const snap = await withTimeout(
      getDoc(doc(db, 'roles', normalizeEmail(user.email))),
      ROLE_TIMEOUT_MS,
      'Waktu tunggu pembacaan peran habis.'
    );
    const isManager = snap.exists() && snap.data().role === ROLES.MANAGER;
    return { role: isManager ? ROLES.MANAGER : ROLES.USER, verified: true };
  } catch (err) {
    console.warn('Peran tidak bisa dipastikan, sementara dianggap Pengguna:', err.code || err.message);
    return { role: ROLES.USER, verified: false };
  }
};

// --- Data tempat ---

const FETCH_TIMEOUT_MS = 6000;
const PROBE_TIMEOUT_MS = 3000;
const CREATE_DB_HINT = 'Buka Firebase Console, menu Build, Firestore Database, lalu klik Create database.';

// Mencari penyebab nyata gagal muat lewat satu permintaan langsung ke Firestore (tanpa login).
// Jawaban dari Google membedakan: layanan belum aktif, database belum dibuat, kunci salah atau dibatasi.
// Mengembalikan teks penjelasan, atau null bila penyebabnya tidak bisa dipastikan.
const diagnoseFirestore = async (err) => {
  if (err && err.code === 'permission-denied' && /insufficient permissions/i.test(err.message || '')) {
    return 'Aturan Firestore menolak akses. Publish isi firestore.rules di Firebase Console, tab Rules.';
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}`
      + `/databases/(default)/documents/places?pageSize=1&key=${encodeURIComponent(firebaseConfig.apiKey)}`;
    const res = await withTimeout(fetch(url), PROBE_TIMEOUT_MS, 'Waktu tunggu pemeriksaan habis.');
    const body = await res.json().catch(() => null);
    const apiError = body && body.error;
    if (!apiError) return null;

    const reasonCode = (apiError.details || []).map((d) => d.reason).find(Boolean);
    const text = String(apiError.message || '');

    if (reasonCode === 'SERVICE_DISABLED') {
      return `Cloud Firestore belum diaktifkan di proyek Firebase. ${CREATE_DB_HINT}`;
    }
    if (apiError.status === 'NOT_FOUND' || /database .* does not exist/i.test(text)) {
      return `Database Firestore belum dibuat. ${CREATE_DB_HINT}`;
    }
    if (reasonCode === 'API_KEY_INVALID') {
      return 'Kunci API Firebase tidak valid. Periksa VITE_FIREBASE_API_KEY di file .env (kunci lama yang sudah dicabut tidak berlaku lagi).';
    }
    if (reasonCode === 'API_KEY_SERVICE_BLOCKED') {
      return 'Kunci API Firebase dibatasi dan tidak mengizinkan Cloud Firestore API. Tambahkan layanan itu pada pembatasan API kunci di Google Cloud Console.';
    }
    if (reasonCode === 'API_KEY_HTTP_REFERRER_BLOCKED') {
      return 'Kunci API Firebase memblokir alamat situs ini. Tambahkan alamat situs (misalnya http://localhost:5173/*) pada pembatasan HTTP referrer kunci.';
    }
    return null;
  } catch {
    return null;
  }
};

// Hasil: { places, source, reason? } dengan source = 'firestore' | 'empty' | 'error'
// reason (hanya bila error) berisi penjelasan penyebab bila berhasil dipastikan.
export const fetchPlaces = async () => {
  if (!db) return { places: INITIAL_PLACES, source: 'error', reason: FIREBASE_SETUP_MESSAGE };
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Waktu tunggu Firestore habis.')), FETCH_TIMEOUT_MS)
    );
    const snapshot = await Promise.race([getDocs(collection(db, 'places')), timeout]);
    if (snapshot.empty) return { places: INITIAL_PLACES, source: 'empty' };
    return {
      places: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
      source: 'firestore'
    };
  } catch (err) {
    console.warn('Gagal membaca data tempat, memakai data awal (hanya baca):', err.code || err.message);
    const reason = await diagnoseFirestore(err);
    if (reason) console.warn('Penyebab gagal muat data:', reason);
    return { places: INITIAL_PLACES, source: 'error', reason };
  }
};

// Salin data awal ke Firestore satu kali (hanya admin, hanya saat koleksi kosong)
export const seedInitialPlaces = async () => {
  const database = requireDb();
  const createdAt = new Date().toISOString();
  for (let i = 0; i < INITIAL_PLACES.length; i += 400) {
    const batch = writeBatch(database);
    INITIAL_PLACES.slice(i, i + 400).forEach((place) => {
      const { id, ...data } = place;
      batch.set(doc(database, 'places', id), { ...data, managerEmail: data.managerEmail || '', createdAt });
    });
    await batch.commit();
  }
};

export const addPlace = async (placeData) => {
  const payload = { ...placeData, createdAt: new Date().toISOString() };
  const docRef = await addDoc(collection(requireDb(), 'places'), payload);
  return { id: docRef.id, ...payload };
};

export const updatePlace = async (id, placeData) => {
  await updateDoc(doc(requireDb(), 'places', id), placeData);
  return { id, ...placeData };
};

export const deletePlace = async (id) => {
  await deleteDoc(doc(requireDb(), 'places', id));
  return true;
};

// --- Kelola pengelola wisata (khusus admin) ---

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const listManagers = async () => {
  const snapshot = await getDocs(collection(requireDb(), 'roles'));
  return snapshot.docs
    .map((d) => ({ email: d.id, ...d.data() }))
    .filter((r) => r.role === ROLES.MANAGER)
    .sort((a, b) => a.email.localeCompare(b.email));
};

export const addManager = async (email, addedBy) => {
  const key = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(key)) throw new Error('Format email tidak valid.');
  if (isAdminEmail(key)) throw new Error('Email ini sudah terdaftar sebagai admin.');
  const data = { role: ROLES.MANAGER, addedBy: normalizeEmail(addedBy), addedAt: new Date().toISOString() };
  await setDoc(doc(requireDb(), 'roles', key), data);
  return { email: key, ...data };
};

export const removeManager = async (email) => {
  await deleteDoc(doc(requireDb(), 'roles', normalizeEmail(email)));
  return true;
};

// --- Unggah gambar ---

const MAX_DATA_URL_LENGTH = 700000; // batas aman agar dokumen Firestore (maks 1 MB) tidak gagal

// Perkecil gambar di browser sebelum diunggah (maks sisi terpanjang 1200 px, JPEG kualitas 80%).
// Jika gagal diperkecil, file asli tetap dipakai agar unggahan tidak terhenti.
export const compressImage = (file, maxSide = 1200, quality = 0.8) =>
  new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; // latar putih untuk PNG transparan
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file); // hasil tidak lebih kecil, pakai file asli
            return;
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });

export const uploadImageFile = async (file) => {
  if (!file) throw new Error('File gambar tidak ditemukan.');

  if (storage) {
    try {
      const storageRef = ref(storage, `places/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.warn('Unggah ke Firebase Storage gagal, memakai data URL:', err.code || err.message);
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      if (result.length > MAX_DATA_URL_LENGTH) {
        reject(new Error('Gambar terlalu besar. Gunakan gambar di bawah 500 KB atau tempel URL gambar.'));
      } else {
        resolve(result);
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
};
