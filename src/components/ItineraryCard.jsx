import React from 'react';
import { Calendar, Clock, DollarSign, MapPin, CheckCircle, Share2, Printer, Sparkles, Lightbulb, ExternalLink, Navigation } from 'lucide-react';
import { formatKm } from '../utils/geo.js';

export const ItineraryCard = ({ itinerary, onReviseClick, onTripPlan }) => {
  if (!itinerary) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mt-3 p-4 sm:p-5 rounded-2xl bg-white/90 border border-indigo-100 shadow-xl space-y-4 text-slate-800 font-sans">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-800" />
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-800">
              Hasil AI Trip Planner Pekalongan
            </span>
          </div>
          <h4 className="text-base sm:text-lg font-bold font-serif text-slate-900">
            {itinerary.title || 'Rencana Perjalanan Kota Pekalongan'}
          </h4>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-900 text-white flex items-center gap-1 shadow-sm">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Est. Rp {Number(itinerary.estimatedCostPerPerson || 0).toLocaleString('id-ID')} / orang</span>
          </span>
        </div>
      </div>

      {/* Summary */}
      {itinerary.summary && (
        <p className="text-xs sm:text-sm text-slate-600 bg-indigo-50 p-3 rounded-xl border border-indigo-100 leading-relaxed italic">
          "{itinerary.summary}"
        </p>
      )}

      {/* Ringkasan rute (hanya ada jika itinerary sudah dicocokkan dengan database) */}
      {typeof itinerary.totalJarakKm === 'number' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-indigo-800" />
            Total rute sekitar {formatKm(itinerary.totalJarakKm)} (garis lurus)
          </span>
          {itinerary.jumlahKecamatan > 0 && <span>Melewati {itinerary.jumlahKecamatan} kecamatan</span>}
        </div>
      )}

      {/* Timeline Schedule */}
      <div className="space-y-3 pt-1">
        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-800" />
          <span>Linimasa Jadwal Kunjungan</span>
        </h5>

        <div className="relative pl-4 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200">
          {itinerary.schedule && itinerary.schedule.map((item, index) => (
            <div key={index} className="relative flex items-start gap-3 group">
              {/* Dot */}
              <div className="absolute -left-4 top-1 w-4 h-4 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-indigo-800">
                {index + 1}
              </div>

              {/* Card Slot */}
              <div className="flex-1 p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 transition-all space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-indigo-800">
                    <Clock className="w-3 h-3 text-indigo-800" />
                    <span>{item.time} ({item.period})</span>
                  </div>

                  {item.estimatedCost > 0 && (
                    <span className="text-xs font-semibold text-emerald-700">
                      ~ Rp {Number(item.estimatedCost).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>

                <h6 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-1.5 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-800 shrink-0" />
                  <span>{item.placeName}</span>
                </h6>

                <p className="text-xs text-slate-600 leading-normal">
                  {item.activity}
                </p>

                {(item.kecamatan || item.jarakDariSebelumnya != null || item.mapUrl) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-500">
                    {item.kecamatan && <span>Kec. {item.kecamatan.replace(/^Pekalongan /, '')}</span>}
                    {item.jarakDariSebelumnya != null && (
                      <span>{formatKm(item.jarakDariSebelumnya)} dari tempat sebelumnya</span>
                    )}
                    {item.mapUrl && (
                      <a
                        href={item.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-indigo-800 hover:text-indigo-900 underline underline-offset-4"
                      >
                        <span>Buka di Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {itinerary.tempatDibuang && itinerary.tempatDibuang.length > 0 && (
        <p className="text-[11px] text-slate-500">
          {itinerary.tempatDibuang.length} saran AI tidak ditampilkan karena tidak ada di database PekaloJalan.
        </p>
      )}

      {/* Tips */}
      {itinerary.tips && itinerary.tips.length > 0 && (
        <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-indigo-800 font-bold">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Tips Kunjungan dari AI:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs">
            {itinerary.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Card Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
        <button
          onClick={onTripPlan || handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all"
        >
          <Printer className="w-3.5 h-3.5 text-indigo-800" />
          <span>{onTripPlan ? 'Buat Trip Plan PDF' : 'Cetak / Simpan PDF'}</span>
        </button>

        {onReviseClick && (
          <button
            onClick={onReviseClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold border border-indigo-100 transition-all"
          >
            <span>Minta Revisi Rencana</span>
          </button>
        )}
      </div>

    </div>
  );
};
