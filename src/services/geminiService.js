import { GoogleGenerativeAI } from '@google/generative-ai';
import { groundItinerary } from '../utils/itinerary.js';

// ---------------------------------------------------------------------------
// Pemilihan tempat untuk AI
// Database bisa berisi ratusan tempat. Mengirim semuanya membuat jawaban lambat
// dan berisiko terpotong, jadi hanya tempat yang relevan dengan percakapan yang dikirim.
// ---------------------------------------------------------------------------
const MAKS_TEMPAT_UNTUK_AI = 40;
const MAKS_TEMPAT_UNTUK_AI_BERKATEGORI = 50;

// Kata kunci pengguna -> id kategori di CATEGORIES. Dicocokkan dari awal kata.
const KATA_KATEGORI = {
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
const KATA_KECAMATAN = ['utara', 'timur', 'barat', 'selatan'];

const cocokKata = (teks, kata) => new RegExp('\\b' + kata.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(teks);

// Teks percakapan terbaru: pesan sekarang + dua pesan pengguna sebelumnya
const bangunKonteks = (history = [], userMessage = '') =>
  [userMessage, ...history.filter((h) => h.role === 'user').slice(-2).map((h) => h.text)]
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

// Urutkan SEMUA tempat dari yang paling relevan
const urutkanTempat = (places, konteks) => {
  const kategoriDiminta = new Set(
    Object.entries(KATA_KATEGORI)
      .filter(([, kata]) => kata.some((k) => cocokKata(konteks, k)))
      .map(([id]) => id)
  );
  const kecamatanDiminta = KATA_KECAMATAN.filter((k) => cocokKata(konteks, k));

  const dinilai = places.map((p) => {
    let skor = skorMutuTempat(p);
    if (kategoriDiminta.has(p.category)) skor += 40;
    const kec = (p.kecamatan || p.address || '').toLowerCase();
    if (kecamatanDiminta.some((k) => kec.includes(k))) skor += 25;
    const kunciNama = (p.name || '').toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').trim();
    if (kunciNama.length > 3 && konteks.includes(kunciNama)) skor += 100; // pengguna menyebut nama tempat
    return { p, skor };
  });
  dinilai.sort((a, b) => b.skor - a.skor || a.p.name.localeCompare(b.p.name));
  return { urut: dinilai.map((d) => d.p), adaKategoriDiminta: kategoriDiminta.size > 0 };
};

export const pilihTempatRelevan = (places, history, userMessage) => {
  const { urut, adaKategoriDiminta } = urutkanTempat(places, bangunKonteks(history, userMessage));
  const batas = adaKategoriDiminta ? MAKS_TEMPAT_UNTUK_AI_BERKATEGORI : MAKS_TEMPAT_UNTUK_AI;
  if (urut.length <= batas) return urut;

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
  return urut.filter((p) => terpilih.has(p.id));
};

// Harga 0 dengan hargaTersedia === false = belum diketahui (bukan gratis)
const hargaDiketahui = (p) => p.hargaTersedia !== false;

// System instruction prompt for PekaloJalan AI Trip Planner
const createSystemInstruction = (placesDatabase, totalTempat = placesDatabase.length) => {
  const placesFormatted = placesDatabase.map(p => {
    const harga = hargaDiketahui(p)
      ? `Rp ${(p.estimatedCost || 0).toLocaleString('id-ID')}`
      : 'harga belum diketahui';
    const rating = p.rating > 0 ? p.rating : 'belum ada';
    const wilayah = p.kecamatan ? ` | Kecamatan: ${p.kecamatan}` : '';
    const deskripsi = (p.description || '').slice(0, 140);
    return `- Nama: ${p.name} | Kategori: ${p.category}${wilayah} | Harga Est: ${harga} | Alamat: ${p.address} | Rating: ${rating} | Jam Buka: ${p.openingHours} | Deskripsi: ${deskripsi}`;
  }).join('\n');

  return `
Kamu adalah "PekaloJalan AI Assistant", pemandu wisata cerdas dan ramah khas Kota Pekalongan ("Kota Batik").
Tugas utama kamu adalah membantu wisatawan dan warga lokal merencanakan perjalanan ideal di Kota Pekalongan secara percakapan (conversational).

DATA TEMPAT YANG TERSEDIA DI DATABASE PEKALONALAN (${placesDatabase.length} tempat paling relevan dari total ${totalTempat} tempat):
${placesFormatted}

ATURAN DAN INSTRUKSI RESPONS:
1. Bersikaplah ramah, komunikatif, dan berikan nuansa lokal Pekalongan yang hangat (gunakan kata salam seperti "Halo Sedulur Pekalongan!").
2. Jika pengguna belum memberikan detail preferensi yang jelas (seperti durasi hari, perkiraan anggaran, atau jenis wisata yang disukai), kamu boleh mengajukan pertanyaan klarifikasi yang singkat dan relevan.
3. Jika informasi pengguna sudah cukup untuk membuat rencana perjalanan (itinerary), berikan penjelasan singkat yang menyenangkan DALAM TEKS PERCAKAPAN, lalu WAJIB sertakan blok JSON itinerary dengan format persis seperti di bawah ini agar sistem dapat menampilkan Kartu Itinerary Visual:

\`\`\`json
{
  "isItinerary": true,
  "title": "Rencana Jelajah Pekalongan 1 Hari",
  "duration": "1 Hari",
  "estimatedCostPerPerson": 150000,
  "summary": "Petualangan seru menikmati kerajinan batik, wisata religi bersejarah, dan kuliner Soto Tauto lezat.",
  "schedule": [
    {
      "time": "08:30 - 11:00",
      "period": "Pagi",
      "placeName": "Museum Batik Pekalongan",
      "activity": "Melihat koleksi batik nusantara dan belajar membatik tulis.",
      "estimatedCost": 10000
    },
    {
      "time": "12:00 - 13:30",
      "period": "Siang",
      "placeName": "Soto Tauto Pak Amir Kraton",
      "activity": "Makan siang dengan Soto Tauto khas tauco gurih pedas.",
      "estimatedCost": 25000
    },
    {
      "time": "14:00 - 16:30",
      "period": "Sore",
      "placeName": "International Batik Center (IBC Pekalongan)",
      "activity": "Berbelanja oleh-oleh kain dan pakaian batik berkualitas.",
      "estimatedCost": 100000
    },
    {
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

4. Rekomendasikan HANYA tempat yang ada di daftar di atas. Pada blok JSON, isi placeName persis sama dengan kolom Nama di daftar. Tempat di luar daftar akan dibuang oleh sistem. Susun tempat yang berdekatan (kecamatan sama) pada hari yang sama agar perjalanan tidak bolak-balik.
5. Jika pengguna meminta revisi (misal "ganti resto B dengan yang murah"), perbarui jadwalnya dan sertakan kembali blok JSON terbarunya.
6. Jangan mengarang harga, jam buka, rating, atau fasilitas. Jika data tertulis "harga belum diketahui", "belum ada", atau "belum tersedia", sampaikan apa adanya. "Harga belum diketahui" BUKAN berarti gratis.
7. Pada blok JSON, isi estimatedCost dengan 0 untuk tempat yang harganya belum diketahui. estimatedCostPerPerson hanya menjumlahkan harga yang diketahui, dan jelaskan di summary atau tips bahwa ada tempat yang harganya belum diketahui.
8. Jika pengguna menanyakan tempat yang tidak ada di daftar, katakan terus terang bahwa tempat itu belum ada di database dan tawarkan alternatif terdekat dari daftar.
`;
};

/**
 * Generate narrative cultural/tourism description for a destination in Pekalongan
 */
export const generatePlaceDescription = async (name, category, address) => {
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const prompt = `Tuliskan 2 kalimat deskripsi singkat, memikat, dan bernuansa lokal khas Kota Pekalongan ("Kota Batik") untuk destinasi berikut:
Nama: ${name}
Kategori: ${category}
Alamat: ${address || 'Kota Pekalongan, Jawa Tengah'}

Instruksi: Langsung berikan teks deskripsinya saja tanpa tanda petik pembuka/penutup dan tanpa basa-basi.`;

  try {
    // 1. Prioritize OpenRouter if valid key exists
    if (openRouterKey && openRouterKey.startsWith('sk-or-')) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "HTTP-Referer": window.location?.href || "http://localhost:5173",
          "X-Title": "PekaloJalan AI Trip Planner",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "google/gemini-2.5-flash",
          "messages": [{ role: "user", content: prompt }],
          "temperature": 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
          return data.choices[0].message.content.trim();
        }
      } else {
        console.warn("OpenRouter API Failed:", response.statusText);
      }
    }
    // 2. Fallback to Native Google Gemini API
    else if (geminiKey && geminiKey.startsWith('AIza')) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      if (responseText) {
        return responseText.trim();
      }
    }
  } catch (err) {
    console.warn("AI description generation error:", err);
  }

  // 3. Ultimate Fallback (Local static rule-based)
  return `${name} merupakan destinasi ${category} populer di Kota Pekalongan yang berlokasi di ${address || 'Kota Pekalongan'}. Tempat yang tepat untuk menikmati pesona khas Kota Batik bersama keluarga dan teman.`;
};

