/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User } from "firebase/auth";
import { onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";
import { auth, googleProvider, db } from "./lib/firebaseConfig";
import { 
  getUserProfile, 
  saveUserProfile, 
  saveMessageMetadataBulk, 
  saveBurnoutScore, 
  saveRecommendationsBulk,
  getUserRecommendations,
  markRecommendationCompleted
} from "./lib/firestoreClient";
import { calculateBurnoutRisk } from "./lib/burnoutCalculator";
import { UserProfile, BurnoutResult, Recommendation, MessageMetadata } from "./types";

// Extracted Sub-Components
import Navigation from "./components/Navigation";
import BurnoutGauge from "./components/BurnoutGauge";
import SignalCards from "./components/SignalCards";
import RecommendationPanel from "./components/RecommendationPanel";
import WeeklyTrend from "./components/WeeklyTrend";
import ManualInputForm from "./components/ManualInputForm";
import CsvUploader from "./components/CsvUploader";
import HistoryView from "./components/HistoryView";
import HrView from "./components/HrView";

// Lucide Icons
import { Heart, Chrome, ShieldAlert, CheckCircle2, Moon, Sparkles, MessageSquare, Flame } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<"dashboard" | "input" | "history" | "hr">("dashboard");

  // Onboarding registration state for first-time login
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [onboardName, setOnboardName] = useState<string>("");
  const [onboardRole, setOnboardRole] = useState<"employee" | "hr">("employee");
  const [onboardTimezone,] = useState<string>("Asia/Jakarta");
  const [isOnboardingSaving, setIsOnboardingSaving] = useState<boolean>(false);

  // Core metrics state (real-time synchronized)
  const [scoresList, setScoresList] = useState<BurnoutResult[]>([]);
  const [recentScore, setRecentScore] = useState<BurnoutResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Calculation workflow states
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calcStatusPercent, setCalcStatusPercent] = useState<number>(0);
  const [calcStatusText, setCalcStatusText] = useState<string>("");

  // Common UI State
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [errGeneral, setErrGeneral] = useState<string | null>(null);

  // 1. Google Authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // Pre-populate onboarding fields in case profile doesn't exist
          setOnboardName(user.displayName || "");
          
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
            setShowOnboarding(false);
          } else {
            // Profile does not exist, trigger onboarding
            setShowOnboarding(true);
          }
        } catch (e) {
          console.error("Auth routing issue:", e);
          setErrGeneral("Gagal menghubungkan profil Anda dengan Firestore.");
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setShowOnboarding(false);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time synchronizers from Firestore on snapshots listeners
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    if (currentUser.uid === "demo-user-id") {
      const loadDemoData = () => {
        const localScores = localStorage.getItem("demo_scores");
        const localRecs = localStorage.getItem("demo_recs");

        let scores: BurnoutResult[] = [];
        let recs: Recommendation[] = [];

        if (localScores) {
          scores = JSON.parse(localScores);
        } else {
          scores = [
            {
              score: 54,
              category: "waspada",
              signalsJson: JSON.stringify([
                { name: "Pekerjaan Larut Malam", value: "3 hari/minggu", level: "medium", isHealthy: false, scoreDecline: 12, description: "Aktivitas kirim pesan terdeteksi di atas jam 21:00" },
                { name: "Respon Cepat Menegangkan", value: "Rata-rata 4.2 menit", level: "high", isHealthy: false, scoreDecline: 18, description: "Tekanan membalas instan sangat tinggi pada jam kerja" },
                { name: "Panjang Pesan Komunikasi", value: "Karakter sedang (180 kata)", level: "low", isHealthy: true, scoreDecline: 0, description: "Beban penjelasan masih dalam batas normal" }
              ]),
              topFactors: ["Komunikasi Larut Malam harian", "Responsivitas pesan yang terlalu instan (harus stand-by)"],
              dataPoints: 7,
              calculatedAt: new Date(Date.now() - 4 * 3600000).toISOString()
            }
          ];
          localStorage.setItem("demo_scores", JSON.stringify(scores));
        }

        if (localRecs) {
          recs = JSON.parse(localRecs);
        } else {
          recs = [
            {
              id: "demo-rec-1",
              title: "Terapkan Aturan Pelindung Jam Malam (Quiet Hours)",
              durationMinutes: 45,
              bestTime: "Mulai pukul 20:00 WIB",
              reason: "Aktivitas berkirim pesan di atas jam 21:00 terdeteksi tinggi. Matikan notifikasi aplikasi chat kerja setelah jam 20:00.",
              completedAt: null,
              scoreId: "demo-score-1",
              type: "mental",
            },
            {
              id: "demo-rec-2",
              title: "Latihan Pernapasan Kotak (Box Breathing)",
              durationMinutes: 5,
              bestTime: "Sela jam makan siang",
              reason: "Rata-rata kecepatan respon pesan Anda adalah 4.2 menit yang mengindikasikan urgensi tinggi konstan. Redakan denyut jantung dengan bernapas tenang.",
              completedAt: null,
              scoreId: "demo-score-1",
              type: "fisik",
            }
          ];
          localStorage.setItem("demo_recs", JSON.stringify(recs));
        }

        setScoresList(scores);
        setRecentScore(scores.length > 0 ? scores[0] : null);
        setRecommendations(recs);
      };

      loadDemoData();

      const handleStorageChange = () => {
        loadDemoData();
      };
      window.addEventListener("demo_data_update", handleStorageChange);
      return () => {
        window.removeEventListener("demo_data_update", handleStorageChange);
      };
    }

    // A. Listen to score archives
    const scoresColRef = collection(db, "users", currentUser.uid, "scores");
    const scoresQuery = query(scoresColRef, orderBy("calculatedAt", "desc"), limit(40));
    const unsubscribeScores = onSnapshot(scoresQuery, (snapshot) => {
      const list: BurnoutResult[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          score: data.score,
          category: data.category,
          signalsJson: data.signalsJson || "[]",
          topFactors: data.topFactors || [],
          dataPoints: 7,
          calculatedAt: data.calculatedAt,
        });
      });
      setScoresList(list);
      setRecentScore(list.length > 0 ? list[0] : null);
    }, (error) => {
      console.error("Scores Snapshot sync interrupted:", error);
    });

    // B. Listen to recommendations list
    const recsColRef = collection(db, "users", currentUser.uid, "recommendations");
    const recsQuery = query(recsColRef, orderBy("completedAt", "asc"));
    const unsubscribeRecs = onSnapshot(recsQuery, (snapshot) => {
      const list: Recommendation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          title: data.title,
          durationMinutes: data.durationMinutes,
          bestTime: data.bestTime,
          reason: data.reason,
          completedAt: data.completedAt,
          scoreId: data.scoreId,
          type: data.type,
        });
      });
      // Sort so active recommendations are of higher priority
      setRecommendations(list);
    }, (error) => {
      console.error("Recommendations Snapshot sync interrupted:", error);
    });

    return () => {
      unsubscribeScores();
      unsubscribeRecs();
    };
  }, [currentUser, userProfile]);

  // Handle onboarding profile completion
  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!onboardName.trim()) {
      setErrGeneral("Nama lengkap harus diisi untuk proses registrasi.");
      return;
    }

    setIsOnboardingSaving(true);
    setErrGeneral(null);

    try {
      const newProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email || "",
        name: onboardName.trim(),
        role: onboardRole,
        timezone: onboardTimezone,
        createdAt: new Date().toISOString(),
      };

      await saveUserProfile(newProfile);
      setUserProfile(newProfile);
      setShowOnboarding(false);
    } catch (err) {
      console.error("Fatal onboarding error:", err);
      setErrGeneral("Gagal melanjutkan pendaftaran profil Anda.");
    } finally {
      setIsOnboardingSaving(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrGeneral(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google authenticated failure:", err);
      const isCancelled = err?.code === "auth/cancelled-popup-request" || 
                          err?.message?.includes("cancelled-popup") || 
                          err?.message?.includes("popup-closed-by-user") ||
                          err?.code === "auth/popup-closed-by-user";
      if (isCancelled) {
        setErrGeneral(
          "Popup login Google ditutup atau dibatalkan. Catatan: Jika aplikasi dijalankan di dalam iframe pratinjau, Google Auth mungkin diblokir oleh kebijakan keamanan browser Anda. Harap klik tombol 'Buka di Tab Baru' di kanan atas layar untuk login dengan lancar, atau silakan gunakan tombol 'Masuk dengan Akun Demo' di bawah ini."
        );
      } else {
        setErrGeneral(
          "Gagal masuk dengan Google. Jika Anda berada di iframe pratinjau, silakan gunakan tombol 'Masuk dengan Akun Demo' di bawah atau buka aplikasi di 'Tab Baru'."
        );
      }
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (currentUser?.uid === "demo-user-id") {
        localStorage.removeItem("demo_scores");
        localStorage.removeItem("demo_recs");
      } else {
        await fbSignOut(auth);
      }
      // Reset variables
      setCurrentUser(null);
      setUserProfile(null);
      setScoresList([]);
      setRecentScore(null);
      setRecommendations([]);
      setActiveView("dashboard");
    } catch (err) {
      console.error("Sign-out failure:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  /**
   * Process and calculate user's burnout index from communication data points list.
   * Invokes mathematical analysis, commits database records, calls Gemini recommendations, and commits breaks.
   */
  const handleScoreAndRecommendationProcess = async (metadataPoints: MessageMetadata[]) => {
    if (!currentUser) return;
    setErrGeneral(null);
    setIsCalculating(true);
    setCalcStatusPercent(10);
    setCalcStatusText("Mengkristalisasi pola data...");

    try {
      // Step A: Calculate score risk level locally using 5 core mathematical signals
      await new Promise((r) => setTimeout(r, 600));
      setCalcStatusPercent(30);
      setCalcStatusText("Menganalisis fluktuasi komunikasi harian Anda...");

      const calcResult = calculateBurnoutRisk(metadataPoints, 150);
      const signalsJson = JSON.stringify(calcResult.signals);

      if (currentUser.uid === "demo-user-id") {
        setCalcStatusPercent(50);
        setCalcStatusText("Mendaftarkan riwayat skoring ke Penyimpanan Demo...");

        const scoreId = "demo-score-" + Date.now();
        const newScoreRecord: BurnoutResult = {
          score: calcResult.score,
          category: calcResult.category,
          signalsJson,
          topFactors: calcResult.topFactors,
          calculatedAt: calcResult.calculatedAt,
          dataPoints: metadataPoints.length,
        };

        const localScores = localStorage.getItem("demo_scores");
        let scoresListLocal: BurnoutResult[] = localScores ? JSON.parse(localScores) : [];
        scoresListLocal = [newScoreRecord, ...scoresListLocal];
        localStorage.setItem("demo_scores", JSON.stringify(scoresListLocal));

        setCalcStatusPercent(70);
        setCalcStatusText("Menghubungkan asisten AI Gemini coach...");

        const response = await fetch("/api/recommendation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            burnoutScore: calcResult.score,
            category: calcResult.category,
            topFactors: calcResult.topFactors,
            userTimezone: userProfile?.timezone || "Asia/Jakarta",
            currentHour: new Date().getHours(),
          }),
        });

        let formattedRecs: any[] = [];
        if (response.ok) {
          const resData = await response.json();
          const geminiRecs = resData.recommendations || [];
          formattedRecs = geminiRecs.map((rec: any, index: number) => ({
            id: `demo-rec-${Date.now()}-${index}`,
            title: rec.title,
            durationMinutes: Number(rec.durationMinutes || 5),
            bestTime: String(rec.bestTime || "Kapan saja"),
            reason: String(rec.reason || ""),
            completedAt: null,
            scoreId: scoreId,
            type: (rec.type || "mental") as "fisik" | "mental" | "sosial",
          }));
        } else {
          formattedRecs = [
            {
              id: "demo-rec-fallback-1",
              title: "Ambil Jeda Bernapas 5 Menit",
              durationMinutes: 5,
              bestTime: "Segera",
              reason: "Redakan penat kognitif sementara Anda.",
              completedAt: null,
              scoreId: scoreId,
              type: "fisik",
            }
          ];
        }

        setCalcStatusPercent(90);
        setCalcStatusText("Menyinkronkan program istirahat mikro personal...");

        localStorage.setItem("demo_recs", JSON.stringify(formattedRecs));

        window.dispatchEvent(new Event("demo_data_update"));

        setCalcStatusPercent(100);
        setCalcStatusText("Pola burnout berhasil disinkronkan ke Akun Demo!");

        await new Promise((r) => setTimeout(r, 800));
        setActiveView("dashboard");
        return;
      }

      // Save raw metadata points harian to database (immutability rule)
      await saveMessageMetadataBulk(currentUser.uid, metadataPoints);

      setCalcStatusPercent(50);
      setCalcStatusText("Mendaftarkan riwayat skoring ke Cloud Firestore...");

      // Step B: Save score list record
      const scoreId = await saveBurnoutScore(currentUser.uid, {
        score: calcResult.score,
        category: calcResult.category,
        signalsJson,
        topFactors: calcResult.topFactors,
        calculatedAt: calcResult.calculatedAt,
        dataPoints: metadataPoints.length,
      });

      setCalcStatusPercent(70);
      setCalcStatusText("Menghubungkan asisten AI Gemini coach...");

      // Step C: Trigger custom API route POST backend endpoint to use Gemini and get recommendations
      const response = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          burnoutScore: calcResult.score,
          category: calcResult.category,
          topFactors: calcResult.topFactors,
          userTimezone: userProfile?.timezone || "Asia/Jakarta",
          currentHour: new Date().getHours(),
        }),
      });

      if (!response.ok) {
        throw new Error("Gemini Server returned an error");
      }

      const resData = await response.json();
      const geminiRecs = resData.recommendations || [];

      setCalcStatusPercent(90);
      setCalcStatusText("Menyinkronkan program istirahat mikro personal...");

      // Step D: Bulk save processed AI recommendations to subcollections
      const formattedRecs = geminiRecs.map((rec: any) => ({
        title: rec.title,
        durationMinutes: Number(rec.durationMinutes || 5),
        bestTime: String(rec.bestTime || "Kapan saja"),
        reason: String(rec.reason || ""),
        scoreId: scoreId,
        type: (rec.type || "recharge") as "reconnect" | "recharge" | "refocus",
      }));

      await saveRecommendationsBulk(currentUser.uid, scoreId, formattedRecs);

      setCalcStatusPercent(100);
      setCalcStatusText("Pola burnout berhasil disinkronkan!");
      
      await new Promise((r) => setTimeout(r, 800));
      setActiveView("dashboard");
    } catch (error: any) {
      console.error("Score transaction failed: ", error);
      setErrGeneral("Gagal memproses kalkulasi burnout atau melakukan query Gemini API.");
    } finally {
      setIsCalculating(false);
      setCalcStatusPercent(0);
      setCalcStatusText("");
    }
  };

  // Complete a recommendation action
  const handleCompleteRecommendation = async (recId: string) => {
    if (!currentUser) return;
    try {
      if (currentUser.uid === "demo-user-id") {
        const localRecs = localStorage.getItem("demo_recs");
        if (localRecs) {
          const recs: Recommendation[] = JSON.parse(localRecs);
          const updated = recs.map(r => {
            if (r.id === recId) {
              return { ...r, completedAt: new Date().toISOString() };
            }
            return r;
          });
          localStorage.setItem("demo_recs", JSON.stringify(updated));
          window.dispatchEvent(new Event("demo_data_update"));
        }
        return;
      }
      await markRecommendationCompleted(currentUser.uid, recId);
    } catch (err) {
      console.error("Error marking recommendation complete: ", err);
      setErrGeneral("Gagal menyimpan tanda penyelesaian ke cloud.");
    }
  };

  // Views switchboard selector
  const renderActiveView = () => {
    if (activeView === "input") {
      return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800">Tambahkan Catatan Aktivitas Komunikasi</h2>
            <p className="text-xs text-slate-400 mt-1">Pilih metode manual untuk pengisian terarah, atau unggah data CSV agar analisis berjalan instan.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              {/* Manual Input card */}
              <div className="border border-slate-150 rounded-xl p-5 hover:border-indigo-500 transition-all space-y-4">
                <h3 className="text-md font-bold text-slate-700">Metode 1: Form Manual Harian</h3>
                <p className="text-xs text-slate-500">
                  Ideal jika Anda mengontrol dan menyadari waktu-waktu luang Anda selama sepekan terakhir. Membutuhkan waktu &le; 2 menit pengisian.
                </p>
                <div className="bg-indigo-50/50 p-4 rounded-xl space-y-2 text-xs text-indigo-700">
                  <div className="flex items-center gap-1.5 font-bold"><CheckCircle2 size={13} /> Sinyal Pratinjau Terbuka</div>
                  <p className="text-[11px] leading-relaxed">Secara otomatis menghasilkan estimasi target stres secara dinamis di panel sidebar.</p>
                </div>
              </div>

              {/* CSV Import card */}
              <div className="border border-slate-150 rounded-xl p-5 hover:border-indigo-500 transition-all space-y-4">
                <h3 className="text-md font-bold text-slate-700">Metode 2: Unggah CSV Log Ekspor</h3>
                <p className="text-xs text-slate-500">
                  Ideal jika Anda mengekstrak riwayat interaksi penuh dari workspace Slack grup atau WhatsApp chat berformat log.
                </p>
                <div className="bg-emerald-50/50 p-4 rounded-xl space-y-2 text-xs text-emerald-700">
                  <div className="flex items-center gap-1.5 font-bold"><CheckCircle2 size={13} /> Deteksi Sinyal Kognitif</div>
                  <p className="text-[11px] leading-relaxed">Algoritme otomatis memilah response time, panjang pesan, dan tren secara objektif.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* Selector view tab manually rendered for precision spacing block */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <div className="space-y-6">
              <span className="text-sm font-bold text-slate-800 block">Form Input Aktif harian:</span>
              <ManualInputForm onSubmit={handleScoreAndRecommendationProcess} isSubmitting={isCalculating} />
              
              <span className="text-sm font-bold text-slate-800 block mt-8 pt-4 border-t border-slate-100">Alternatif Ekspor Parser:</span>
              <CsvUploader 
                onParsed={(parseSummary) => handleScoreAndRecommendationProcess(parseSummary.metadata)} 
                isSubmitting={isCalculating} 
              />
            </div>
          </div>
        </div>
      );
    }

    if (activeView === "history") {
      return <HistoryView scores={scoresList} />;
    }

    if (activeView === "hr" && userProfile?.role === "hr") {
      return <HrView />;
    }

    // Default: Dashboard View Layout
    return (
      <div className="space-y-6">
        {/* Real-time sync core dashboard cards */}
        {!recentScore ? (
          <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center text-slate-550 max-w-lg mx-auto shadow-sm space-y-5">
            <Heart className="mx-auto text-indigo-400 animate-pulse" size={48} />
            <h3 className="text-lg font-bold text-slate-800">Selamat Data di SehatKerja!</h3>
            <p className="text-xs text-slate-400 mt-1 leading-normal">
              Kami akan mendeteksi risiko kejenuhan (burnout) Anda secara preventif menggunakan metadata komunikasi harian Anda tanpa menyentuh PII atau privasi isi pesan.
            </p>
            <button
              onClick={() => setActiveView("input")}
              className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-all shrink-0"
            >
              Mulai Analisis Pertama Anda!
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <BurnoutGauge score={recentScore.score} category={recentScore.category} />
              <div className="lg:col-span-2">
                <WeeklyTrend scores={scoresList} />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Metrik Aktivitas Sinyal Terakhir:</span>
              <SignalCards signals={JSON.parse(recentScore.signalsJson || "[]")} />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Rencana Aksi & Break preventif:</span>
              <RecommendationPanel 
                recommendations={recommendations} 
                onComplete={handleCompleteRecommendation} 
                isLoading={isCalculating} 
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Pre-boot Authentication loading skeleton
  if (isAuthLoading) {
    return (
      <div id="loading" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Heart size={44} className="text-indigo-600 animate-bounce" fill="#4F46E5" />
        <h2 className="text-sm font-bold text-slate-700 tracking-tight mt-3">Menyelaraskan Workspace SehatKerja...</h2>
        <p className="text-xs text-slate-400 mt-1">Sistem sandboxing aman harian Anda sedang disiapkan.</p>
      </div>
    );
  }

  // 1. Unauthenticated Login Screen
  if (!currentUser) {
    return (
      <div id="login-layout" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-150 w-full max-w-md shadow-xl p-8 space-y-6 flex flex-col items-center">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="bg-rose-500 text-white p-3 rounded-2xl shadow-md shadow-rose-500/10 animate-pulse">
              <Heart size={32} fill="#ffffff" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">SehatKerja</h1>
              <p className="text-xs text-slate-400 font-medium mt-1">Platform Manajemen Kelelahan & Burnout Karyawan Indonesia berbasis AI</p>
            </div>
          </div>

          <div className="text-slate-500 text-xs leading-relaxed text-center space-y-3 pt-2">
            <p>
              Pantau batas lelah kognitif Anda secara preventif dari metadata aktivitas pengiriman harian (panjang tulisan, durasi respon, jam log) tanpa kebocoran data.
            </p>
            <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-indigo-600/90 font-semibold bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/50">
              <div className="flex flex-col items-center"><Moon size={14} /> Jam Malam</div>
              <div className="flex flex-col items-center"><Sparkles size={14} /> Akhir Pekan</div>
              <div className="flex flex-col items-center"><MessageSquare size={14} /> Panjang Pesan</div>
            </div>
          </div>

          {errGeneral && (
            <div className="w-full p-3 bg-red-50 text-red-650 rounded-lg text-xs leading-relaxed">
              {errGeneral}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full py-3.5 px-4 bg-slate-900 font-bold hover:bg-slate-800 text-white rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 border border-slate-800 hover:scale-[1.01]"
          >
            <Chrome size={18} />
            <span>Login dengan Google Account</span>
          </button>

          <div className="w-full flex items-center justify-between text-[11px] text-slate-300 font-medium">
            <span className="w-full h-[1px] bg-slate-200"></span>
            <span className="px-3 shrink-0 uppercase tracking-widest text-[9px] text-slate-400">Atau</span>
            <span className="w-full h-[1px] bg-slate-200"></span>
          </div>

          <button
            onClick={() => {
              setErrGeneral(null);
              const mockUser: any = {
                uid: "demo-user-id",
                email: "demo@sehatkerja.com",
                displayName: "Demo User",
                emailVerified: true,
              };
              setCurrentUser(mockUser);
              
              const mockProfile: UserProfile = {
                uid: "demo-user-id",
                email: "demo@sehatkerja.com",
                name: "Demo User",
                role: "employee",
                timezone: "Asia/Jakarta",
                createdAt: new Date().toISOString(),
                teamId: "demo-team",
              };
              setUserProfile(mockProfile);
              setShowOnboarding(false);
            }}
            className="w-full py-3 px-4 bg-white font-bold hover:bg-slate-50 text-indigo-600 rounded-xl transition-all text-xs flex items-center justify-center gap-2 border border-indigo-200 hover:border-indigo-400"
          >
            <Sparkles size={14} className="text-indigo-500 animate-pulse" />
            <span>Masuk dengan Akun Demo (Bypass)</span>
          </button>

          <span className="text-[10px] text-slate-400 font-medium select-none">
            Aman • Terenkripsi • Pembatasan PII Aktif
          </span>
        </div>
      </div>
    );
  }

  // 2. Profile Onboarding Registration Screen
  if (showOnboarding) {
    return (
      <div id="onboarding-layout" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <form onSubmit={handleCompleteOnboarding} className="bg-white rounded-2xl border border-slate-150 w-full max-w-md shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Registrasi Akun Baru
            </span>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mt-2">Atur Ruang Kerja Anda</h2>
            <p className="text-xs text-slate-400">Sesuaikan profil untuk menghitung parameter kelelahan Anda secara tepat harian.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                placeholder="cth: Budi Setiawan"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Peran Kerja di Sistem</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOnboardRole("employee")}
                  className={`py-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center transition-all ${
                    onboardRole === "employee"
                      ? "border-indigo-600 bg-indigo-50/30 text-indigo-600 font-extrabold shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-semibold">Karyawan</span>
                  <span className="text-[10px] font-normal text-slate-400 mt-0.5">Analisis burnout personal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOnboardRole("hr")}
                  className={`py-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center transition-all ${
                    onboardRole === "hr"
                      ? "border-red-600 bg-red-50/30 text-red-650 font-extrabold shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-semibold">HR Manager</span>
                  <span className="text-[10px] font-normal text-slate-400 mt-0.5">Pantau data agregat tim</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Zona Waktu Kerja (Timezone)</label>
              <input
                type="text"
                disabled
                value={onboardTimezone}
                className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2.5 bg-slate-100 text-slate-450 select-none"
              />
              <span className="text-[10px] text-slate-450 italic mt-1 block">Default menyesuaikan region asia-southeast2 (Jakarta).</span>
            </div>
          </div>

          {errGeneral && (
            <div className="p-3 bg-red-50 text-red-650 rounded-lg text-xs leading-normal">
              {errGeneral}
            </div>
          )}

          <button
            type="submit"
            disabled={isOnboardingSaving}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            {isOnboardingSaving ? "Menyimpan koordinat profil..." : "Selesaikan Registrasi & Masuk"}
          </button>
        </form>
      </div>
    );
  }

  // 3. Authenticated App Layout Workspace
  return (
    <div id="sehatkerja-workspace" className="min-h-screen bg-slate-50/70 flex flex-col justify-between">
      <div>
        <Navigation
          activeView={activeView}
          onChangeView={(view) => {
            setErrGeneral(null);
            setActiveView(view);
          }}
          userProfile={userProfile}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />

        {/* Global calculation progress modal overlay during data parsing transactions */}
        {isCalculating && (
          <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-100 p-8 w-full max-w-sm text-center shadow-2xl flex flex-col items-center space-y-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="animate-spin h-12 w-12 text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="absolute text-xs font-bold font-mono text-indigo-600">{calcStatusPercent}%</span>
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Menyelesaikan Analisis</h4>
                <p className="text-xs text-slate-400 mt-1 leading-normal font-medium">{calcStatusText}</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300" 
                  style={{ width: `${calcStatusPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {errGeneral && (
            <div className="mb-6 p-4 bg-red-50 text-red-650 border border-red-100 rounded-xl text-xs font-medium flex items-center justify-between">
              <span>{errGeneral}</span>
              <button onClick={() => setErrGeneral(null)} className="text-[10px] font-bold underline">Hapus</button>
            </div>
          )}

          {renderActiveView()}
        </main>
      </div>

      {/* Footer Branding */}
      <footer className="border-t border-slate-150 py-6 bg-white text-center text-xs text-slate-400 mt-12 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:justify-between items-center gap-2">
          <span>&copy; {new Date().getFullYear()} SehatKerja Organisasi. Semua Hak Cipta Dilindungi.</span>
          <span className="text-[10px] bg-slate-50 text-slate-450 border border-slate-150 rounded px-2 py-0.5">
            Cloud Run Deployment • Jakarta Region (asia-southeast2)
          </span>
        </div>
      </footer>
    </div>
  );
}
