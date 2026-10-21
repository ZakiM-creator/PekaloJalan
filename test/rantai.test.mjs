// Uji rantai model dengan penyedia palsu (tanpa internet, tanpa kunci asli).
// Jalankan: node test/rantai.test.mjs
import assert from 'node:assert/strict';
import { jalankanRantai, resetStatus, periksaIsi } from '../api/_rantai.js';

const body = (lewati = []) => ({ system: 'sistem', messages: [{ role: 'user', content: 'halo' }], lewati });
const balas = (status, isi, header = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => header[k.toLowerCase()] ?? null },
  json: async () => isi
});
const sukses = (teks) => balas(200, { choices: [{ message: { content: teks } }] });
const env = { NVIDIA_API_KEY: 'k1', GROQ_API_KEY: 'k2', CEREBRAS_API_KEY: 'k3', OPENROUTER_API_KEY: 'k4' };

let n = 0;
const uji = async (nama, fn) => { resetStatus(); await fn(); n += 1; console.log('lolos:', nama); };

await uji('model pertama menjawab', async () => {
  const r = await jalankanRantai(body(), env, async () => sukses('jawaban A'));
  assert.equal(r.status, 200);
  assert.equal(r.data.modelId, 'nvidia');
});

await uji('429 -> pindah ke model berikutnya, lalu model itu diistirahatkan', async () => {
  const panggilan = [];
  const f = async (url) => {
    panggilan.push(url);
    return url.includes('nvidia') ? balas(429, {}, { 'retry-after': '120' }) : sukses('dari groq');
  };
  const r = await jalankanRantai(body(), env, f);
  assert.equal(r.data.modelId, 'groq');
  const r2 = await jalankanRantai(body(), env, f);
  assert.equal(r2.data.modelId, 'groq');
  assert.equal(panggilan.filter((u) => u.includes('nvidia')).length, 1, 'nvidia tidak dicoba lagi saat istirahat');
});

await uji('daftar lewati dari klien dihormati', async () => {
  const r = await jalankanRantai(body(['nvidia', 'groq']), env, async () => sukses('x'));
  assert.equal(r.data.modelId, 'cerebras');
});

await uji('waktu habis -> pindah model', async () => {
  const f = async (url, opsi) => {
    if (url.includes('nvidia')) {
      const e = new Error('abort'); e.name = 'AbortError'; throw e;
    }
    return sukses('ok');
  };
  const r = await jalankanRantai(body(), env, f);
  assert.equal(r.data.modelId, 'groq');
  assert.equal(r.data.dicoba[0].hasil, 'waktu habis');
});

await uji('kunci kosong dilewati', async () => {
  const r = await jalankanRantai(body(), { OPENROUTER_API_KEY: 'k' }, async () => sukses('x'));
  assert.equal(r.data.modelId, 'openrouter');
});

await uji('semua gagal -> 503 tanpa membocorkan kunci', async () => {
  const r = await jalankanRantai(body(), env, async () => balas(500, {}));
  assert.equal(r.status, 503);
  assert.ok(!JSON.stringify(r.data).includes('k1'));
});

await uji('tanpa kunci sama sekali -> 503', async () => {
  const r = await jalankanRantai(body(), {}, async () => sukses('x'));
  assert.equal(r.status, 503);
});

await uji('tag <think> dibuang dan jawaban kosong ditolak', async () => {
  const r = await jalankanRantai(body(), env, async () => sukses('<think>rahasia</think>Halo'));
  assert.equal(r.data.text, 'Halo');
  const r2 = await jalankanRantai(body(), { NVIDIA_API_KEY: 'k' }, async () => sukses('<think>saja</think>'));
  assert.equal(r2.status, 503);
});

await uji('isi permintaan tidak valid ditolak', async () => {
  assert.ok(periksaIsi(null));
  assert.ok(periksaIsi({ system: 's', messages: [{ role: 'system', content: 'x' }] }));
  assert.ok(periksaIsi({ system: 's', messages: [{ role: 'user', content: 'x'.repeat(130000) }] }));
  assert.equal(periksaIsi(body()), null);
});

console.log(`\nSemua ${n} uji lolos`);
