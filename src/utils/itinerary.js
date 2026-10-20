import { getCoords, getMapUrl, getKecamatan, jarakAntarTempat, optimizeRoute, totalJarakRute } from './geo.js';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Cari tempat di database berdasarkan nama dari AI: sama persis, lalu saling mengandung (min. 5 huruf). */
export const cariTempatDariNama = (nama, places) => {
  const n = norm(nama);
  if (!n) return null;
  const persis = places.find((p) => norm(p.name) === n);
  if (persis) return persis;
  if (n.length < 5) return null;
  const cocok = places.filter((p) => {
    const pn = norm(p.name);
    return pn.length >= 5 && (pn.includes(n) || n.includes(pn));
  });
  return cocok.length === 1 ? cocok[0] : null; // ambigu = tidak dipakai
};

/**
 * Membumikan itinerary ke database: buang tempat yang tidak ada di database, pakai nama dan
 * biaya dari database, susun ulang urutan agar rute efisien, lalu tambah link peta dan jarak.
 * Mengembalikan null jika tidak ada satu pun tempat yang cocok.
 */
export const groundItinerary = (itinerary, places, { start = null } = {}) => {
  if (!itinerary || !Array.isArray(itinerary.schedule)) return itinerary;

  const dipakai = new Set();
  const cocok = [];
  const dibuang = [];
  itinerary.schedule.forEach((item) => {
    const p = cariTempatDariNama(item.placeName, places);
    if (!p || dipakai.has(p.id)) { dibuang.push(item.placeName); return; }
    dipakai.add(p.id);
    cocok.push({ item, p });
  });
  if (cocok.length === 0) return null;

  const urut = optimizeRoute(cocok.map((x) => x.p), start);
  const slot = itinerary.schedule.slice(0, cocok.length);
  const byId = Object.fromEntries(cocok.map((x) => [x.p.id, x.item]));

  const schedule = urut.map((p, i) => {
    const asli = byId[p.id];
    const waktu = slot[i] || asli;
    const sebelumnya = i > 0 ? urut[i - 1] : null;
    const jarak = sebelumnya ? jarakAntarTempat(sebelumnya, p) : null;
    return {
      ...asli,
      time: waktu.time,
      period: waktu.period,
      placeName: p.name,
      placeId: p.id,
      estimatedCost: p.hargaTersedia === false ? 0 : (p.estimatedCost || 0),
      mapUrl: getMapUrl(p),
      kecamatan: getKecamatan(p),
      adaKoordinat: !!getCoords(p),
      jarakDariSebelumnya: jarak
    };
  });

  const kecamatan = new Set(schedule.map((s) => s.kecamatan).filter(Boolean));
  return {
    ...itinerary,
    schedule,
    estimatedCostPerPerson: schedule.reduce((t, s) => t + (s.estimatedCost || 0), 0),
    totalJarakKm: totalJarakRute(urut),
    jumlahKecamatan: kecamatan.size,
    tempatDibuang: dibuang
  };
};
