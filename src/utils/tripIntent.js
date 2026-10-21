// Membaca permintaan pengguna dari percakapan (jumlah hari, anggaran, tempat tujuan, jenis wisata)
// dan memeriksa apakah rencana yang dibuat sudah memenuhinya. Semua fungsi di sini murni (tanpa
// jaringan), supaya hasilnya pasti dan mudah diuji.

export const MAKS_HARI = 7; // sama dengan pilihan hari di form Trip Plan PDF

// Kata kunci pengguna -> id kategori di CATEGORIES. Dicocokkan dari awal kata.
export const KATA_KATEGORI = {
  wisata: ['wisata', 'pantai', 'museum', 'taman', 'mangrove', 'kano', 'alam', 'budaya', 'edukasi'],
  cafe: ['cafe', 'kafe', 'kopi', 'ngopi', 'nongkrong', 'gelato'],
  resto: ['makan', 'resto', 'restoran', 'kuliner', 'warung', 'sarapan', 'soto', 'nasi', 'sate', 'bakso', 'seafood'],
  'street-food': ['kaki lima', 'jajan', 'angkringan', 'megono', 'tauto'],
  penginapan: ['hotel', 'penginapan', 'menginap', 'nginap', 'homestay', 'bermalam'],
  hiburan: ['hiburan', 'karaoke', 'bioskop', 'spa', 'pijat', 'fitness', 'rekreasi', 'playground'],
  'oleh-oleh': ['oleh', 'batik', 'belanja', 'suvenir', 'souvenir', 'pasar'],
  religi: ['religi', 'masjid', 'makam', 'ziarah', 'habib'],
  layanan: ['tour', 'travel', 'biro', 'pemandu', 'sewa', 'rental', 'transport', 'gedung', 'meeting', 'konferensi', 'rapat']
};
export const KATA_KECAMATAN = ['utara', 'timur', 'barat', 'selatan'];

const lepasRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const cocokKata = (teks, kata) => new RegExp('\\b' + lepasRegex(kata)).test(teks);

export const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const kataDari = (s) => { const n = norm(s); return n ? n.split(' ') : []; };

const ANGKA_KATA = { satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10 };

// ---------------------------------------------------------------------------
// Jumlah hari
// ---------------------------------------------------------------------------
/** Membaca jumlah hari dari satu teks. Mengembalikan { hari (1..MAKS_HARI), mentah } atau null. */
export const bacaHari = (teks) => {
  const t = String(teks || '').toLowerCase();
  let n = null;
  let m = t.match(/(\d{1,2})\s*(?:hari|hr)(?![a-z])/); // "2 hari", "3hari"
  if (m) n = parseInt(m[1], 10);
  if (n === null) {
    m = t.match(/\b(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\s+hari\b/);
    if (m) n = ANGKA_KATA[m[1]];
  }
  if (n === null && /\bsehari(?!\s*-\s*hari)\b/.test(t)) n = 1; // "sehari-hari" bukan jumlah hari
  if (n === null) {
    m = t.match(/\b(\d)\s*d\s*\d\s*n\b/); // "3d2n"
    if (m) n = parseInt(m[1], 10);
  }
  if (n === null) {
    // "2 malam" = 3 hari, tetapi "hari 1 malam restoran" artinya hari 1 pada waktu malam
    const reMalam = /(hari\s+(?:ke\s*)?)?(\d{1,2})\s*malam\b/g;
    let mm;
    while ((mm = reMalam.exec(t)) !== null) {
      if (!mm[1]) { n = parseInt(mm[2], 10) + 1; break; }
    }
  }
  if (n === null && /\b(seminggu|sepekan)\b/.test(t)) n = 7;
  if (n === null && /\b(weekend|akhir\s+pekan|akhir\s+minggu)\b/.test(t)) n = 2;
  if (n === null || !Number.isFinite(n) || n < 1) return null;
  return { hari: Math.min(n, MAKS_HARI), mentah: n };
};

// ---------------------------------------------------------------------------
// Anggaran
// ---------------------------------------------------------------------------
const ANGKA_UANG_MIN = 10000;
const ANGKA_UANG_MAKS = 1000000000;

/** Membaca anggaran dari satu teks. Mengembalikan { jumlah, tipe: 'perOrang'|'total' } atau null. */
export const bacaAnggaran = (teks) => {
  const t = String(teks || '').toLowerCase();
  const kandidat = []; // { idx, nilai }

  let m;
  const reSatuan = /(\d+(?:[.,]\d+)*)\s*(juta|jt|ribu|rb|k)\b/g;
  while ((m = reSatuan.exec(t)) !== null) {
    let mentah = m[1];
    if (/^\d{1,3}(\.\d{3})+$/.test(mentah)) mentah = mentah.replace(/\./g, ''); // "1.500" = seribu lima ratus
    else mentah = mentah.replace(',', '.');
    const angka = parseFloat(mentah);
    if (!Number.isFinite(angka)) continue;
    const kali = m[2] === 'juta' || m[2] === 'jt' ? 1000000 : 1000;
    kandidat.push({ idx: m.index, nilai: Math.round(angka * kali) });
  }

  const reRupiah = /\brp\.?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})(?![\d.,]*\s*(?:juta|jt|ribu|rb|k)\b)/g;
  while ((m = reRupiah.exec(t)) !== null) {
    kandidat.push({ idx: m.index, nilai: parseInt(m[1].replace(/[.,]/g, ''), 10) });
  }

  // "150.000" (tanpa lookbehind agar aman di browser lama)
  const reTitik = /(^|[^\d.,])(\d{1,3}(?:\.\d{3})+)(?![\d.,]*\s*(?:juta|jt|ribu|rb|k)\b)(?![\d.])/g;
  while ((m = reTitik.exec(t)) !== null) {
    kandidat.push({ idx: m.index + m[1].length, nilai: parseInt(m[2].replace(/\./g, ''), 10) });
  }

  const mSetengah = t.match(/\bsetengah\s+juta\b/);
  if (mSetengah) kandidat.push({ idx: mSetengah.index, nilai: 500000 });
  const mSejuta = t.match(/\bsejuta\b/);
  if (mSejuta) kandidat.push({ idx: mSejuta.index, nilai: 1000000 });
  const mRatus = t.match(/\b(se|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan)\s*ratus\s*(?:ribu|rb)\b/);
  if (mRatus) kandidat.push({ idx: mRatus.index, nilai: (mRatus[1] === 'se' ? 1 : ANGKA_KATA[mRatus[1]]) * 100000 });

  const layak = kandidat
    .filter((k) => Number.isFinite(k.nilai) && k.nilai >= ANGKA_UANG_MIN && k.nilai <= ANGKA_UANG_MAKS)
    .sort((a, b) => a.idx - b.idx);
  if (layak.length === 0) return null;
  const jumlah = layak[layak.length - 1].nilai; // yang paling akhir disebut

  let tipe = 'perOrang';
  if (/\b(per\s*orang|perorang|per\s*kepala|per\s*pax|pp)\b|\/\s*orang/.test(t)) tipe = 'perOrang';
  else if (/\b(total|keseluruhan|semuanya|seluruhnya|rombongan)\b/.test(t) || /untuk\s*\d+\s*orang/.test(t)) tipe = 'total';
  return { jumlah, tipe };
};

