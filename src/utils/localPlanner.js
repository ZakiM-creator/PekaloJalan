// Penyusun rencana perjalanan tanpa AI (cadangan saat layanan AI tidak tersedia atau jawabannya
// tidak memenuhi permintaan). Aturannya pasti, jadi hasilnya selalu mengikuti permintaan pengguna:
// jumlah hari, anggaran, tempat tujuan yang disebut, dan jenis wisata yang diminati.
import { getCoords, haversineKm, getKecamatan } from './geo.js';
import { urutkanTempat, bangunKonteks, MAKS_HARI, URUTAN_WAKTU, LABEL_WAKTU, LABEL_KATEGORI, kategoriSlotSet } from './tripIntent.js';

const MIN_SLOT = 4;
const MAKS_SLOT = 6;

// [jenis slot, label periode, jam] per jumlah tempat dalam sehari
const POLA = {
  4: [['pagi', 'Pagi', '08:30 - 11:00'], ['siang', 'Siang', '11:30 - 13:30'], ['sore', 'Sore', '14:00 - 16:30'], ['malam', 'Malam', '17:00 - 19:30']],
  5: [['pagi', 'Pagi', '08:00 - 09:30'], ['pagi', 'Pagi', '10:00 - 11:30'], ['siang', 'Siang', '12:00 - 13:30'], ['sore', 'Sore', '14:00 - 16:00'], ['malam', 'Malam', '17:00 - 19:30']],
  6: [['pagi', 'Pagi', '08:00 - 09:30'], ['pagi', 'Pagi', '10:00 - 11:30'], ['siang', 'Siang', '12:00 - 13:30'], ['sore', 'Sore', '14:00 - 15:30'], ['sore', 'Sore', '16:00 - 17:30'], ['malam', 'Malam', '18:00 - 19:30']]
};

const KATEGORI_SLOT = {
  pagi: ['wisata', 'religi', 'oleh-oleh', 'hiburan'],
  siang: ['resto', 'street-food'],
  sore: ['oleh-oleh', 'wisata', 'cafe', 'hiburan', 'religi'],
  malam: ['street-food', 'wisata', 'cafe', 'hiburan', 'resto']
};
const KATEGORI_UMUM = ['wisata', 'resto', 'street-food', 'cafe', 'oleh-oleh', 'religi', 'hiburan'];
const KATEGORI_KHUSUS = new Set(['penginapan', 'layanan']); // paling banyak satu per rencana
const KULINER = new Set(['resto', 'street-food']);

// Harga 0 dengan hargaTersedia === false = belum diketahui (bukan gratis), dihitung 0 dan diberi catatan
const hargaDiketahui = (p) => p.hargaTersedia !== false;
const biaya = (p) => (hargaDiketahui(p) ? Number(p.estimatedCost) || 0 : 0);
const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const namaTampil = (p) => String(p.name || '').replace(/\s*\(.*?\)\s*/g, ' ').trim();

