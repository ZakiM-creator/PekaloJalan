import test from 'node:test';
import assert from 'node:assert/strict';
import { validasiDeskripsi } from './geminiService.js';

test('validasiDeskripsi menerima deskripsi wajar yang menyebut nama tempat', () => {
  const teks = 'Museum Batik Pekalongan menyimpan koleksi batik nusantara dari abad ke-19 hingga kini. Pengunjung dapat melihat proses membatik tulis dan mengikuti lokakarya singkat bersama perajin lokal di Kota Pekalongan.';
  assert.equal(validasiDeskripsi(`"${teks}"`, 'Museum Batik Pekalongan'), teks);
});

test('validasiDeskripsi menolak jawaban penolakan, markdown, atau tanpa nama', () => {
  const asing = 'Tempat ini sangat menarik dan cocok untuk liburan keluarga karena suasananya nyaman, bersih, dan ramah untuk anak-anak serta memiliki area parkir yang luas.';
  assert.equal(validasiDeskripsi(`Maaf, saya tidak dapat membantu. ${asing}`, 'Museum Batik Pekalongan'), null);
  assert.equal(validasiDeskripsi(`**${asing}**`, 'Museum Batik Pekalongan'), null);
  assert.equal(validasiDeskripsi(asing, 'Museum Batik Pekalongan'), null); // nama tidak disebut
  assert.equal(validasiDeskripsi('Terlalu pendek, Museum Batik Pekalongan.', 'Museum Batik Pekalongan'), null);
});
