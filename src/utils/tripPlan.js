import { getMapUrl, getKecamatan, getCoords, totalJarakRute, formatKm } from './geo.js';
import { cariTempatDariNama } from './itinerary.js';

// Label mengikuti template referensi (bahasa Inggris). Ubah di sini jika ingin bahasa Indonesia.
export const LABEL = {
  title: 'Trip Plan',
  destination: 'DESTINATION:',
  dates: 'TRAVEL DATES:',
  transportHeader: 'FLIGHTS & TRANSPORTATION:',
  accommodationHeader: 'ACCOMMODATION:',
  departure: 'Departure:',
  returnTrip: 'Return:',
  vehicle: 'Airline / Train / Bus:',
  transfer: 'Transfers / Rental Car:',
  hotel: 'Hotel / Flat:',
  address: 'Address:',
  checkin: 'Check-in:',
  checkout: 'Check-out:',
  todo: 'THINGS TO DO:',
  budget: 'BUDGET & EXPENSES:',
  notes: 'NOTES:',
  packing: 'PACKING LIST:'
};

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const parseTanggal = (iso) => {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
};
const formatTanggal = (d) => `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
export const formatTanggalIso = (iso) => { const d = parseTanggal(iso); return d ? formatTanggal(d) : ''; };
const tambahHari = (d, n) => new Date(d.getTime() + n * 86400000);

export const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const jamBukaAda = (p) => {
  const j = String(p.openingHours || '').trim();
  return j !== '' && !/belum tersedia/i.test(j);
};

/** Biaya satu tempat: { tipe: 'gratis'|'berbayar'|'tidak-diketahui', nilai } mengikuti data, tanpa menebak. */
export const biayaTempat = (p) => {
  if (p.hargaTersedia === false) return { tipe: 'tidak-diketahui', nilai: 0 };
  const v = Number(p.estimatedCost) || 0;
  return v > 0 ? { tipe: 'berbayar', nilai: v } : { tipe: 'gratis', nilai: 0 };
};

/**
 * Kumpulkan calon tempat final dari seluruh sesi chat (itinerary dari yang terbaru) dan tempat tersimpan.
 * Hanya tempat yang benar-benar ada di database yang dimasukkan.
 */
export const kumpulkanKandidat = (chatMessages, places, bookmarkIds = []) => {
  const hasil = [];
  const ada = new Set();
  let idTerbaru = null;
  const tambah = (place, sumber, time) => {
    if (!place || ada.has(place.id)) return;
    ada.add(place.id);
    hasil.push({ place, sumber, time: time || '', dipilih: sumber === 'terbaru', hari: 1 });
  };
  const daftar = [...(chatMessages || [])].reverse();
  daftar.forEach((m) => {
    if (!m.itinerary || !Array.isArray(m.itinerary.schedule)) return;
    if (idTerbaru === null) idTerbaru = m.id;
    const sumber = m.id === idTerbaru ? 'terbaru' : 'sebelumnya';
    m.itinerary.schedule.forEach((s) => {
      const place = (s.placeId && places.find((p) => p.id === s.placeId)) || cariTempatDariNama(s.placeName, places);
      tambah(place, sumber, s.time);
    });
  });
  (bookmarkIds || []).forEach((id) => tambah(places.find((p) => p.id === id), 'tersimpan', ''));
  return hasil;
};

/**
 * Susun isi Trip Plan. Semua isi berasal dari database dan isian pengguna.
 * Tidak ada teks karangan AI. Isian kosong tetap kosong (jadi garis kosong di PDF).
 */
export const buildTripPlan = (input) => {
  const {
    stops = [], destination = '', startDate = '', endDate = '', orang = 1,
    transport = {}, accommodation = {}, packing = [], notes = [], dibuat = new Date()
  } = input;

  const mulai = parseTanggal(startDate);
  const selesai = parseTanggal(endDate);
  const travelDates = mulai && selesai ? `${formatTanggal(mulai)} - ${formatTanggal(selesai)}` : (mulai ? formatTanggal(mulai) : '');
  const jumlahOrang = Math.max(1, Math.floor(Number(orang) || 1));

  // Urut per hari, urutan dalam hari mengikuti urutan masuk
  const urut = stops
    .map((s, i) => ({ ...s, hari: Math.max(1, Math.floor(Number(s.hari) || 1)), _i: i }))
    .sort((a, b) => a.hari - b.hari || a._i - b._i);

  const labelHari = (h) => {
    if (!mulai) return `Hari ${h}`;
    const d = tambahHari(mulai, h - 1);
    return `Hari ${h} (${HARI[d.getUTCDay()]}, ${formatTanggal(d)})`;
  };

  const hariTampil = [...new Set(urut.map((s) => s.hari))];
  const multiHari = hariTampil.length > 1;

  const todo = [];
  const nomorPerHari = {};
  urut.forEach((s) => {
    const p = s.place;
    if (multiHari && !todo.some((t) => t.hari === s.hari)) todo.push({ jenis: 'hari', teks: labelHari(s.hari), hari: s.hari });
    nomorPerHari[s.hari] = (nomorPerHari[s.hari] || 0) + 1;
    const jam = jamBukaAda(p) ? `Jam buka: ${p.openingHours}` : 'Jam buka: belum tersedia';
    const kec = getKecamatan(p);
    const biaya = biayaTempat(p);
    const tiket = biaya.tipe === 'tidak-diketahui' ? 'Harga: belum tersedia' : (biaya.tipe === 'gratis' ? 'Harga: gratis' : `Est. ${formatRupiah(biaya.nilai)}/orang`);
    todo.push({
      jenis: 'tempat',
      hari: s.hari,
      teks: `${s.time ? `${s.time}  ` : ''}${p.name}`,
      detail: [kec ? `Kec. ${kec.replace(/^Pekalongan /, '')}` : '', jam, tiket].filter(Boolean).join(' | '),
      mapUrl: getMapUrl(p),
      placeId: p.id
    });
  });

  // Anggaran dari data database (per orang), tanpa menebak yang kosong
  const budget = [];
  let totalPerOrang = 0;
  let tanpaHarga = 0;
  urut.forEach((s) => {
    const b = biayaTempat(s.place);
    if (b.tipe === 'tidak-diketahui') {
      tanpaHarga += 1;
      budget.push({ nama: s.place.name, jumlah: 'belum tersedia' });
    } else {
      totalPerOrang += b.nilai;
      budget.push({ nama: s.place.name, jumlah: b.tipe === 'gratis' ? 'gratis' : formatRupiah(b.nilai) });
    }
  });
  budget.push({ nama: 'Total per orang (harga yang diketahui)', jumlah: formatRupiah(totalPerOrang), tebal: true });
  if (jumlahOrang > 1) budget.push({ nama: `Untuk ${jumlahOrang} orang`, jumlah: formatRupiah(totalPerOrang * jumlahOrang), tebal: true });

  // Catatan otomatis berbasis data
  const catatan = [];
  const hariKeStops = {};
  urut.forEach((s) => { (hariKeStops[s.hari] = hariKeStops[s.hari] || []).push(s.place); });
  // Hanya hari dengan minimal 2 tempat berkoordinat yang dihitung jaraknya
  const jarakHari = Object.keys(hariKeStops).map((h) => {
    const berkoordinat = hariKeStops[h].filter((p) => getCoords(p));
    return { h: Number(h), km: totalJarakRute(berkoordinat), n: berkoordinat.length, semua: hariKeStops[h].length };
  });
  const adaJarak = jarakHari.filter((j) => j.n > 1);
  if (adaJarak.length) {
    const kurang = jarakHari.some((j) => j.n < j.semua);
    catatan.push(
      'Jarak antar tempat (garis lurus, bukan jarak jalan): ' +
      adaJarak.map((j) => `${multiHari ? `Hari ${j.h}: ` : ''}${formatKm(j.km)}`).join('; ') + '.' +
      (kurang ? ' Tempat tanpa data koordinat tidak ikut dihitung.' : '')
    );
  }
  const tutup = /\b(Senin|Selasa|Rabu|Kamis|Jumat|Jum'at|Sabtu|Minggu)\s+Tutup/i;
  urut.forEach((s) => {
    const m = String(s.place.openingHours || '').match(tutup);
    if (!m) return;
    const hariTutup = m[1].replace("Jum'at", 'Jumat').toLowerCase();
    if (mulai) {
      const d = tambahHari(mulai, s.hari - 1);
      if (HARI[d.getUTCDay()].toLowerCase() === hariTutup) {
        catatan.push(`PERHATIAN: ${s.place.name} tutup hari ${HARI[d.getUTCDay()]}, sedangkan jadwal Hari ${s.hari} jatuh pada ${formatTanggal(d)}.`);
      }
    } else {
      catatan.push(`${s.place.name} tutup hari ${m[1]}. Cocokkan dengan tanggal kunjungan.`);
    }
  });
  const tanpaJam = urut.map((s) => s.place).filter((p) => !jamBukaAda(p));
  if (tanpaJam.length) {
    catatan.push('Jam buka belum tersedia untuk: ' + tanpaJam.map((p) => (p.telepon ? `${p.name} (tel. ${p.telepon})` : p.name)).join('; ') + '. Hubungi tempat sebelum berkunjung.');
  }
  if (tanpaHarga) catatan.push(`${tanpaHarga} tempat belum punya data harga, jadi belum masuk hitungan anggaran. Anggaran belum termasuk transportasi, penginapan, dan makan di luar daftar.`);
  else catatan.push('Anggaran belum termasuk transportasi, penginapan, dan makan di luar daftar.');
  notes.forEach((n) => { if (String(n).trim()) catatan.push(String(n).trim()); });

  return {
    title: LABEL.title,
    destination: String(destination || '').trim(),
    travelDates,
    transport: [
      { label: LABEL.departure, value: String(transport.departure || '').trim() },
      { label: LABEL.returnTrip, value: String(transport.returnTrip || '').trim() },
      { label: LABEL.vehicle, value: String(transport.vehicle || '').trim() },
      { label: LABEL.transfer, value: String(transport.transfer || '').trim() }
    ],
    accommodation: [
      { label: LABEL.hotel, value: String(accommodation.name || '').trim() },
      { label: LABEL.address, value: String(accommodation.address || '').trim() },
      { label: LABEL.checkin, value: String(accommodation.checkin || '').trim() },
      { label: LABEL.checkout, value: String(accommodation.checkout || '').trim() }
    ],
    todo,
    budget,
    notes: catatan,
    packing: packing.map((x) => String(x).trim()).filter(Boolean),
    meta: { jumlahTempat: urut.length, jumlahOrang, totalPerOrang, tanpaHarga, dibuat }
  };
};

export const namaFilePdf = (plan) => {
  const slug = (plan.destination || 'pekalongan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pekalongan';
  const d = plan.meta.dibuat;
  const tgl = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `trip-plan-${slug}-${tgl}.pdf`;
};
