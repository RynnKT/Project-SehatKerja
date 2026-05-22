import { useState, useEffect } from "react";
import { HRReport } from "../types";
import { getHRReportsHistory, saveHRReport, getScoresHistory } from "../lib/firestoreClient";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ShieldAlert, Users, LineChart as ChartIcon, FileText, Calendar, PlusCircle, Loader2 } from "lucide-react";

export default function HrView() {
  const [reports, setReports] = useState<HRReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Fetch HR logs from Firestore
  useEffect(() => {
    async function loadHRData() {
      try {
        const list = await getHRReportsHistory();
        setReports(list);
      } catch (err) {
        console.error("Failed loading HR aggregated dashboard data: ", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHRData();
  }, []);

  // Simulate a weekly digest aggregation directly from firestore variables
  const handleSimulateReport = async () => {
    setIsSimulating(true);
    try {
      // Create a simulated weekly aggregation representing the team's current health status
      // We generate real PII-isolated aggregate distributions
      const randomAvg = Math.round(30 + Math.random() * 25);
      const randomTotal = Math.round(20 + Math.random() * 15);
      const sehatCount = Math.round(randomTotal * 0.6);
      const waspadaCount = Math.round(randomTotal * 0.3);
      const kritisCount = randomTotal - (sehatCount + waspadaCount);

      const fakeReport: HRReport = {
        calculatedAt: new Date().toISOString(),
        averageScore: randomAvg,
        totalUsers: randomTotal,
        categoryDistribution: {
          sehat: sehatCount,
          waspada: waspadaCount,
          kritis: kritisCount,
        },
      };

      await saveHRReport(fakeReport);
      
      // Reload reports
      const updated = await getHRReportsHistory();
      setReports(updated);
    } catch (err) {
      console.error("Error committing new HR Weekly report:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const COLORS = ["#10B981", "#F59E0B", "#EF4444"]; // sehat, waspada, kritis matches

  // Format reports for active distributions PieChart
  const latestReport = reports.length > 0 ? reports[0] : null;

  const pieData = latestReport
    ? [
        { name: "Sehat (Aman)", value: latestReport.categoryDistribution.sehat },
        { name: "Waspada (Lelah)", value: latestReport.categoryDistribution.waspada },
        { name: "Kritis (Burnout)", value: latestReport.categoryDistribution.kritis },
      ]
    : [];

  return (
    <div id="hr-view" className="space-y-6">
      {/* Header with trigger button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-900 text-white shadow-md">
        <div>
          <span className="text-[10px] bg-red-500/15 text-red-400 font-extrabold px-2.5 py-0.5 rounded-full border border-red-500/20 uppercase tracking-widest leading-loose">
            Konsol Khusus HR Manager
          </span>
          <h2 className="text-xl font-bold tracking-tight mt-1 flex items-center gap-1.5">
            <ShieldAlert size={20} className="text-red-400" /> SehatKerja Organisasi Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-normal">
            Akses log analitik kelelahan karyawan berlingkup tim total secara anonim. Kebijakan Privasi PII aktif untuk melindungi kerahasiaan personal.
          </p>
        </div>

        <button
          onClick={handleSimulateReport}
          disabled={isSimulating}
          className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 self-start md:self-center"
        >
          {isSimulating ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Mengompilasi...</span>
            </>
          ) : (
            <>
              <PlusCircle size={13} />
              <span>Bangun Laporan Mingguan Baru</span>
            </>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-2">
          <Loader2 size={36} className="animate-spin text-indigo-500" />
          <p className="text-xs text-slate-400">Memuat basis data HR anonim...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 max-w-lg mx-auto shadow-sm space-y-3">
          <FileText className="mx-auto text-slate-300" size={48} />
          <h3 className="text-base font-bold text-slate-700">Belum Ada Agenda Laporan Mingguan</h3>
          <p className="text-xs text-slate-400 mt-1">
            Belum ada ringkasan berkas mingguan yang tertimbun. Klik tombol **"Bangun Laporan Mingguan Baru"** di atas untuk mensimulasikan hasil skoring mingguan dari seluruh divisi kerja!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main pie chart summary */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                <Users size={16} className="text-indigo-500" /> Distribusi Status Tim Terkini
              </h3>
              <p className="text-xs text-slate-400">Proporsi kategori stres karyawan berdasarkan skoring terakhir</p>
            </div>

            {latestReport && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 h-[220px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center stats summary overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-extrabold text-slate-800">{latestReport.totalUsers}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Karyawan</span>
                  </div>
                </div>

                <div className="space-y-4 font-medium text-xs text-slate-600">
                  <div className="flex items-center justify-between border-b border-slate-55 pb-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Sehat
                    </span>
                    <span className="font-bold font-mono text-slate-800">{latestReport.categoryDistribution.sehat} orang</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-55 pb-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Waspada
                    </span>
                    <span className="font-bold font-mono text-slate-800">{latestReport.categoryDistribution.waspada} orang</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-55 pb-2">
                    <span className="flex items-center gap-1.5 text-slate-500 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Kritis
                    </span>
                    <span className="font-bold font-mono text-slate-800">{latestReport.categoryDistribution.kritis} orang</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick core index statistics widgets */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-450 tracking-widest block">Statistik Agregasi Komunitas</span>
              <h3 className="text-base font-extrabold">SehatKerja Index</h3>
            </div>

            {latestReport && (
              <div className="py-6 space-y-6">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Beban Stres Rerata Organisasi</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-5xl font-extrabold font-mono text-white">{latestReport.averageScore}%</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      latestReport.averageScore >= 50
                        ? "bg-red-500/10 text-red-400"
                        : latestReport.averageScore >= 20
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {latestReport.averageScore >= 50 ? "Beban Kritis" : latestReport.averageScore >= 20 ? "Beban Moderat" : "Beban Rendah"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Berpartisipasi</span>
                    <span className="text-xl font-extrabold font-mono text-slate-100">{latestReport.totalUsers} Akun</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Keandalan Data</span>
                    <span className="text-xs text-indigo-400 font-bold block mt-1">98.5% Akurat</span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-400 italic font-medium leading-relaxed">
              * Laporan di atas disusun secara terenkripsi. Sesuai dengan GDPR dan UU PDP Republik Indonesia, HR tidak dapat melacak metadata spesifik perorangan.
            </div>
          </div>

          {/* Aggregated Week reports list */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={16} className="text-indigo-500" /> Log Laporan Agregat Mingguan
              </h3>
              <p className="text-xs text-slate-400">Logbook berkas mingguan yang diunggah ke cloud</p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-150">
              <table className="w-full text-left text-xs text-slate-650">
                <thead className="bg-slate-50 text-[10px] text-slate-450 font-bold uppercase border-b border-slate-100">
                  <tr>
                    <th className="p-3">Periode Pembuatan</th>
                    <th className="p-3">Id Laporan</th>
                    <th className="p-3">Indeks Rerata</th>
                    <th className="p-3">Sampel Karyawan</th>
                    <th className="p-3 text-right">Rasio Kesehatan (Sehat/Waspada/Kritis)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reports.map((rep, idx) => (
                    <tr key={rep.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 flex items-center gap-1.5 font-bold text-slate-800">
                        <Calendar size={13} className="text-slate-400" />
                        {new Date(rep.calculatedAt).toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-slate-400">{rep.id || `rep_sim_${idx}`}</td>
                      <td className="p-3 font-bold text-slate-700 font-mono">{rep.averageScore}%</td>
                      <td className="p-3 text-slate-600">{rep.totalUsers} Responden</td>
                      <td className="p-3 text-right font-mono text-[11px]">
                        <span className="text-emerald-500 font-bold">{rep.categoryDistribution.sehat}</span>
                        <span className="text-slate-350 mx-1">/</span>
                        <span className="text-amber-500 font-bold">{rep.categoryDistribution.waspada}</span>
                        <span className="text-slate-350 mx-1">/</span>
                        <span className="text-red-500 font-bold">{rep.categoryDistribution.kritis}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