/** Jumlah orang yang disebut pengguna (null jika tidak disebut). */
export const bacaOrang = (teks) => {
  const t = String(teks || '').toLowerCase();
  const m = t.match(/(\d{1,2})\s*(?:orang|org|pax)\b/);
  if (m) { const n = parseInt(m[1], 10); return n >= 1 ? n : null; }
  if (/\bberdua\b/.test(t)) return 2;
  if (/\bbertiga\b/.test(t)) return 3;
  if (/\bberempat\b/.test(t)) return 4;
  return null;
};

// ---------------------------------------------------------------------------
// Tempat tujuan yang disebut pengguna
// ---------------------------------------------------------------------------
// Kata yang terlalu umum untuk dipakai sebagai ciri sebuah tempat
const GENERIK = new Set([
  'pekalongan', 'kota', 'taman', 'wisata', 'rumah', 'makan', 'warung', 'depot', 'toko', 'kedai', 'pak', 'bapak',
  'bu', 'ibu', 'mas', 'mbak', 'haji', 'cafe', 'kafe', 'resto', 'restoran', 'hotel', 'the', 'new', 'baru', 'jaya',
  'sari', 'indah', 'pusat', 'center', 'centre', 'kampung', 'kampoeng', 'pantai', 'dan', 'dengan', 'plaza', 'grand',
  'kuliner', 'pasar', 'masjid', 'makam', 'alun', 'rental', 'wedding', 'jawa', 'tengah', 'indonesia'
]);

// Kata sehari-hari yang tidak boleh dianggap nama tempat atau kata kunci pencarian
const STOP_KUNCI = new Set([
  'pekalongan', 'kota', 'rencana', 'rencanakan', 'jadwal', 'itinerary', 'trip', 'plan', 'buat', 'buatkan', 'tolong',
  'bantu', 'mau', 'ingin', 'pengen', 'pingin', 'saya', 'aku', 'kamu', 'anda', 'yang', 'dan', 'dengan', 'untuk',
  'dari', 'atau', 'juga', 'agar', 'supaya', 'bisa', 'dong', 'donk', 'nih', 'ini', 'itu', 'tersebut', 'hari', 'malam',
  'pagi', 'siang', 'sore', 'anggaran', 'budget', 'biaya', 'harga', 'murah', 'hemat', 'juta', 'ribu', 'orang',
  'tempat', 'wisata', 'liburan', 'jalan', 'berapa', 'sekitar', 'sekali', 'banyak', 'lebih', 'paling', 'tidak',
  'jangan', 'sama', 'bersama', 'keluarga', 'teman', 'pacar', 'semua', 'lagi', 'masih', 'sudah', 'akan', 'harus',
  'sedang', 'dalam', 'pada', 'adalah', 'kunjungan', 'kunjungi', 'kuliner', 'makan', 'minum', 'enak', 'bagus',
  'indah', 'sehat', 'seru', 'asik', 'santai', 'suka', 'senang', 'favorit', 'rekomendasi', 'saran', 'sarankan',
  'sebutkan', 'revisi', 'ganti', 'hapus', 'tambah', 'tambahkan', 'masukkan', 'masukin', 'sertakan', 'kurang',
  'cukup', 'total', 'perorang', 'weekend', 'akhir', 'pekan', 'minggu', 'satu', 'dua', 'tiga', 'empat', 'lima',
  'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'tolong', 'terima', 'kasih', 'makasih', 'terus', 'lalu',
  'kemudian', 'setelah', 'sebelum', 'sambil', 'kalau', 'jika', 'karena', 'tapi', 'namun', 'seperti', 'contoh',
  'misal', 'misalnya', 'tentang', 'ada', 'apa', 'siapa', 'dimana', 'kapan', 'bagaimana', 'kenapa', 'mana',
  'itinerary', 'sesuai', 'preferensi', 'berbeda', 'salah', 'atas', 'bawah', 'tempatnya', 'disana', 'sana', 'situ',
  'sini', 'ikut', 'jadi', 'menjadi', 'saja', 'aja', 'cuma', 'hanya', 'gratis', 'bayar', 'tradisional', 'modern',
  'nusantara', 'klasik', 'original', 'spesial', 'special', 'istimewa', 'lengkap', 'mewah', 'nyaman', 'bersih',
  'strategis', 'populer', 'terbaik', 'anak', 'dewasa', 'wisatawan', 'liburan', 'perjalanan', 'destinasi',
  'pengunjung', 'khas', 'lokal', 'sekitar', 'terdekat', 'dekat', 'jauh', 'ramai', 'sepi', 'estetik', 'instagramable'
]);

