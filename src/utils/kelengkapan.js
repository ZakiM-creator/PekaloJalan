// Kelengkapan profil tempat: 3 bidang (foto, deskripsi, jam buka), masing-masing bernilai sama.
const FOTO_PLACEHOLDER = 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?q=80&w=800&auto=format&fit=crop';
// Pola kalimat deskripsi buatan skrip impor USPAR, contoh: "... di Kel. Klego, Kec. Pekalongan Timur, Kota Pekalongan."
const POLA_DESKRIPSI_OTOMATIS = /di Kel\. .+, Kec\. .+, Kota Pekalongan\.$/;

export const BIDANG = [
  { kunci: 'foto', label: 'Foto' },
  { kunci: 'deskripsi', label: 'Deskripsi' },
  { kunci: 'jamBuka', label: 'Jam buka' }
];

const fotoTerisi = (p) => {
  const img = String(p.image || '').trim();
  if (!img) return false;
  if (p.fotoAsli === true) return true;
  if (p.fotoAsli === false) return img !== FOTO_PLACEHOLDER; // data USPAR memakai foto pengganti
  return true; // tempat awal tanpa penanda: dianggap sudah punya foto
};

const deskripsiTerisi = (p) => {
  const d = String(p.description || '').trim();
  if (!d) return false;
  return !(p.sumberDeskripsi === 'dibuat-otomatis' && POLA_DESKRIPSI_OTOMATIS.test(d));
};

const jamBukaTerisi = (p) => {
  const j = String(p.openingHours || '').trim();
  return j !== '' && !/belum tersedia/i.test(j);
};

const CEK = { foto: fotoTerisi, deskripsi: deskripsiTerisi, jamBuka: jamBukaTerisi };

/** Hasil untuk satu tempat: persen (0-100), rincian per bidang, dan daftar bidang yang kosong. */
export const hitungKelengkapan = (place) => {
  const bidang = BIDANG.map((b) => ({ ...b, terisi: CEK[b.kunci](place || {}) }));
  const terisi = bidang.filter((b) => b.terisi).length;
  return {
    persen: Math.round((terisi / BIDANG.length) * 100),
    bidang,
    kosong: bidang.filter((b) => !b.terisi).map((b) => b.label)
  };
};

/** Ringkasan seluruh tempat milik pengelola: rata-rata persen dan jumlah kosong per bidang. */
export const ringkasKelengkapan = (places) => {
  const daftar = places || [];
  const kosongPerBidang = Object.fromEntries(BIDANG.map((b) => [b.kunci, 0]));
  let jumlah = 0;
  daftar.forEach((p) => {
    const h = hitungKelengkapan(p);
    jumlah += h.persen;
    h.bidang.forEach((b) => { if (!b.terisi) kosongPerBidang[b.kunci] += 1; });
  });
  return {
    rataRata: daftar.length ? Math.round(jumlah / daftar.length) : 0,
    kosongPerBidang,
    total: daftar.length
  };
};
