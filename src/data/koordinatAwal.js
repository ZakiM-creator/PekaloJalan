// Koordinat 10 tempat awal (place-N) yang di Firestore belum punya latitude/longitude.
// Sumber: Data USPAR Kota Pekalongan (9 Okt 2026), baris kembarannya, sudah diperbaiki
// formatnya oleh skrip bersihkan_uspar.py. Tempat awal lain sengaja TIDAK diisi karena
// tidak ada data koordinat yang terverifikasi untuk mereka.
export const KOORDINAT_AWAL = {
  'place-1': { lat: -6.8786839, lng: 109.6755195 }, // Museum Batik Pekalongan
  'place-2': { lat: -6.8592635, lng: 109.6910395 }, // Pantai Pasir Kencana
  'place-3': { lat: -6.887154, lng: 109.6718279 }, // Kampung Wisata Batik Pesindon
  'place-4': { lat: -6.8583337, lng: 109.6750352 }, // Pekalongan Mangrove Park
  'place-7': { lat: -6.8916398, lng: 109.6607125 }, // Ayam Bakar Selaras
  'place-9': { lat: -6.8887917, lng: 109.6640521 }, // Hotel Santika Pekalongan
  'place-10': { lat: -6.8895652, lng: 109.6790323 }, // Namira Syariah
  'place-11': { lat: -6.8786218, lng: 109.6747944 }, // Kawasan Budaya Jetayu
  'place-16': { lat: -6.8973573, lng: 109.6739478 }, // Makam Al Habib Ahmad bin Abdullah bin Thalib Alatas
  'place-17': { lat: -6.9028422, lng: 109.6877408 } // Bang Dul
};