const NEGASI = new Set(['ganti', 'hapus', 'buang', 'tanpa', 'jangan', 'hilangkan', 'coret', 'skip', 'batalkan', 'keluarkan', 'kecuali', 'bukan']);
const SAMBUNG = new Set(['dengan', 'jadi', 'menjadi', 'pakai', 'dan', 'atau', 'ke', 'diganti', 'sama', 'lupa']);

const indeksFrasa = (tokens, frasaTokens) => {
  if (!frasaTokens.length) return -1;
  for (let i = 0; i + frasaTokens.length <= tokens.length; i++) {
    let ok = true;
    for (let j = 0; j < frasaTokens.length; j++) {
      if (tokens[i + j] !== frasaTokens[j]) { ok = false; break; }
    }
    if (ok) return i;
  }
  return -1;
};

const dinegasi = (tokens, pos) => {
  if (pos < 0) return false;
  for (let k = 1; k <= 4; k++) {
    const tk = tokens[pos - k];
    if (tk === undefined) return false;
    if (SAMBUNG.has(tk)) return false;
    if (NEGASI.has(tk)) return true;
  }
  return false;
};

const bangunIndeksNama = (places) => {
  const df = new Map();
  const dfDesk = new Map(); // jumlah tempat yang deskripsinya memuat kata ini
  const hitungDepan = new Map();
  const info = (places || []).map((p) => {
    const nama = String(p?.name || '');
    const tanpaKurung = nama.replace(/\([^)]*\)/g, ' ');
    const alias = [...nama.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
    const frasa = [...new Set([norm(nama), norm(tanpaKurung), ...alias.map(norm)])]
      .filter((f) => f.length >= 5 && !kataDari(f).every((k) => GENERIK.has(k)));
    const tokenNama = kataDari(tanpaKurung);
    const inti = [...new Set(tokenNama.filter((k) => k.length >= 4 && !GENERIK.has(k) && !STOP_KUNCI.has(k) && !/^\d+$/.test(k)))];
    // Frasa depan: awal nama sampai kata khas pertama, mis. "masjid agung", "pantai slamaran", "hotel santika"
    const iKhas = tokenNama.findIndex((k) => inti.includes(k));
    const depan = iKhas >= 1 ? tokenNama.slice(0, iKhas + 1).join(' ') : '';
    if (depan && depan.length >= 8 && !frasa.includes(depan)) hitungDepan.set(depan, (hitungDepan.get(depan) || 0) + 1);
    // Singkatan hanya dari dalam tanda kurung, mis. "(IBC Wiradesa)"
    const akronim = [...new Set(alias.flatMap((a) => (a.match(/\b[A-Z]{3,5}\b/g) || []).map((x) => x.toLowerCase())).filter((a) => !GENERIK.has(a) && !STOP_KUNCI.has(a)))];
    new Set([...inti, ...akronim]).forEach((k) => df.set(k, (df.get(k) || 0) + 1));
    const desk = new Set(kataDari(p?.description));
    desk.forEach((k) => dfDesk.set(k, (dfDesk.get(k) || 0) + 1));
    return { p, frasa, inti, akronim, depan, depanToken: iKhas >= 0 ? tokenNama[iKhas] : '', desk };
  });
  // Frasa depan hanya dipakai jika khas untuk satu tempat
  // dan kata khasnya bukan kata yang dipakai banyak tempat (mis. "batik")
  info.forEach((x) => {
    if (x.depan && hitungDepan.get(x.depan) === 1 && (df.get(x.depanToken) || 0) <= 2 && !x.frasa.includes(x.depan)) x.frasa.push(x.depan);
  });
  return { info, df, dfDesk };
};

/**
 * Cari tempat dari database yang disebut dalam satu teks. Pencocokan ketat supaya tidak salah tangkap:
 * 1) nama lengkap (atau nama dalam kurung) muncul utuh, atau
 * 2) kata khas nama tempat muncul berdekatan (mis. "pasir kencana", "slamaran").
 * Kata umum seperti "soto" atau "batik" saja tidak dianggap menyebut tempat tertentu.
 */
export const cariTempatDiminta = (teks, places, indeks = null) => {
  const tokens = kataDari(teks);
  if (!tokens.length || !places || !places.length) return [];
  const idx = indeks || bangunIndeksNama(places);
  const posisiToken = new Map();
  tokens.forEach((t, i) => { if (!posisiToken.has(t)) posisiToken.set(t, i); });
  const df1 = (k) => (idx.df.get(k) || 0) === 1;
  const hasil = [];

  idx.info.forEach(({ p, frasa, inti, akronim, desk }) => {
    let cocok = null;
    for (const f of frasa) {
      const ft = f.split(' ');
      if (indeksFrasa(tokens, ft) >= 0) { cocok = ft; break; }
    }
    if (!cocok && inti.length > 0) {
      const kena = inti.filter((k) => posisiToken.has(k));
      const t = inti.length;
      const m = kena.length;
      if (m >= 1) {
        const pos = kena.map((k) => posisiToken.get(k));
        const rentang = Math.max(...pos) - Math.min(...pos) + 1;
        // Kombinasi kata harus khas untuk SATU tempat saja (mis. "soto tauto" yang dimiliki banyak tempat tidak dihitung)
        const unik = () => idx.info.filter((x) => kena.every((k) => x.inti.includes(k))).length === 1;
        const semuaDekat = m === t && rentang <= t && (t >= 2 ? unik() : (df1(kena[0]) && kena[0].length >= 5));
        const sebagian = t >= 3 && m >= 2 && m / t >= 0.6 && rentang <= m + 1 && unik();
        // Satu kata langka, mis. "slamaran", "kanzus": hanya ada di satu nama tempat dan tidak dipakai sebagai kata biasa
        // di deskripsi tempat lain (supaya kata umum seperti "sunset" tidak salah dianggap nama tempat)
        const khas = kena.some((k) => k.length >= 6 && df1(k) && (idx.dfDesk.get(k) || 0) - (desk.has(k) ? 1 : 0) === 0);
        if (semuaDekat || sebagian || khas) cocok = kena;
      }
    }
    if (!cocok) {
      const ak = akronim.find((a) => posisiToken.has(a) && df1(a));
      if (ak) cocok = [ak];
    }
    if (cocok) {
      let pos = indeksFrasa(tokens, cocok);
      if (pos < 0) pos = tokens.indexOf(cocok[0]);
      hasil.push({ place: p, pos, len: cocok.length, tokens });
    }
  });
  return hasil;
};

