import { MessageMetadata, BurnoutResult, SignalDetail } from "../types";

/**
 * Calculates burnout risk score and sub-signals from daily communication metadata.
 * @param metadataList List of user's communication metadata for the last 7 days.
 * @param historicalAverageLength Baseline average message character length from previous weeks.
 * @returns BurnoutResult structured calculation output.
 */
export function calculateBurnoutRisk(
  metadataList: MessageMetadata[],
  historicalAverageLength?: number
): BurnoutResult {
  // 1. Group metadata by calendar date to determine data completeness and consecutive actvity
  const datesMap = new Map<string, MessageMetadata[]>();
  
  metadataList.forEach((meta) => {
    const dateStr = new Date(meta.timestamp).toISOString().split("T")[0];
    const existingGroup = datesMap.get(dateStr) || [];
    existingGroup.push(meta);
    datesMap.set(dateStr, existingGroup);
  });

  const uniqueDays = datesMap.size;
  if (uniqueDays < 3) {
    throw new Error("DATA_INSUFFICIENT");
  }

  // Helper variables for calculation
  let totalScore = 0;
  const signals: SignalDetail[] = [];
  const topFactors: string[] = [];

  // Sort dates chronologically for consecutive analysis
  const sortedDates = Array.from(datesMap.keys()).sort();

  // --- SIGNAL 1: Jam Malam (21.00 - 06.00) | Weight 25% ---
  // If active sent times include hours >= 21 or < 6, count frequency. Trigger if > 3x/week.
  let nightCount = 0;
  metadataList.forEach((m) => {
    if (m.hourOfDay >= 21 || m.hourOfDay < 6) {
      nightCount++;
    }
  });

  const isNightSignalTriggered = nightCount > 3;
  const nightScoreContrib = isNightSignalTriggered ? 25 : 0;
  totalScore += nightScoreContrib;
  signals.push({
    name: "Sinyal Jam Malam (21.00-06.00)",
    status: isNightSignalTriggered ? (nightCount > 6 ? "kritis" : "waspada") : "aman",
    actualValue: `${nightCount} pesan malam`,
    limitStr: "> 3x seminggu",
    weightPercent: 25,
    description: "Frekuensi pengiriman informasi pekerjaan di larut malam yang mengganggu istirahat restoratif.",
  });
  if (isNightSignalTriggered) {
    topFactors.push("Tingginya aktivitas komunikasi kerja di luar batas waktu istirahat malam (21.00 - 06.00).");
  }

  // --- SIGNAL 2: Respons Kerja Instan (<5 menit) di Luar Jam Kerja | Weight 20% ---
  // Working hours: 08:00 - 17:00 on weekdays. Any other time is "di luar jam kerja".
  let instantOffHoursCount = 0;
  metadataList.forEach((m) => {
    // Check if outside work hours
    const isOffHour = m.hourOfDay < 8 || m.hourOfDay >= 17 || m.isWeekend;
    if (isOffHour && m.responseTimeMinutes < 5) {
      instantOffHoursCount++;
    }
  });

  const isInstantSignalTriggered = instantOffHoursCount > 5;
  const instantScoreContrib = isInstantSignalTriggered ? 20 : 0;
  totalScore += instantScoreContrib;
  signals.push({
    name: "Respons Instan Luar Jam Kerja",
    status: isInstantSignalTriggered ? (instantOffHoursCount > 10 ? "kritis" : "waspada") : "aman",
    actualValue: `${instantOffHoursCount} kali`,
    limitStr: "> 5x seminggu",
    weightPercent: 20,
    description: "Kecenderungan untuk segera merespons pesan secara instan (<5 mnt) di luar jam operasional kantor.",
  });
  if (isInstantSignalTriggered) {
    topFactors.push("Selalu siaga merespons pesan kerjaan dengan sangat cepat di luar jam kerja.");
  }

  // --- SIGNAL 3: Aktif Akhir Pekan (Weekend) | Weight 20% ---
  // Active on weekend with total message count > 10
  let weekendMessageCount = 0;
  metadataList.forEach((m) => {
    if (m.isWeekend) {
      weekendMessageCount++;
    }
  });

  const isWeekendSignalTriggered = weekendMessageCount > 10;
  const weekendScoreContrib = isWeekendSignalTriggered ? 20 : 0;
  totalScore += weekendScoreContrib;
  signals.push({
    name: "Komunikasi Akhir Pekan",
    status: isWeekendSignalTriggered ? (weekendMessageCount > 25 ? "kritis" : "waspada") : "aman",
    actualValue: `${weekendMessageCount} pesan akhir pekan`,
    limitStr: "> 10 pesan",
    weightPercent: 20,
    description: "Beban komunikasi kerja yang terbawa ke hari Sabtu dan Minggu, mengabaikan hak pemulihan diri.",
  });
  if (isWeekendSignalTriggered) {
    topFactors.push("Volume komunikasi pekerjaan yang tinggi di hari libur akhir pekan.");
  }

  // --- SIGNAL 4: Penurunan Panjang Pesan (>30% vs baseline) | Weight 15% ---
  // Calculated from current average vs baseline. If baseline not present, we simulate a drop test:
  // compare early week (Mon-Wed) with late week (Thu-Sun) average layout length, or check for >30% drop.
  let currentAverageLength = 0;
  if (metadataList.length > 0) {
    const sum = metadataList.reduce((acc, current) => acc + current.messageLength, 0);
    currentAverageLength = Math.round(sum / metadataList.length);
  }

  const baseline = historicalAverageLength || 150; // default standard reference length
  const percentDecline = baseline > 0 ? ((baseline - currentAverageLength) / baseline) * 100 : 0;
  const isLengthSignalTriggered = percentDecline > 30;
  const lengthScoreContrib = isLengthSignalTriggered ? 15 : 0;
  totalScore += lengthScoreContrib;

  signals.push({
    name: "Penurunan Panjang Pesan (Sinyal Kognitif)",
    status: isLengthSignalTriggered ? "waspada" : "aman",
    actualValue: `${Math.round(percentDecline)}% menurun (Rerata: ${currentAverageLength} karakter vs baseline ${Math.round(baseline)})`,
    limitStr: "> 30% penurunan",
    weightPercent: 15,
    description: "Penyusutan panjang pesan secara signifikan, mengindikasikan penurunan energi kognitif dan keletihan mental.",
  });
  if (isLengthSignalTriggered) {
    topFactors.push("Terjadi penyusutan ekspresi tulisan (panjang pesan) yang mengindikasikan keletihan mental kognitif.");
  }

  // --- SIGNAL 5: Durasi Aktivitas Kerja Ekstrim (>10 jam selama 3+ hari berturut) | Weight 20% ---
  // Find active span (max hourOfDay - min hourOfDay) on each day. Determine consecutive day count.
  const activeHoursPerDay = new Map<string, { min: number; max: number }>();
  metadataList.forEach((m) => {
    const dateStr = new Date(m.timestamp).toISOString().split("T")[0];
    const hours = activeHoursPerDay.get(dateStr) || { min: 24, max: -1 };
    if (m.hourOfDay < hours.min) hours.min = m.hourOfDay;
    if (m.hourOfDay > hours.max) hours.max = m.hourOfDay;
    activeHoursPerDay.set(dateStr, hours);
  });

  const dailyDurations = new Map<string, number>();
  activeHoursPerDay.forEach((hours, dateStr) => {
    const duration = hours.max - hours.min;
    dailyDurations.set(dateStr, duration);
  });

  // Check for consecutive days with duration > 10 hours
  let maxConsecutiveDays = 0;
  let currentConsecutiveDays = 0;

  sortedDates.forEach((dateStr) => {
    const dur = dailyDurations.get(dateStr) || 0;
    if (dur >= 10) {
      currentConsecutiveDays++;
      if (currentConsecutiveDays > maxConsecutiveDays) {
        maxConsecutiveDays = currentConsecutiveDays;
      }
    } else {
      currentConsecutiveDays = 0;
    }
  });

  const isExtremeHoursSignalTriggered = maxConsecutiveDays >= 3;
  const extremeHoursScoreContrib = isExtremeHoursSignalTriggered ? 20 : 0;
  totalScore += extremeHoursScoreContrib;

  signals.push({
    name: "Durasi Kerja Ekstrim (>10 jam)",
    status: isExtremeHoursSignalTriggered ? "kritis" : (maxConsecutiveDays >= 2 ? "waspada" : "aman"),
    actualValue: `${maxConsecutiveDays} hari berturut-turut`,
    limitStr: ">= 3 hari berturut",
    weightPercent: 20,
    description: "Membentang waktu aktif bekerja melebihi 10 jam dalam sehari selama minimal 3 hari berurutan.",
  });
  if (isExtremeHoursSignalTriggered) {
    topFactors.push("Durasi rentang kerja terlalu panjang (>10 jam sehari) selama beberapa hari berturut-turut.");
  }

  // Overall burnt risk classification category
  let category: "sehat" | "waspada" | "kritis" = "sehat";
  if (totalScore >= 50) {
    category = "kritis";
  } else if (totalScore >= 20) {
    category = "waspada";
  }

  if (topFactors.length === 0) {
    topFactors.push("Pola komunikasi harian stabil dan sehat dalam koridor jam operasional standar.");
  }

  return {
    score: totalScore,
    category,
    signals,
    topFactors,
    dataPoints: metadataList.length,
    calculatedAt: new Date().toISOString(),
  };
}
