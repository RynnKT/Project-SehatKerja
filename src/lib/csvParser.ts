import Papa from "papaparse";
import { MessageMetadata } from "../types";

export interface ParseResultSummary {
  format: "Slack" | "WhatsApp" | "Unknown";
  totalMessagesMatched: number;
  dateRange: { start: string; end: string } | null;
  detectedSenderNames: string[];
  metadata: MessageMetadata[];
}

/**
 * Parses a Slack or WhatsApp CSV export and compiles daily communication metadata.
 * @param csvContent Input CSV file contents as string
 * @param targetUserName Name of the user in the logs to filter by
 * @returns Comprehensive summary parsing result
 */
export function parseCommunicationCsv(csvContent: string, targetUserName: string): ParseResultSummary {
  // Parse with PapaParse
  const parsed = Papa.parse<any>(csvContent.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const data = parsed.data;
  if (!data || data.length === 0) {
    return {
      format: "Unknown",
      totalMessagesMatched: 0,
      dateRange: null,
      detectedSenderNames: [],
      metadata: [],
    };
  }

  // Auto-detect format based on header columns
  const firstRow = data[0];
  const keys = Object.keys(firstRow).map((k) => k.toLowerCase());

  let format: "Slack" | "WhatsApp" | "Unknown" = "Unknown";
  if (keys.includes("channel") || (keys.includes("user") && keys.includes("text"))) {
    format = "Slack";
  } else if (keys.includes("sender") || keys.includes("message") || (keys.includes("date") && keys.includes("time"))) {
    format = "WhatsApp";
  }

  // Log list of all unique senders to display to user
  const uniqueSendersSet = new Set<string>();
  const senderField = keys.includes("user") ? "user" : keys.includes("sender") ? "sender" : "sender";

  // Re-map with actual case keys
  const actualSenderKey = Object.keys(firstRow).find((k) => k.toLowerCase() === senderField) || senderField;
  const actualMessageTextKey = Object.keys(firstRow).find((k) => ["text", "message", "msg"].includes(k.toLowerCase())) || "text";

  data.forEach((row) => {
    const s = row[actualSenderKey];
    if (s) uniqueSendersSet.add(String(s).trim());
  });

  const detectedSenderNames = Array.from(uniqueSendersSet);

  // Normalize all messages chronologically to calculate response times properly
  interface NormalizedMessage {
    timestamp: Date;
    sender: string;
    text: string;
    source: "Slack" | "WhatsApp";
  }

  const normalizedList: NormalizedMessage[] = [];

  data.forEach((row) => {
    let timestamp: Date | null = null;
    let sender = "";
    let text = "";

    if (format === "Slack") {
      sender = String(row[actualSenderKey] || "").trim();
      text = String(row[actualMessageTextKey] || "").trim();
      
      const tsVal = row["timestamp"] || row["ts"];
      if (tsVal) {
        timestamp = new Date(tsVal);
      }
    } else if (format === "WhatsApp") {
      sender = String(row[actualSenderKey] || "").trim();
      text = String(row[actualMessageTextKey] || "").trim();
      
      const dateVal = row["date"] || row["Date"];
      const timeVal = row["time"] || row["Time"];
      if (dateVal && timeVal) {
        // Handle format DD/MM/YYYY or YYYY-MM-DD
        const dateParts = String(dateVal).split(/[-/]/);
        let isoDateStr = dateVal;
        if (dateParts.length === 3) {
          // If in DD/MM/YYYY order
          if (dateParts[0].length <= 2 && dateParts[2].length === 4) {
            isoDateStr = `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`;
          }
        }
        timestamp = new Date(`${isoDateStr}T${timeVal}`);
      }
    }

    if (timestamp && !isNaN(timestamp.getTime())) {
      normalizedList.push({
        timestamp,
        sender,
        text,
        source: format === "Slack" ? "Slack" : "WhatsApp",
      });
    }
  });

  // Sort chronologically
  normalizedList.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Filter messages specifically matching the target user
  const matchingMessagesMetadata: MessageMetadata[] = [];
  const targetLower = targetUserName.toLowerCase().trim();

  normalizedList.forEach((msg, idx) => {
    if (msg.sender.toLowerCase().trim() !== targetLower) {
      return;
    }

    // Compute Response Time in Minutes
    // Defined as time since the last message in the chronological chain sent by *someone else*
    let responseTimeMinutes = 0;
    
    // Scan backward to find preceding message from standard sibling
    let lastPeerMessage: NormalizedMessage | null = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (normalizedList[i].sender.toLowerCase().trim() !== targetLower) {
        lastPeerMessage = normalizedList[i];
        break;
      }
    }

    if (lastPeerMessage) {
      const diffMs = msg.timestamp.getTime() - lastPeerMessage.timestamp.getTime();
      const diffMin = Math.round(diffMs / 60000);
      
      // Only treat it as an active reply/response if it occurred within a reasonable 12-hour window
      if (diffMin > 0 && diffMin <= 720) {
        responseTimeMinutes = diffMin;
      }
    }

    const day = msg.timestamp.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = day === 0 || day === 6;

    matchingMessagesMetadata.push({
      timestamp: msg.timestamp.toISOString(),
      hourOfDay: msg.timestamp.getHours(),
      isWeekend,
      messageLength: msg.text.length,
      responseTimeMinutes,
      source: "csv",
      createdAt: new Date().toISOString(),
    });
  });

  // Calculate Date Range
  let dateRange: { start: string; end: string } | null = null;
  if (matchingMessagesMetadata.length > 0) {
    const dates = matchingMessagesMetadata.map((m) => new Date(m.timestamp).getTime());
    const minD = new Date(Math.min(...dates));
    const maxD = new Date(Math.max(...dates));
    dateRange = {
      start: minD.toLocaleDateString("id-ID"),
      end: maxD.toLocaleDateString("id-ID"),
    };
  }

  return {
    format,
    totalMessagesMatched: matchingMessagesMetadata.length,
    dateRange,
    detectedSenderNames,
    metadata: matchingMessagesMetadata,
  };
}
