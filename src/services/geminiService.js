import { GoogleGenerativeAI } from '@google/generative-ai';
import { groundItinerary } from '../utils/itinerary.js';
import {
  MAKS_HARI,
  parsePermintaan,
  permintaanKosong,
  pilihTempatRelevan,
  ringkasPermintaanUntukAI,
  ringkasItinerary,
  cekKesesuaian
} from '../utils/tripIntent.js';
import { buatRencanaLokal, mintaRencana, bukaDalamRentang, SAPAAN_AWAL } from '../utils/localPlanner.js';

export { pilihTempatRelevan };

// Harga 0 dengan hargaTersedia === false = belum diketahui (bukan gratis)
const hargaDiketahui = (p) => p.hargaTersedia !== false;

// System instruction prompt for PekaloJalan AI Trip Planner
const createSystemInstruction = (placesDatabase, totalTempat = placesDatabase.length, permintaan = null) => {
  const placesFormatted = placesDatabase.map(p => {
    const harga = hargaDiketahui(p)
      ? `Rp ${(p.estimatedCost || 0).toLocaleString('id-ID')}`
      : 'harga belum diketahui';
    const rating = p.rating > 0 ? p.rating : 'belum ada';
    const wilayah = p.kecamatan ? ` | Kecamatan: ${p.kecamatan}` : '';
    const deskripsi = String(p.description || '').slice(0, 140);
    return `- Nama: ${p.name} | Kategori: ${p.category}${wilayah} | Harga Est: ${harga} | Alamat: ${p.address} | Rating: ${rating} | Jam Buka: ${p.openingHours} | Deskripsi: ${deskripsi}`;
  }).join('\n');

  return `
Kamu adalah "PekaloJalan AI Assistant", pemandu wisata cerdas dan ramah khas Kota Pekalongan ("Kota Batik").
Tugas utama kamu adalah membantu wisatawan dan warga lokal merencanakan perjalanan ideal di Kota Pekalongan secara percakapan (conversational).

DATA TEMPAT YANG TERSEDIA DI DATABASE PEKALONGAN (${placesDatabase.length} tempat paling relevan dari total ${totalTempat} tempat):
${placesFormatted}

PERMINTAAN PENGGUNA YANG WAJIB DIPATUHI (dibaca program dari percakapan, bukan tebakan):
${ringkasPermintaanUntukAI(permintaan)}

ATURAN DAN INSTRUKSI RESPONS:
1. Bersikaplah ramah, komunikatif, dan berikan nuansa lokal Pekalongan yang hangat (gunakan kata salam seperti "Halo Sedulur Pekalongan!").
2. Jangan bertanya lagi untuk hal yang sudah disebut pengguna (jumlah hari, anggaran, tempat tujuan). Jika jumlah hari atau jenis wisata sama sekali belum jelas, boleh ajukan satu pertanyaan klarifikasi singkat.
3. Jika informasi pengguna sudah cukup untuk membuat rencana perjalanan (itinerary), berikan penjelasan singkat yang menyenangkan DALAM TEKS PERCAKAPAN, lalu WAJIB sertakan blok JSON itinerary dengan format persis seperti di bawah ini agar sistem dapat menampilkan Kartu Itinerary Visual. Contoh di bawah hanya untuk FORMAT. Jumlah hari, tempat, dan biaya harus mengikuti permintaan pengguna dan daftar tempat di atas, bukan mengikuti contoh.

\`\`\`json
{
  "isItinerary": true,
  "title": "Rencana Jelajah Pekalongan 2 Hari",
  "duration": "2 Hari",
  "estimatedCostPerPerson": 160000,
  "summary": "Petualangan seru menikmati kerajinan batik, wisata religi bersejarah, dan kuliner Soto Tauto lezat.",
  "schedule": [
    {
      "day": 1,
      "time": "08:30 - 11:00",
      "period": "Pagi",
      "placeName": "Museum Batik Pekalongan",
      "activity": "Melihat koleksi batik nusantara dan belajar membatik tulis.",
      "estimatedCost": 10000
    },
    {
      "day": 1,
      "time": "12:00 - 13:30",
      "period": "Siang",
      "placeName": "Soto Tauto Pak Amir Kraton",
      "activity": "Makan siang dengan Soto Tauto khas tauco gurih pedas.",
      "estimatedCost": 25000
    },
    {
      "day": 2,
      "time": "08:30 - 11:00",
      "period": "Pagi",
      "placeName": "International Batik Center (IBC Pekalongan)",
      "activity": "Berbelanja oleh-oleh kain dan pakaian batik berkualitas.",
      "estimatedCost": 100000
    },
    {
      "day": 2,
      "time": "17:00 - 19:30",
      "period": "Malam",
      "placeName": "Taman Wisata Pasir Kencana (Pantai Pasir Kencana)",
      "activity": "Menikmati pemandangan sunset dan pertunjukan lampu di skywalk pantai.",
      "estimatedCost": 25000
    }
  ],
  "tips": [
    "Gunakan pakaian santai berbahan katun yang menyerap keringat.",
    "Bawa uang tunai secukupnya untuk jajan kuliner kaki lima."
  ]
}
\`\`\`

4. Setiap item schedule WAJIB punya field "day" berupa angka (1, 2, 3, dst). Jam ("time") dimulai ulang setiap hari. Isi "duration" dan judul dengan jumlah hari yang benar. Susun tempat yang berdekatan (kecamatan sama) pada hari yang sama agar perjalanan tidak bolak-balik. Maksimal ${MAKS_HARI} hari per rencana.
5. Rekomendasikan HANYA tempat yang ada di daftar di atas. Pada blok JSON, isi placeName persis sama dengan kolom Nama di daftar. Tempat di luar daftar akan dibuang oleh sistem. Tempat yang diminta langsung oleh pengguna WAJIB masuk jadwal.
6. Jika pengguna meminta revisi (misal "ganti resto B dengan yang murah" atau "jadikan 3 hari"), perbarui jadwalnya sesuai permintaan, pertahankan bagian lain yang tidak diminta berubah, dan sertakan kembali blok JSON terbarunya yang lengkap (semua hari).
7. Jangan mengarang harga, jam buka, rating, atau fasilitas. Jika data tertulis "harga belum diketahui", "belum ada", atau "belum tersedia", sampaikan apa adanya. "Harga belum diketahui" BUKAN berarti gratis.
8. Pada blok JSON, isi estimatedCost dengan 0 untuk tempat yang harganya belum diketahui. estimatedCostPerPerson hanya menjumlahkan harga yang diketahui, dan jelaskan di summary atau tips bahwa ada tempat yang harganya belum diketahui. Jika ada anggaran dari pengguna, jangan lewati anggaran itu.
9. Jika pengguna menanyakan tempat yang tidak ada di daftar, katakan terus terang bahwa tempat itu belum ada di database dan tawarkan alternatif terdekat dari daftar.
`;
};

