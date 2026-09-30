import { encryptNarrativeWithPublicKey } from "../crypto/asymmetric";
import { calculateIncidentPoints, deriveSurgeOccurred } from "./scoring";
import { getLogicalDateForTimestamp } from "./time";

export interface PreparedImportRecord {
  logical_date: string;
  start_time: string;
  end_time: string;
  tier_level: 1 | 2 | 3 | 4 | 5;
  defense_occurred: boolean;
  surge_occurred: boolean;
  points: number;
  encrypted_narrative: string;
}

/**
 * Robust CSV line splitter handling quoted commas and escapes
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function parseAndEncryptImport(
  rawInput: string,
  publicKey: CryptoKey,
  format: "json" | "csv"
): Promise<PreparedImportRecord[]> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return [];
  }

  let records: Record<string, any>[] = [];

  if (format === "json") {
    const parsed = JSON.parse(trimmed);
    records = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    // Parse CSV
    const rawLines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (rawLines.length < 2) {
      throw new Error("CSV must include a header row and at least one data row");
    }

    const headers = parseCsvLine(rawLines[0]).map((h) => h.toLowerCase().replace(/['"]/g, ""));
    for (let i = 1; i < rawLines.length; i++) {
      const values = parseCsvLine(rawLines[i]);
      const row: Record<string, any> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] ?? "";
      });
      records.push(row);
    }
  }

  const preparedPayloads: PreparedImportRecord[] = await Promise.all(
    records.map(async (row, index) => {
      const rawStart = row.start_time || row.startTime || row.start;
      const rawEnd = row.end_time || row.endTime || row.end;

      if (!rawStart || !rawEnd) {
        throw new Error(`Record #${index + 1} missing start_time or end_time`);
      }

      const startTime = new Date(rawStart);
      const endTime = new Date(rawEnd);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        throw new Error(
          `Record #${index + 1} has invalid timestamps: "${rawStart}", "${rawEnd}"`
        );
      }

      if (endTime.getTime() < startTime.getTime()) {
        throw new Error(`Record #${index + 1} has end_time before start_time`);
      }

      const tierRaw = row.tier ?? row.tier_level ?? row.tierLevel;
      const tier = parseInt(String(tierRaw), 10);
      if (isNaN(tier) || tier < 1 || tier > 5) {
        throw new Error(`Record #${index + 1} has invalid tier: "${tierRaw}". Must be 1-5.`);
      }

      const defendedRaw = String(
        row.defended ?? row.defense_occurred ?? row.defenseOccurred ?? "false"
      ).toLowerCase();
      const defense_occurred = defendedRaw === "true" || defendedRaw === "1" || defendedRaw === "yes";
      const surge_occurred = deriveSurgeOccurred(defense_occurred);
      const points = calculateIncidentPoints(tier, defense_occurred);

      // Auto-derive logical_date if missing using late-night awake-cycle rule
      const rawLogical = row.logical_date || row.logicalDate;
      const logicalDate = rawLogical && String(rawLogical).trim() !== ""
        ? String(rawLogical).trim().substring(0, 10)
        : getLogicalDateForTimestamp(startTime);

      // Narrative JSON payload
      const narrativeJson = JSON.stringify({
        pathway: row.pathway || row.path || "",
        context: row.context || row.trigger || "",
        impact: row.impact || row.notes || "",
      });

      // Encrypt with RSA public key
      const encrypted_narrative = await encryptNarrativeWithPublicKey(narrativeJson, publicKey);

      return {
        logical_date: logicalDate,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        tier_level: tier as 1 | 2 | 3 | 4 | 5,
        defense_occurred,
        surge_occurred,
        points,
        encrypted_narrative,
      };
    })
  );

  return preparedPayloads;
}
