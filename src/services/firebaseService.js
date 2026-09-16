import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { INITIAL_PLACES } from '../data/mockPlaces';

// Read config from Vite env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let db = null;
let auth = null;
let storage = null;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
    console.log("Firebase Service initialized successfully.");
  } catch (err) {
    console.warn("Firebase initialization error, using local fallback mode:", err);
  }
} else {
  console.log("Firebase API Keys not found in env. Running in High-Performance Local Hybrid Mode.");
}

// Local Storage Helper for Offline/Mock mode
const STORAGE_KEY = 'pekalojalan_places';
const AUTH_KEY = 'pekalojalan_admin_session';

export const getStoredPlaces = () => {
  const localData = localStorage.getItem(STORAGE_KEY);
  if (!localData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PLACES));
    return INITIAL_PLACES;
  }
  try {
    return JSON.parse(localData);
  } catch {
    return INITIAL_PLACES;
  }
};

export const saveStoredPlaces = (places) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
};

// --- API Service Methods ---

// 1. Fetch All Places
export const fetchPlaces = async () => {
  if (db) {
    try {
      // FITUR ANTI-HANG: Jika Firestore belum diaktifkan di Console, request akan timeout dalam 2.5 detik
      // lalu otomatis jatuh ke fallback data lokal tanpa membuat aplikasi error (Graceful Degradation).
      const fetchPromise = getDocs(collection(db, 'places'));
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore connection timeout. Database might not be initialized.")), 2500)
      );

      const querySnapshot = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!querySnapshot.empty) {
        const places = [];
        querySnapshot.forEach((doc) => {
          places.push({ id: doc.id, ...doc.data() });
        });
        return places;
      }
    } catch (err) {
      console.warn("Firestore fetch error or timeout. Falling back to local dataset:", err.message);
    }
  }
  return getStoredPlaces();
};

// 2. Add New Place
export const addPlace = async (placeData) => {
  const newPlace = {
    ...placeData,
    createdAt: new Date().toISOString()
  };

  if (db) {
    try {
      const docRef = await addDoc(collection(db, 'places'), newPlace);
      return { id: docRef.id, ...newPlace };
    } catch (err) {
      console.warn("Firestore addDoc error, saving locally:", err);
    }
  }

  const localPlaces = getStoredPlaces();
  const created = { id: `place-${Date.now()}`, ...newPlace };
  const updated = [created, ...localPlaces];
  saveStoredPlaces(updated);
  return created;
};

// 3. Update Existing Place
export const updatePlace = async (id, placeData) => {
  if (db && !id.startsWith('place-')) {
    try {
      const placeRef = doc(db, 'places', id);
      await updateDoc(placeRef, placeData);
      return { id, ...placeData };
    } catch (err) {
      console.warn("Firestore update error, updating locally:", err);
    }
  }

  const localPlaces = getStoredPlaces();
  const updated = localPlaces.map((p) => (p.id === id ? { ...p, ...placeData } : p));
  saveStoredPlaces(updated);
  return { id, ...placeData };
};

// 4. Delete Place
export const deletePlace = async (id) => {
  if (db && !id.startsWith('place-')) {
    try {
      await deleteDoc(doc(db, 'places', id));
      return true;
    } catch (err) {
      console.warn("Firestore delete error, deleting locally:", err);
    }
  }

  const localPlaces = getStoredPlaces();
  const filtered = localPlaces.filter((p) => p.id !== id);
  saveStoredPlaces(filtered);
  return true;
};

// 5. Admin Auth Login
export const loginAdmin = async (email, password) => {
  if (auth) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, success: true };
    } catch (err) {
      console.warn("Firebase Auth failed, trying local demo login check:", err);
    }
  }

  // Local Demo Authentication Fallback
  if (email.trim().toLowerCase() === 'admin@pekalojalan.com' && password === 'admin123') {
    const demoUser = { uid: 'demo-admin-123', email: 'admin@pekalojalan.com', displayName: 'Pengelola PekaloJalan' };
    localStorage.setItem(AUTH_KEY, JSON.stringify(demoUser));
    return { user: demoUser, success: true };
  } else {
    throw new Error('Email atau password admin tidak valid. Gunakan admin@pekalojalan.com / admin123');
  }
};

// 5b. User Google Login
export const loginWithGoogle = async () => {
  if (auth) {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return { user: result.user, success: true };
    } catch (err) {
      console.warn("Google Sign-In failed:", err);
      throw err;
    }
  }
  
  // Local Demo Google Login Fallback
  const demoUser = { 
    uid: 'demo-google-123', 
    email: 'wisatawan@gmail.com', 
    displayName: 'Demo Wisatawan', 
    photoURL: 'https://www.svgrepo.com/show/475656/google-color.svg' 
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(demoUser));
  return { user: demoUser, success: true };
};

// 6. Logout Admin
export const logoutAdmin = async () => {
  if (auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Firebase Logout error:", err);
    }
  }
  localStorage.removeItem(AUTH_KEY);
  return true;
};

// 7. Check Current Auth Session
export const checkAuthSession = (callback) => {
  if (auth) {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        callback(user);
      } else {
        const stored = localStorage.getItem(AUTH_KEY);
        callback(stored ? JSON.parse(stored) : null);
      }
    });
  } else {
    const stored = localStorage.getItem(AUTH_KEY);
    callback(stored ? JSON.parse(stored) : null);
    return () => {};
  }
};

// 8. Image Upload helper
export const uploadImageFile = async (file) => {
  if (storage && file) {
    try {
      const storageRef = ref(storage, `places/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (err) {
      console.warn("Firebase storage upload failed, creating base64 data URL fallback:", err);
    }
  }
  
  // Local File Reader Fallback
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
};
