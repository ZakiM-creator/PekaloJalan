// Konfigurasi peran (role) dan hak akses menu PekaloJalan.
// Catatan: pembatasan di sini hanya mengatur TAMPILAN.
// Penjagaan yang sebenarnya ada di firestore.rules (server).

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user'
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Pengelola Wisata',
  [ROLES.USER]: 'Pengguna'
};

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const parseEmailList = (raw) =>
  String(raw || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);

// Daftar email admin dari file .env (VITE_ADMIN_EMAILS=a@gmail.com,b@gmail.com)
export const ADMIN_EMAILS = parseEmailList(import.meta.env.VITE_ADMIN_EMAILS);

export const isAdminEmail = (email) => ADMIN_EMAILS.includes(normalizeEmail(email));

const ALL_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER];

// Menu (tab) apa saja yang boleh dibuka tiap peran
export const TAB_ACCESS = {
  home: ALL_ROLES,
  directory: ALL_ROLES,
  'ai-planner': ALL_ROLES,
  saved: ALL_ROLES,
  manager: [ROLES.MANAGER],
  admin: [ROLES.ADMIN]
};

export const canAccessTab = (role, tab) =>
  Boolean(role && TAB_ACCESS[tab] && TAB_ACCESS[tab].includes(role));
