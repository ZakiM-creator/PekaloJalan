import React, { createContext, useContext, useState, useEffect } from 'react';
import { CATEGORIES } from '../data/mockPlaces';
import { fetchPlaces, addPlace, updatePlace, deletePlace, loginAdmin, logoutAdmin, checkAuthSession, loginWithGoogle } from '../services/firebaseService';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('pekalojalan_bookmarks');
    return saved ? JSON.parse(saved) : ['place-1', 'place-17'];
  });
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'directory' | 'ai-planner' | 'saved' | 'admin'
  const [adminUser, setAdminUser] = useState(null);
  const [selectedPlaceModal, setSelectedPlaceModal] = useState(null);
  const [pendingAIPrompt, setPendingAIPrompt] = useState(null);

  // Initial Chat Messages for AI Trip Planner
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome-1',
      role: 'model',
      text: 'Sugeng Rawuh & Selamat Datang di PekaloJalan AI Trip Planner! 🧳✨\n\nSaya adalah asisten AI pribadi Anda untuk menjelajahi keindahan Kota Pekalongan. Beritahu saya preferensi perjalanan Anda (contoh: *"Saya mau jalan-jalan 1 hari budget 150rb, suka kuliner dan museum batik"*), dan saya akan buatkan rencana perjalanan otomatis!',
      itinerary: null,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Load places and check admin auth session on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchPlaces();
      setPlaces(data);
      setLoading(false);
    };
    loadData();

    const unsubscribe = checkAuthSession((user) => {
      setAdminUser(user);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Sync bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('pekalojalan_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Actions
  const toggleBookmark = (id) => {
    setBookmarks(prev => 
      prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
    );
  };

  const handleCreatePlace = async (placeData) => {
    const created = await addPlace(placeData);
    setPlaces(prev => [created, ...prev]);
    return created;
  };

  const handleEditPlace = async (id, placeData) => {
    const updated = await updatePlace(id, placeData);
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    return updated;
  };

  const handleRemovePlace = async (id) => {
    await deletePlace(id);
    setPlaces(prev => prev.filter(p => p.id !== id));
  };

  const handleAdminLogin = async (email, password) => {
    const res = await loginAdmin(email, password);
    setAdminUser(res.user);
    return res;
  };

  const handleGoogleLogin = async () => {
    const res = await loginWithGoogle();
    setAdminUser(res.user);
    return res;
  };

  const handleAdminLogout = async () => {
    await logoutAdmin();
    setAdminUser(null);
  };

  // Filtered places selector
  const filteredPlaces = places.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  return (
    <AppContext.Provider
      value={{
        places,
        loading,
        categories: CATEGORIES,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        filteredPlaces,
        bookmarks,
        toggleBookmark,
        activeTab,
        setActiveTab,
        adminUser,
        user: adminUser, // Alias for generic users
        handleAdminLogin,
        handleGoogleLogin,
        handleAdminLogout,
        handleCreatePlace,
        handleEditPlace,
        handleRemovePlace,
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