/**
 * Kumpulkan tempat dari beberapa pesan (urut dari terlama): `wajib` untuk yang diminta,
 * `hindari` untuk yang diminta diganti/dibuang (pesan yang lebih baru menang).
 */
export const kumpulkanTempatDiminta = (teksUrut, places) => {
  if (!places || !places.length) return { wajib: [], hindari: [] };
  const indeks = bangunIndeksNama(places);
  const wajib = new Map();
  const hindari = new Map();
  teksUrut.forEach((teks) => {
    cariTempatDiminta(teks, places, indeks).forEach(({ place, pos, tokens }) => {
      if (dinegasi(tokens, pos)) { wajib.delete(place.id); hindari.set(place.id, place); }
      else { hindari.delete(place.id); wajib.set(place.id, place); }
    });
  });
  return { wajib: [...wajib.values()], hindari: [...hindari.values()] };
};

// ---------------------------------------------------------------------------
// Urutan waktu yang diminta pengguna ("pagi di hotel, siang ke museum batik, sore ke pantai, malam makan")
// ---------------------------------------------------------------------------
export const URUTAN_WAKTU = ['pagi', 'siang', 'sore', 'malam'];
export const LABEL_WAKTU = { pagi: 'Pagi', siang: 'Siang', sore: 'Sore', malam: 'Malam' };
const ANGKA_URUT = { pertama: 1, kedua: 2, ketiga: 3, keempat: 4, kelima: 5, keenam: 6, ketujuh: 7 };
const KATA_MAKAN = new Set(['makan', 'sarapan', 'ngopi', 'minum', 'nongkrong']);

// Kategori yang dianggap cocok untuk satu permintaan jenis tempat ("restoran" boleh juga jajanan kaki lima)
export const kategoriSlotSet = (id) => (id === 'resto' ? ['resto', 'street-food'] : [id]);
export const LABEL_KATEGORI = {
  wisata: 'tempat wisata', cafe: 'cafe', resto: 'restoran', 'street-food': 'jajanan kaki lima', penginapan: 'hotel atau penginapan',
  hiburan: 'tempat hiburan', 'oleh-oleh': 'toko oleh-oleh', religi: 'wisata religi', layanan: 'layanan wisata'
};

/** Jenis waktu ('pagi' | 'siang' | 'sore' | 'malam') dari satu item jadwal: dari field period, atau dari jam mulai. */
export const jenisWaktu = (item) => {
  const kata = kataDari(item && item.period);
  for (const w of URUTAN_WAKTU) if (kata.includes(w)) return w;
  const m = String((item && item.time) || '').match(/(\d{1,2})\s*[:.]\s*(\d{2})/);
  if (!m) return null;
  const j = Number(m[1]);
  return j < 11 ? 'pagi' : j < 14 ? 'siang' : j < 17 ? 'sore' : 'malam';
};

// Penanda hari: "hari 2", "hari ke 2", "hari kedua". Bukan "2 hari" (jumlah hari).
const bacaPenandaHari = (tokens, i) => {
  if (tokens[i] !== 'hari' && tokens[i] !== 'day') return null;
  const sebelum = tokens[i - 1];
  if (sebelum !== undefined && (/^\d+$/.test(sebelum) || ANGKA_KATA[sebelum])) return null;
  let j = i + 1;
  if (tokens[j] === 'ke') j += 1;
  const w = tokens[j];
  if (w === undefined) return null;
  let n = null;
  if (/^\d{1,2}$/.test(w)) n = parseInt(w, 10);
  else if (ANGKA_URUT[w]) n = ANGKA_URUT[w];
  else if (j === i + 2 && ANGKA_KATA[w]) n = ANGKA_KATA[w];
  if (!n || n < 1 || n > 31) return null;
  return { hari: n, panjang: j - i + 1 };
};

const kategoriPertama = (teks) => {
  let terbaik = null;
  let posTerbaik = Infinity;
  Object.entries(KATA_KATEGORI).forEach(([id, kata]) => {
    kata.forEach((k) => {
      const m = new RegExp('\\b' + lepasRegex(k)).exec(teks);
      if (m && m.index < posTerbaik) { posTerbaik = m.index; terbaik = id; }
    });
  });
  return terbaik;
};

/**
 * Baca urutan waktu dari satu pesan. Mengembalikan daftar { hari, waktu, place, kategori }:
 * `place` jika menyebut tempat tertentu, `kategori` jika hanya menyebut jenis tempat (mis. "restoran").
 * Mendukung "pagi ke X, siang ke Y", "hari 1 pagi ... hari 2 ...", dan "ke X pagi, ke Y siang".
 */
