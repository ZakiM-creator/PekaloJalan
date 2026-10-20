import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PlaceDetailModal } from './components/PlaceDetailModal';

import { HomePage } from './pages/HomePage';
import { DirectoryPage } from './pages/DirectoryPage';
import { AITripPlannerPage } from './pages/AITripPlannerPage';
import { SavedPlacesPage } from './pages/SavedPlacesPage';
import { AdminPage } from './pages/AdminPage';

const MainContent = () => {
  const { activeTab, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <img src="/logo-pin.png" alt="Logo PekaloJalan" className="h-16 w-auto animate-pulse" />
        <p className="text-amber-400 text-xs font-semibold tracking-wider animate-pulse">
          Memuat PekaloJalan...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      {activeTab === 'home' && <HomePage />}
      {activeTab === 'directory' && <DirectoryPage />}
      {activeTab === 'ai-planner' && <AITripPlannerPage />}
      {activeTab === 'saved' && <SavedPlacesPage />}
      {activeTab === 'admin' && <AdminPage />}
    </main>
  );
};

export function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
        <Navbar />
        <MainContent />
        <PlaceDetailModal />
        <Footer />
      </div>
    </AppProvider>
  );
}

export default App;