const bersihkanTeks = (t) => String(t || '')
  .trim()
  .replace(/^["'“”]+|["'“”]+$/g, '')
  .replace(/\s+/g, ' ');

// Tolak jawaban yang kosong, terlalu pendek/panjang, berupa penolakan, atau tidak menyebut nama tempat.
export const validasiDeskripsi = (teks, nama) => {
  const t = bersihkanTeks(teks);
  if (t.length < 80 || t.length > 700) return null;
  if (/maaf|tidak dapat|tidak bisa|sebagai ai|\[|\]|\*\*|```/i.test(t)) return null;
  const kataNama = String(nama || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  if (kataNama.length && !kataNama.some((w) => t.toLowerCase().includes(w))) return null;
  return t;
};

const sumberDariResponse = (response) => {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return [...new Set(chunks.map((c) => c.web?.uri).filter(Boolean))].slice(0, 3);
};

/**
 * Generate narrative cultural/tourism description for a destination in Pekalongan.
 * Memakai data formulir sebagai fakta dasar, dilengkapi Google Search grounding bila tersedia.
 * Mengembalikan { text, sumber } — sumber berisi URL hasil pencarian web (boleh kosong).
 */
export const generatePlaceDescription = async ({
  name, category, categoryLabel, address, openingHours, priceRange, facilities = [], tags = []
}) => {
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const kategori = categoryLabel || category || 'destinasi';
  const alamat = address || 'Kota Pekalongan, Jawa Tengah';

  const prompt = `Kamu penulis profil destinasi untuk direktori wisata PekaloJalan, Kota Pekalongan.

DATA FORMULIR (satu-satunya fakta yang pasti):
Nama: ${name}
Kategori: ${kategori}
Alamat: ${alamat}
Jam buka: ${openingHours || 'tidak diisi'}
Kisaran harga: ${priceRange || 'tidak diisi'}
Fasilitas: ${facilities.length ? facilities.join(', ') : 'tidak diisi'}
Tag: ${tags.length ? tags.join(', ') : 'tidak diisi'}

Tugas: tulis 2-3 kalimat (maksimal 450 karakter) berbahasa Indonesia yang memikat dan spesifik untuk tempat bernama PERSIS "${name}".

Gunakan hasil pencarian Google untuk memverifikasi keunikan, sejarah, atau daya tarik tempat ini. Aturan wajib:
- Sebut nama "${name}" secara persis di awal kalimat.
- Jangan mengarang tahun, nama tokoh, alamat, harga, rating, atau fasilitas yang tidak ada di data formulir maupun hasil pencarian.
- Bila fakta sejarah/keunikan tidak ditemukan di pencarian, jelaskan daya tarik berdasarkan kategori, lokasi, fasilitas, dan jam buka saja. Jangan berspekulasi.
- Jangan menulis tanda kutip, markdown, atau kalimat pembuka seperti "Berikut adalah".`;

  // 1. Gemini native + Google Search grounding: paling akurat untuk fakta tempat
  if (geminiKey && geminiKey.startsWith('AIza')) {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const minta = (pakaiCari) => genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      ...(pakaiCari ? { tools: [{ googleSearch: {} }] } : {}),
      generationConfig: { temperature: 0.4 }
    }).generateContent(prompt);

    for (const pakaiCari of [true, false]) {
      try {
        const result = await minta(pakaiCari);
        const teks = validasiDeskripsi(result.response.text(), name);
        if (teks) return { text: teks, sumber: pakaiCari ? sumberDariResponse(result.response) : [] };
      } catch (err) {
        console.warn(`Gemini deskripsi (search=${pakaiCari}) gagal:`, err);
      }
    }
  }

  // 2. OpenRouter (tanpa grounding) — tetap divalidasi
  if (openRouterKey && openRouterKey.startsWith('sk-or-')) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': window.location?.href || 'http://localhost:5173',
          'X-Title': 'PekaloJalan AI Trip Planner',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4
        })
      });
      if (response.ok) {
        const data = await response.json();
        const teks = validasiDeskripsi(data.choices?.[0]?.message?.content, name);
        if (teks) return { text: teks, sumber: [] };
      } else {
        console.warn('OpenRouter API Failed:', response.statusText);
      }
    } catch (err) {
      console.warn('OpenRouter deskripsi gagal:', err);
    }
  }

  // 3. Fallback lokal: hanya dari data formulir, tanpa klaim tambahan
  const rincian = [
    openingHours ? `Buka ${openingHours}` : '',
    priceRange ? `kisaran biaya ${priceRange}` : '',
    facilities.length ? `fasilitas ${facilities.slice(0, 4).join(', ')}` : ''
  ].filter(Boolean).join(', ');

  return {
    text: `${name} adalah ${kategori.toLowerCase()} di ${alamat}${rincian ? ` dengan ${rincian}` : ''}. Tempat ini cocok untuk wisatawan yang ingin menikmati suasana khas Kota Pekalongan bersama keluarga maupun teman.`,
    sumber: []
  };
};

// ---------------------------------------------------------------------------
// Riwayat percakapan untuk model
// ---------------------------------------------------------------------------
/**
 * Rapikan riwayat agar aman untuk semua penyedia AI: dimulai dari pesan pengguna, selang-seling,
 * tidak berakhir di pesan pengguna (pesan baru dikirim terpisah), dan rencana sebelumnya diringkas
 * ke dalam teks supaya AI ingat isinya saat pengguna minta revisi.
 */
const bentukRiwayat = (history) => {
  const awal = (history || [])
    .filter((h) => h && h.text && (h.role === 'user' || h.role === 'model'))
    .map((h) => {
      const ringkas = h.role === 'model' ? ringkasItinerary(h.itinerary) : '';
      return { role: h.role, text: ringkas ? `${h.text}\n${ringkas}` : String(h.text) };
    });

  while (awal.length && awal[0].role !== 'user') awal.shift();

  const gabung = [];
  awal.forEach((m) => {
    const terakhir = gabung[gabung.length - 1];
    if (terakhir && terakhir.role === m.role) terakhir.text += `\n${m.text}`;
    else gabung.push({ ...m });
  });

  while (gabung.length && gabung[gabung.length - 1].role === 'user') gabung.pop();
  return gabung;
};

// ---------------------------------------------------------------------------
// Pemanggilan model AI (lewat server /api/chat, kunci API tidak ada di browser)
// ---------------------------------------------------------------------------
const MAKS_PERCOBAAN = 4; // jumlah model berbeda yang boleh dicoba untuk satu pesan pengguna

/**
 * Minta server mencoba model berikutnya di rantai (lihat src/config/aiModels.js).
 * `lewati` berisi id model yang jawabannya sudah ditolak pemeriksa di sini.
 * Melempar galat bila server tidak ada atau semua model tidak tersedia.
 */
const panggilServer = async (systemInstruction, riwayat, pesan, lewati) => {
  const messages = [
    ...riwayat.map((h) => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text })),
    { role: 'user', content: pesan }
  ];

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: systemInstruction, messages, lewati })
  });

  if (!response.ok) throw new Error(`Server AI tidak tersedia: ${response.status}`);
  const data = await response.json();
  if (!data || typeof data.text !== 'string' || !data.text) throw new Error('Server AI mengembalikan jawaban kosong');
  return data; // { text, modelId, dicoba }
};

// ---------------------------------------------------------------------------
// Membaca jawaban AI
// ---------------------------------------------------------------------------
// Ambil objek JSON { ... } yang mengandung "isItinerary" dari teks mentah (tanpa pagar ```)
const ambilObjekMentah = (teks) => {
  const idx = teks.indexOf('"isItinerary"');
  if (idx < 0) return null;
  const awal = teks.lastIndexOf('{', idx);
  if (awal < 0) return null;
  let kedalaman = 0;
  let dalamString = false;
  for (let i = awal; i < teks.length; i++) {
    const c = teks[i];
    if (dalamString) {
      if (c === '\\') i += 1;
      else if (c === '"') dalamString = false;
      continue;
    }
    if (c === '"') dalamString = true;
    else if (c === '{') kedalaman += 1;
    else if (c === '}') {
      kedalaman -= 1;
      if (kedalaman === 0) return teks.slice(awal, i + 1);
    }
  }
  return null;
};

const cobaParseJson = (json) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    try {
      return JSON.parse(json.replace(/,\s*([}\]])/g, '$1')); // koma berlebih di akhir daftar
    } catch (e2) {
      return null;
    }
  }
};

