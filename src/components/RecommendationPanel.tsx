import { Recommendation } from "../types";
import { CheckCircle2, Clock, CalendarClock, MessageCircle, ShieldAlert, Heart, Smile } from "lucide-react";

interface RecommendationPanelProps {
  recommendations: Recommendation[];
  onComplete: (recId: string) => void;
  isLoading: boolean;
}

export default function RecommendationPanel({ recommendations, onComplete, isLoading }: RecommendationPanelProps) {
  
  // Custom icons based on wellness category
  const getTypeBadge = (type: "fisik" | "mental" | "sosial") => {
    if (type === "fisik") {
      return { 
        text: "Peregangan Fisik", 
        color: "text-emerald-600 bg-emerald-50 border-emerald-100", 
        icon: <Heart size={14} className="text-emerald-500" /> 
      };
    }
    if (type === "mental") {
      return { 
        text: "Rileksasi Mental", 
        color: "text-indigo-600 bg-indigo-50 border-indigo-100", 
        icon: <Smile size={14} className="text-indigo-500" /> 
      };
    }
    return { 
      text: "Koneksi Sosial", 
      color: "text-purple-600 bg-purple-50 border-purple-100", 
      icon: <MessageCircle size={14} className="text-purple-500" /> 
    };
  };

  return (
    <div id="ai-recommendations" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-1.5">
            <Heart size={16} className="text-rose-500" fill="#F43F5E" /> Rekomendasi Micro-Break Coach AI
          </h3>
          <p className="text-xs text-slate-400">Dirancang personal oleh Gemini berdasarkan sinyal kognitif Anda hari ini</p>
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 rounded bg-slate-100 font-mono">
          Asisten Aktif
        </span>
      </div>

      {recommendations.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <ShieldAlert size={32} className="text-slate-300" />
          <p>Belum ada rekomendasi aktif. Lakuan analisis pola di halaman input terlebih dahulu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.slice(0, 3).map((rec, idx) => {
            const isCompleted = !!rec.completedAt;
            const badge = getTypeBadge(rec.type);

            return (
              <div
                key={rec.id || idx}
                className={`relative border rounded-xl p-5 flex flex-col justify-between transition-all ${
                  isCompleted
                    ? "bg-slate-50/70 border-slate-200/60 opacity-60 line-through text-slate-400"
                    : "bg-white border-slate-100 shadow-sm hover:border-slate-200 hover:shadow"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.color}`}
                    >
                      {badge.icon}
                      <span>{badge.text}</span>
                    </span>

                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock size={11} /> {rec.durationMinutes} Menit
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className={`text-sm font-bold ${isCompleted ? "text-slate-400" : "text-slate-800"}`}>
                      {rec.title}
                    </h4>
                    <p className={`text-xs leading-normal ${isCompleted ? "text-slate-400" : "text-slate-500"}`}>
                      {rec.reason}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <CalendarClock size={11} className="text-indigo-500" />
                    <span>Waktu: {rec.bestTime}</span>
                  </div>

                  {!isCompleted ? (
                    <button
                      onClick={() => rec.id && onComplete(rec.id)}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} />
                      <span>Selesai</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      Tuntas!
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
