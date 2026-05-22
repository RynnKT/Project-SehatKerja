import { useState } from "react";
import { BurnoutResult } from "../types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Database, ChevronLeft, ChevronRight, Eye, Calendar, Signal, Award } from "lucide-react";

interface HistoryViewProps {
  scores: BurnoutResult[];
}

export default function HistoryView({ scores }: HistoryViewProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedScore, setSelectedScore] = useState<BurnoutResult | null>(null);

  const itemsPerPage = 10;
  const sortedScores = [...scores].sort(
    (a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime()
  );

  // Pagination logic
  const totalPages = Math.ceil(sortedScores.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedScores = sortedScores.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (category: "sehat" | "waspada" | "kritis") => {
    if (category === "kritis") return "bg-red-50 text-red-600 border border-red-100";
    if (category === "waspada") return "bg-amber-50 text-amber-600 border border-amber-100";
    return "bg-green-50 text-green-600 border border-green-100";
  };

  // Convert scores for all-time line chart
  const timelineData = [...scores]
    .sort((a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime())
    .map((item) => ({
      date: new Date(item.calculatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      score: item.score,
    }));

  return (
    <div id="history-view-container" className="space-y-6">
      {sortedScores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500 max-w-lg mx-auto shadow-sm space-y-4">
          <Database className="mx-auto text-slate-350" size={48} />
          <h3 className="text-base font-bold text-slate-700">Pola Komunikasi Kosong</h3>
          <p className="text-xs text-slate-400 mt-1 leading-normal">
            Anda belum pernah menghitung indeks stres burnout sebelumnya. Kunjungi halaman **Input Data** untuk mulai menganalisis!
          </p>
        </div>
      ) : (
        <>
          {/* Historical progression LineChart */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Kurva Perjalanan Burnout</h3>
              <p className="text-xs text-slate-400">Peta visual perkembangan indeks burnout harian dari awal pemantauan</p>
            </div>

            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5 text-[11px] shadow-lg">
                            <p className="font-bold">{payload[0].payload.date}</p>
                            <p className="mt-1 text-slate-300">
                              Indeks: <strong className="text-white font-mono">{payload[0].value}%</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2.5} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4 p-6">
            <div>
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Arsip Analisis Burnout</h3>
              <p className="text-xs text-slate-400">Daftar riwayat index kelayakan kerja per sesi</p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100">
                  <tr>
                    <th className="p-3">Tanggal Hitung</th>
                    <th className="p-3">Indeks Skoring</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Faktor Utama</th>
                    <th className="p-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedScores.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-medium text-slate-800 flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {new Date(item.calculatedAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">{item.score}%</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${getStatusColor(item.category)}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 max-w-[250px] truncate text-slate-500 font-medium">{item.topFactors.join(", ")}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedScore(item)}
                          className="p-1 px-2.2 text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-lg transition-all"
                        >
                          <Eye size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                <span>Halaman {currentPage} dari {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-300"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-300"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Breakdown Modal Overlay */}
      {selectedScore && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 w-full max-w-lg shadow-xl p-6 space-y-6 animate-scaleIn">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Detail Sinyal Burnout</h3>
                <p className="text-[10px] text-slate-400">
                  Dihitung pada {new Date(selectedScore.calculatedAt).toLocaleString("id-ID")}
                </p>
              </div>
              <button
                onClick={() => setSelectedScore(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 px-3  py-1 rounded font-bold transition-all text-xs border border-slate-200"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-indigo-600 flex items-center justify-center font-bold font-mono text-indigo-600">
                    {selectedScore.score}%
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Indeks Total</span>
                    <h4 className="text-sm font-extrabold text-slate-800 capitalize">{selectedScore.category}</h4>
                  </div>
                </div>
              </div>

              {/* Signals checklist list */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Signal size={12} /> Status 5 Komponen Sinyal:
                </span>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
                  {JSON.parse(selectedScore.signalsJson || "[]").map((sig: any, sIdx: number) => {
                    return (
                      <div key={sIdx} className="p-3 flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-medium">{sig.name}</span>
                        <span
                          className={`font-mono px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                            sig.status === "kritis"
                              ? "bg-red-50 text-red-650"
                              : sig.status === "waspada"
                              ? "bg-amber-50 text-amber-650"
                              : "bg-green-50 text-green-650"
                          }`}
                        >
                          {sig.status} ({sig.actualValue})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1 bg-amber-50/50 p-4 rounded-xl border border-amber-100 text-xs text-amber-800 leading-normal">
                <span className="font-bold flex items-center gap-1 text-amber-900">
                  <Award size={13} /> Analisis Penyebab Utama:
                </span>
                <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-700">
                  {selectedScore.topFactors.map((f, fIdx) => (
                    <li key={fIdx}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