/**
 * Parses raw text from AI to separate natural conversation text from structured itinerary JSON
 */
export const parseAIResponse = (rawText) => {
  const teks = String(rawText || '');
  let itinerary = null;
  let cleanText = teks;

  // Cari blok JSON: pagar ``` (dengan atau tanpa kata json), lalu objek mentah tanpa pagar
  let json = null;
  let potong = null;
  for (const m of teks.matchAll(/```[a-zA-Z]*\s*([\s\S]*?)```/g)) {
    if (m[1].includes('"isItinerary"')) { json = m[1]; potong = m[0]; break; }
  }
  if (json === null) {
    const mentah = ambilObjekMentah(teks);
    if (mentah) { json = mentah; potong = mentah; }
  }

  if (json !== null) {
    const parsed = cobaParseJson(json);
    if (parsed && Array.isArray(parsed.schedule) && parsed.schedule.length > 0) {
      itinerary = { ...parsed, isItinerary: true };
      cleanText = teks.replace(potong, '').trim();
    } else {
      console.warn('Could not parse JSON block from AI output');
    }
  }

  // Jawaban terpotong: pagar dibuka tetapi tidak pernah ditutup. Jangan tampilkan JSON setengah jadi.
  if (!itinerary) {
    const buka = cleanText.indexOf('```json');
    if (buka >= 0 && cleanText.indexOf('```', buka + 7) < 0) cleanText = cleanText.slice(0, buka).trim();
  }

  return {
    text: cleanText,
    itinerary
  };
};

