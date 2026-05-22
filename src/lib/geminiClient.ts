import { GoogleGenAI, Type } from "@google/genai";

// Standard Indonesia-context wellness fallback micro-breaks
export const FALLBACK_RECOMMENDATIONS = [
  {
    title: "Teknik Pernapasan Kotak (Box Breathing)",
    durationMinutes: 5,
    bestTime: "Setiap kali merasa tertekan di meja kerja",
    reason: "Menurunkan denyut jantung tinggi dan menenangkan sistem saraf simpatik secara instan.",
    type: "mental" as const,
  },
  {
    title: "Peregangan Statis Leher & Bahu",
    durationMinutes: 3,
    bestTime: "Setiap setelah 2 jam duduk tegak",
    reason: "Mengurangi ketegangan otot trapezius akibat mengetik terlalu lama.",
    type: "fisik" as const,
  },
  {
    title: "Obrolan Ringan Non-Kerja dengan Rekan",
    durationMinutes: 10,
    bestTime: "Sore hari jam 15.00 WIB",
    reason: "Membatasi rasa isolasi kerja dari tugas beruntun dengan interaksi manusiawi.",
    type: "sosial" as const,
  },
];

const WELLNESS_SYSTEM_PROMPT = `
Kamu adalah wellness coach professional untuk karyawan Indonesia yang ramah, hangat, dan empati (menggunakan sapaan santun/informal seperti 'kamu', 'rekan').
Tugasmu adalah merekomendasikan TIGA (3) micro-break yang sangat taktis, praktikal, fleksibel, dan bisa langsung diterapkan di sela-sela rutinitas kerja harian.
Sesuaikan durasi, tipe, dan konten istirahat mikro berdasarkan skor burnout, kategori risiko, dan faktor penyebab utama ("topFactors") yang dialami karyawan tersebut.

Format output WAJIB berupa JSON array murni tanpa preamble, penjelasan pembuka, atau markdown block. 
Struktur Skema objek dalam array:
[
  {
    "title": "Nama micro-break yang menarik",
    "durationMinutes": 3 sampai 15 (integer),
    "bestTime": "rekomendasi waktu pelaksanaan spesifik",
    "reason": "mengapa istirahat ini efektif mengatasi faktor burnout spesifik yang terdeteksi",
    "type": "fisik" atau "mental" atau "sosial"
  }
]
`;

/**
 * Invokes Gemini text models to craft personalized micro-break recommendations.
 * Incorporates a 2-pass automatic retry mechanism and structured response validation.
 */
export async function getGeminiRecommendations(params: {
  burnoutScore: number;
  category: "sehat" | "waspada" | "kritis";
  topFactors: string[];
  userTimezone: string;
  currentHour: number;
}): Promise<any[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined. Gratefully serving fallback recommendations.");
    return FALLBACK_RECOMMENDATIONS;
  }

  // Modern @google/genai initialization
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const promptContent = `
Sajikan 3 rekomendasi micro-break personal untuk kondisi berikut:
- Skor Burnout: ${params.burnoutScore}/100 (Kategori: ${params.category.toUpperCase()})
- Faktor Kontributor Utama: ${params.topFactors.join(", ")}
- Zona Waktu User: ${params.userTimezone}
- Waktu Lokal Saat Ini: Jam ${params.currentHour} siang/malam.
`;

  let attempts = 0;
  const maxAttempts = 3; // 1 original + 2 retries

  while (attempts < maxAttempts) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptContent,
        config: {
          systemInstruction: WELLNESS_SYSTEM_PROMPT,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Micro-break title" },
                durationMinutes: { type: Type.INTEGER, description: "Break duration in minutes" },
                bestTime: { type: Type.STRING, description: "Ideal daily timing" },
                reason: { type: Type.STRING, description: "Personalized benefit matching factors" },
                type: { type: Type.STRING, enum: ["fisik", "mental", "sosial"] },
              },
              required: ["title", "durationMinutes", "bestTime", "reason", "type"],
            },
          },
        },
      });

      const textOutput = response.text?.trim();
      if (textOutput) {
        const parsed = JSON.parse(textOutput);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      throw new Error("Empty or invalid structured JSON returned by Gemini API");
    } catch (error) {
      attempts++;
      console.error(`Attempt ${attempts} to reach Gemini API failed:`, error);
      if (attempts >= maxAttempts) {
        break;
      }
      // Wait for 1 second before retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.warn("Gemini recommendations exhausted with errors. Serving high-fidelity Indonesian fallback tips.");
  return FALLBACK_RECOMMENDATIONS;
}
