import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { canAccessTab } from './config/roles';
import { Navbar } from './components/Navbar';
import { PlaceDetailModal } from './components/PlaceDetailModal';

import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { DirectoryPage } from './pages/DirectoryPage';
import { AITripPlannerPage } from './pages/AITripPlannerPage';
import { SavedPlacesPage } from './pages/SavedPlacesPage';
import { ManagerPage } from './pages/ManagerPage';
import { AdminPage } from './pages/AdminPage';

const LoadingScreen = ({ text }) => {
  const [slow, setSlow] = useState(false);

  // Bila pemuatan melewati 5 detik, beri tahu pengguna apa yang sedang terjadi
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4">
      <img src="/logo-pin.png" alt="Logo PekaloJalan" className="h-16 w-auto animate-pulse" />
      <p className="text-indigo-800 text-xs font-semibold tracking-wider animate-pulse">{text}</p>
      {slow && (
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Masih menghubungi database. Periksa koneksi internet Anda. Halaman akan tampil otomatis.
        </p>
      )}
    </div>
  );
};

const MainContent = () => {
  const { activeTab, loading, role } = useApp();

  if (loading) return <LoadingScreen text="Memuat PekaloJalan..." />;

  // Penjaga terakhir: tab yang bukan hak peran ini selalu jatuh ke Beranda
  const tab = canAccessTab(role, activeTab) ? activeTab : 'home';

  return (
    <main className="min-h-screen">
      {tab === 'home' && <HomePage />}
      {tab === 'directory' && <DirectoryPage />}
      {tab === 'ai-planner' && <AITripPlannerPage />}
      {tab === 'saved' && <SavedPlacesPage />}
      {tab === 'manager' && <ManagerPage />}
      {tab === 'admin' && <AdminPage />}
    </main>
  );
};

// Pintu masuk aplikasi: memuat status login, lalu halaman login, lalu aplikasi
const AppGate = () => {
  const { authLoading, user, role } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
        <LoadingScreen text="Memeriksa sesi login..." />
      </div>
    );
  }

  if (!user || !role) return <LoginPage />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-indigo-100 selection:text-slate-900">
      <Navbar />
      <MainContent />
      <PlaceDetailModal />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppGate />
    </AppProvider>
  );
}

export default App;