export const bacaSlotDiminta = (teks, places, indeks = null) => {
  const tokens = kataDari(teks);
  if (!tokens.length) return [];
  const idx = indeks || bangunIndeksNama(places || []);

  const tempatDiTeks = cariTempatDiminta(teks, places || [], idx);
  const terkunci = new Set(); // posisi kata yang bagian dari nama tempat ("Pasar Malam") bukan penanda waktu
  tempatDiTeks.forEach(({ pos, len }) => { for (let k = 0; k < len; k++) terkunci.add(pos + k); });

  // 1. Penanda hari dan penanda waktu
  const penanda = [];
  for (let i = 0; i < tokens.length; i++) {
    if (terkunci.has(i)) continue;
    const hari = bacaPenandaHari(tokens, i);
    if (hari) { penanda.push({ jenis: 'hari', i, akhir: i + hari.panjang - 1, hari: hari.hari }); i += hari.panjang - 1; continue; }
    const t = tokens[i];
    if (!URUTAN_WAKTU.includes(t)) continue;
    const sebelum = tokens[i - 1];
    if (sebelum === 'selamat') continue; // "selamat pagi"
    const habisPenandaHari = penanda.length > 0 && penanda[penanda.length - 1].jenis === 'hari' && penanda[penanda.length - 1].akhir === i - 1;
    if (t === 'malam' && !habisPenandaHari && sebelum !== undefined && (/^\d+$/.test(sebelum) || ANGKA_KATA[sebelum])) continue; // "2 malam"
    let akhir = i;
    while ((tokens[akhir + 1] === 'nya' || tokens[akhir + 1] === 'hari') && !bacaPenandaHari(tokens, akhir + 1)) akhir += 1;
    penanda.push({ jenis: 'waktu', i, akhir, waktu: t, awalMakan: KATA_MAKAN.has(sebelum) });
  }
  if (!penanda.some((m) => m.jenis === 'waktu')) return [];

  // 2. Isi tiap penanda waktu: kata-kata sesudahnya (gaya "pagi ke X"); jika tidak ada yang terisi,
  //    kata-kata sebelumnya (gaya "ke X pagi")
  const potong = (dari, sampai) => tokens.slice(Math.max(0, dari), Math.max(0, sampai)).join(' ');
  const isi = (teksSegmen) => {
    if (!teksSegmen) return { place: null, kategori: null };
    const kena = cariTempatDiminta(teksSegmen, places || [], idx).filter((x) => !dinegasi(x.tokens, x.pos));
    if (kena.length) return { place: kena.sort((a, b) => a.pos - b.pos)[0].place, kategori: null };
    return { place: null, kategori: kategoriPertama(teksSegmen) };
  };
  const segmenSesudah = (k) => {
    const m = penanda[k];
    const berikut = penanda[k + 1];
    let akhir = berikut ? berikut.i : tokens.length;
    if (berikut && berikut.jenis === 'waktu' && berikut.awalMakan) akhir -= 1; // "makan" milik waktu berikutnya
    return `${m.awalMakan ? 'makan ' : ''}${potong(m.akhir + 1, akhir)}`.trim();
  };
  const segmenSebelum = (k) => {
    const m = penanda[k];
    const awal = k > 0 ? penanda[k - 1].akhir + 1 : 0;
    const bagian = potong(awal, m.i - (m.awalMakan ? 1 : 0));
    return `${bagian}${m.awalMakan ? ' makan' : ''}`.trim();
  };

  const waktuIdx = penanda.map((m, k) => (m.jenis === 'waktu' ? k : -1)).filter((k) => k >= 0);
  // Pilih gaya baca yang mengisi lebih banyak slot (seri: gaya "pagi ke X")
  const terisi = (ambil) => waktuIdx.filter((k) => { const r = isi(ambil(k)); return r.place || r.kategori; }).length;
  const gayaSesudah = terisi(segmenSesudah) >= terisi(segmenSebelum);
  const adaHariEksplisit = penanda.some((m) => m.jenis === 'hari');
  const hariPesan = bacaHari(teks);
  const jumlahHariPesan = hariPesan ? hariPesan.hari : 0;

  // 3. Susun slot dengan hari berjalan
  const slot = [];
  let hari = 1;
  let urutTerakhir = -1;
  penanda.forEach((m, k) => {
    if (m.jenis === 'hari') { hari = m.hari; urutTerakhir = -1; return; }
    const r = isi(gayaSesudah ? segmenSesudah(k) : segmenSebelum(k));
    if (!r.place && !r.kategori) return;
    const urut = URUTAN_WAKTU.indexOf(m.waktu);
    // Tanpa penanda hari: jika pengguna menyebut 2 hari atau lebih, waktu yang berulang atau mundur = hari berikutnya
    if (!adaHariEksplisit && jumlahHariPesan >= 2 && urut <= urutTerakhir) hari += 1;
    urutTerakhir = urut;
    slot.push({ hari, waktu: m.waktu, place: r.place, kategori: r.kategori });
  });

  // Tempat yang sama tidak dipakai dua kali
  const sudah = new Set();
  return slot.filter((s) => s.hari >= 1 && s.hari <= MAKS_HARI).filter((s) => {
    if (!s.place) return true;
    if (sudah.has(s.place.id)) return false;
    sudah.add(s.place.id);
    return true;
  });
};

// ---------------------------------------------------------------------------
// Gabungan: permintaan dari seluruh percakapan
// ---------------------------------------------------------------------------
export const permintaanKosong = () => ({
  hari: null, hariMentah: null, hariDipotong: false, anggaranPerOrang: null, anggaranTotal: null, orang: null,
  tempatDiminta: [], tempatDihindari: [], kategoriDiminta: [], hemat: false, slotDiminta: []
});

