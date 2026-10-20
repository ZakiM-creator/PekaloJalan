# PRD: Login Google Wajib dan 3 Role (PekaloJalan)

Versi 1.0 | 20 Oktober 2026 | Pemilik: Zaki | Cabang kerja: `fitur-3-role`

## 1. Latar belakang dan masalah

Hasil pembacaan kode `main` (commit 07920b9):

| No | Temuan | Lokasi |
|---|---|---|
| 1 | Siapa pun yang login Google langsung dianggap admin. Penyebabnya, hasil login Google disimpan ke variabel `adminUser`, dan halaman admin hanya mengecek "ada user atau tidak". | `AppContext.jsx` (handleGoogleLogin), `AdminPage.jsx` (`if (!adminUser)`) |
| 2 | Kredensial demo `admin@pekalojalan.com` / `admin123` tampil di layar dan terisi otomatis di form. | `AdminPage.jsx` |
| 3 | Ada login admin palsu (demo) di kode, dan login Google palsu bila Firebase tidak aktif. Keduanya membuat orang bisa masuk tanpa verifikasi. | `firebaseService.js` (loginAdmin, loginWithGoogle) |
| 4 | Website bisa dibuka tanpa login. Login hanya tombol kecil di menu. | `App.jsx`, `Navbar.jsx` |
| 5 | Hanya ada 1 peran (admin). Peran pengguna dan pengelola wisata belum ada. | seluruh aplikasi |
| 6 | Edit tempat bawaan (id `place-*`) hanya tersimpan di browser, tidak ke database. Ini menghalangi peran pengelola. | `firebaseService.js` (updatePlace, deletePlace) |

## 2. Tujuan

1. Halaman pertama saat website dibuka adalah halaman login Google. Tanpa login, tidak ada isi website yang terlihat.
2. Akses admin hanya untuk email yang didaftarkan pemilik.
3. Ada 3 peran: Admin, Pengelola Wisata, Pengguna.
4. Kredensial demo dan login palsu dihapus total.
5. Pembatasan akses dijaga oleh server (Firestore Security Rules), bukan hanya tampilan. Alasannya: aplikasi ini berjalan di browser, jadi pembatasan di tampilan saja bisa dilewati orang yang paham cara membuka kode browser.

## 3. Istilah singkat

| Istilah | Arti |
|---|---|
| Firebase Authentication | Layanan Google untuk login. Kita pakai login dengan akun Google. |
| Firestore | Database di Firebase tempat data tempat wisata dan daftar pengelola disimpan. |
| Security Rules | Aturan di server Firestore yang menentukan siapa boleh baca dan tulis data. Tidak bisa dilewati dari browser. |
| Role | Peran yang menentukan menu dan hak akses seseorang. |

## 4. Peran dan hak akses

| Fitur | Pengguna | Pengelola Wisata | Admin |
|---|---|---|---|
| Login Google | Ya | Ya | Ya |
| Beranda, Direktori, AI Trip Planner, Tersimpan | Ya | Ya | Ya |
| Menu "Kelola Tempat Saya" | Tidak | Ya | Tidak (memakai panel admin) |
| Tambah tempat | Tidak | Ya (otomatis atas namanya) | Ya |
| Ubah tempat | Tidak | Hanya tempat miliknya | Semua tempat |
| Hapus tempat | Tidak | Tidak | Ya |
| Atur "Destinasi Populer" (featured) | Tidak | Tidak | Ya |
| Tambah atau cabut pengelola | Tidak | Tidak | Ya |
| Menu "Panel Admin" | Tidak | Tidak | Ya |

Cara peran ditentukan:
1. Admin: email ada di daftar admin milik pemilik (variabel `VITE_ADMIN_EMAILS` di `.env` untuk tampilan, dan daftar yang sama di Security Rules untuk penjagaan server).
2. Pengelola Wisata: admin mendaftarkan emailnya lewat Panel Admin. Disimpan di Firestore koleksi `roles`, dokumen berid email huruf kecil, isi `{ role: "manager" }`.
3. Pengguna: semua akun Google lain. Tidak perlu didaftarkan.

Satu email hanya punya satu peran. Prioritas: Admin, lalu Pengelola, lalu Pengguna.

## 5. Alur pengguna

1. Buka website. Layar pemuatan muncul sebentar selagi status login dicek.
2. Belum login: tampil Halaman Login (logo, tombol "Masuk dengan Google"). Navbar, menu, dan isi website tidak dirender sama sekali.
3. Klik tombol: muncul jendela pilih akun Google.
4. Berhasil: sistem menentukan peran, lalu membuka Beranda. Menu menyesuaikan peran.
5. Gagal atau jendela ditutup: pesan kesalahan singkat di halaman login, tombol bisa dicoba lagi.
6. Akses menu yang bukan haknya (misalnya pengguna memaksa membuka tab admin): dialihkan ke Beranda.
7. Keluar: tombol logout di navbar, kembali ke Halaman Login.
8. Firebase belum diisi di `.env`: halaman login menampilkan pesan konfigurasi, bukan login palsu.

## 6. Struktur data

| Koleksi | Dokumen | Isi | Siapa yang boleh |
|---|---|---|---|
| `places` | id tempat | data tempat yang sudah ada, ditambah `managerEmail` (boleh kosong) | Baca: semua yang sudah login. Tulis: sesuai tabel bagian 4 |
| `roles` | email huruf kecil | `{ role: "manager", addedBy, addedAt }` | Baca: admin, dan pemilik email itu untuk dokumennya sendiri. Tulis: admin |

