import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// System instruction prompt for PekaloJalan AI Trip Planner
const createSystemInstruction = (placesDatabase) => {
  const placesFormatted = placesDatabase.map(p => 
    `- Nama: ${p.name} | Kategori: ${p.category} | Harga Est: Rp ${p.estimatedCost.toLocaleString('id-ID')} | Alamat: ${p.address} | Rating: ${p.rating} | Jam Buka: ${p.openingHours} | Deskripsi: ${p.description}`
  ).join('\n');

  return `
Kamu adalah "PekaloJalan AI Assistant", pemandu wisata cerdas dan ramah khas Kota Pekalongan ("Kota Batik").
Tugas utama kamu adalah membantu wisatawan dan warga lokal merencanakan perjalanan ideal di Kota Pekalongan secara percakapan (conversational).

DATA TEMPAT YANG TERSEDIA DI DATABASE PEKALONALAN:
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

4. Pastikan tempat yang kamu rekomendasikan mengutamakan data tempat yang ada di database di atas.
5. Jika pengguna meminta revisi (misal "ganti resto B dengan yang murah"), perbarui jadwalnya dan sertakan kembali blok JSON terbarunya.
`;
};

/**
 * Main AI Chat Service function integrated with OpenRouter
 * Menggunakan sistem Model Fallback untuk efisiensi token & mencegah limit
 * @param {Array} history - Array of { role: 'user' | 'model', text: string }
 * @param {string} userMessage - Latest prompt
 * @param {Array} placesDatabase - Live list of places
 */
export const sendMessageToGemini = async (history, userMessage, placesDatabase) => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 5) {
    try {
      const systemInstruction = createSystemInstruction(placesDatabase);
      
      // Mengubah format history aplikasi menjadi format standar OpenAI/OpenRouter
      const messages = [
        { role: 'system', content: systemInstruction },
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.text
        })),
        { role: 'user', content: userMessage }
      ];

      // Memanggil OpenRouter Multiplexer
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location?.href || "http://localhost:5173", // Wajib untuk OpenRouter tier gratis
          "X-Title": "PekaloJalan AI Trip Planner",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          // FITUR FALLBACK: Mengantrekan AI gratisan jika yang pertama kena limit!
          "models": [
            "google/gemini-1.5-flash:free", // Prioritas Utama
            "meta-llama/llama-3-8b-instruct:free", // Cadangan 1 (Jika Gemini limit)
            "mistralai/mistral-7b-instruct:free" // Cadangan 2 (Jika Llama limit)
          ],
          "messages": messages,
          "temperature": 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // OpenRouter mengembalikan data di dalam array choices
      if (data.choices && data.choices.length > 0) {
        const textOutput = data.choices[0].message.content;
        return parseAIResponse(textOutput);
      } else {
        throw new Error("No choices returned from OpenRouter");
      }
    } catch (err) {
      console.warn("OpenRouter API call failed / rate limited. Switching to Smart Local AI Engine:", err);
    }
  }

  // Jika API Key tidak ada, atau koneksi terputus, atau limit semua model habis
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
const generateLocalAIResponse = async (history, userMessage, placesDatabase) => {
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

  const totalCost = selectedPlaces.reduce((sum, p) => sum + (p.estimatedCost || 15000), 0);

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
        estimatedCost: p.estimatedCost || 15000
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