/**
 * Baca permintaan dari pesan sekarang dan beberapa pesan pengguna sebelumnya.
 * Untuk hari, anggaran, dan jumlah orang, yang dipakai adalah pesan terbaru yang menyebutkannya.
 */
export const parsePermintaan = (userMessage, history = [], places = []) => {
  const lama = (history || []).filter((h) => h && h.role === 'user' && h.text).map((h) => String(h.text)).slice(-5);
  const teksUrut = [...lama, String(userMessage || '')]; // terlama -> terbaru
  const terbaruDulu = [...teksUrut].reverse();

  let hari = null;
  let hariMentah = null;
  let anggaran = null;
  let orang = null;
  for (const t of terbaruDulu) {
    if (hari === null) { const h = bacaHari(t); if (h) { hari = h.hari; hariMentah = h.mentah; } }
    if (anggaran === null) { const a = bacaAnggaran(t); if (a) anggaran = a; }
    if (orang === null) { const o = bacaOrang(t); if (o) orang = o; }
  }

  const anggaranPerOrang = anggaran
    ? (anggaran.tipe === 'total' && orang && orang > 1 ? Math.round(anggaran.jumlah / orang) : anggaran.jumlah)
    : null;

  const { wajib, hindari } = kumpulkanTempatDiminta(teksUrut.slice(-4), places);

  // Urutan waktu: dari pesan terbaru yang menyebutkannya. Tempat yang diminta dibuang tidak dipakai.
  let slotDiminta = [];
  if (places && places.length) {
    const indeksNama = bangunIndeksNama(places);
    for (const t of terbaruDulu) {
      let s = [];
      try { s = bacaSlotDiminta(t, places, indeksNama); } catch (e) { s = []; }
      if (s.length) { slotDiminta = s; break; }
    }
  }
  const idHindari = new Set(hindari.map((x) => x.id));
  if (slotDiminta.some((s) => s.place && idHindari.has(s.place.id))) {
    // Tempat pada slot diminta diganti: pengganti yang disebut di pesan terbaru menempati slot yang sama,
    // jika tidak ada pengganti, slot tetap ada dengan jenis tempat yang sama
    const dipakaiSlot = new Set(slotDiminta.filter((s) => s.place && !idHindari.has(s.place.id)).map((s) => s.place.id));
    const pengganti = places && places.length
      ? cariTempatDiminta(String(userMessage || ''), places).filter((x) => !dinegasi(x.tokens, x.pos))
          .sort((a, b) => a.pos - b.pos).map((x) => x.place)
          .filter((pl) => !dipakaiSlot.has(pl.id) && !idHindari.has(pl.id))
      : [];
    slotDiminta = slotDiminta.map((s) => {
      if (!s.place || !idHindari.has(s.place.id)) return s;
      const baru = pengganti.shift();
      if (baru) { dipakaiSlot.add(baru.id); return { ...s, place: baru, kategori: null }; }
      return { ...s, place: null, kategori: s.place.category };
    });
  }
  const tempatWajib = [...wajib];
  slotDiminta.forEach((s) => { if (s.place && !tempatWajib.some((x) => x.id === s.place.id)) tempatWajib.push(s.place); });
  if (slotDiminta.length) {
    const hariSlot = Math.max(...slotDiminta.map((s) => s.hari));
    if (hari === null || hari < hariSlot) { hari = hariSlot; hariMentah = hariSlot; }
  }
  const konteks = teksUrut.slice(-3).join(' ').toLowerCase();
  const kategoriDiminta = Object.entries(KATA_KATEGORI)
    .filter(([, kata]) => kata.some((k) => cocokKata(konteks, k)))
    .map(([id]) => id);

  return {
    hari,
    hariMentah,
    hariDipotong: hariMentah !== null && hariMentah > MAKS_HARI,
    anggaranPerOrang,
    anggaranTotal: anggaran && anggaran.tipe === 'total' ? anggaran.jumlah : null,
    orang,
    tempatDiminta: tempatWajib,
    tempatDihindari: hindari,
    kategoriDiminta,
    hemat: /\b(murah|hemat|backpacker|irit|terjangkau)\b/.test(konteks),
    slotDiminta
  };
};

// ---------------------------------------------------------------------------
// Pengurutan tempat berdasarkan kecocokan dengan percakapan
// ---------------------------------------------------------------------------
// Teks percakapan terbaru: pesan sekarang + dua pesan pengguna sebelumnya
export const bangunKonteks = (history = [], userMessage = '') =>
  [userMessage, ...(history || []).filter((h) => h && h.role === 'user').slice(-2).map((h) => h.text)]
    .join(' ')
    .toLowerCase();

// Skor mutu data: tempat yang sudah dikurasi dan lengkap diutamakan
const skorMutuTempat = (p) => {
  let skor = 0;
  if (p.statusData !== 'belum-dikurasi') skor += 30; // data awal buatan tangan (tanpa penanda) dianggap terkurasi
  if (p.featured) skor += 15;
  if (p.rating > 0) skor += Math.min(p.rating, 5) * 2;
  skor += (p.kelengkapan || 0) / 10;
  return skor;
};

const ambilKataKunci = (konteks) =>
  [...new Set(kataDari(konteks).filter((k) => k.length >= 4 && !STOP_KUNCI.has(k) && !/^\d+$/.test(k)))];

const skorKataKunci = (p, kataKunci) => {
  if (!kataKunci.length) return 0;
  const namaTok = new Set(kataDari(`${p.name || ''} ${(Array.isArray(p.tags) ? p.tags : []).join(' ')}`));
  const deskTok = new Set(kataDari(p.description));
  let n = 0;
  let d = 0;
  kataKunci.forEach((k) => { if (namaTok.has(k)) n += 1; else if (deskTok.has(k)) d += 1; });
  return Math.min(36, n * 12) + Math.min(12, d * 3);
};

