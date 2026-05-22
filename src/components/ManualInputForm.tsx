import React, { useState, useEffect } from "react";
import { MessageMetadata } from "../types";
import { calculateBurnoutRisk } from "../lib/burnoutCalculator";
import { AlertCircle, Clock, MessageSquare, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

interface ManualInputFormProps {
  onSubmit: (metadata: MessageMetadata[]) => void;
  isSubmitting: boolean;
}

interface DayInput {
  dayName: string;
  isEnabled: boolean;
  startTime: string; // "08:00"
  endTime: string;   // "17:00"
  messageCount: number;
  responseTimeCategory: "<5" | "5-30" | ">30";
}

const INDONESIAN_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function ManualInputForm({ onSubmit, isSubmitting }: ManualInputFormProps) {
  // Setup day schedules trailing from today back 7 days
  const [days, setDays] = useState<DayInput[]>([]);
  const [activeAccordionIdx, setActiveAccordionIdx] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize form options relative to today's Indonesian calendar day list
  useEffect(() => {
    const today = new Date();
    const list: DayInput[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayName = INDONESIAN_DAYS[d.getDay()];
      list.push({
        dayName: `${dayName} (${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })})`,
        isEnabled: i === 0 || i === 1 || i === 2, // default enable 3 days to pass validation easily
        startTime: "08:00",
        endTime: "17:00",
        messageCount: 5,
        responseTimeCategory: "5-30",
      });
    }
    setDays(list);
  }, []);

  // Duplicate previous day configuration shortcut
  const handleCopyYesterday = (currentIdx: number) => {
    if (currentIdx === 0) return;
    const prev = days[currentIdx - 1];
    setDays((prevDays) => {
      const updated = [...prevDays];
      updated[currentIdx] = {
        ...updated[currentIdx],
        startTime: prev.startTime,
        endTime: prev.endTime,
        messageCount: prev.messageCount,
        responseTimeCategory: prev.responseTimeCategory,
        isEnabled: true,
      };
      return updated;
    });
  };

  const handleUpdateField = <K extends keyof DayInput>(idx: number, field: K, value: DayInput[K]) => {
    setDays((prevDays) => {
      const updated = [...prevDays];
      updated[idx] = {
        ...updated[idx],
        [field]: value,
      };
      return updated;
    });
  };

  // Convert DayInput model structure to MessageMetadata standard database structure
  const convertToMetadata = (): MessageMetadata[] => {
    const today = new Date();
    return days
      .map((day, idx) => {
        if (!day.isEnabled) return null;

        // Reconstruct date
        const targetDate = new Date();
        targetDate.setDate(today.getDate() - (6 - idx));

        // Create metadata samples for messages sent on this day
        // Synthesising message distributions based on messageCount
        const [startH] = day.startTime.split(":").map(Number);
        const [endH] = day.endTime.split(":").map(Number);
        const count = day.messageCount;

        const minutesMap = {
          "<5": 3,
          "5-30": 15,
          ">30": 45,
        };
        const respTime = minutesMap[day.responseTimeCategory];

        const dayOfWeek = targetDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const results: MessageMetadata[] = [];
        for (let i = 0; i < count; i++) {
          // Distribute message hours from startTime to endTime
          let msgHour = startH;
          if (count > 1) {
            msgHour = Math.round(startH + ((endH - startH) * i) / (count - 1));
          }
          // Clamp hour valid limits
          msgHour = Math.max(0, Math.min(23, msgHour));

          // Set specific simulated date timestamp
          const msgTimestamp = new Date(targetDate);
          msgTimestamp.setHours(msgHour, Math.round(Math.random() * 59));

          results.push({
            timestamp: msgTimestamp.toISOString(),
            hourOfDay: msgHour,
            isWeekend,
            messageLength: 120 + Math.round(Math.random() * 60), // standard text size
            responseTimeMinutes: respTime,
            source: "manual",
            createdAt: new Date().toISOString(),
          });
        }
        return results;
      })
      .filter((x): x is MessageMetadata[] => x !== null)
      .flat();
  };

  // Live sidebar calculator computation
  const activeMetadata = convertToMetadata();
  const activeDaysCount = days.filter((d) => d.isEnabled).length;

  let liveCalculatedResult: any = null;
  let liveCalcError = "";

  if (activeDaysCount >= 3) {
    try {
      liveCalculatedResult = calculateBurnoutRisk(activeMetadata, 150);
    } catch (e) {
      liveCalcError = "Format kalkulasi belum sinkron.";
    }
  } else {
    liveCalcError = "Harap centang/aktifkan minimal 3 hari untuk kalkulasi.";
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeDaysCount < 3) {
      setErrorMsg("Validasi Gagal: Anda harus mengaktifkan dan mengisi minimal 3 hari laporan harian.");
      return;
    }
    setErrorMsg(null);
    onSubmit(activeMetadata);
  };

  return (
    <div id="manual-input-container" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form accordion block */}
      <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Metadata Harian Kerja (7 Hari)</h3>
              <p className="text-xs text-slate-400">Pilih hari aktif & isi ringkasan komunikasi Anda</p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold">
              {activeDaysCount} Hari Aktif
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {days.map((day, idx) => {
              const isOpen = activeAccordionIdx === idx;
              return (
                <div key={idx} className="py-3 flex flex-col">
                  {/* Accordion trigger row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={day.isEnabled}
                        onChange={(e) => handleUpdateField(idx, "isEnabled", e.target.checked)}
                        className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <span className={`text-sm font-medium ${day.isEnabled ? "text-slate-700" : "text-slate-400 font-normal line-through"}`}>
                        {day.dayName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {idx > 0 && day.isEnabled && (
                        <button
                          type="button"
                          onClick={() => handleCopyYesterday(idx)}
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded border border-slate-200"
                        >
                          <Copy size={12} />
                          <span>Isi Seperti Kemarin</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveAccordionIdx(isOpen ? -1 : idx)}
                        className="text-slate-500 hover:bg-slate-100 p-1 rounded"
                      >
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Accordion collapsed body */}
                  {isOpen && (
                    <div className="mt-4 pl-7 pr-3 pb-2 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100 transition-all duration-300">
                      {!day.isEnabled && (
                        <p className="text-xs text-amber-500 italic flex items-center gap-1">
                          <AlertCircle size={12} /> Centang kotak aktif di samping kiri untuk mengedit koordinat hari ini.
                        </p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                            <Clock size={12} /> Rentang Jam Komunikasi Kerja Aktif
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={day.startTime}
                              disabled={!day.isEnabled}
                              onChange={(e) => handleUpdateField(idx, "startTime", e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-slate-400">s/d</span>
                            <input
                              type="time"
                              value={day.endTime}
                              disabled={!day.isEnabled}
                              onChange={(e) => handleUpdateField(idx, "endTime", e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                            <MessageSquare size={12} /> Jumlah Pesan Kerja Dikirim / Hari
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={day.messageCount}
                            disabled={!day.isEnabled}
                            onChange={(e) => handleUpdateField(idx, "messageCount", Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            Rata-Rata Waktu Balas Pesan Masuk
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {["<5", "5-30", ">30"].map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                disabled={!day.isEnabled}
                                onClick={() => handleUpdateField(idx, "responseTimeCategory", cat as any)}
                                className={`py-1.5 text-xs font-medium rounded-lg border text-center transition-all ${
                                  day.responseTimeCategory === cat
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                }`}
                              >
                                {cat === "<5" ? "< 5 menit" : cat === "5-30" ? "5 - 30 menit" : "> 30 menit"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || activeDaysCount < 3}
          className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl shadow-sm transition-all text-sm flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Menganalisis Pola Burnout...</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span>Simpan & Integrasikan Grafik Burnout</span>
            </>
          )}
        </button>
      </form>

      {/* Reactive stress prediction sidebar */}
      <div className="space-y-6">
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col space-y-4">
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">Live Preview Burnout</h4>
            <h3 className="text-xl font-bold mt-1 text-white">Sinyal Burnout Sementara</h3>
          </div>

          {liveCalculatedResult ? (
            <div className="space-y-4 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-slate-800">
                  <span className="text-2xl font-bold font-mono text-white">{liveCalculatedResult.score}</span>
                  <div
                    className={`absolute inset-0 rounded-full border-4 animate-pulse ${
                      liveCalculatedResult.category === "kritis"
                        ? "border-red-500"
                        : liveCalculatedResult.category === "waspada"
                        ? "border-amber-400"
                        : "border-green-400"
                    }`}
                    style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", opacity: 0.3 }}
                  ></div>
                </div>

                <div>
                  <span
                    className={`text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full ${
                      liveCalculatedResult.category === "kritis"
                        ? "bg-red-500/10 text-red-400"
                        : liveCalculatedResult.category === "waspada"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-green-500/10 text-green-400"
                    }`}
                  >
                    Kategori: {liveCalculatedResult.category}
                  </span>
                  <p className="text-xs text-slate-300 mt-1">
                    Dari data {liveCalculatedResult.dataPoints} pesan komunikasi yang Anda input di form.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">
                  Status Signal Utama harian:
                </span>
                {liveCalculatedResult.signals.map((sig: any, sIdx: number) => (
                  <div key={sIdx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">{sig.name}</span>
                    <span
                      className={`font-mono px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        sig.status === "kritis"
                          ? "bg-red-500/20 text-red-300"
                          : sig.status === "waspada"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-green-400/20 text-green-300"
                      }`}
                    >
                      {sig.status} ({sig.actualValue})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500 text-xs">
              <AlertCircle className="mx-auto text-slate-600 mb-2" size={32} />
              <p>{liveCalcError}</p>
            </div>
          )}
        </div>

        <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl space-y-2.5">
          <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1">
            <AlertCircle size={14} /> Aturan Validasi Input:
          </h4>
          <ul className="text-xs text-amber-700/95 space-y-1.5 list-disc pl-4">
            <li>Minimal Anda harus mengisi 3 hari aktif.</li>
            <li>Centang kotak di sisi kiri hari untuk mendaftarkan data hari tersebut ke algoritme.</li>
            <li>Makin lengkap melengkapi form, makin presisi algoritme mendeteksi fluktuasi burnout Anda.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
