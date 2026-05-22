import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { SignalDetail } from "../types";
import { Moon, Send, Sparkles, MessageSquare, Flame } from "lucide-react";

interface SignalCardsProps {
  signals: SignalDetail[];
}

export default function SignalCards({ signals }: SignalCardsProps) {
  // Map icons corresponding to signal types
  const getIcon = (name: string, color: string) => {
    const lName = name.toLowerCase();
    if (lName.includes("malam")) return <Moon size={18} style={{ color }} />;
    if (lName.includes("respons") || lName.includes("instan")) return <Send size={18} style={{ color }} />;
    if (lName.includes("akhir") || lName.includes("weekend")) return <Sparkles size={18} style={{ color }} />;
    if (lName.includes("panjang") || lName.includes("kognitif")) return <MessageSquare size={18} style={{ color }} />;
    return <Flame size={18} style={{ color }} />;
  };

  // Status badges colors
  const getStatusColor = (status: "aman" | "waspada" | "kritis") => {
    if (status === "kritis") return { text: "text-red-600", bg: "bg-red-50", border: "border-red-100", raw: "#EF4444" };
    if (status === "waspada") return { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", raw: "#F59E0B" };
    return { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", raw: "#10B981" };
  };

  // Mock simple historical micro-sparkline datasets for visual rhythm
  const getSparklineData = (status: string) => {
    if (status === "kritis") return [{ v: 40 }, { v: 50 }, { v: 75 }, { v: 60 }, { v: 90 }, { v: 85 }, { v: 100 }];
    if (status === "waspada") return [{ v: 10 }, { v: 25 }, { v: 20 }, { v: 45 }, { v: 35 }, { v: 55 }, { v: 40 }];
    return [{ v: 5 }, { v: 12 }, { v: 8 }, { v: 15 }, { v: 10 }, { v: 14 }, { v: 5 }];
  };

  return (
    <div id="signals-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {signals.map((sig, idx) => {
        const theme = getStatusColor(sig.status);
        const sparkData = getSparklineData(sig.status);

        return (
          <div
            key={idx}
            className={`bg-white rounded-2xl border ${theme.border} p-5 shadow-sm space-y-3.5 flex flex-col justify-between transition-all hover:shadow`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${theme.bg}`}>
                  {getIcon(sig.name, theme.raw)}
                </div>
                <span
                  className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${theme.bg} ${theme.text} ${theme.border}`}
                >
                  {sig.status}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 leading-tight line-clamp-1">{sig.name}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-normal line-clamp-2">{sig.description}</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-50">
              <div className="flex justify-between items-baseline font-mono">
                <span className="text-[10px] text-slate-400">Limit: {sig.limitStr}</span>
                <span className="text-xs font-extrabold text-slate-700">{sig.actualValue}</span>
              </div>

              {/* Sparkline trend container */}
              <div className="h-[25px] w-full mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData}>
                    <defs>
                      <linearGradient id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.raw} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={theme.raw} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={theme.raw}
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill={`url(#grad-${idx})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
