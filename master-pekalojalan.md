# MASTER PRODUCT BLUEPRINT
## PekaloJalan — Portal Rekomendasi Wisata & AI Trip Planner Kota Pekalongan

> Dokumen ini disusun berdasarkan Proposal Ringkas "PekaloJalan" untuk Lomba Teknologi Piranti Lunak — Jambore Pemuda Kota Pekalongan 2026. Seluruh konten teknis (stack, arsitektur, fitur, keamanan) merujuk langsung pada dokumen proposal yang diberikan. Bagian yang menambahkan detail turunan (use case, sequence diagram, dsb.) ditandai sebagai elaborasi tim, bukan fakta baru dari proposal.

---

## DAFTAR ISI

1. [Project Brief](#1-project-brief)
2. [Product Requirement Document (PRD)](#2-product-requirement-document-prd)
3. [Design Brief](#3-design-brief)
4. [Flowchart](#4-flowchart)
5. [Use Case](#5-use-case)
6. [Sequence Diagram](#6-sequence-diagram)

---

## 1. PROJECT BRIEF

### 1.1 Nama Produk
**PekaloJalan** — Portal Rekomendasi Wisata & AI Trip Planner Kota Pekalongan

### 1.2 Konteks
Disusun untuk Lomba Teknologi Piranti Lunak, rangkaian Jambore Pemuda Kota Pekalongan 2026. Sesuai proposal, jenis dan teknologi aplikasi bebas dipilih peserta; ide ini dipilih sebagai portal rekomendasi wisata dengan fitur AI Trip Planner.

### 1.3 Masalah yang Diselesaikan
Berdasarkan proposal, informasi wisata Kota Pekalongan (wisata budaya batik, kuliner, kafe, hiburan) tersebar di berbagai sumber tidak terkurasi (media sosial pribadi, ulasan Google Maps tidak lengkap, informasi mulut ke mulut), sehingga wisatawan dan warga lokal kesulitan menyusun rencana perjalanan sesuai waktu dan anggaran. Belum ada platform terpadu yang menyediakan rekomendasi sekaligus membantu menyusun rencana perjalanan otomatis.

### 1.4 Solusi
Aplikasi web direktori terkurasi (wisata, cafe, resto, penginapan, hiburan, oleh-oleh/toko batik, wisata religi, kuliner kaki lima/street food) dengan fitur unggulan **AI Trip Planner**: pengguna memasukkan preferensi (kategori, anggaran, durasi), sistem menyusun rencana perjalanan otomatis.

### 1.5 Target Pengguna
- Wisatawan yang berkunjung ke Kota Pekalongan.
- Warga lokal yang mencari rekomendasi tempat.
- (Sisi admin) Pengelola konten yang mengurasi data tempat.

### 1.6 Diferensiator (sesuai proposal)
- Fitur AI Trip Planner sebagai pembeda utama.
- Direktori terpusat lintas kategori dalam satu platform.
- Fokus lokal khas Pekalongan: kategori Oleh-oleh/Batik dan Wisata Religi yang mencerminkan identitas Kota Batik, membedakan dari platform wisata generik nasional.

### 1.7 Stack Teknologi (final, sesuai proposal)
| Komponen | Teknologi |
|---|---|
| Frontend | React JS |
| Backend & Database | Firebase (Firestore, Authentication, Storage) |
| Integrasi AI | Gemini API |
| Hosting | Vercel |

---

## 2. PRODUCT REQUIREMENT DOCUMENT (PRD)

### 2.1 Tujuan Produk
Menyediakan direktori terkurasi tempat wisata/kuliner/penginapan/hiburan Kota Pekalongan dan fitur AI Trip Planner yang menghasilkan rencana perjalanan otomatis berdasarkan preferensi pengguna.

### 2.2 Kategori Data Tempat (sesuai proposal)
1. Wisata
2. Cafe
3. Resto
4. Penginapan
5. Hiburan
6. Oleh-oleh / Toko Batik
7. Wisata Religi
8. Kuliner Kaki Lima / Street Food

### 2.3 Daftar Fitur

#### A. Fitur Publik (Pengunjung — tanpa login)
| ID | Fitur | Deskripsi |
|---|---|---|
| F1 | Direktori Tempat | Menampilkan daftar tempat per kategori dengan info dasar (nama, kategori, deskripsi, lokasi, gambar) |
| F2 | Filter/Pencarian Kategori | Menyaring tempat berdasarkan kategori |
| F3 | Detail Tempat | Halaman detail satu tempat |
| F4 | **AI Trip Planner (berbasis chat)** | Antarmuka chat conversational (seperti LLM) — pengguna mengetik preferensi/permintaan dalam bahasa natural, dapat multi-turn (revisi/klarifikasi), sistem menghasilkan rencana kunjungan (itinerary) |
| F5 | Tampilan Itinerary dalam Chat | Menampilkan hasil AI Trip Planner sebagai kartu/linimasa terstruktur di dalam alur chat |
| F6 | Tampilan Responsif | Tampilan menyesuaikan desktop, tablet, dan smartphone (mobile-first) |

#### B. Fitur Admin (Pengelola — perlu login)
| ID | Fitur | Deskripsi |
|---|---|---|
| F7 | Login Admin | Autentikasi via Firebase Authentication |
| F8 | Kelola Data Tempat | Tambah/ubah/hapus data tempat (khusus akun admin terautentikasi) |
| F9 | Kelola Gambar | Upload gambar tempat ke Firebase Storage |

### 2.4 Alur Kerja Fitur AI Trip Planner (berbasis chat — diperbarui atas permintaan Anda)

> Catatan: Proposal asli mendeskripsikan AI Trip Planner berbasis **form** (input kategori, budget, durasi). Atas instruksi Anda, alur ini diperbarui menjadi **antarmuka chat/conversational (seperti LLM)**. Ini adalah keputusan desain baru dari Anda, bukan isi proposal asli — dicatat di sini agar konsisten di seluruh dokumen.

1. Pengguna membuka antarmuka chat AI Trip Planner (mirip chatbot LLM), bukan form statis.
2. Pengguna mengetik permintaan dalam bahasa natural (mis. "Saya mau jalan-jalan 1 hari di Pekalongan, budget 200rb, suka kuliner dan wisata religi").
3. Frontend mengirim pesan pengguna (beserta riwayat percakapan untuk menjaga konteks multi-turn) ke backend.
4. Backend mengambil data tempat relevan dari Firestore (berdasarkan kategori/kata kunci yang terdeteksi dari pesan, atau seluruh data tempat jika diperlukan sebagai konteks).
5. Backend mengirim pesan pengguna + riwayat chat + data tempat ke Gemini API sebagai konteks (system prompt mengarahkan Gemini untuk berperan sebagai trip planner Kota Pekalongan).
6. Gemini API merespons secara percakapan: bisa berupa balasan teks biasa (klarifikasi, tanya balik jika informasi kurang) atau hasil rencana perjalanan terstruktur (itinerary).
7. Frontend menampilkan balasan dalam bentuk chat bubble; jika responsnya berupa itinerary, ditampilkan juga sebagai kartu/linimasa terstruktur di dalam chat.
8. Pengguna dapat melanjutkan percakapan untuk merevisi rencana (mis. "ganti resto B dengan yang lebih murah") tanpa mengisi ulang form.

### 2.5 Kebutuhan Non-Fungsional

#### Keamanan Data (sesuai proposal)
- **Firebase Security Rules**: pengunjung hanya *read-only* pada Firestore; operasi tambah/ubah/hapus dibatasi untuk akun admin terautentikasi.
- **Firebase Authentication**: mengamankan akses panel admin.
- **Perlindungan API Key**: kunci Gemini API dan konfigurasi sensitif Firebase disimpan via *environment variables*, tidak *hardcoded*.
- **HTTPS**: seluruh komunikasi client–Firebase–Gemini API terenkripsi.
- **Validasi Input**: divalidasi di sisi frontend maupun backend/rules untuk mencegah data tidak valid/injection.

#### Kompatibilitas
- Desain responsif *mobile-first* dengan React, menyesuaikan desktop, tablet, smartphone.

### 2.6 Kriteria Keberhasilan (selaras kriteria penilaian lomba)
- Fungsi direktori dan AI Trip Planner berjalan andal.
- Desain UI jelas dan mudah dipahami.
- Mekanisme keamanan data diterapkan sesuai poin 2.5.
- Dokumentasi tersedia (panduan penggunaan).
- Tampilan berfungsi baik lintas perangkat.

### 2.7 Di Luar Cakupan (Out of Scope)
*(Elaborasi tim — tidak disebutkan eksplisit di proposal, ditambahkan sebagai batasan wajar untuk pengembangan MVP lomba)*
- Sistem pemesanan/transaksi (booking, pembayaran).
- Ulasan/rating pengguna.
- Aplikasi mobile native (hanya web responsif).

---

## 3. DESIGN BRIEF

### 3.1 Prinsip Desain
- **Mobile-first**: sesuai proposal, prioritas tampilan smartphone karena wisatawan mengakses saat bepergian.
- **Identitas lokal**: nuansa visual mencerminkan Kota Pekalongan sebagai Kota Batik (elaborasi tim — dapat memakai motif batik sebagai aksen visual, bukan konten utama).
- **Kejelasan informasi**: struktur direktori dan hasil itinerary harus mudah dipindai (scannable).

### 3.2 Komponen Antarmuka Utama
*(Elaborasi tim berdasarkan fitur di PRD)*
| Halaman/Komponen | Isi |
|---|---|
| Landing/Beranda | Hero singkat, akses cepat ke kategori dan ke AI Trip Planner |
| Direktori per Kategori | Grid/list kartu tempat: gambar, nama, kategori, ringkasan lokasi |
| Detail Tempat | Gambar, deskripsi, kategori, lokasi |
| Chat AI Trip Planner | Antarmuka chat (bubble percakapan, input teks bebas, riwayat pesan tersimpan selama sesi) mirip chatbot LLM, bukan form |
| Hasil Itinerary (dalam Chat) | Kartu itinerary terstruktur (tempat A → B → C dengan waktu/urutan) muncul inline di dalam alur chat |
| Panel Admin | Login, form tambah/ubah/hapus tempat, upload gambar |

### 3.3 Tone Visual
*(Elaborasi tim — perlu difinalisasi tim desain sebelum implementasi)*
- Warna dasar cerah namun tetap profesional, dapat mengambil inspirasi warna batik khas Pekalongan (mis. cokelat tanah, biru indigo, krem) sebagai aksen — bukan warna literal dari proposal karena proposal tidak menetapkan palet warna spesifik.
- Tipografi sederhana dan mudah dibaca di layar kecil.

### 3.4 Aset yang Perlu Disiapkan (sesuai ketentuan lomba)
- Sketsa UI, logo, palet warna, tata letak — sesuai dokumen kelengkapan teknis yang diwajibkan panitia lomba.

---

## 4. FLOWCHART

### 4.1 Flowchart Alur Pengguna Umum (Pengunjung)

```mermaid
flowchart TD
    A[Mulai: Buka Aplikasi PekaloJalan] --> B{Pilih Aksi}
    B -->|Lihat Direktori| C[Pilih Kategori: Wisata/Cafe/Resto/Penginapan/Hiburan/Oleh-oleh/Wisata Religi/Kuliner Kaki Lima]
    C --> D[Tampilkan Daftar Tempat]
    D --> E[Pilih Tempat]
    E --> F[Tampilkan Detail Tempat]
    F --> Z[Selesai]

    B -->|Gunakan AI Trip Planner| G[Buka Antarmuka Chat]
    G --> H[Ketik Permintaan dalam Bahasa Natural]
    H --> I[Backend Ambil Data Tempat Relevan dari Firestore]
    I --> J[Kirim Pesan + Riwayat Chat + Data Tempat ke Gemini API]
    J --> K[Gemini API Balas: Klarifikasi atau Susun Rencana Perjalanan]
    K --> L{Perlu Klarifikasi?}
    L -->|Ya| H
    L -->|Tidak, itinerary siap| M[Tampilkan Itinerary di dalam Chat]
    M --> N{Pengguna Ingin Revisi?}
    N -->|Ya| H
    N -->|Tidak| Z
    L --> Z
```

### 4.2 Flowchart Alur Admin

```mermaid
flowchart TD
    A[Mulai: Admin Buka Panel Admin] --> B[Login via Firebase Authentication]
    B --> C{Login Berhasil?}
    C -->|Tidak| B
    C -->|Ya| D{Pilih Aksi}
    D -->|Tambah Tempat| E[Isi Form Data Tempat + Upload Gambar]
    E --> F[Validasi Input]
    F --> G[Simpan ke Firestore & Storage sesuai Security Rules]
    D -->|Ubah Tempat| H[Pilih Tempat -> Edit Data]
    H --> F
    D -->|Hapus Tempat| I[Pilih Tempat -> Konfirmasi Hapus]
    I --> G
    G --> Z[Selesai]
```

---

## 5. USE CASE

### 5.1 Daftar Aktor
- **Pengunjung** (wisatawan/warga lokal, tanpa login)
- **Admin** (pengelola konten, login via Firebase Authentication)
- **Sistem AI (Gemini API)** — aktor eksternal yang berinteraksi via integrasi

### 5.2 Diagram Use Case (Mermaid)

```mermaid
flowchart LR
    Pengunjung((Pengunjung))
    Admin((Admin))
    Gemini([Gemini API])

    Pengunjung --> UC1[Lihat Direktori Tempat]
    Pengunjung --> UC2[Filter Berdasarkan Kategori]
    Pengunjung --> UC3[Lihat Detail Tempat]
    Pengunjung --> UC4[Chat dengan AI Trip Planner]
    UC4 --> UC5[Lihat Hasil Itinerary dalam Chat]
    UC4 --> UC11[Revisi Rencana via Chat Lanjutan]
    UC4 -.include.-> Gemini

    Admin --> UC6[Login Admin]
    Admin --> UC7[Tambah Data Tempat]
    Admin --> UC8[Ubah Data Tempat]
    Admin --> UC9[Hapus Data Tempat]
    Admin --> UC10[Upload Gambar Tempat]
    UC7 -.include.-> UC6
    UC8 -.include.-> UC6
    UC9 -.include.-> UC6
    UC10 -.include.-> UC6
```

### 5.3 Rincian Use Case Utama

#### UC4 — Chat dengan AI Trip Planner
- **Aktor**: Pengunjung
- **Prekondisi**: Aplikasi terbuka, data tempat tersedia di Firestore.
- **Alur Utama**:
  1. Pengunjung membuka antarmuka chat AI Trip Planner.
  2. Pengunjung mengetik permintaan dalam bahasa natural (kategori, budget, durasi, preferensi lain disebutkan bebas dalam kalimat).
  3. Sistem mengirim pesan + riwayat chat ke backend, backend mengambil data tempat relevan dari Firestore.
  4. Sistem mengirim pesan pengguna + riwayat chat + data tempat ke Gemini API.
  5. Gemini API merespons: jika informasi kurang, mengajukan pertanyaan klarifikasi (kembali ke langkah 2); jika cukup, mengembalikan rencana perjalanan.
  6. Sistem menampilkan hasil sebagai itinerary di dalam alur chat.
- **Alur Alternatif**: Pengunjung dapat mengirim pesan lanjutan untuk merevisi itinerary (mis. mengganti satu tempat), tanpa mengulang dari awal.
- **Postkondisi**: Pengunjung memperoleh rencana perjalanan terstruktur melalui percakapan.

#### UC7 — Tambah Data Tempat
- **Aktor**: Admin
- **Prekondisi**: Admin sudah login (terautentikasi).
- **Alur Utama**:
  1. Admin membuka form tambah tempat.
  2. Admin mengisi data (nama, kategori, deskripsi, lokasi) dan mengunggah gambar.
  3. Sistem memvalidasi input di sisi frontend dan backend/rules.
  4. Sistem menyimpan data ke Firestore dan gambar ke Storage sesuai Firebase Security Rules (hanya admin terautentikasi yang boleh menulis).
- **Alur Alternatif**: Jika validasi gagal, sistem menampilkan pesan error.
- **Postkondisi**: Data tempat baru tersimpan dan tampil di direktori publik.

---

## 6. SEQUENCE DIAGRAM

### 6.1 Sequence Diagram — AI Trip Planner (berbasis Chat)

```mermaid
sequenceDiagram
    actor U as Pengunjung
    participant FE as Frontend Chat UI (React)
    participant BE as Backend/Cloud Function
    participant FS as Firestore
    participant GM as Gemini API

    U->>FE: Ketik pesan (preferensi dalam bahasa natural)
    FE->>BE: Kirim pesan + riwayat chat sesi
    BE->>FS: Ambil data tempat relevan (read-only)
    FS-->>BE: Kembalikan data tempat
    BE->>GM: Kirim pesan + riwayat chat + data tempat (API key via environment variable)
    alt Informasi kurang
        GM-->>BE: Balasan berupa pertanyaan klarifikasi
        BE-->>FE: Tampilkan sebagai chat bubble
        FE-->>U: Tampilkan pertanyaan klarifikasi
        U->>FE: Jawab/lengkapi preferensi (lanjut chat)
        FE->>BE: Kirim pesan lanjutan + riwayat chat
        BE->>GM: Kirim ulang konteks lengkap
    else Informasi cukup
        GM-->>BE: Kembalikan susunan rencana perjalanan (itinerary)
        BE-->>FE: Kirim hasil itinerary
        FE-->>U: Tampilkan itinerary sebagai kartu di dalam chat
    end
    U->>FE: (Opsional) Minta revisi itinerary via chat
    FE->>BE: Kirim permintaan revisi + riwayat chat
    BE->>GM: Proses revisi dengan konteks itinerary sebelumnya
    GM-->>BE: Kembalikan itinerary revisi
    BE-->>FE: Kirim hasil revisi
    FE-->>U: Tampilkan itinerary terbaru
```

### 6.2 Sequence Diagram — Admin Kelola Data Tempat

```mermaid
sequenceDiagram
    actor A as Admin
    participant FE as Frontend (React)
    participant Auth as Firebase Authentication
    participant FS as Firestore
    participant ST as Firebase Storage

    A->>FE: Login (email/password)
    FE->>Auth: Kirim kredensial
    Auth-->>FE: Token autentikasi (berhasil)
    A->>FE: Isi form data tempat + pilih gambar
    FE->>FE: Validasi input
    FE->>ST: Upload gambar
    ST-->>FE: URL gambar tersimpan
    FE->>FS: Simpan data tempat (write, sesuai Security Rules akun admin)
    FS-->>FE: Konfirmasi tersimpan
    FE-->>A: Tampilkan notifikasi berhasil
```

---