// Jendela jam buka [mulai, selesai] dalam menit dari teks seperti "08:00 - 16:00 WIB (Senin Tutup)".
// null jika tidak diketahui, 24 jam, atau bukan jam operasional (mis. check-in hotel): dianggap tidak membatasi.
const jendelaBuka = (p) => {
  const t = String(p.openingHours || '');
  if (!t || /24\s*jam|check-in/i.test(t)) return null;
  const m = t.match(/(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const a = Number(m[1]) * 60 + Number(m[2]);
  let b = Number(m[3]) * 60 + Number(m[4]);
  if (b <= a) b += 1440; // buka sampai lewat tengah malam
  return [a, b];
};

/** Apakah tempat ini buka saat slot waktu (mis. "14:00 - 16:30") dimulai, dengan sisa waktu minimal 30 menit? */
export const bukaSaat = (p, jam) => {
  const w = jendelaBuka(p);
  if (!w) return true;
  const s = String(jam || '').match(/(\d{1,2}):(\d{2})/);
  if (!s) return true;
  const mulai = Number(s[1]) * 60 + Number(s[2]);
  return mulai >= w[0] && mulai + 30 <= w[1];
};

/** Apakah tempat ini buka di sebagian rentang slot (mis. "08:30 - 11:00")? Dipakai untuk peringatan pada slot pilihan pengguna. */
export const bukaDalamRentang = (p, rentang) => {
  const w = jendelaBuka(p);
  if (!w) return true;
  const m = String(rentang || '').match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return bukaSaat(p, rentang);
  const a = Number(m[1]) * 60 + Number(m[2]);
  const b = Number(m[3]) * 60 + Number(m[4]);
  return Math.min(b, w[1]) - Math.max(a, w[0]) >= 30;
};

const ringkasAktivitas = (p) => {
  const d = String(p.description || '').replace(/\s+/g, ' ').trim();
  if (!d) return `Kunjungi ${namaTampil(p)}.`;
  return d.length > 110 ? `${d.slice(0, 110).trimEnd()}...` : d;
};

const bagiKeHari = (daftar, jumlahHari) => {
  const hasil = [];
  const dasar = Math.floor(daftar.length / jumlahHari);
  const sisa = daftar.length % jumlahHari;
  let idx = 0;
  for (let d = 0; d < jumlahHari; d++) {
    const n = dasar + (d < sisa ? 1 : 0);
    hasil.push(daftar.slice(idx, idx + n));
    idx += n;
  }
  return hasil;
};

const daftarNama = (arr) => {
  const nama = arr.map(namaTampil);
  if (nama.length <= 1) return nama.join('');
  return `${nama.slice(0, -1).join(', ')} dan ${nama[nama.length - 1]}`;
};

const KATA_RENCANA = /\b(itinerary|rencana|jadwal|trip|hari|jalan|liburan|rekomendasi|budget|anggaran|wisata|kuliner|plan|susun|buatkan|tour|paket|destinasi)\b/;
const KATA_MINTA_TEMPAT = /\b(masukkan|masukin|tambahkan|tambah|sertakan|include|kunjungi|mau|ingin|pengen|pingin|ke)\b/;

/** Apakah pesan ini meminta dibuatkan rencana (bukan sekadar sapaan atau pertanyaan umum)? */
export const mintaRencana = (userMessage, history, permintaan) => {
  const t = String(userMessage || '').toLowerCase();
  const p = permintaan || {};
  if (p.hari || p.anggaranPerOrang) return true;
  if (KATA_RENCANA.test(t)) return true;
  if (p.tempatDiminta && p.tempatDiminta.length && KATA_MINTA_TEMPAT.test(t)) return true;
  if (p.kategoriDiminta && p.kategoriDiminta.length) return true;
  return false;
};

export const SAPAAN_AWAL = `Halo Sedulur Pekalongan! 👋

Saya siap membantu Anda menyusun rencana perjalanan liburan yang paling seru di Pekalongan! Coba ceritakan ke saya:
1. Berapa hari rencana kunjungan Anda? (misal: 1 hari atau 2 hari)
2. Berapa perkiraan anggaran (budget) Anda?
3. Jenis wisata apa yang paling diminati, atau tempat tertentu yang ingin dikunjungi? (contoh: *Wisata Batik, Kuliner Soto Tauto/Megono, Wisata Religi, atau Pantai Pasir Kencana*)

Silakan ketik preferensi Anda di bawah!`;

/**
 * Susun rencana. Hasilnya { text, itinerary } dengan itinerary berformat sama seperti dari AI
 * (tiap item punya field day) dan siap dicocokkan oleh groundItinerary.
 */
export const buatRencanaLokal = ({ history = [], userMessage = '', places = [], permintaan = null }) => {
  if (!places.length) {
    return { text: 'Maaf Sedulur, data tempat belum berhasil dimuat sehingga saya belum bisa menyusun rencana. Coba muat ulang halaman, lalu kirim lagi permintaan Anda.', itinerary: null };
  }

  const konteks = bangunKonteks(history, userMessage);
  const { urut, skorById, kategoriDiminta } = urutkanTempat(places, konteks, permintaan);
  const jumlahHari = Math.min(MAKS_HARI, Math.max(1, (permintaan && permintaan.hari) || 1));
  const anggaran = (permintaan && permintaan.anggaranPerOrang) || null;
  const hemat = !!(permintaan && permintaan.hemat);

  // 1. Tempat yang diminta pengguna: wajib masuk, dikelompokkan per kecamatan lalu dibagi ke hari-hari
  // Urutan waktu dari pengguna ("pagi hotel, siang museum, ..."): tempat dikunci ke slot hari dan waktu yang diminta
  const slotUser = ((permintaan && permintaan.slotDiminta) || []).filter((sl) => sl && sl.hari >= 1 && sl.hari <= jumlahHari && URUTAN_WAKTU.includes(sl.waktu));
  const idSlot = new Set(slotUser.filter((sl) => sl.place).map((sl) => sl.place.id));
  const wajibSemua = [
    ...slotUser.filter((sl) => sl.place).map((sl) => sl.place),
    ...(((permintaan && permintaan.tempatDiminta) || []).filter((p) => !idSlot.has(p.id)))
  ];
  const wajib = wajibSemua.slice(0, jumlahHari * MAKS_SLOT);
  const wajibTerpotong = wajibSemua.length - wajib.length;
  let jumlahSlot = Math.min(MAKS_SLOT, Math.max(MIN_SLOT, Math.ceil(wajib.length / jumlahHari), slotUser.length ? Math.ceil(slotUser.length / jumlahHari) : 0));
  // Pola harian harus punya cukup slot untuk tiap waktu yang diminta (mis. dua slot pagi)
  const kebutuhan = (w) => Math.max(0, ...Array.from({ length: jumlahHari }, (_, d) => slotUser.filter((sl) => sl.hari === d + 1 && sl.waktu === w).length));
  const polaCukup = (n) => URUTAN_WAKTU.every((w) => kebutuhan(w) <= POLA[n].filter((x) => x[0] === w).length);
  while (jumlahSlot < MAKS_SLOT && !polaCukup(jumlahSlot)) jumlahSlot += 1;
  const pola = POLA[jumlahSlot];
  const hariList = Array.from({ length: jumlahHari }, () => pola.map(([tipe, period, time]) => ({ tipe, period, time, place: null, wajib: false })));
  const terpakai = new Set(((permintaan && permintaan.tempatDihindari) || []).map((x) => x.id)); // yang diminta dibuang tidak dipakai lagi

  const peringatan = [];
  const labelSlot = (sl) => `hari ${sl.hari} ${LABEL_WAKTU[sl.waktu].toLowerCase()}`;
  const bebas = (s) => !s.place && !s.terkunci;

  slotUser.forEach((sl) => {
    const slots = hariList[sl.hari - 1];
    let i = slots.findIndex((s) => s.tipe === sl.waktu && bebas(s));
    if (i === -1) {
      i = slots.findIndex(bebas); // waktu itu penuh: pakai slot lain di hari yang sama, lalu beri tahu
      if (i !== -1) peringatan.push(`Slot ${labelSlot(sl)} sudah penuh, jadi ${sl.place ? namaTampil(sl.place) : LABEL_KATEGORI[sl.kategori]} dipindah ke waktu ${slots[i].period.toLowerCase()}.`);
    }
    if (i === -1) { peringatan.push(`Slot ${labelSlot(sl)} tidak muat di rencana ini.`); return; }
    const s = slots[i];
    if (sl.place) {
      if (terpakai.has(sl.place.id)) return;
      s.terkunci = true;
      s.place = sl.place; s.wajib = true; terpakai.add(sl.place.id);
      if (!bukaDalamRentang(sl.place, s.time)) {
        peringatan.push(`${namaTampil(sl.place)} saya taruh di ${labelSlot(sl)} sesuai permintaan Anda, tetapi jam bukanya (${sl.place.openingHours}) mungkin tidak cocok dengan waktu itu. Cek dulu sebelum berangkat.`);
      }
    } else {
      s.terkunci = true;
      s.kategoriKunci = kategoriSlotSet(sl.kategori);
      s.labelKategori = LABEL_KATEGORI[sl.kategori] || sl.kategori;
    }
  });

  const wajibBebas = wajib.filter((p) => !idSlot.has(p.id));
  const wajibUrut = [...wajibBebas].sort((a, b) =>
    String(getKecamatan(a)).localeCompare(String(getKecamatan(b))) || String(a.name).localeCompare(String(b.name)));
  const tempatkanWajib = (p, slots) => {
    let i = -1;
    if (p.category === 'penginapan') {
      for (let k = slots.length - 1; k >= 0; k--) { if (bebas(slots[k])) { i = k; break; } } // hotel di slot paling akhir
    } else {
      // Utamakan slot yang cocok jenisnya DAN tempatnya sedang buka, lalu yang cocok jenisnya saja
      i = slots.findIndex((s) => bebas(s) && KATEGORI_SLOT[s.tipe].includes(p.category) && bukaSaat(p, s.time));
      if (i === -1) i = slots.findIndex((s) => bebas(s) && bukaSaat(p, s.time));
      if (i === -1) i = slots.findIndex((s) => bebas(s) && KATEGORI_SLOT[s.tipe].includes(p.category));
    }
    if (i === -1) i = slots.findIndex(bebas);
    if (i === -1) return false;
    slots[i].place = p; slots[i].wajib = true; terpakai.add(p.id);
    return true;
  };
  const wajibGagal = [];
  bagiKeHari(wajibUrut, jumlahHari).forEach((kelompok, d) => {
    [...kelompok]
      .sort((a, b) => Number(KULINER.has(b.category)) - Number(KULINER.has(a.category))) // kuliner dulu (slot makan terbatas)
      .forEach((p) => { if (!tempatkanWajib(p, hariList[d])) wajibGagal.push(p); });
  });
  // Hari itu penuh (mis. banyak slot dikunci pengguna): coba hari lain
  let wajibTidakMuat = 0;
  wajibGagal.forEach((p) => { if (!hariList.some((slots) => tempatkanWajib(p, slots))) wajibTidakMuat += 1; });
  if (wajibTidakMuat > 0) peringatan.push(`${wajibTidakMuat} tempat pilihan Anda tidak muat karena slot waktu hari itu sudah penuh.`);

  // 2. Sisa slot diisi tempat terbaik yang cocok, dekat dengan tempat lain di hari yang sama, dan muat di anggaran
  const biayaWajib = wajib.reduce((t, p) => t + biaya(p), 0);
  const anggaranOpsional = anggaran ? Math.max(0, anggaran - biayaWajib) : Infinity;
  let terpakaiOpsional = 0;
  const khususDipakai = new Set(wajib.filter((p) => KATEGORI_KHUSUS.has(p.category)).map((p) => p.category));

  hariList.forEach((slots, d) => {
    const batasHari = anggaran ? (anggaranOpsional - terpakaiOpsional) / (jumlahHari - d) : Infinity;
    let terpakaiHari = 0;

    const urutanIsi = [...slots.filter((s) => s.kategoriKunci), ...slots.filter((s) => !s.kategoriKunci)]; // jenis yang diminta pengguna lebih dulu
    urutanIsi.forEach((slot) => {
      if (slot.place) return;
      const dalamHari = slots.filter((s) => s.place).map((s) => s.place);
      const hitungKat = {};
      dalamHari.forEach((p) => { hitungKat[p.category] = (hitungKat[p.category] || 0) + 1; });

      const nilai = (p) => {
        let s = skorById[p.id] || 0;
        const c = getCoords(p);
        if (dalamHari.length) {
          if (c) {
            const jarak = Math.min(...dalamHari.map((q) => { const cq = getCoords(q); return cq ? haversineKm(c, cq) : Infinity; }));
            if (Number.isFinite(jarak)) s -= Math.min(40, jarak * 2);
          } else {
            s -= 5;
          }
        }
        s -= (hitungKat[p.category] || 0) * (kategoriDiminta.has(p.category) ? 4 : 12); // variasi jenis dalam sehari
        if (hemat) s -= biaya(p) / 2000;
        if (anggaran && !hargaDiketahui(p)) s -= 3;
        return s;
      };

      const pilihDari = (kategoriSet, dikunci = false) => {
        let terbaik = null;
        let nilaiTerbaik = -Infinity;
        for (const p of urut) {
          if (terpakai.has(p.id) || !kategoriSet.has(p.category)) continue;
          if (!dikunci && KATEGORI_KHUSUS.has(p.category) && khususDipakai.has(p.category)) continue;
          if (!dikunci && p.category === 'penginapan' && slot.tipe !== 'malam') continue; // hotel hanya di slot malam kecuali diminta pengguna
          if (!bukaSaat(p, slot.time)) continue; // tempat sedang tutup pada jam slot ini
          if (terpakaiHari + biaya(p) > batasHari + 1e-6) continue;
          const v = nilai(p);
          if (v > nilaiTerbaik) { nilaiTerbaik = v; terbaik = p; }
        }
        return terbaik;
      };

      let terbaik;
      if (slot.kategoriKunci) {
        // Pengguna hanya menyebut jenis (mis. "restoran"): ambil yang terbaik dari jenis itu, dan jangan diganti jenis lain
        terbaik = pilihDari(new Set([slot.kategoriKunci[0]]), true) || pilihDari(new Set(slot.kategoriKunci), true);
        if (!terbaik) {
          peringatan.push(`Belum ada ${slot.labelKategori} yang cocok di database untuk ${slot.period.toLowerCase()} hari ${d + 1}, jadi slot itu dikosongkan.`);
          return;
        }
      } else {
        const kategoriSlot = new Set([...KATEGORI_SLOT[slot.tipe], ...kategoriDiminta]);
        terbaik = pilihDari(kategoriSlot) || pilihDari(new Set([...KATEGORI_UMUM, ...kategoriDiminta]));
      }
      if (!terbaik) return;
      slot.place = terbaik;
      terpakai.add(terbaik.id);
      if (KATEGORI_KHUSUS.has(terbaik.category)) khususDipakai.add(terbaik.category);
      terpakaiOpsional += biaya(terbaik);
      terpakaiHari += biaya(terbaik);
    });
  });

  // 3. Susun itinerary
  const schedule = [];
  hariList.forEach((slots, d) => {
    slots.forEach((s) => {
      if (!s.place) return;
      schedule.push({
        day: d + 1,
        time: s.time,
        period: s.period,
        placeName: s.place.name,
        placeId: s.place.id,
        activity: ringkasAktivitas(s.place),
        estimatedCost: biaya(s.place)
      });
    });
  });

  if (schedule.length === 0) {
    return { text: 'Maaf Sedulur, saya belum menemukan tempat yang cocok di database untuk permintaan ini. Coba ubah anggaran atau jenis wisata yang diminati.', itinerary: null };
  }

  const hariTerisi = new Set(schedule.map((s) => s.day)).size;
  const tempatMap = new Map(places.map((p) => [p.id, p]));
  const dipakaiPlaces = schedule.map((s) => tempatMap.get(s.placeId)).filter(Boolean);
  const total = schedule.reduce((t, s) => t + s.estimatedCost, 0);
  const tanpaHarga = dipakaiPlaces.filter((p) => !hargaDiketahui(p)).length;
  const adaPenginapan = dipakaiPlaces.some((p) => p.category === 'penginapan');

  const judulTambahan = wajib.length === 1 ? ` Termasuk ${namaTampil(wajib[0])}` : '';
  const bagianRingkas = [`${schedule.length} tempat selama ${hariTerisi} hari`];
  if (wajib.length) bagianRingkas.push(`termasuk pilihan Anda: ${daftarNama(wajib)}`);
  if (anggaran) bagianRingkas.push(`dengan batas anggaran ${rupiah(anggaran)} per orang`);

  const tips = [];
  const wajibBuka = wajib.find((p) => p.openingHours && !/belum tersedia/i.test(p.openingHours));
  if (wajibBuka) tips.push(`Jam buka ${namaTampil(wajibBuka)}: ${wajibBuka.openingHours}.`);
  if (tanpaHarga) tips.push(`${tanpaHarga} tempat belum punya data harga, jadi belum masuk hitungan biaya.`);
  peringatan.forEach((t) => tips.push(t));
  tips.push('Biaya belum termasuk transportasi, penginapan, dan makan di luar daftar.');
  if (hariTerisi > 1 && !adaPenginapan) tips.push('Rencana ini belum memasukkan penginapan. Tulis "sertakan hotel" jika ingin saya masukkan.');
  tips.push('Gunakan transportasi lokal atau kendaraan pribadi untuk berpindah antar-lokasi dengan efisien.');

  const itinerary = {
    isItinerary: true,
    title: `Rencana Jelajah Pekalongan ${hariTerisi} Hari${judulTambahan}`,
    duration: `${hariTerisi} Hari`,
    estimatedCostPerPerson: total,
    summary: `${bagianRingkas.join(', ')}.`,
    schedule,
    tips
  };

  const baris = [`Halo Sedulur! Siap, saya susun rencana ${hariTerisi} hari di Kota Pekalongan${wajib.length ? `, termasuk ${daftarNama(wajib)}` : ''}.`];
  if (permintaan && permintaan.hariDipotong) baris.push(`Rencana dibatasi maksimal ${MAKS_HARI} hari, jadi saya buat ${MAKS_HARI} hari.`);
  else if (!(permintaan && permintaan.hari)) baris.push('Anda belum menyebut jumlah hari, jadi saya buat 1 hari. Tulis misalnya "2 hari" jika ingin lebih lama.');
  if (hariTerisi < jumlahHari) baris.push(`Data tempat di database terbatas, jadi hanya ${hariTerisi} dari ${jumlahHari} hari yang terisi.`);
  if (slotUser.length) baris.push('Urutan waktu yang Anda minta saya ikuti persis (hari dan waktunya). Slot yang tidak Anda sebut saya isi sendiri.');
  peringatan.forEach((t) => baris.push(`Catatan: ${t}`));
  if (wajibTerpotong > 0) baris.push(`${wajibTerpotong} tempat pilihan Anda tidak muat di rencana ini. Minta saja rencana terpisah untuk tempat tersebut.`);
  if (anggaran) {
    baris.push(`Perkiraan biaya dari data tempat sekitar ${rupiah(total)} per orang dari batas ${rupiah(anggaran)}${total > anggaran ? '. Tempat pilihan Anda sudah melebihi batas ini' : ''}.`);
  }
  baris.push('Silakan periksa linimasa di bawah ini! 👇');

  return { text: baris.join('\n'), itinerary };
};
