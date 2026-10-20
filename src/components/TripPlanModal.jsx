import React, { useMemo, useState } from 'react';
import { X, FileDown, MapPin, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { kumpulkanKandidat, buildTripPlan, formatTanggalIso } from '../utils/tripPlan.js';
import { unduhTripPlanPdf } from '../services/tripPlanPdf.js';

const SUMBER = { terbaru: 'Rencana AI terbaru', sebelumnya: 'Rencana AI sebelumnya', tersimpan: 'Tempat tersimpan' };
const inputCls = 'w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-500 text-xs focus:outline-none focus:border-slate-400';
const labelCls = 'text-[11px] font-semibold text-slate-500';

const Field = ({ label, children }) => (
  <label className="block space-y-1"><span className={labelCls}>{label}</span>{children}</label>
);

export const TripPlanModal = ({ open, onClose, chatMessages }) => {
  const { places, bookmarks } = useApp();
  const awal = useMemo(() => kumpulkanKandidat(chatMessages, places, bookmarks), [chatMessages, places, bookmarks]);
  const [pilihan, setPilihan] = useState({}); // id -> { dipilih, hari } (perubahan pengguna)
  const [f, setF] = useState({
    destination: 'Kota Pekalongan', startDate: '', endDate: '', orang: 1,
    departure: '', returnTrip: '', vehicle: '', transfer: '',
    hotelId: '', hotelName: '', hotelAddress: '', checkin: '', checkout: '',
    packing: '', notes: ''
  });
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const penginapan = useMemo(() => places.filter((p) => p.category === 'penginapan').sort((a, b) => a.name.localeCompare(b.name)), [places]);

  if (!open) return null;

  const kandidat = awal.map((k) => ({ ...k, ...(pilihan[k.place.id] || {}) }));
  const terpilih = kandidat.filter((k) => k.dipilih);
  const ubah = (id, patch) => setPilihan((x) => ({ ...x, [id]: { ...(x[id] || {}), ...patch } }));

  const pilihHotel = (id) => {
    const h = penginapan.find((p) => p.id === id);
    setF((x) => ({ ...x, hotelId: id, hotelName: h ? h.name : '', hotelAddress: h ? h.address : '' }));
  };

  // Tanggal check-in/out terisi dari tanggal perjalanan (masih bisa diubah pengguna)
  const checkinTampil = f.checkin !== '' ? f.checkin : formatTanggalIso(f.startDate);
  const checkoutTampil = f.checkout !== '' ? f.checkout : formatTanggalIso(f.endDate);

  const unduh = async () => {
    setGalat('');
    if (f.startDate && f.endDate && f.endDate < f.startDate) { setGalat('Tanggal pulang tidak boleh lebih awal dari tanggal berangkat.'); return; }
    setSibuk(true);
    try {
      const plan = buildTripPlan({
        stops: terpilih.map((k) => ({ place: k.place, time: k.time, hari: k.hari })),
        destination: f.destination, startDate: f.startDate, endDate: f.endDate, orang: f.orang,
        transport: { departure: f.departure, returnTrip: f.returnTrip, vehicle: f.vehicle, transfer: f.transfer },
        accommodation: { name: f.hotelName, address: f.hotelAddress, checkin: f.hotelName ? checkinTampil : f.checkin, checkout: f.hotelName ? checkoutTampil : f.checkout },
        packing: f.packing.split('\n'), notes: f.notes.split('\n'), dibuat: new Date()
      });
      await unduhTripPlanPdf(plan);
    } catch (e) {
      console.error('Gagal membuat PDF Trip Plan:', e);
      setGalat('PDF gagal dibuat. Coba lagi, atau lihat pesan di konsol browser.');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-3 sm:p-6 overflow-y-auto hide-on-print" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl glass-panel rounded-3xl border border-indigo-100 shadow-lg p-4 sm:p-6 space-y-5 my-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-serif text-slate-900">Buat Trip Plan (PDF)</h2>
            <p className="text-xs text-slate-500">
              Isi PDF hanya berasal dari database PekaloJalan dan isian Anda. Kolom yang dikosongkan menjadi garis kosong untuk ditulis tangan, tidak diisi otomatis.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900" aria-label="Tutup"><X className="w-5 h-5" /></button>
        </div>

        {/* 1. Tempat final */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-indigo-800">1. Pilih tempat tujuan final ({terpilih.length} dipilih)</h3>
          {kandidat.length === 0 ? (
            <p className="text-xs text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-200">
              Belum ada rencana dari AI atau tempat tersimpan. Minta AI membuat rencana perjalanan dulu, atau simpan tempat dari Direktori.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {kandidat.map((k) => (
                <div key={k.place.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <input type="checkbox" checked={!!k.dipilih} onChange={(e) => ubah(k.place.id, { dipilih: e.target.checked })} className="accent-slate-900 w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{k.place.name}</p>
                    <p className="text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{SUMBER[k.sumber]}{k.time ? ` | ${k.time}` : ''}</p>
                  </div>
                  <label className="flex items-center gap-1.5 text-slate-500">
                    Hari
                    <select value={k.hari} onChange={(e) => ubah(k.place.id, { hari: Number(e.target.value) })} className="bg-white border border-slate-300 rounded-lg px-1.5 py-1 text-slate-900">
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. Umum */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-indigo-800">2. Tujuan dan tanggal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2"><Field label="Destination"><input className={inputCls} value={f.destination} onChange={set('destination')} /></Field></div>
            <Field label="Tanggal berangkat"><input type="date" className={inputCls} value={f.startDate} onChange={set('startDate')} /></Field>
            <Field label="Tanggal pulang"><input type="date" className={inputCls} value={f.endDate} onChange={set('endDate')} /></Field>
            <Field label="Jumlah orang"><input type="number" min="1" className={inputCls} value={f.orang} onChange={set('orang')} /></Field>
          </div>
        </section>

        {/* 3. Transportasi */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-indigo-800">3. Transportasi (opsional)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Departure"><input className={inputCls} value={f.departure} onChange={set('departure')} placeholder="mis. Stasiun Tegal, 26 Okt 07.00" /></Field>
            <Field label="Return"><input className={inputCls} value={f.returnTrip} onChange={set('returnTrip')} /></Field>
            <Field label="Airline / Train / Bus"><input className={inputCls} value={f.vehicle} onChange={set('vehicle')} /></Field>
            <Field label="Transfers / Rental Car"><input className={inputCls} value={f.transfer} onChange={set('transfer')} /></Field>
          </div>
        </section>

        {/* 4. Akomodasi */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-indigo-800">4. Akomodasi (opsional)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Pilih dari database penginapan (nama dan alamat terisi dari data)">
                <select className={inputCls} value={f.hotelId} onChange={(e) => pilihHotel(e.target.value)}>
                  <option value="">Tidak memilih, isi manual</option>
                  {penginapan.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Hotel / Flat"><input className={inputCls} value={f.hotelName} onChange={(e) => setF((x) => ({ ...x, hotelName: e.target.value, hotelId: '' }))} /></Field>
            <Field label="Address"><input className={inputCls} value={f.hotelAddress} onChange={set('hotelAddress')} /></Field>
            <Field label="Check-in"><input className={inputCls} value={checkinTampil} onChange={set('checkin')} /></Field>
            <Field label="Check-out"><input className={inputCls} value={checkoutTampil} onChange={set('checkout')} /></Field>
          </div>
        </section>

        {/* 5. Daftar bawaan dan catatan */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-indigo-800">5. Packing list dan catatan pribadi (opsional)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Packing list (satu barang per baris)"><textarea rows={4} className={inputCls} value={f.packing} onChange={set('packing')} /></Field>
            <Field label="Catatan tambahan (satu catatan per baris)"><textarea rows={4} className={inputCls} value={f.notes} onChange={set('notes')} /></Field>
          </div>
        </section>

        {galat && <p className="text-xs text-red-600">{galat}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
          <p className="text-[11px] text-slate-500 max-w-md">
            Catatan otomatis di PDF (jarak, tempat tutup, jam buka kosong, anggaran) dihitung dari data database dan tanggal yang Anda isi.
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300">Batal</button>
            <button
              onClick={unduh}
              disabled={terpilih.length === 0 || sibuk}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sibuk ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              <span>{sibuk ? 'Membuat PDF...' : 'Unduh Trip Plan PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
