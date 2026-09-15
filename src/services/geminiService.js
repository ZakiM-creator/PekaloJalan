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
 * Main Gemini Chat Service function
 * @param {Array} history - Array of { role: 'user' | 'model', text: string }
 * @param {string} userMessage - Latest prompt
 * @param {Array} placesDatabase - Live list of places
 */
export const sendMessageToGemini = async (history, userMessage, placesDatabase) => {
  if (apiKey && apiKey.trim().length > 5) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const systemInstruction = createSystemInstruction(placesDatabase);
      
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction
      });

      // Convert history for GenAI SDK
      const historyFormatted = history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      }));

      const chat = model.startChat({
        history: historyFormatted
      });

      const result = await chat.sendMessage(userMessage);
      const textOutput = result.response.text();
      return parseAIResponse(textOutput);
    } catch (err) {
      console.warn("Gemini API call failed or error encountered. Switching to Smart Local AI Engine:", err);
    }
  }

  // Smart Local Fallback AI Engine
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

  // Filter places based on categories matching user prompt
  const hasReligi = promptLower.includes('religi') || promptLower.includes('masjid') || promptLower.includes('ziarah');
  const hasBatik = promptLower.includes('batik') || promptLower.includes('museum') || promptLower.includes('oleh');
  const hasPantai = promptLower.includes('pantai') || promptLower.includes('sunset') || promptLower.includes('alam');
  const hasMurah = promptLower.includes('murah') || promptLower.includes('hemat') || promptLower.includes('backpacker');

  const selectedPlaces = [];

  // 1. Morning activity
  const morningPlace = hasBatik 
    ? placesDatabase.find(p => p.id === 'place-1') || placesDatabase.find(p => p.category === 'wisata')
    : (hasReligi ? placesDatabase.find(p => p.id === 'place-15') : placesDatabase.find(p => p.category === 'wisata'));
  
  if (morningPlace) selectedPlaces.push(morningPlace);

  // 2. Lunch / Culinary
  const lunchPlace = hasMurah
    ? (placesDatabase.find(p => p.id === 'place-18') || placesDatabase.find(p => p.category === 'street-food'))
    : (placesDatabase.find(p => p.id === 'place-17') || placesDatabase.find(p => p.category === 'street-food'));
  
  if (lunchPlace) selectedPlaces.push(lunchPlace);

  // 3. Afternoon Shopping / Culture
  const afternoonPlace = placesDatabase.find(p => p.id === 'place-13') || placesDatabase.find(p => p.category === 'oleh-oleh');
  if (afternoonPlace) selectedPlaces.push(afternoonPlace);

  // 4. Evening Sunset / Fun
  const eveningPlace = hasPantai
    ? (placesDatabase.find(p => p.id === 'place-2') || placesDatabase.find(p => p.category === 'wisata'))
    : (placesDatabase.find(p => p.id === 'place-11') || placesDatabase.find(p => p.category === 'hiburan'));
  if (eveningPlace) selectedPlaces.push(eveningPlace);

  const totalCost = selectedPlaces.reduce((sum, p) => sum + (p.estimatedCost || 15000), 0);

  const itineraryData = {
    isItinerary: true,
    title: `Rencana Jelajah Kota Batik Pekalongan (Custom Trip)`,
    duration: "1 Hari (Fleksibel)",
    estimatedCostPerPerson: totalCost,
    summary: `Rencana perjalanan komprehensif yang dirangkum khusus sesuai preferensi Anda. Menikmati kekayaan budaya batik, kuliner khas lezat, dan spot ikonik Pekalongan.`,
    schedule: [
      {
        time: "08:30 - 11:00",
        period: "Pagi",
        placeName: morningPlace ? morningPlace.name : "Museum Batik Pekalongan",
        activity: morningPlace ? morningPlace.description.slice(0, 110) + "..." : "Eksplorasi budaya batik khas Pekalongan.",
        estimatedCost: morningPlace ? morningPlace.estimatedCost : 10000
      },
      {
        time: "11:30 - 13:00",
        period: "Siang",
        placeName: lunchPlace ? lunchPlace.name : "Soto Tauto Pak Amir Kraton",
        activity: lunchPlace ? lunchPlace.description.slice(0, 110) + "..." : "Makan siang kuliner khas lokal.",
        estimatedCost: lunchPlace ? lunchPlace.estimatedCost : 25000
      },
      {
        time: "13:30 - 16:00",
        period: "Sore",
        placeName: afternoonPlace ? afternoonPlace.name : "International Batik Center (IBC)",
        activity: afternoonPlace ? afternoonPlace.description.slice(0, 110) + "..." : "Berbelanja oleh-oleh khas Pekalongan.",
        estimatedCost: afternoonPlace ? afternoonPlace.estimatedCost : 100000
      },
      {
        time: "16:30 - 19:30",
        period: "Malam",
        placeName: eveningPlace ? eveningPlace.name : "Taman Wisata Pasir Kencana",
        activity: eveningPlace ? eveningPlace.description.slice(0, 110) + "..." : "Bersantai menikmati suasana malam Pekalongan.",
        estimatedCost: eveningPlace ? eveningPlace.estimatedCost : 25000
      }
    ],
    tips: [
      "Bawa pakaian santai berbahan katun yang nyaman untuk menjelajah.",
      "Gunakan pembayaran non-tunai atau sediakan tunai untuk jajan kuliner street food.",
      "Cek jam buka destinasi agar kunjungan berjalan sesuai rencana."
    ]
  };

  return {
    text: `Halo Sedulur! Berdasarkan preferensi yang Anda sampaikan, saya telah meracik rencana perjalanan spesial jelajah Kota Pekalongan berikut ini. Silakan periksa linimasa di bawah ini! 👇`,
    itinerary: itineraryData
  };
};
