import { useState, useEffect } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

interface BurnoutGaugeProps {
  score: number;
  category: "sehat" | "waspada" | "kritis";
}

export default function BurnoutGauge({ score, category }: BurnoutGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState<number>(0);

  // Smooth count-up animation over 1.5 seconds (1500 ms)
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1500;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setAnimatedScore(Math.round(progress * score));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [score]);

  // Determine dynamic zone colors
  const getColor = () => {
    if (category === "kritis") return "#EF4444"; // Emerald red
    if (category === "waspada") return "#F59E0B"; // Amber yellow
    return "#10B981"; // Emerald green
  };

  const currentThemeColor = getColor();

  const data = [
    {
      name: "Burnout Score",
      value: animatedScore,
      fill: currentThemeColor,
    },
  ];

  return (
    <div id="burnout-gauge" className="flex flex-col items-center bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex flex-col items-center text-center mb-2">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Skor Risiko Burnout</h3>
        <p className="text-2xl font-bold font-mono text-slate-800 tracking-tight mt-1">{score}/100</p>
      </div>

      <div className="relative w-full h-[220px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="75%"
            outerRadius="100%"
            barSize={14}
            data={data}
            startAngle={225}
            endAngle={-45}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: "#F1F5F9" }}
              dataKey="value"
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Absolute center layout text */}
        <div className="absolute text-center flex flex-col items-center">
          <span className="text-4xl font-extrabold font-mono text-slate-800">{animatedScore}%</span>
          <span
            className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full mt-2 inline-block shadow-sm transition-all text-white"
            style={{ backgroundColor: currentThemeColor }}
          >
            {category === "sehat" ? "sehat" : category === "waspada" ? "waspada" : "kritis"}
          </span>
        </div>
      </div>

      <div className="w-full text-center mt-2 border-t border-slate-50 pt-3">
        <p className="text-xs text-slate-400 font-medium">
          {category === "kritis" && "Tingkat stres kognitif berlebih ditemukan. Diperlukan tindakan pemulihan mendesak!"}
          {category === "waspada" && "Sinyal kelelahan mulai muncul. Ambil saran micro-break dari asisten AI Anda."}
          {category === "sehat" && "Kondisi kerja Anda seimbang. Pertahankan ritme kerja sehat ini."}
        </p>
      </div>
    </div>
  );
}