/**
 * Main AI Chat Service function
 * Menggunakan sistem Hybrid (OpenRouter -> Gemini Native -> Local Fallback)
 */
export const sendMessageToGemini = async (history, userMessage, placesDatabase) => {
  const hasil = await kirimKeModel(history, userMessage, placesDatabase);
  if (!hasil || !hasil.itinerary) return hasil;
  // Pagar kode: hanya tempat yang ada di database yang boleh tampil, urutan rute dirapikan
  const itinerary = groundItinerary(hasil.itinerary, placesDatabase);
  return { ...hasil, itinerary };
};

const kirimKeModel = async (history, userMessage, placesDatabase) => {
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const tempatRelevan = pilihTempatRelevan(placesDatabase, history, userMessage);
  const systemInstruction = createSystemInstruction(tempatRelevan, placesDatabase.length);

  try {
    // 1. Try OpenRouter First
    if (openRouterKey && openRouterKey.startsWith('sk-or-')) {
      const messages = [
        { role: 'system', content: systemInstruction },
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.text
        })),
        { role: 'user', content: userMessage }
      ];

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "HTTP-Referer": window.location?.href || "http://localhost:5173",
          "X-Title": "PekaloJalan AI Trip Planner",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "google/gemini-2.5-flash",
          "messages": messages,
          "temperature": 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
          return parseAIResponse(data.choices[0].message.content);
        }
      }
      throw new Error(`OpenRouter API Failed: ${response.status}`);
    }
    // 2. Try Native Gemini API Second
    else if (geminiKey && geminiKey.startsWith('AIza')) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemInstruction
      });

      const chat = model.startChat({
        history: history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        }))
      });

      const result = await chat.sendMessage([{ text: userMessage }]);
      const responseText = result.response.text();
      return parseAIResponse(responseText);
    }
  } catch (err) {
    console.warn("API call failed. Switching to Smart Local AI Engine:", err);
  }

  // 3. Jika API Key tidak ada, atau koneksi terputus, atau limit semua model habis
  // Aktifkan Smart Local Fallback AI Engine agar website tidak pernah Error!
  return generateLocalAIResponse(history, userMessage, placesDatabase);
};

