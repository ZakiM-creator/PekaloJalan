// Daftar rantai model AI untuk chatbot PekaloJalan.
// Urutan = prioritas: model paling atas dicoba lebih dulu.
// Prinsip urutan: penyedia dengan batas gratis paling longgar di depan,
// penyedia dengan kuota kecil (OpenRouter: 50 request per hari) di belakang.
//
// Setiap penyedia memakai format OpenAI-compatible: alamat + "/chat/completions".
// Kunci TIDAK ditulis di sini. Kunci dibaca server dari environment variable bernama `kunci`.
// Nama model bisa diganti tanpa mengubah file ini lewat env MODEL_<ID>, contoh MODEL_NVIDIA=...
//
// Model dengan kunci kosong otomatis dilewati. Model dengan nama salah akan error 404
// lalu diistirahatkan otomatis, jadi tidak merusak chatbot.
export const RANTAI_MODEL = [
  {
    id: 'nvidia',
    alamat: 'https://integrate.api.nvidia.com/v1',
    kunci: 'NVIDIA_API_KEY',
    model: 'deepseek-ai/deepseek-v4.1-flash'
  },
  {
    id: 'groq',
    alamat: 'https://api.groq.com/openai/v1',
    kunci: 'GROQ_API_KEY',
    model: 'openai/gpt-oss-120b'
  },
  {
    id: 'cerebras',
    alamat: 'https://api.cerebras.ai/v1',
    kunci: 'CEREBRAS_API_KEY',
    model: 'gpt-oss-120b'
  },
  {
    id: 'gemini',
    alamat: 'https://generativelanguage.googleapis.com/v1beta/openai',
    kunci: 'GEMINI_API_KEY',
    model: 'gemini-2.5-flash'
  },
  {
    id: 'openrouter',
    alamat: 'https://openrouter.ai/api/v1',
    kunci: 'OPENROUTER_API_KEY',
    model: 'minimax/minimax-m3.1-flash:free',
    headerTambahan: { 'X-Title': 'PekaloJalan AI Trip Planner' }
  }
];

export const WAKTU_HABIS_MS = 20000; // batas tunggu satu model
export const MAKS_PERCOBAAN_KLIEN = 4; // berapa model berbeda yang boleh dicoba per pesan pengguna
