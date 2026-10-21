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

// Angka hari dari field day/hari ("2", 2, "Hari 2"). null jika tidak terbaca.
const bacaHari = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const m = String(v).match(/\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return n >= 1 && n <= 31 ? n : null;
};

// Jam mulai dalam menit dari "08:30 - 11:00" atau "08.30". null jika tidak terbaca.
const jamMulai = (t) => {
  const m = String(t || '').match(/(\d{1,2})\s*[:.]\s*(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/**
 * Tentukan hari tiap item. Pakai field day/hari jika ada (yang kosong ikut hari sebelumnya).
 * Jika tidak ada penanda hari sama sekali, hari baru dimulai saat jam mulai mundur (mis. 17:00 lalu 08:30).
 */
const tentukanHari = (jadwal) => {
  const eksplisit = jadwal.map((i) => bacaHari(i.day !== undefined ? i.day : i.hari));
  if (eksplisit.some((h) => h !== null)) {
    let cur = 1;
    return eksplisit.map((h) => { if (h !== null) cur = h; return cur; });
  }
  let hari = 1;
  let prev = null;
  return jadwal.map((i) => {
    const j = jamMulai(i.time);
    if (j !== null && prev !== null && j < prev) hari += 1;
    if (j !== null) prev = j;
    return hari;
  });
};

const sesuaikanJudul = (judul, jumlahHari) => {
  if (!judul) return judul;
  return /\b\d+\s*hari\b/i.test(judul) ? judul.replace(/\b\d+\s*hari\b/i, `${jumlahHari} Hari`) : judul;
};

/**
 * Membumikan itinerary ke database: buang tempat yang tidak ada di database, pakai nama dan
 * biaya dari database, susun ulang urutan di dalam tiap hari agar rute efisien (tempat tidak
 * dipindah antar hari), lalu tambah link peta dan jarak.
 * Opsi: start (posisi awal rute), jagaUrutan (jangan susun ulang urutan di dalam hari).
 * Mengembalikan null jika tidak ada satu pun tempat yang cocok.
 */
export const groundItinerary = (itinerary, places, { start = null, jagaUrutan = false } = {}) => {
  if (!itinerary || !Array.isArray(itinerary.schedule)) return itinerary;

  const jadwal = itinerary.schedule.filter((i) => i && typeof i === 'object');
  const hariAsli = tentukanHari(jadwal);

  const dipakai = new Set();
  const dibuang = [];
  const perHari = new Map(); // hari -> [{ item, p }]
  jadwal.forEach((item, idx) => {
    const p = (item.placeId && places.find((x) => x.id === item.placeId)) || cariTempatDariNama(item.placeName, places);
    if (!p || dipakai.has(p.id)) { dibuang.push(item.placeName); return; }
    dipakai.add(p.id);
    const h = hariAsli[idx];
    if (!perHari.has(h)) perHari.set(h, []);
    perHari.get(h).push({ item, p });
  });
  if (dipakai.size === 0) return null;

  // Hari yang kosong (semua tempatnya dibuang) dilewati; nomor hari dirapatkan menjadi 1, 2, 3, ...
  const urutanHari = [...perHari.keys()].sort((a, b) => a - b);
  const schedule = [];
  let totalJarak = 0;

  urutanHari.forEach((h, di) => {
    let entri = perHari.get(h);
    // jagaUrutan: urutan jam dari penyusun/AI dipakai apa adanya, tetapi dirapikan dari pagi ke malam bila semua jamnya terbaca
    if (jagaUrutan && entri.every((x) => jamMulai(x.item.time) !== null)) {
      entri = entri.map((x, n) => ({ ...x, n })).sort((a, b) => jamMulai(a.item.time) - jamMulai(b.item.time) || a.n - b.n);
    }
    // jagaUrutan: urutan dari penyusun rencana (yang sudah memperhatikan jam buka) tidak diacak ulang
    const urut = jagaUrutan ? entri.map((x) => x.p) : optimizeRoute(entri.map((x) => x.p), di === 0 ? start : null);
    const slot = entri.map((x) => x.item); // jam dan periode asli hari itu, sesuai urutan awal
    const byId = Object.fromEntries(entri.map((x) => [x.p.id, x.item]));

    urut.forEach((p, i) => {
      const asli = byId[p.id];
      const waktu = slot[i] || asli;
      const sebelumnya = i > 0 ? urut[i - 1] : null;
      schedule.push({
        ...asli,
        day: di + 1,
        time: waktu.time,
        period: waktu.period,
        placeName: p.name,
        placeId: p.id,
        kategori: p.category,
        estimatedCost: p.hargaTersedia === false ? 0 : (p.estimatedCost || 0),
        mapUrl: getMapUrl(p),
        kecamatan: getKecamatan(p),
        adaKoordinat: !!getCoords(p),
        jarakDariSebelumnya: sebelumnya ? jarakAntarTempat(sebelumnya, p) : null
      });
    });
    totalJarak += totalJarakRute(urut);
  });

  const kecamatan = new Set(schedule.map((s) => s.kecamatan).filter(Boolean));
  const jumlahHari = urutanHari.length;
  return {
    ...itinerary,
    title: sesuaikanJudul(itinerary.title, jumlahHari),
    duration: `${jumlahHari} Hari`,
    totalHari: jumlahHari,
    schedule,
    estimatedCostPerPerson: schedule.reduce((t, s) => t + (s.estimatedCost || 0), 0),
    totalJarakKm: totalJarak,
    jumlahKecamatan: kecamatan.size,
    tempatDibuang: dibuang
  };
};
