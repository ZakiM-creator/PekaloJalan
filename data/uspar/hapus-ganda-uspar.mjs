// Hapus tempat USPAR yang kembar dengan data contoh, dan pertahankan versi contoh.
// Dibuat Claude, BELUM diuji terhadap Firestore Anda. Default = simulasi (tidak mengubah apa pun).
//
// Pakai (PowerShell, dari C:\PEKALOJALAN, variabel GOOGLE_APPLICATION_CREDENTIALS sudah diatur):
//   node data/uspar/hapus-ganda-uspar.mjs                          simulasi
//   node data/uspar/hapus-ganda-uspar.mjs --sedia-contoh           simulasi, termasuk membuat data contoh yang belum ada
//   node data/uspar/hapus-ganda-uspar.mjs --sedia-contoh --terapkan   jalankan sungguhan
//
// Pengaman:
// - Versi USPAR hanya dihapus bila versi contoh (place-N) ADA di Firestore.
//   Bila belum ada, dokumen ditahan, kecuali Anda memakai --sedia-contoh (contoh dibuat dulu dari mockPlaces.js).
// - Dokumen yang akan dihapus disalin dulu ke file cadangan di data/uspar/hasil/.
// - Hanya 7 id uspar-* di bawah yang disentuh. Dokumen lain tidak diubah.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PASANGAN = [
  ['uspar-137', 'place-1', 'Museum Batik Pekalongan'],
  ['uspar-156', 'place-2', 'Pantai Pasir Kencana'],
  ['uspar-104', 'place-3', 'Kampung Batik Pesindon'],
  ['uspar-160', 'place-4', 'Mangrove Pekalongan'],
  ['uspar-092', 'place-9', 'Hotel Santika Pekalongan'],
  ['uspar-141', 'place-10', 'Namira Syariah'],
  ['uspar-118', 'place-16', 'Makam Habib Ahmad (Sapuro)'],
];

// Fungsi murni: menentukan tindakan tiap pasangan (mudah diuji tanpa Firestore)
export const bangunRencana = (adaUspar, adaContoh, sediaContoh, contohTersedia = new Set()) =>
  PASANGAN.map(([idUspar, idContoh, nama]) => {
    if (!adaUspar.has(idUspar)) return { idUspar, idContoh, nama, aksi: 'lewati', alasan: 'versi USPAR tidak ada di Firestore' };
    if (adaContoh.has(idContoh)) return { idUspar, idContoh, nama, aksi: 'hapus', alasan: 'versi contoh sudah ada' };
    if (sediaContoh && contohTersedia.has(idContoh)) return { idUspar, idContoh, nama, aksi: 'buat-lalu-hapus', alasan: 'versi contoh dibuat dari mockPlaces.js' };
    return { idUspar, idContoh, nama, aksi: 'tahan', alasan: 'versi contoh BELUM ada di Firestore (pakai --sedia-contoh)' };
  });

const main = async () => {
  const opsi = process.argv.slice(2);
  const terapkan = opsi.includes('--terapkan');
  const sediaContoh = opsi.includes('--sedia-contoh');

  const { initializeApp, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  let contoh = [];
  if (sediaContoh) {
    const mod = await import(pathToFileURL(resolve('src/data/mockPlaces.js')).href);
    contoh = mod.INITIAL_PLACES;
  }
  const contohTersedia = new Set(contoh.map((p) => p.id));

  const ambil = async (id) => db.collection('places').doc(id).get();
  const snapUspar = new Map();
  const adaContoh = new Set();
  for (const [idUspar, idContoh] of PASANGAN) {
    const [u, c] = await Promise.all([ambil(idUspar), ambil(idContoh)]);
    if (u.exists) snapUspar.set(idUspar, u.data());
    if (c.exists) adaContoh.add(idContoh);
  }

  const rencana = bangunRencana(new Set(snapUspar.keys()), adaContoh, sediaContoh, contohTersedia);
  console.log('\nRencana:');
  rencana.forEach((r) => console.log(`  ${r.idUspar} <-> ${r.idContoh}  ${r.nama.padEnd(32)} ${r.aksi.toUpperCase().padEnd(16)} ${r.alasan}`));
  const hitung = (a) => rencana.filter((r) => r.aksi === a).length;
  console.log(`\nHapus: ${hitung('hapus') + hitung('buat-lalu-hapus')} | Buat contoh dulu: ${hitung('buat-lalu-hapus')} | Ditahan: ${hitung('tahan')} | Dilewati: ${hitung('lewati')}`);
  if (!terapkan) { console.log('Mode simulasi. Tambahkan --terapkan untuk menjalankan.'); return; }

  const dihapus = rencana.filter((r) => r.aksi === 'hapus' || r.aksi === 'buat-lalu-hapus');
  if (dihapus.length === 0) { console.log('Tidak ada yang dihapus.'); return; }

  // Cadangan sebelum perubahan
  mkdirSync(resolve('data/uspar/hasil'), { recursive: true });
  const berkas = resolve(`data/uspar/hasil/cadangan-dihapus-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(berkas, JSON.stringify(dihapus.map((r) => ({ id: r.idUspar, ...snapUspar.get(r.idUspar) })), null, 2), 'utf-8');
  console.log(`Cadangan disimpan: ${berkas}`);

  const batch = db.batch();
  const createdAt = new Date().toISOString();
  for (const r of dihapus) {
    if (r.aksi === 'buat-lalu-hapus') {
      const { id, ...isi } = contoh.find((p) => p.id === r.idContoh);
      batch.set(db.collection('places').doc(id), { ...isi, managerEmail: isi.managerEmail || '', createdAt });
    }
    batch.delete(db.collection('places').doc(r.idUspar));
  }
  await batch.commit();
  console.log(`Selesai. ${dihapus.length} dokumen USPAR kembar dihapus.`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