/** Urutkan SEMUA tempat dari yang paling relevan. Mengembalikan juga skor tiap tempat dan kategori yang diminta. */
export const urutkanTempat = (places, konteks, permintaan = null) => {
  const kategoriDiminta = new Set(
    Object.entries(KATA_KATEGORI)
      .filter(([, kata]) => kata.some((k) => cocokKata(konteks, k)))
      .map(([id]) => id)
  );
  const kecamatanDiminta = KATA_KECAMATAN.filter((k) => cocokKata(konteks, k));
  const kataKunci = ambilKataKunci(konteks);
  const wajib = new Set((permintaan?.tempatDiminta || []).map((p) => p.id));
  const skorById = {};

  const dinilai = (places || []).map((p) => {
    let skor = skorMutuTempat(p);
    if (kategoriDiminta.has(p.category)) skor += 40;
    const kec = String(p.kecamatan || p.address || '').toLowerCase();
    if (kecamatanDiminta.some((k) => kec.includes(k))) skor += 25;
    const kunciNama = String(p.name || '').toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').trim();
    if (kunciNama.length > 3 && konteks.includes(kunciNama)) skor += 100; // pengguna menyebut nama tempat
    skor += skorKataKunci(p, kataKunci);
    if (wajib.has(p.id)) skor += 200; // tempat yang diminta pengguna
    skorById[p.id] = skor;
    return { p, skor };
  });
  dinilai.sort((a, b) => b.skor - a.skor || String(a.p.name || '').localeCompare(String(b.p.name || '')));
  return { urut: dinilai.map((d) => d.p), skorById, kategoriDiminta, adaKategoriDiminta: kategoriDiminta.size > 0 };
};

const MAKS_TEMPAT_UNTUK_AI = 40;
const MAKS_TEMPAT_UNTUK_AI_BERKATEGORI = 50;
const MAKS_TEMPAT_UNTUK_AI_TERTINGGI = 80;

/** Pilih tempat yang dikirim ke AI. Tempat yang diminta pengguna pasti ikut; makin banyak hari, makin banyak pilihan. */
export const pilihTempatRelevan = (places, history, userMessage, permintaan = null) => {
  const { urut, adaKategoriDiminta } = urutkanTempat(places, bangunKonteks(history, userMessage), permintaan);
  const hari = permintaan?.hari || 1;
  const dasar = adaKategoriDiminta ? MAKS_TEMPAT_UNTUK_AI_BERKATEGORI : MAKS_TEMPAT_UNTUK_AI;
  const batas = Math.min(MAKS_TEMPAT_UNTUK_AI_TERTINGGI, dasar + (hari - 1) * 10);

  let hasil;
  if (urut.length <= batas) {
    hasil = urut;
  } else {
    // Jaminan keragaman: tiap kategori minimal punya wakil, agar rencana perjalanan tidak timpang
    const perKategori = adaKategoriDiminta ? 1 : 3;
    const terpilih = new Map();
    const hitung = {};
    for (const p of urut) {
      hitung[p.category] = hitung[p.category] || 0;
      if (hitung[p.category] < perKategori) {
        terpilih.set(p.id, p);
        hitung[p.category] += 1;
      }
    }
    for (const p of urut) {
      if (terpilih.size >= batas) break;
      terpilih.set(p.id, p);
    }
    hasil = urut.filter((p) => terpilih.has(p.id));
  }

  const ada = new Set(hasil.map((p) => p.id));
  const tambahan = (permintaan?.tempatDiminta || []).filter((p) => !ada.has(p.id));
  return tambahan.length ? [...tambahan, ...hasil] : hasil;
};

// ---------------------------------------------------------------------------
// Teks untuk AI dan pemeriksaan hasil
// ---------------------------------------------------------------------------
const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

/** Ringkasan permintaan pengguna untuk ditempel ke prompt AI. */
export const ringkasPermintaanUntukAI = (permintaan) => {
  const p = permintaan || permintaanKosong();
  const baris = [];
  if (p.hari) {
    baris.push(`- Jumlah hari: ${p.hari}. Isi schedule untuk TEPAT ${p.hari} hari (day 1 sampai day ${p.hari}), tiap hari 3 sampai 5 tempat. JANGAN memendekkan menjadi 1 hari dan JANGAN menambah hari.`);
    if (p.hariDipotong) baris.push(`- Pengguna meminta ${p.hariMentah} hari, tetapi batas sistem ${MAKS_HARI} hari. Buat ${MAKS_HARI} hari dan jelaskan batas ini di teks.`);
  } else {
    baris.push('- Pengguna belum menyebut jumlah hari. Jika tidak bisa disimpulkan dari percakapan, buat 1 hari lalu tawarkan versi lebih lama.');
  }
  if (p.anggaranPerOrang) {
    baris.push(`- Anggaran: maksimal ${rupiah(p.anggaranPerOrang)} per orang. estimatedCostPerPerson tidak boleh melebihi angka ini, kecuali karena tempat wajib di bawah.`);
  }
  if (p.tempatDiminta && p.tempatDiminta.length) {
    baris.push(`- Tempat yang WAJIB masuk schedule (pengguna memintanya langsung): ${p.tempatDiminta.map((x) => x.name).join('; ')}. Tulis placeName persis seperti di daftar.`);
  }
  if (p.tempatDihindari && p.tempatDihindari.length) {
    baris.push(`- Tempat yang TIDAK boleh dimasukkan (pengguna meminta menggantinya atau membuangnya): ${p.tempatDihindari.map((x) => x.name).join('; ')}.`);
  }
  if (p.slotDiminta && p.slotDiminta.length) {
    const jam = { pagi: '08:30 - 11:00', siang: '11:30 - 13:30', sore: '14:00 - 16:30', malam: '17:00 - 19:30' };
    const daftar = p.slotDiminta.map((s) => {
      const isi = s.place ? `"${s.place.name}"` : `satu tempat berkategori ${kategoriSlotSet(s.kategori).join(' atau ')} (${LABEL_KATEGORI[s.kategori] || s.kategori}) pilihanmu dari daftar`;
      return `Hari ${s.hari} ${LABEL_WAKTU[s.waktu]} (jam sekitar ${jam[s.waktu]}): ${isi}`;
    });
    baris.push(`- URUTAN WAKTU dari pengguna, WAJIB persis (field "day", "period", dan "time" harus sesuai; period diisi "Pagi", "Siang", "Sore", atau "Malam"). Slot lain yang tidak disebut boleh kamu isi sendiri, dan urutkan item tiap hari dari pagi sampai malam: ${daftar.join('; ')}.`);
  }
  if (p.kategoriDiminta && p.kategoriDiminta.length) {
    baris.push(`- Jenis tempat yang diminati (kategori): ${p.kategoriDiminta.join(', ')}. Utamakan jenis ini.`);
  }
  if (p.hemat) baris.push('- Pengguna ingin hemat. Utamakan tempat gratis atau murah.');
  return baris.join('\n');
};

