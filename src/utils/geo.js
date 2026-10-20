import { KOORDINAT_AWAL } from '../data/koordinatAwal.js';

// Kotak batas wajar wilayah Kota Pekalongan dan sekitarnya. Titik di luar kotak dianggap rusak.
const BATAS = { latMin: -7.1, latMax: -6.7, lngMin: 109.5, lngMax: 109.85 };

const valid = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat >= BATAS.latMin && lat <= BATAS.latMax && lng >= BATAS.lngMin && lng <= BATAS.lngMax;

/** Koordinat tempat: field latitude/longitude, lalu angka di locationMapUrl, lalu koordinat awal. null jika tidak ada. */
export const getCoords = (place) => {
  if (!place) return null;
  const lat = Number(place.latitude);
  const lng = Number(place.longitude);
  if (valid(lat, lng)) return { lat, lng };

  const m = String(place.locationMapUrl || '').match(/query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m && valid(Number(m[1]), Number(m[2]))) return { lat: Number(m[1]), lng: Number(m[2]) };

  const awal = KOORDINAT_AWAL[place.id];
  return awal && valid(awal.lat, awal.lng) ? awal : null;
};

/** Link Google Maps (format resmi Maps URLs). Tanpa koordinat: pakai link lama, lalu pencarian nama. */
export const getMapUrl = (place) => {
  const c = getCoords(place);
  if (c) return `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;
  if (place?.locationMapUrl) return place.locationMapUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place?.name || ''} Pekalongan`.trim())}`;
};

/** Link petunjuk arah dari posisi pengguna ke tempat. */
export const getDirectionsUrl = (place) => {
  const c = getCoords(place);
  if (c) return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
  return getMapUrl(place);
};

/** Jarak garis lurus dua titik dalam km (rumus Haversine). */
export const haversineKm = (a, b) => {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Jarak antar dua tempat (km), null jika salah satu tidak punya koordinat. */
export const jarakAntarTempat = (p1, p2) => {
  const a = getCoords(p1);
  const b = getCoords(p2);
  return a && b ? haversineKm(a, b) : null;
};

export const formatKm = (km) => (km == null ? '' : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);

const SINGKATAN = { Tim: 'Timur', Bar: 'Barat', Sel: 'Selatan', Utara: 'Utara', Utr: 'Utara' };

/** Nama kecamatan: dari field kecamatan, jika kosong dibaca dari alamat ("Kec. Pekalongan Tim."). */
export const getKecamatan = (place) => {
  if (place?.kecamatan) return String(place.kecamatan).trim();
  const m = String(place?.address || '').match(/Kec\.\s*Pekalongan\s+([A-Za-z]+)\.?/i);
  if (!m) return '';
  const kata = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  const penuh = SINGKATAN[kata];
  return penuh ? `Pekalongan ${penuh}` : '';
};

/** Nama kelurahan dari field kelurahan saja (alamat tempat awal tidak menyebut kelurahan secara baku). */
export const getKelurahan = (place) => (place?.kelurahan ? String(place.kelurahan).trim() : '');

const KULINER = new Set(['resto', 'street-food', 'cafe']);
export const adalahKuliner = (place) => KULINER.has(place?.category);

const panjangJalur = (titik) => {
  let t = 0;
  for (let i = 1; i < titik.length; i++) t += haversineKm(titik[i - 1], titik[i]);
  return t;
};

const permutasi = (arr) => {
  if (arr.length <= 1) return [arr];
  const hasil = [];
  arr.forEach((x, i) => {
    const sisa = [...arr.slice(0, i), ...arr.slice(i + 1)];
    permutasi(sisa).forEach((p) => hasil.push([x, ...p]));
  });
  return hasil;
};

const urutTerdekat = (awal, items, akhir) => {
  const sisa = [...items];
  const hasil = [];
  let cur = awal;
  while (sisa.length) {
    let bi = 0;
    if (cur) {
      let bd = Infinity;
      sisa.forEach((it, i) => { const d = haversineKm(cur, it.c); if (d < bd) { bd = d; bi = i; } });
    }
    const [pilih] = sisa.splice(bi, 1);
    hasil.push(pilih);
    cur = pilih.c;
  }
  return hasil;
};

/**
 * Urutkan tempat agar rute tidak bolak-balik. Posisi tempat kuliner dan tempat tanpa
 * koordinat DIKUNCI (jadwal makan tidak bergeser). Tempat lain di antara dua kunci disusun
 * ulang agar jalur terpendek. Segmen sampai 7 tempat dicari optimal, lebih dari itu pakai terdekat.
 * @param {Array} places daftar tempat sesuai urutan awal
 * @param {{lat:number,lng:number}|null} start posisi awal (opsional)
 */
export const optimizeRoute = (places, start = null) => {
  const items = places.map((p) => ({ p, c: getCoords(p), kunci: adalahKuliner(p) || !getCoords(p) }));
  const hasil = [];
  let i = 0;
  let prev = start;
  while (i < items.length) {
    if (items[i].kunci) {
      hasil.push(items[i]);
      prev = items[i].c || prev;
      i += 1;
      continue;
    }
    let j = i;
    while (j < items.length && !items[j].kunci) j += 1;
    const segmen = items.slice(i, j);
    const next = items[j] && items[j].c ? items[j].c : null;
    let urut;
    if (segmen.length <= 7) {
      let terbaik = segmen;
      let jarakTerbaik = Infinity;
      permutasi(segmen).forEach((perm) => {
        const jalur = [prev, ...perm.map((x) => x.c), next].filter(Boolean);
        const d = panjangJalur(jalur);
        if (d < jarakTerbaik - 1e-9) { jarakTerbaik = d; terbaik = perm; }
      });
      urut = terbaik;
    } else {
      urut = urutTerdekat(prev, segmen, next);
    }
    hasil.push(...urut);
    prev = urut[urut.length - 1].c;
    i = j;
  }
  return hasil.map((x) => x.p);
};

/** Total panjang rute (km) melewati tempat berkoordinat sesuai urutan. */
export const totalJarakRute = (places) => {
  const titik = places.map(getCoords).filter(Boolean);
  return panjangJalur(titik);
};
