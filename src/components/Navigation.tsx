import { Heart, Home, FileInput, History, ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { UserProfile } from "../types";

interface NavigationProps {
  activeView: "dashboard" | "input" | "history" | "hr";
  onChangeView: (view: "dashboard" | "input" | "history" | "hr") => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
  isLoggingOut: boolean;
}

export default function Navigation({ activeView, onChangeView, userProfile, onLogout, isLoggingOut }: NavigationProps) {
  if (!userProfile) return null;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onChangeView("dashboard")}>
            <div className="bg-rose-500 text-white p-1.5 rounded-lg animate-pulse">
              <Heart size={18} fill="#ffffff" />
            </div>
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              SehatKerja
            </span>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
              v1.0
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1 text-sm font-semibold">
            <button
              onClick={() => onChangeView("dashboard")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
                activeView === "dashboard"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Home size={15} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onChangeView("input")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
                activeView === "input"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <FileInput size={15} />
              <span>Input Data</span>
            </button>

            <button
              onClick={() => onChangeView("history")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
                activeView === "history"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <History size={15} />
              <span>Riwayat</span>
            </button>

            {userProfile.role === "hr" && (
              <button
                onClick={() => onChangeView("hr")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
                  activeView === "hr"
                    ? "bg-indigo-600/25 text-indigo-400 border border-indigo-500/20"
                    : "text-slate-450 hover:text-indigo-400 hover:bg-indigo-500/10"
                }`}
              >
                <ShieldAlert size={15} />
                <span>HR Admin</span>
              </button>
            )}
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end text-right">
              <span className="text-xs font-bold text-slate-200">{userProfile.name}</span>
              <span className="text-[10px] text-slate-400 capitalize bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50 mt-0.5">
                {userProfile.role === "hr" ? "HR Manager" : "Karyawan"}
              </span>
            </div>

            <button
              onClick={onLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-all border border-slate-800"
              title="Keluar dari Aplikasi"
            >
              {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile view bottom selector */}
      <div className="md:hidden flex justify-around items-center border-t border-slate-800 bg-slate-900/90 py-2.5 backdrop-blur-sm">
        <button
          onClick={() => onChangeView("dashboard")}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeView === "dashboard" ? "text-indigo-400" : "text-slate-500"
          }`}
        >
          <Home size={18} />
          <span className="mt-1">Dashboard</span>
        </button>

        <button
          onClick={() => onChangeView("input")}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeView === "input" ? "text-indigo-400" : "text-slate-500"
          }`}
        >
          <FileInput size={18} />
          <span className="mt-1">Input</span>
        </button>

        <button
          onClick={() => onChangeView("history")}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeView === "history" ? "text-indigo-400" : "text-slate-500"
          }`}
        >
          <History size={18} />
          <span className="mt-1">Riwayat</span>
        </button>

        {userProfile.role === "hr" && (
          <button
            onClick={() => onChangeView("hr")}
            className={`flex flex-col items-center text-[10px] font-bold ${
              activeView === "hr" ? "text-indigo-400" : "text-slate-500"
            }`}
          >
            <ShieldAlert size={18} />
            <span className="mt-1">HR</span>
          </button>
        )}
      </div>
    </nav>
  );
}
