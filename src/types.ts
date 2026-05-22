export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: "employee" | "hr";
  timezone: string;
  createdAt: string; // ISO string
  teamId?: string;
}

export interface MessageMetadata {
  id?: string;
  timestamp: string; // ISO string of message date-time
  hourOfDay: number; // 0-23
  isWeekend: boolean;
  messageLength: number; // characters
  responseTimeMinutes: number;
  source: "manual" | "csv";
  createdAt: string; // ISO string
}

export interface SignalDetail {
  name: string;
  status: "aman" | "waspada" | "kritis";
  actualValue: string | number;
  limitStr: string;
  weightPercent: number;
  description: string;
}

export interface BurnoutResult {
  score: number; // 0-100
  category: "sehat" | "waspada" | "kritis";
  signals?: SignalDetail[];
  signalsJson?: string;
  topFactors: string[];
  dataPoints: number;
  calculatedAt: string; // ISO string
}

export interface Recommendation {
  id?: string;
  title: string;
  durationMinutes: number;
  bestTime: string;
  reason: string;
  completedAt: string | null; // ISO string or null
  scoreId: string;
  type: "fisik" | "mental" | "sosial";
}

export interface HRReport {
  id?: string;
  calculatedAt: string; // ISO string
  averageScore: number;
  totalUsers: number;
  categoryDistribution: {
    sehat: number;
    waspada: number;
    kritis: number;
  };
}
