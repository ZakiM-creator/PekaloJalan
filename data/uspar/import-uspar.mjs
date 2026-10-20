// Impor places_uspar.json ke Firestore (koleksi "places") memakai firebase-admin.
// BELUM DIUJI oleh Claude: jalankan dulu tanpa --terapkan (hanya simulasi).
//
// Persiapan (sekali saja, di folder proyek):
//   npm install --no-save firebase-admin
// Kunci layanan (service account):
//   Firebase Console > Project settings > Service accounts > Generate new private key.
//   Simpan di LUAR repository (jangan di-commit), lalu atur lokasinya:
//   PowerShell:  $env:GOOGLE_APPLICATION_CREDENTIALS="C:\kunci\pekalojalan-admin.json"
//
// Pakai:
//   node data/uspar/import-uspar.mjs data/uspar/hasil/places_uspar.json            (simulasi)
//   node data/uspar/import-uspar.mjs data/uspar/hasil/places_uspar.json --terapkan  (tulis sungguhan)
//
// Perilaku aman: id dokumen tetap (uspar-001, dst) sehingga bisa diulang tanpa menggandakan
// data, dan dokumen lain di "places" tidak disentuh. Dokumen yang sudah ada TIDAK ditimpa
// kecuali memakai --timpa.
import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const [, , berkas, ...opsi] = process.argv;
if (!berkas) { console.error('Beri path places_uspar.json'); process.exit(1); }
const terapkan = opsi.includes('--terapkan');
const timpa = opsi.includes('--timpa');

const data = JSON.parse(readFileSync(berkas, 'utf-8'));
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const ada = new Set((await db.collection('places').select().get()).docs.map((d) => d.id));
const baru = data.filter((p) => timpa || !ada.has(p.id));
console.log(`Di file: ${data.length}. Sudah ada di Firestore: ${data.length - baru.length}. Akan ditulis: ${baru.length}.`);
if (!terapkan) { console.log('Mode simulasi. Tambahkan --terapkan untuk menulis.'); process.exit(0); }

const createdAt = new Date().toISOString();
for (let i = 0; i < baru.length; i += 400) {
  const batch = db.batch();
  baru.slice(i, i + 400).forEach(({ id, ...isi }) => {
    batch.set(db.collection('places').doc(id), { ...isi, createdAt });
  });
  await batch.commit();
  console.log(`Tertulis ${Math.min(i + 400, baru.length)} / ${baru.length}`);
}
console.log('Selesai.');
