import React from 'react';
import { Calendar, Clock, DollarSign, MapPin, CheckCircle, Share2, Printer, Sparkles, Lightbulb } from 'lucide-react';

export const ItineraryCard = ({ itinerary, onReviseClick }) => {
  if (!itinerary) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mt-3 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-amber-500/40 shadow-xl space-y-4 text-slate-100 font-sans">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] uppercase font-bold tracking-wider text-amber-400">
              Hasil AI Trip Planner Pekalongan
            </span>
          </div>
          <h4 className="text-base sm:text-lg font-bold font-serif text-white">
            {itinerary.title || 'Rencana Perjalanan Kota Pekalongan'}
          </h4>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Est. Rp {Number(itinerary.estimatedCostPerPerson || 0).toLocaleString('id-ID')} / orang</span>
          </span>
        </div>
      </div>

      {/* Summary */}
      {itinerary.summary && (
        <p className="text-xs sm:text-sm text-slate-300 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 leading-relaxed italic">
          "{itinerary.summary}"
        </p>
      )}

      {/* Timeline Schedule */}
      <div className="space-y-3 pt-1">
        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>Linimasa Jadwal Kunjungan</span>
        </h5>

        <div className="relative pl-4 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-amber-500/30">
          {itinerary.schedule && itinerary.schedule.map((item, index) => (
            <div key={index} className="relative flex items-start gap-3 group">
              {/* Dot */}
              <div className="absolute -left-4 top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center text-[9px] font-bold text-amber-300">
                {index + 1}
              </div>

              {/* Card Slot */}
              <div className="flex-1 p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition-all space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{item.time} ({item.period})</span>
                  </div>

                  {item.estimatedCost > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-400">
                      ~ Rp {Number(item.estimatedCost).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>

                <h6 className="text-sm font-bold text-white font-serif flex items-center gap-1.5 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>{item.placeName}</span>
                </h6>

                <p className="text-xs text-slate-300 leading-normal">
                  {item.activity}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      {itinerary.tips && itinerary.tips.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Tips Kunjungan dari AI:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
            {itinerary.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Card Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
        >
          <Printer className="w-3.5 h-3.5 text-amber-400" />
          <span>Cetak / Simpan PDF</span>
        </button>

        {onReviseClick && (
          <button
            onClick={onReviseClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-all"
          >
            <span>Minta Revisi Rencana</span>
          </button>
        )}
      </div>

    </div>
  );
};
