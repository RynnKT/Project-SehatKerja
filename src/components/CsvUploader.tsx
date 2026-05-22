import React, { useState, useRef } from "react";
import { parseCommunicationCsv, ParseResultSummary } from "../lib/csvParser";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, FileText, Calendar, MessageSquare, RefreshCw } from "lucide-react";

interface CsvUploaderProps {
  onParsed: (summary: ParseResultSummary) => void;
  isSubmitting: boolean;
}

export default function CsvUploader({ onParsed, isSubmitting }: CsvUploaderProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [summary, setSummary] = useState<ParseResultSummary | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Table preview of first 5 lines
  const [rawRowsPreview, setRawRowsPreview] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv") && !selectedFile.name.endsWith(".txt")) {
      setErrorMsg("Gagal: Hanya mendukung file berekstensi .csv atau .txt.");
      return;
    }

    setErrorMsg(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);

      try {
        // Initial dry run parser just to detect senders list
        const initialSummary = parseCommunicationCsv(content, "");
        setSummary(initialSummary);

        // Pre-select first found sender name if present
        if (initialSummary.detectedSenderNames.length > 0) {
          const firstSender = initialSummary.detectedSenderNames[0];
          setSelectedUser(firstSender);
          
          // Trigger actual parsed update based on that user
          const loadedParsed = parseCommunicationCsv(content, firstSender);
          setSummary(loadedParsed);
        }

        // Gather raw preview rows for display
        const lines = content.split("\n").slice(0, 6);
        const headers = lines[0].split(",");
        const previewList = lines.slice(1).map((line) => {
          const cells = line.split(",");
          const rowObj: any = {};
          headers.forEach((header, idx) => {
            rowObj[header.trim()] = cells[idx] ? cells[idx].replace(/['"]+/g, "").trim() : "";
          });
          return rowObj;
        });
        setRawRowsPreview(previewList.slice(0, 5));

      } catch (err) {
        setErrorMsg("Format berkas CSV tidak dikenali atau salah satu baris mengandung format korup.");
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // When selected user changes inside CSV, re-run parser
  const handleUserChange = (user: string) => {
    setSelectedUser(user);
    if (csvContent) {
      const updated = parseCommunicationCsv(csvContent, user);
      setSummary(updated);
    }
  };

  const handleClear = () => {
    setFile(null);
    setCsvContent("");
    setSummary(null);
    setRawRowsPreview([]);
    setSelectedUser("");
  };

  const handleAnalyze = () => {
    if (!summary || summary.totalMessagesMatched === 0) {
      setErrorMsg("Gagal: Tidak ada data pesan yang cocok dengan pengguna terpilih.");
      return;
    }
    
    // Check if unique days is sufficient
    const datesMap = new Set<string>();
    summary.metadata.forEach((m) => {
      datesMap.add(m.timestamp.split("T")[0]);
    });

    if (datesMap.size < 3) {
      setErrorMsg("Gagal: Komunikasi terdeteksi kurang dari 3 hari berbeda. Diperlukan minimal harian 3 hari data berbeda.");
      return;
    }

    onParsed(summary);
  };

  return (
    <div id="csv-uploader-root" className="space-y-6">
      {!file ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-indigo-600 bg-indigo-50"
              : "border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleChange}
            className="hidden"
          />
          <UploadCloud className="mx-auto text-indigo-500 mb-4" size={48} />
          <h3 className="text-base font-bold text-slate-700">Tarik & Lepas berkas CSV ekspor Anda</h3>
          <p className="text-xs text-slate-400 mt-1">Atau klik untuk menelusuri dari folder (Mendukung tipe berkas .csv, .txt Slack & WhatsApp)</p>
          <div className="mt-6 flex justify-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200">
              <FileSpreadsheet size={13} className="text-emerald-500" /> Slack messages.csv
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200">
              <FileText size={13} className="text-green-500" /> WhatsApp chat.txt
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700">{file.name}</h4>
                <p className="text-xs text-slate-400">Deteksi format: <strong className="text-slate-600">{summary?.format}</strong></p>
              </div>
            </div>
            
            <button
              onClick={handleClear}
              className="text-xs font-semibold text-slate-500 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-slate-200"
            >
              Ubah Berkas
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User selector block */}
          {summary && summary.detectedSenderNames.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Mencari Anggota Komunikasi Ekspor:
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => handleUserChange(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500"
                >
                  {summary.detectedSenderNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Data yang teranalisis hanya merupakan metadata komunikasi yang dikirim oleh nama ini.
                </span>
              </div>

              <div className="space-y-2 border-l border-slate-200/50 pl-0 md:pl-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Ringkasan Pesan Terarsir</span>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-slate-400" />
                    <span>{summary.totalMessagesMatched} Pesan</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Calendar size={13} className="text-slate-400" />
                    <span>Rentang: {summary.dateRange ? `${summary.dateRange.start} - ${summary.dateRange.end}` : "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Table Preview */}
          {rawRowsPreview.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500">Pratinjau Data Mentah (5 baris pertama)</span>
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100">
                    <tr>
                      {Object.keys(rawRowsPreview[0]).map((h) => (
                        <th key={h} className="p-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {rawRowsPreview.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        {Object.values(row).map((val: any, cIdx) => (
                          <td key={cIdx} className="p-2 max-w-[150px] truncate">{String(val || "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isSubmitting || !summary || summary.totalMessagesMatched === 0}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Memproses dan Menyinkronkan Database...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Analisis Log Hasil Komunikasi Kerja Sekarang</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