/** Ringkasan satu baris tentang itinerary, ditempel ke riwayat percakapan agar AI ingat rencana sebelumnya. */
export const ringkasItinerary = (itinerary) => {
  if (!itinerary || !Array.isArray(itinerary.schedule) || itinerary.schedule.length === 0) return '';
  const perHari = new Map();
  itinerary.schedule.forEach((s) => {
    if (!s) return;
    const h = Number(s.day) || 1;
    if (!perHari.has(h)) perHari.set(h, []);
    perHari.get(h).push(s.placeName);
  });
  const bagian = [...perHari.entries()].sort((a, b) => a[0] - b[0]).map(([h, nama]) => `Hari ${h}: ${nama.join(', ')}`);
  return `[Rencana yang sudah ditampilkan ke pengguna. ${bagian.join('; ')}]`;
};

/**
 * Periksa itinerary (yang sudah dicocokkan dengan database) terhadap permintaan pengguna.
 * Mengembalikan daftar masalah; kosong berarti sesuai.
 */
export const cekKesesuaian = (itinerary, permintaan) => {
  const masalah = [];
  const p = permintaan || permintaanKosong();
  const jadwal = itinerary && Array.isArray(itinerary.schedule) ? itinerary.schedule : [];

  if (jadwal.length === 0) {
    if (p.hari || (p.tempatDiminta && p.tempatDiminta.length)) {
      masalah.push('Belum ada blok JSON itinerary yang valid dengan tempat dari daftar.');
    }
    return masalah;
  }

  const hariTerisi = new Set(jadwal.map((s) => Number(s.day) || 1)).size;
  if (p.hari && hariTerisi !== p.hari) {
    masalah.push(`Jadwal berisi ${hariTerisi} hari, padahal pengguna meminta ${p.hari} hari. Tiap item schedule wajib punya field day (1 sampai ${p.hari}).`);
  }

  const idDipakai = new Set(jadwal.map((s) => s.placeId).filter(Boolean));
  const terlarang = (p.tempatDihindari || []).filter((x) => idDipakai.has(x.id));
  if (terlarang.length) masalah.push(`Tempat yang diminta dibuang masih ada di jadwal: ${terlarang.map((x) => x.name).join('; ')}.`);
  const hilang = (p.tempatDiminta || []).filter((x) => !idDipakai.has(x.id));
  if (hilang.length) masalah.push(`Tempat wajib belum masuk jadwal: ${hilang.map((x) => x.name).join('; ')}.`);

  (p.slotDiminta || []).forEach((sl) => {
    const nama = sl.place ? sl.place.name : (LABEL_KATEGORI[sl.kategori] || sl.kategori);
    const lokasi = `hari ${sl.hari} waktu ${sl.waktu}`;
    const diHariItu = jadwal.filter((s) => (Number(s.day) || 1) === sl.hari);
    if (sl.place) {
      const item = jadwal.find((s) => s.placeId === sl.place.id);
      if (!item || (Number(item.day) || 1) !== sl.hari || jenisWaktu(item) !== sl.waktu) {
        masalah.push(`${sl.place.name} harus dijadwalkan pada ${lokasi} (period "${LABEL_WAKTU[sl.waktu]}").`);
      }
    } else {
      const cocok = kategoriSlotSet(sl.kategori);
      const adaTanpaKategori = diHariItu.some((s) => s.kategori === undefined);
      const ada = diHariItu.some((s) => jenisWaktu(s) === sl.waktu && cocok.includes(s.kategori));
      if (!ada && !adaTanpaKategori) masalah.push(`Pada ${lokasi} wajib ada satu ${nama} (kategori ${cocok.join(' atau ')}) dengan period "${LABEL_WAKTU[sl.waktu]}".`);
    }
  });

  if (p.anggaranPerOrang) {
    const idWajib = new Set((p.tempatDiminta || []).map((x) => x.id));
    const biayaOpsional = jadwal.filter((s) => !idWajib.has(s.placeId)).reduce((t, s) => t + (Number(s.estimatedCost) || 0), 0);
    const total = Number(itinerary.estimatedCostPerPerson) || 0;
    if (total > p.anggaranPerOrang && biayaOpsional > 0) {
      masalah.push(`Biaya ${rupiah(total)} per orang melebihi anggaran ${rupiah(p.anggaranPerOrang)}. Ganti tempat lain dengan yang lebih murah atau gratis.`);
    }
  }
  return masalah;
};