// Bersihkan jawaban AI: cocokkan itinerary dengan database (tempat tak dikenal dibuang, rute dirapikan per hari)
const olahJawaban = (teksMentah, places, permintaan = null) => {
  const hasil = parseAIResponse(teksMentah);
  if (!hasil.itinerary) return { ...hasil, itinerary: null, itineraryRusak: false };
  // Jika pengguna menentukan urutan waktu, susunan jam dari AI dijaga (hanya dirapikan pagi ke malam), tidak diacak oleh pengurut rute
  const adaSlot = !!(permintaan && permintaan.slotDiminta && permintaan.slotDiminta.length);
  const itinerary = groundItinerary(hasil.itinerary, places, { jagaUrutan: adaSlot });
  const teks = hasil.text || 'Berikut rencana perjalanan untuk Anda.';
  return { text: teks, itinerary, itineraryRusak: !itinerary };
};

// Tempat yang diminta pengguna pada waktu tertentu tetap dipakai, tetapi pengguna diberi tahu jika jam bukanya tidak cocok
const catatanJamBuka = (itinerary, permintaan) => {
  if (!itinerary || !Array.isArray(itinerary.schedule)) return [];
  return ((permintaan && permintaan.slotDiminta) || [])
    .filter((sl) => sl.place)
    .map((sl) => {
      const item = itinerary.schedule.find((s) => s.placeId === sl.place.id);
      if (!item || bukaDalamRentang(sl.place, item.time)) return '';
      return `Catatan: ${sl.place.name} sesuai permintaan Anda ada di ${item.period || 'jadwal'}, tetapi jam bukanya (${sl.place.openingHours}) mungkin tidak cocok. Cek dulu sebelum berangkat.`;
    })
    .filter(Boolean);
};
const denganCatatan = (hasil, permintaan) => {
  const catatan = catatanJamBuka(hasil.itinerary, permintaan);
  return catatan.length ? `${hasil.text}\n\n${catatan.join('\n')}` : hasil.text;
};

