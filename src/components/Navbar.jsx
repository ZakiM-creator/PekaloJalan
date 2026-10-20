import React, { useState } from 'react';
import { Compass, Sparkles, MapPin, Bookmark, Menu, X, ShieldCheck, Store, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS, canAccessTab } from '../config/roles';

const ALL_NAV_ITEMS = [
  { id: 'home', label: 'Beranda', icon: MapPin },
  { id: 'directory', label: 'Direktori Tempat', icon: Compass },
  { id: 'ai-planner', label: 'AI Trip Planner', icon: Sparkles, badge: 'AI Cerdas' },
  { id: 'saved', label: 'Tersimpan', icon: Bookmark },
  { id: 'manager', label: 'Kelola Tempat Saya', icon: Store },
  { id: 'admin', label: 'Panel Admin', icon: ShieldCheck }
];

const Avatar = ({ user, className }) => (
  <img
    src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'Pengguna')}`}
    alt="Foto profil"
    referrerPolicy="no-referrer"
    className={className}
  />
);

export const Navbar = () => {
  const { activeTab, setActiveTab, bookmarks, user, role, handleLogout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = ALL_NAV_ITEMS
    .filter((item) => canAccessTab(role, item.id))
    .map((item) => (item.id === 'saved' ? { ...item, count: bookmarks.length } : item));

  const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Pengguna');
  const roleLabel = ROLE_LABELS[role] || '';

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onLogout = async () => {
    setMobileMenuOpen(false);
    await handleLogout();
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* Logo Brand */}
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src="/logo-pin.png"
              alt="Logo PekaloJalan"
              className="h-10 sm:h-12 w-auto shrink-0 group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-bold text-indigo-800 font-serif tracking-tight">
                  PekaloJalan
                </span>
                <span className="text-xs uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-100 hidden sm:inline-block">
                  Kota Batik
                </span>
              </div>
              <p className="text-xs text-slate-500 tracking-wider hidden sm:block">
                Portal Rekomendasi Wisata & AI Trip Planner
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white p-1.5 rounded-full border border-slate-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-800'}`} />
                  <span>{item.label}</span>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-900">
                      {item.badge}
                    </span>
                  )}

                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="w-4 h-4 flex items-center justify-center rounded-full text-[10px] bg-slate-900 text-white font-bold">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Profil dan Logout (Desktop) */}
          <div className="hidden md:flex items-center ml-2">
            <div className="flex items-center gap-3 bg-white pl-2 pr-4 py-1.5 rounded-full border border-slate-200">
              <Avatar user={user} className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300" />
              <div className="hidden lg:block leading-tight">
                <p className="text-xs font-bold text-slate-700">{displayName}</p>
                <p className="text-[10px] text-indigo-800 font-semibold">{roleLabel}</p>
              </div>
              <button
                onClick={onLogout}
                className="ml-2 text-slate-500 hover:text-red-600 transition-colors"
                title="Keluar"
                aria-label="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tombol menu (Mobile) */}
          <div className="flex items-center gap-2 md:hidden">
            <Avatar user={user} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300" />

            <button
              onClick={() => handleNavClick('ai-planner')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Trip</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
              aria-label="Buka menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-slate-200 px-4 pt-3 pb-5 space-y-2 animate-fadeIn">
          <div className="px-4 py-2 text-xs text-slate-500">
            <p className="font-bold text-slate-700">{displayName}</p>
            <p className="text-indigo-800 font-semibold">{roleLabel}</p>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-100'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-indigo-800" />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-900 text-white">
                      {item.badge}
                    </span>
                  )}
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-900 text-white">
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 border border-slate-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Keluar</span>
          </button>
        </div>
      )}
    </header>
  );
};