Catatan data: tempat bawaan (`INITIAL_PLACES`) disalin ke Firestore satu kali oleh admin saat koleksi `places` masih kosong, supaya semua tempat bisa diubah dan disimpan di database yang sama (menutup temuan nomor 6).

## 7. Aturan keamanan Firestore (ringkas)

1. Semua akses ditolak secara bawaan.
2. Admin: email ada di daftar admin dan `email_verified` bernilai benar.
3. Pengelola: ada dokumen `roles/{email}` dengan `role == "manager"`.
4. `places` boleh dibaca semua yang login.
5. `places` create: admin, atau pengelola dengan `managerEmail` sama dengan emailnya dan `featured` bukan true.
6. `places` update: admin, atau pengelola pemilik tempat itu, dengan `managerEmail` dan `featured` tidak berubah.
7. `places` delete: admin saja.
8. `roles`: tulis hanya admin.

File aturan lengkap: `firestore.rules` (ditempel ke Firebase Console).

## 8. Perubahan kode

| File | Perubahan |
|---|---|
| `src/config/roles.js` (baru) | Daftar peran, pembaca `VITE_ADMIN_EMAILS`, tabel menu yang boleh dibuka per peran |
| `src/services/firebaseService.js` | Hapus login admin dan Google palsu. Tambah login Google asli, penentu peran, kelola pengelola, salin data awal. Tulis data selalu ke Firestore |
| `src/context/AppContext.jsx` | Tambah status `authLoading`, `role`, `authError`. Muat tempat setelah login. Bookmark disimpan per akun |
| `src/pages/LoginPage.jsx` (baru) | Halaman login paling awal |
| `src/components/PlaceFormModal.jsx` (baru) | Formulir tambah/ubah tempat yang dipakai bersama Admin dan Pengelola |
| `src/pages/AdminPage.jsx` | Hanya untuk admin. Tabel semua tempat, kelola pengelola. Kredensial demo dan form login dihapus |
| `src/pages/ManagerPage.jsx` (baru) | Panel pengelola: hanya tempat miliknya |
| `src/App.jsx` | Penjaga: memuat, login, atau aplikasi. Tab dibatasi per peran |
| `src/components/Navbar.jsx` | Menu per peran, label peran, logout. Tombol "Login" dihapus |
| `.env.example` | Tambah `VITE_ADMIN_EMAILS` |
| `firestore.rules` (baru) | Aturan keamanan |

## 9. Di luar cakupan (sengaja tidak dikerjakan sekarang)

1. Persetujuan admin sebelum tempat dari pengelola tampil.
2. Memindahkan panggilan AI ke server. Kunci yang diawali `VITE_` tetap terlihat di browser (sudah dijelaskan sebelumnya).
3. Daftar semua akun yang pernah login.
4. Perbaikan tombol lain (filter kategori dan lain-lain) karena itu masalah terpisah.

## 10. Kriteria berhasil (cara uji)

| No | Skenario | Hasil yang benar |
|---|---|---|
| 1 | Buka website tanpa login | Hanya Halaman Login yang tampil |
| 2 | Cari teks `admin123` dan `admin@pekalojalan.com` di folder `src` | Tidak ditemukan |
| 3 | Login dengan akun Google biasa | Peran Pengguna, tidak ada menu Panel Admin dan Kelola Tempat |
| 4 | Pengguna mengubah tab ke admin lewat konsol browser | Tetap diarahkan ke Beranda, dan tulis ke Firestore ditolak server |
| 5 | Login dengan email admin | Peran Admin, menu Panel Admin muncul |
| 6 | Admin mendaftarkan email pengelola, lalu email itu login | Peran Pengelola, menu Kelola Tempat Saya muncul |
| 7 | Pengelola mengubah tempat miliknya | Berhasil tersimpan dan terlihat dari browser lain |
| 8 | Pengelola mencoba mengubah tempat milik orang lain atau menghapus | Ditolak server |
| 9 | Logout | Kembali ke Halaman Login |
| 10 | `npm run build` | Selesai tanpa error |

## 11. Yang harus disiapkan pemilik di Firebase Console

1. Authentication, tab Sign-in method: aktifkan penyedia Google.
2. Authentication, Settings, Authorized domains: pastikan `localhost` ada. Tambahkan alamat situs bila nanti di-hosting.
3. Firestore Database: buat database bila belum ada.
4. Firestore, tab Rules: tempel isi `firestore.rules` setelah email admin diisi, lalu Publish.
5. File `.env`: isi `VITE_ADMIN_EMAILS` dengan email Anda (pisahkan dengan koma bila lebih dari satu).

## 12. Risiko dan batasan

| Risiko | Penanganan |
|---|---|
| Daftar admin ada di dua tempat (`.env` dan Rules) | Rules yang menentukan. `.env` hanya mengatur tampilan. Isi keduanya sama |
| Rules belum dipublish | Login tetap jalan, tetapi simpan data gagal dengan pesan jelas. Tidak ada celah yang terbuka |
| Pengelola tanpa dokumen `roles` | Otomatis dianggap Pengguna |
| Koleksi `places` kosong | Admin menyalin data awal sekali saat pertama masuk. Pengelola melihat data awal tanpa bisa mengubah sampai itu dilakukan |
| Tes login Google asli tidak bisa dilakukan oleh Claude | Perlu diuji langsung oleh pemilik dengan skenario bagian 10 |