const periksaJawaban = (hasil, permintaan) => {
  const masalah = cekKesesuaian(hasil.itinerary, permintaan);
  if (hasil.itineraryRusak) masalah.push('Tidak ada satu pun placeName yang cocok dengan daftar tempat.');
  return masalah;
};

const jeda = (ms) => new Promise((r) => setTimeout(r, ms));

// Rencana tanpa AI: aturan pasti yang membaca hari, anggaran, dan tempat tujuan dari permintaan
const jawabanLokal = async (history, userMessage, places, permintaan) => {
  await jeda(800); // beri kesan memproses seperti AI
  if (!mintaRencana(userMessage, history, permintaan)) {
    return { text: SAPAAN_AWAL, itinerary: null, sumber: 'lokal' };
  }
  const hasil = buatRencanaLokal({ history, userMessage, places, permintaan });
  const itinerary = hasil.itinerary ? groundItinerary(hasil.itinerary, places, { jagaUrutan: true }) : null;
  return { text: hasil.text, itinerary, sumber: 'lokal' };
};

const kirimKeModel = async (history, userMessage, places, permintaan) => {
  const tempatRelevan = pilihTempatRelevan(places, history, userMessage, permintaan);
  const systemInstruction = createSystemInstruction(tempatRelevan, places.length, permintaan);
  const riwayat = bentukRiwayat(history);
  const lewati = [];

  // Rantai model: tiap jawaban diperiksa program. Lolos = dipakai. Gagal = minta model berikutnya.
  for (let percobaan = 0; percobaan < MAKS_PERCOBAAN; percobaan += 1) {
    try {
      const jawab = await panggilServer(systemInstruction, riwayat, userMessage, lewati);
      const hasil = olahJawaban(jawab.text, places, permintaan);
      const masalah = periksaJawaban(hasil, permintaan);
      if (masalah.length === 0) {
        return { text: denganCatatan(hasil, permintaan), itinerary: hasil.itinerary, sumber: 'ai', model: jawab.modelId };
      }
      console.warn(`Jawaban model "${jawab.modelId}" belum sesuai permintaan, mencoba model berikutnya:`, masalah);
      lewati.push(jawab.modelId);
    } catch (err) {
      console.warn('Rantai model AI berhenti:', err);
      break;
    }
  }

  // Server tidak ada, semua model habis kuota, atau tidak ada jawaban yang lolos pemeriksa:
  // pakai penyusun rencana lokal agar website tidak pernah error dan permintaan tetap terpenuhi.
  return jawabanLokal(history, userMessage, places, permintaan);
};

/**
 * Main AI Chat Service function
 * Alur: baca permintaan -> rantai model AI di server (cek kesesuaian tiap jawaban, ganti model bila gagal) -> penyusun lokal.
 * `history` adalah pesan SEBELUM pesan sekarang; tiap item { role, text, itinerary? }.
 */
export const sendMessageToGemini = async (history, userMessage, placesDatabase) => {
  const places = Array.isArray(placesDatabase) ? placesDatabase : [];
  const riwayat = Array.isArray(history) ? history : [];
  let permintaan;
  try {
    permintaan = parsePermintaan(userMessage, riwayat, places);
  } catch (err) {
    console.warn('Gagal membaca permintaan pengguna, memakai pengaturan bawaan:', err);
    permintaan = permintaanKosong();
  }
  return kirimKeModel(riwayat, userMessage, places, permintaan);
};
