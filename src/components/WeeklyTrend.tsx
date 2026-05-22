import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { BurnoutResult } from "../types";
import { TrendingUp, Award, Calendar } from "lucide-react";

interface WeeklyTrendProps {
  scores: BurnoutResult[];
}

export default function WeeklyTrend({ scores }: WeeklyTrendProps) {
  // Format dates chronologically
  const sortedScores = [...scores]
    .sort((a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime())
    .map((item) => {
      const d = new Date(item.calculatedAt);
      return {
        ...item,
        formattedDate: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        displayScore: item.score,
      };
    });

  // Calculate stats
  const totalScoresCount = sortedScores.length;
  const recentScore = totalScoresCount > 0 ? sortedScores[totalScoresCount - 1].score : 0;
  const averageScore = totalScoresCount > 0 
    ? Math.round(sortedScores.reduce((acc, curr) => acc + curr.score, 0) / totalScoresCount) 
    : 0;

  return (
    <div id="weekly-historical-trend" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6 flex flex-col justify-between">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
            <TrendingUp size={16} className="text-indigo-500" /> Tren Indeks Kelelahan Pekerjaan
          </h3>
          <p className="text-xs text-slate-400">Fluktuasi index stress total harian dari run analisis Anda</p>
        </div>

        {/* Quick parameters readout metrics */}
        <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2 rounded-lg bg-indigo-50 text-indigo-600 font-bold font-mono">
              {recentScore}%
            </div>
            <span>Skor Terkini</span>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <div className="p-1 px-2 rounded-lg bg-emerald-50 text-emerald-600 font-bold font-mono">
              {averageScore}%
            </div>
            <span>Rerata Tren</span>
          </div>
        </div>
      </div>

      {sortedScores.length < 2 ? (
        <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-100">
          <Calendar size={32} className="text-slate-300" />
          <p>Butuh minimal 2x koordinat analisis untuk melacak tren pergerakan kurva kelelahan Anda.</p>
        </div>
      ) : (
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sortedScores} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              {/* Reference indicator lines */}
              <ReferenceLine y={50} stroke="#EF4444" strokeDasharray="3 3" />
              <ReferenceLine y={20} stroke="#F59E0B" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dataObj = payload[0].payload as BurnoutResult;
                    const dateDesc = new Date(dataObj.calculatedAt).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                    return (
                      <div className="bg-slate-900 border border-slate-800 text-white rounded-lg p-3 text-xs shadow-xl space-y-1">
                        <p className="font-bold text-[10px] text-slate-400 uppercase">{dateDesc}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                          <span className="font-medium text-slate-200">Indeks Burnout: </span>
                          <span className="font-extrabold text-white font-mono">{dataObj.score}%</span>
                        </div>
                        <p className="text-[10px] capitalize font-semibold text-indigo-300">Category: {dataObj.category}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="displayScore"
                stroke="#4F46E5"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#scoreTrendGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3 mt-2">
        <Award className="text-indigo-600 mt-0.5 shrink-0" size={16} />
        <div className="text-xs text-slate-500 leading-normal">
          <p className="font-bold text-slate-700">Tips Membaca Grafik:</p>
          <p className="mt-0.5">
            Komponen garis merah putus-putus mewakili batas ambang risiko **Kritis** (Skor &ge; 50), dan garis kuning mewakili batas **Waspada** (Skor &ge; 20). Usahakan grafik selalu berada di bawah garis kuning!
          </p>
        </div>
      </div>
    </div>
  );
}