/**
 * Parses raw text from AI to separate natural conversation text from structured itinerary JSON
 */
export const parseAIResponse = (rawText) => {
  let itinerary = null;
  let cleanText = rawText;

  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = rawText.match(jsonRegex);

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && parsed.isItinerary) {
        itinerary = parsed;
        cleanText = rawText.replace(jsonRegex, '').trim();
      }
    } catch (e) {
      console.warn("Could not parse JSON block from AI output:", e);
    }
  }

  return {
    text: cleanText,
    itinerary
  };
};

/**
 * Smart Rule-based Local AI Trip Planner Generator Fallback
 */
const generateLocalAIResponse = async (history, userMessage, semuaTempat) => {
  // Urutkan agar tempat terkurasi dan paling lengkap yang dipilih lebih dulu oleh find() di bawah
  const placesDatabase = urutkanTempat(semuaTempat, bangunKonteks(history, userMessage)).urut;
  // Simulate natural delay for realistic AI feel
  await new Promise(r => setTimeout(r, 1200));

  const promptLower = userMessage.toLowerCase();

  // Check if asking general questions vs asking for itinerary
  const isItineraryRequest = 
    promptLower.includes('itinerary') || 
    promptLower.includes('rencana') || 
    promptLower.includes('jadwal') || 
    promptLower.includes('trip') || 
    promptLower.includes('hari') || 
    promptLower.includes('jalan') || 
    promptLower.includes('liburan') || 
    promptLower.includes('rekomendasi') ||
    promptLower.includes('budget') ||
    promptLower.includes('1') || promptLower.includes('2') || promptLower.includes('3');

  if (!isItineraryRequest) {
    return {
      text: `Halo Sedulur Pekalongan! 👋 

Saya siap membantu Anda menyusun rencana perjalanan liburan yang paling seru di Pekalongan! Coba ceritakan ke saya:
1. Berapa hari rencana kunjungan Anda? (misal: 1 hari atau 2 hari)
2. Berapa perkiraan anggaran (budget) Anda?
3. Jenis wisata apa yang paling diminati? (contoh: *Wisata Batik, Kuliner Soto Tauto/Megono, Wisata Religi, atau Sunset Pantai Pasir Kencana*)

Silakan ketik preferensi Anda di bawah!`,
      itinerary: null
    };
  }

  // Check if a specific place from database is mentioned in the prompt
  const mentionedPlace = placesDatabase.find(p => 
    promptLower.includes(p.name.toLowerCase()) || 
    p.name.toLowerCase().includes(promptLower.replace('tolong masukkan', '').trim())
  );

  // Filter places based on categories matching user prompt
  const hasReligi = promptLower.includes('religi') || promptLower.includes('masjid') || promptLower.includes('ziarah') || (mentionedPlace && mentionedPlace.category === 'religi');
  const hasBatik = promptLower.includes('batik') || promptLower.includes('museum') || promptLower.includes('oleh') || (mentionedPlace && (mentionedPlace.category === 'oleh-oleh' || mentionedPlace.category === 'wisata'));
  const hasPantai = promptLower.includes('pantai') || promptLower.includes('pasir kencana') || promptLower.includes('sunset') || promptLower.includes('alam');
  const hasMurah = promptLower.includes('murah') || promptLower.includes('hemat') || promptLower.includes('backpacker');

  const selectedPlaces = [];

  // 1. Morning / Utama
  let morningPlace = null;
  if (mentionedPlace) {
    morningPlace = mentionedPlace;
  } else if (hasBatik) {
    morningPlace = placesDatabase.find(p => p.id === 'place-1') || placesDatabase.find(p => p.category === 'wisata');
  } else if (hasReligi) {
    morningPlace = placesDatabase.find(p => p.id === 'place-15') || placesDatabase.find(p => p.category === 'religi');
  } else {
    morningPlace = placesDatabase.find(p => p.category === 'wisata');
  }
  if (morningPlace) selectedPlaces.push(morningPlace);

  // 2. Lunch / Culinary
  const lunchPlace = placesDatabase.find(p => p.id !== morningPlace?.id && (p.category === 'street-food' || p.category === 'resto')) || placesDatabase.find(p => p.category === 'street-food');
  if (lunchPlace) selectedPlaces.push(lunchPlace);

  // 3. Afternoon Shopping / Culture
  const afternoonPlace = placesDatabase.find(p => p.id !== morningPlace?.id && p.id !== lunchPlace?.id && (p.category === 'oleh-oleh' || p.category === 'cafe')) || placesDatabase.find(p => p.category === 'oleh-oleh');
  if (afternoonPlace) selectedPlaces.push(afternoonPlace);

  // 4. Evening Sunset / Fun
  const eveningPlace = placesDatabase.find(p => p.id !== morningPlace?.id && p.id !== lunchPlace?.id && p.id !== afternoonPlace?.id && (p.category === 'wisata' || p.category === 'hiburan')) || placesDatabase.find(p => p.category === 'hiburan');
  if (eveningPlace) selectedPlaces.push(eveningPlace);

  const totalCost = selectedPlaces.reduce((sum, p) => sum + (hargaDiketahui(p) ? (p.estimatedCost || 15000) : 0), 0);

  const targetName = mentionedPlace ? mentionedPlace.name : (morningPlace ? morningPlace.name : "Destinasi Pilihan");

  const itineraryData = {
    isItinerary: true,
    title: mentionedPlace ? `Rencana Jelajah Pekalongan Termasuk ${mentionedPlace.name}` : `Rencana Jelajah Kota Batik Pekalongan (Custom Trip)`,
    duration: "1 Hari (Fleksibel)",
    estimatedCostPerPerson: totalCost,
    summary: mentionedPlace 
      ? `Rencana perjalanan ini dirancang khusus menyertakan ${mentionedPlace.name} dengan rekomendasi waktu terbaik serta rute kuliner dan belanja batik terdekat.`
      : `Rencana perjalanan komprehensif yang dirangkum khusus sesuai preferensi Anda. Menikmati kekayaan budaya batik, kuliner khas lezat, dan spot ikonik Pekalongan.`,
    schedule: selectedPlaces.map((p, idx) => {
      const periods = [
        { period: 'Pagi', time: '08:30 - 11:00' },
        { period: 'Siang', time: '11:30 - 13:30' },
        { period: 'Sore', time: '14:00 - 16:30' },
        { period: 'Malam', time: '17:00 - 19:30' }
      ];
      const slot = periods[idx] || { period: 'Sesi ' + (idx + 1), time: 'Fleksibel' };
      return {
        time: slot.time,
        period: slot.period,
        placeName: p.name,
        activity: p.description.slice(0, 110) + '...',
        estimatedCost: hargaDiketahui(p) ? (p.estimatedCost || 15000) : 0
      };
    }),
    tips: [
      mentionedPlace ? `Waktu terbaik mengunjungi ${mentionedPlace.name}: ${mentionedPlace.openingHours || 'pagi atau sore hari'}.` : "Kunjungi tempat lebih awal untuk menghindari keramaian.",
      "Gunakan transportasi lokal atau kendaraan pribadi untuk berpindah antar-lokasi dengan efisien.",
      "Sediakan uang tunai secukupnya untuk berbelanja kuliner kaki lima dan suvenir lokal."
    ]
  };

  const responseGreeting = mentionedPlace 
    ? `Halo Sedulur! Tentu saja, saya sudah memasukkan **${mentionedPlace.name}** ke dalam rencana perjalanan Anda di Pekalongan. Waktu terbaik mengunjunginya adalah saat **${mentionedPlace.openingHours || 'pagi hari'}** agar suasananya nyaman. Saya juga telah memadukan rute ke tempat kuliner dan belanja batik terdekat berikut ini! 👇`
    : `Halo Sedulur! Berdasarkan preferensi yang Anda sampaikan, saya telah meracik rencana perjalanan spesial jelajah Kota Pekalongan berikut ini. Silakan periksa linimasa di bawah ini! 👇`;

  return {
    text: responseGreeting,
    itinerary: itineraryData
  };
};
