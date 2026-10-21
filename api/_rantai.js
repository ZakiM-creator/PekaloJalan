// Logika rantai model di sisi server. Kunci API hanya dibaca dari `env` (server), tidak pernah dikirim ke browser.
import { RANTAI_MODEL, WAKTU_HABIS_MS } from '../src/config/aiModels.js';

const MAKS_PESAN = 40;
const MAKS_KARAKTER = 120000;

const istirahat = new Map(); // id model -> waktu (ms) kapan boleh dipakai lagi
const riwayatIp = new Map(); // ip -> daftar waktu permintaan

export const resetStatus = () => { istirahat.clear(); riwayatIp.clear(); };

const sedangIstirahat = (id) => (istirahat.get(id) || 0) > Date.now();
const istirahatkan = (id, menit) => {
  if (menit > 0) istirahat.set(id, Date.now() + menit * 60000);
};

/** Pembatas sederhana per IP (cadangan, berlaku per instance server). Mengembalikan false bila terlalu sering. */
export const batasiIp = (ip, maks = 20, jendelaMs = 60000) => {
  const sekarang = Date.now();
  const daftar = (riwayatIp.get(ip) || []).filter((t) => sekarang - t < jendelaMs);
  if (daftar.length >= maks) {
    riwayatIp.set(ip, daftar);
    return false;
  }
  daftar.push(sekarang);
  riwayatIp.set(ip, daftar);
  return true;
};

export const bersihkanJawaban = (teks) =>
  String(teks || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

/** Mengembalikan teks galat bila isi permintaan tidak valid, atau null bila aman. */
export const periksaIsi = (body) => {
  if (!body || typeof body !== 'object') return 'Isi permintaan tidak valid';
  if (typeof body.system !== 'string' || !body.system) return 'Field system wajib diisi';
  if (!Array.isArray(body.messages) || body.messages.length === 0) return 'Field messages wajib diisi';
  if (body.messages.length > MAKS_PESAN) return 'Terlalu banyak pesan';
  let total = body.system.length;
  for (const m of body.messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return 'Format pesan tidak valid';
    }
    total += m.content.length;
  }
  if (total > MAKS_KARAKTER) return 'Permintaan terlalu besar';
  if (body.lewati !== undefined && !Array.isArray(body.lewati)) return 'Field lewati harus berupa daftar';
  return null;
};

const menitDariRetryAfter = (nilai) => {
  const detik = Number(nilai);
  if (!Number.isFinite(detik) || detik <= 0) return 5;
  return Math.min(30, Math.max(1, Math.ceil(detik / 60)));
};

/** Panggil satu model. Mengembalikan { ok:true, text } atau { ok:false, alasan, menit }. */
const panggilSatu = async (model, env, pesan, fetchFn) => {
  const namaModel = env[`MODEL_${model.id.toUpperCase()}`] || model.model;
  const alamat = `${model.alamat.replace(/\/+$/, '')}/chat/completions`;
  const kontrol = new AbortController();
  const timer = setTimeout(() => kontrol.abort(), WAKTU_HABIS_MS);

  try {
    const res = await fetchFn(alamat, {
      method: 'POST',
      signal: kontrol.signal,
      headers: {
        Authorization: `Bearer ${env[model.kunci]}`,
        'Content-Type': 'application/json',
        ...(model.headerTambahan || {})
      },
      body: JSON.stringify({
        model: namaModel,
        messages: pesan,
        temperature: 0.5,
        max_tokens: 4096
      })
    });

    if (!res.ok) {
      if (res.status === 429) return { ok: false, alasan: 'kena batas (429)', menit: menitDariRetryAfter(res.headers?.get?.('retry-after')) };
      if (res.status === 401 || res.status === 403) return { ok: false, alasan: `kunci ditolak (${res.status})`, menit: 60 };
      if (res.status === 404) return { ok: false, alasan: 'model tidak ditemukan (404)', menit: 60 };
      if (res.status === 400) return { ok: false, alasan: 'permintaan ditolak (400)', menit: 0 };
      return { ok: false, alasan: `galat server (${res.status})`, menit: 2 };
    }

    const data = await res.json();
    const teks = bersihkanJawaban(data?.choices?.[0]?.message?.content);
    if (!teks) return { ok: false, alasan: 'jawaban kosong', menit: 1 };
    return { ok: true, text: teks };
  } catch (err) {
    const waktuHabis = err?.name === 'AbortError';
    return { ok: false, alasan: waktuHabis ? 'waktu habis' : 'koneksi gagal', menit: 2 };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Coba model satu per satu sampai ada yang menjawab.
 * body: { system, messages:[{role,content}], lewati:[id model yang sudah ditolak pemeriksa di klien] }
 * Mengembalikan { status, data } siap dikirim sebagai respons HTTP.
 */
export async function jalankanRantai(body, env, fetchFn = fetch) {
  const galat = periksaIsi(body);
  if (galat) return { status: 400, data: { error: galat } };

  const lewati = new Set(body.lewati || []);
  const pesan = [{ role: 'system', content: body.system }, ...body.messages];
  const dicoba = [];

  for (const model of RANTAI_MODEL) {
    if (!env[model.kunci] || lewati.has(model.id) || sedangIstirahat(model.id)) continue;
    const hasil = await panggilSatu(model, env, pesan, fetchFn);
    if (hasil.ok) {
      return { status: 200, data: { text: hasil.text, modelId: model.id, dicoba: [...dicoba, { id: model.id, hasil: 'ok' }] } };
    }
    istirahatkan(model.id, hasil.menit);
    dicoba.push({ id: model.id, hasil: hasil.alasan });
  }

  return { status: 503, data: { error: 'Tidak ada model AI yang tersedia saat ini', dicoba } };
}
