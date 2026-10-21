import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { jalankanRantai, batasiIp } from './api/_rantai.js'

// Saat `npm run dev`, Vite tidak menjalankan folder /api milik Vercel.
// Plugin kecil ini menyajikan /api/chat dengan logika yang sama, memakai kunci dari file .env.
const apiChatDev = (env) => ({
  name: 'api-chat-dev',
  configureServer(server) {
    server.middlewares.use('/api/chat', (req, res) => {
      const kirim = (status, data) => {
        res.statusCode = status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(data))
      }
      if (req.method !== 'POST') return kirim(405, { error: 'Gunakan metode POST' })
      if (!batasiIp(req.socket?.remoteAddress || 'lokal', 60)) return kirim(429, { error: 'Terlalu banyak permintaan' })

      let mentah = ''
      req.on('data', (potongan) => {
        mentah += potongan
        if (mentah.length > 262144) req.destroy()
      })
      req.on('end', async () => {
        let body = null
        try { body = JSON.parse(mentah) } catch { body = null }
        const { status, data } = await jalankanRantai(body, env)
        kirim(status, data)
      })
    })
  }
})

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Awalan '' = baca SEMUA variabel di .env (termasuk yang tanpa VITE_). Hanya dipakai di server dev, tidak masuk ke browser.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  return {
    plugins: [
      react(),
      tailwindcss(),
      apiChatDev(env)
    ],
  }
})
