// Pembuat PDF Trip Plan. Digambar langsung ke dokumen PDF (teks, garis, kotak), bukan dari tangkapan halaman HTML.
import { namaFilePdf } from '../utils/tripPlan.js';

const W = 595.28;
const H = 841.89;
const ML = 50;
const MR = 545;
const MID = 301;
const KOL = { L: { x: 50, w: 228 }, R: { x: 315, w: 228 } };
const WARNA = { gelap: [51, 51, 51], biru: [102, 167, 222], abu: [112, 112, 112], tautan: [30, 100, 200], putih: [255, 255, 255] };
const BATAS_BAWAH = 788;
const TINGGI_BARIS = 26;

// Font bawaan PDF hanya mendukung aksara Latin dasar. Karakter lain dibuang agar tidak jadi simbol rusak.
const aman = (s) => String(s ?? '')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[–—]/g, '-').replace(/…/g, '...')
  .replace(/[^\x20-\x7E -ÿ]/g, '').replace(/\s+/g, ' ').trim();

export const renderTripPlan = (doc, plan) => {
  const set = (size, bold = false, warna = WARNA.gelap) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...warna);
  };
  const lebar = (t, size, bold = false) => { set(size, bold); return doc.getTextWidth(t); };
  const garis = (x1, y, x2, tebal = 0.8) => { doc.setDrawColor(...WARNA.gelap); doc.setLineWidth(tebal); doc.line(x1, y, x2, y); };
  const kotak = (x, y, s = 14) => { doc.setFillColor(...WARNA.biru); doc.rect(x, y, s, s, 'F'); };

  // Teks dengan jarak antar huruf (untuk judul bagian, seperti template)
  const spasi = (t, x, y, { size = 11, bold = true, warna = WARNA.gelap, ruang = 1.3, pusat = false } = {}) => {
    set(size, bold, warna);
    const total = doc.getTextWidth(t) + ruang * t.length;
    doc.text(t, pusat ? x - total / 2 : x, y, { charSpace: ruang });
    return total;
  };

  // Muat teks pada satu baris: kecilkan huruf sampai batas, jika masih panjang potong dengan "..."
  const muat = (teks, maxW, size, min = 7, bold = false) => {
    let s = size;
    let t = aman(teks);
    while (s > min && lebar(t, s, bold) > maxW) s -= 0.5;
    if (lebar(t, s, bold) > maxW) {
      while (t.length > 1 && lebar(`${t}...`, s, bold) > maxW) t = t.slice(0, -1);
      t = `${t}...`;
    }
    return { t, s };
  };
  const bungkus = (teks, maxW, size, bold = false, maksBaris = 99) => {
    set(size, bold);
    const baris = doc.splitTextToSize(aman(teks), maxW);
    if (baris.length > maksBaris) {
      const potong = baris.slice(0, maksBaris);
      let akhir = potong[maksBaris - 1];
      while (akhir.length > 1 && lebar(`${akhir}...`, size, bold) > maxW) akhir = akhir.slice(0, -1);
      potong[maksBaris - 1] = `${akhir}...`;
      return potong;
    }
    return baris;
  };

  // ---------- Blok kolom ----------
  const TEKS_X = 24;
  const ukur = (b, lebarKolom) => {
    const teksW = lebarKolom - TEKS_X;
    if (b.k === 'head') return 40;
    if (b.k === 'hari') return 22;
    if (b.k === 'blank') return TINGGI_BARIS;
    if (b.k === 'tempat') {
      b._main = bungkus(b.teks, teksW, 9.5, true, 2);
      b._det = b.detail ? bungkus(b.detail, teksW, 7.5, false, 3) : [];
      return 6 + b._main.length * 11.5 + b._det.length * 9.3 + (b.mapUrl ? 10.5 : 0) + 6;
    }
    if (b.k === 'budget') {
      set(8.5, true);
      b._wj = doc.getTextWidth(aman(b.jumlah));
      b._nama = bungkus(b.nama, teksW - b._wj - 8, 8.5, !!b.tebal, 3);
      return Math.max(TINGGI_BARIS, b._nama.length * 10.5 + 12);
    }
    b._baris = bungkus(b.teks, teksW, 8.5, false, 12);
    return Math.max(TINGGI_BARIS, b._baris.length * 10.5 + 12);
  };

  const gambar = (b, kol, y, h) => {
    const { x, w } = KOL[kol];
    const teksX = x + TEKS_X;
    const akhir = x + w;
    if (b.k === 'head') { spasi(aman(b.teks), x + w / 2, y + 18, { pusat: true }); return; }
    if (b.k === 'hari') {
      set(9, true, WARNA.gelap);
      doc.text(aman(b.teks), x, y + 13);
      return;
    }
    kotak(x, y + 4);
    if (b.k === 'blank') { garis(teksX, y + TINGGI_BARIS - 4, akhir, 0.8); return; }
    if (b.k === 'tempat') {
      let cy = y + 6;
      set(9.5, true);
      b._main.forEach((l) => { cy += 11.5; doc.text(l, teksX, cy - 2.5); });
      set(7.5, false, WARNA.abu);
      b._det.forEach((l) => { cy += 9.3; doc.text(l, teksX, cy - 1.5); });
      if (b.mapUrl) {
        cy += 10.5;
        set(7.5, true, WARNA.tautan);
        const t = 'Buka di Google Maps';
        doc.text(t, teksX, cy - 2);
        const tw = doc.getTextWidth(t);
        doc.setDrawColor(...WARNA.tautan); doc.setLineWidth(0.4); doc.line(teksX, cy - 0.8, teksX + tw, cy - 0.8);
        doc.link(teksX, cy - 9, tw, 11, { url: b.mapUrl });
      }
      garis(teksX, y + h - 3, akhir, 0.8);
      return;
    }
    if (b.k === 'budget') {
      set(8.5, !!b.tebal);
      b._nama.forEach((l, i) => doc.text(l, teksX, y + 15 + i * 10.5));
      set(8.5, true);
      doc.text(aman(b.jumlah), akhir, y + 15, { align: 'right' });
      garis(teksX, y + h - 3, akhir, 0.8);
      return;
    }
    set(8.5);
    b._baris.forEach((l, i) => doc.text(l, teksX, y + 15 + i * 10.5));
    garis(teksX, y + h - 3, akhir, 0.8);
  };

  // Nilai isian: satu baris bila muat, jika tidak muat dibungkus 2 baris kecil (tidak dipotong bila masih cukup)
  const nilaiBaris = (teks, x, xAkhir, top) => {
    const maxW = xAkhir - x;
    const t = aman(teks);
    if (lebar(t, 10) <= maxW) { set(10); doc.text(t, x, top + 22); return; }
    const baris = bungkus(t, maxW, 7.5, false, 2);
    set(7.5);
    if (baris.length === 1) { doc.text(baris[0], x, top + 22); return; }
    doc.text(baris[0], x, top + 17);
    doc.text(baris[1], x, top + 27);
  };

  // ---------- Halaman 1: judul dan bagian atas ----------
  const gambarHalamanAtas = () => {
    set(46, true);
    doc.text(aman(plan.title), W / 2, 98, { align: 'center' });

    const labelD = spasi(plan.destination !== undefined ? 'DESTINATION:' : '', ML, 140, { size: 11 });
    const dx = ML + labelD + 10;
    garis(dx, 143, 277, 0.8);
    if (plan.destination) { const m = muat(plan.destination, 277 - dx - 2, 11, 7); set(m.s); doc.text(m.t, dx + 1, 139); }

    const labelT = spasi('TRAVEL DATES:', 300, 140, { size: 11 });
    const tx = 300 + labelT + 10;
    garis(tx, 143, MR, 0.8);
    if (plan.travelDates) { const m = muat(plan.travelDates, MR - tx - 2, 11, 7); set(m.s); doc.text(m.t, tx + 1, 139); }

    doc.setFillColor(...WARNA.biru);
    doc.rect(ML, 166, MR - ML, 28, 'F');
    spasi('FLIGHTS & TRANSPORTATION:', ML + 16, 184, { size: 10.5, warna: WARNA.putih });
    spasi('ACCOMMODATION:', (MID + MR) / 2 + 2, 184, { size: 10.5, warna: WARNA.putih, pusat: true });

    for (let i = 0; i < 4; i++) {
      const top = 194 + i * 36;
      const kiri = plan.transport[i];
      const kanan = plan.accommodation[i];
      set(10.5, true);
      doc.text(kiri.label, ML, top + 22);
      if (kiri.value) nilaiBaris(kiri.value, ML + lebar(kiri.label, 10.5, true) + 6, MID - 12, top);
      set(10.5, true);
      doc.text(kanan.label, MID, top + 22);
      if (kanan.value) nilaiBaris(kanan.value, MID + lebar(kanan.label, 10.5, true) + 6, MR, top);
      garis(ML, top + 36, MR, 0.8);
    }
  };
  const gambarHalamanLanjut = () => {
    set(20, true);
    doc.text(`${aman(plan.title)} (lanjutan)`, W / 2, 56, { align: 'center' });
    if (plan.destination) { set(9, false, WARNA.abu); doc.text(aman(plan.destination), W / 2, 72, { align: 'center' }); }
  };

  // ---------- Antrian blok ----------
  const antri = {
    L: [
      { k: 'head', teks: 'THINGS TO DO:', sec: 'THINGS TO DO:' },
      ...plan.todo.map((t) => (t.jenis === 'hari' ? { k: 'hari', teks: t.teks, sec: 'THINGS TO DO:' } : { k: 'tempat', teks: t.teks, detail: t.detail, mapUrl: t.mapUrl, sec: 'THINGS TO DO:' })),
      { k: 'head', teks: 'BUDGET & EXPENSES:', sec: 'BUDGET & EXPENSES:' },
      ...plan.budget.map((b) => ({ k: 'budget', nama: b.nama, jumlah: b.jumlah, tebal: b.tebal, sec: 'BUDGET & EXPENSES:' })),
      { k: 'head', teks: 'NOTES:', sec: 'NOTES:' },
      ...plan.notes.map((n) => ({ k: 'note', teks: n, sec: 'NOTES:' }))
    ],
    R: [
      { k: 'head', teks: 'PACKING LIST:', sec: 'PACKING LIST:' },
      ...plan.packing.map((p) => ({ k: 'note', teks: p, sec: 'PACKING LIST:' }))
    ]
  };

  const hal = [];
  let nomor = 0;
  let sisa = { L: antri.L, R: antri.R };
  while (nomor === 0 || sisa.L.length || sisa.R.length) {
    const yMulai = nomor === 0 ? 352 : 92;
    const halaman = { L: [], R: [], yMulai };
    ['L', 'R'].forEach((kol) => {
      let y = yMulai;
      let q = sisa[kol];
      // Lanjutan: ulang judul bagian jika blok pertama bukan judul
      if (nomor > 0 && q.length && q[0].k !== 'head') q = [{ k: 'head', teks: `${q[0].sec.replace(':', '')} (LANJUTAN):`, sec: q[0].sec }, ...q];
      const lebarKol = KOL[kol].w;
      while (q.length) {
        const b = q[0];
        const h = ukur(b, lebarKol);
        let perlu = h;
        if (b.k === 'head' && q[1]) perlu += ukur(q[1], lebarKol);
        if (y + perlu > BATAS_BAWAH && halaman[kol].length) break;
        halaman[kol].push({ b, y, h });
        y += h;
        q = q.slice(1);
      }
      sisa[kol] = q;
      // Kolom yang selesai di halaman ini diisi garis kosong sampai bawah, seperti template
      if (!q.length && halaman[kol].length) {
        while (y + TINGGI_BARIS <= BATAS_BAWAH) {
          halaman[kol].push({ b: { k: 'blank' }, y, h: TINGGI_BARIS });
          y += TINGGI_BARIS;
        }
      }
    });
    hal.push(halaman);
    nomor += 1;
    if (nomor > 30) break; // pengaman
  }

  hal.forEach((halaman, i) => {
    if (i > 0) doc.addPage();
    if (i === 0) gambarHalamanAtas(); else gambarHalamanLanjut();
    ['L', 'R'].forEach((kol) => halaman[kol].forEach(({ b, y, h }) => gambar(b, kol, y, h)));
  });

  // Catatan kaki
  const d = plan.meta.dibuat;
  const tgl = `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()]} ${d.getFullYear()}`;
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    set(7, false, WARNA.abu);
    doc.text(`Dibuat oleh PekaloJalan AI Trip Planner, ${tgl}. Sumber: database PekaloJalan. Harga dan jam buka dapat berubah.`, ML, 818);
    doc.text(`Halaman ${i} dari ${total}`, MR, 818, { align: 'right' });
  }
  doc.setProperties({ title: `Trip Plan ${aman(plan.destination)}`.trim(), subject: 'Trip Plan PekaloJalan', creator: 'PekaloJalan AI Trip Planner' });
  return doc;
};

export const buatPdfTripPlan = async (plan) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  return renderTripPlan(doc, plan);
};

export const unduhTripPlanPdf = async (plan) => {
  const doc = await buatPdfTripPlan(plan);
  doc.save(namaFilePdf(plan));
};
