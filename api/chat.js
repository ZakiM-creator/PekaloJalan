// Fungsi server Vercel: POST /api/chat
// Menyimpan semua kunci API di server (Environment Variables Vercel), bukan di browser.
import { jalankanRantai, batasiIp } from './_rantai.js';

export const config = { api: { bodyParser: { sizeLimit: '256kb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Gunakan metode POST' });
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'tidak-diketahui')
    .split(',')[0]
    .trim();
  if (!batasiIp(ip)) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan, coba lagi sebentar lagi' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }

  const { status, data } = await jalankanRantai(body, process.env);
  return res.status(status).json(data);
}
