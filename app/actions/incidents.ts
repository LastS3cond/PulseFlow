"use server";

import { getServiceSupabase } from "@/lib/supabase/server";
import { Incident } from "@/lib/types";
import { revalidatePath } from "next/cache";

export type DashboardIncident = Omit<Incident, "encrypted_narrative">;

/**
 * Inserts a single incident record into Supabase.
 */
export async function insertIncident(payload: {
  logical_date: string;
  start_time: string;
  end_time: string;
  tier_level: number;
  defense_occurred: boolean;
  surge_occurred: boolean;
  points: number;
  encrypted_narrative: string;
}): Promise<{ success: boolean; error?: string; incident?: Incident }> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("incidents")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Error inserting incident:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, incident: data };
}

/**
 * Bulk imports telemetry incidents idempotently.
 * Enforces ON CONFLICT (start_time, end_time, tier_level) DO NOTHING.
 */
export async function bulkImportIncidents(
  records: Array<{
    logical_date: string;
    start_time: string;
    end_time: string;
    tier_level: number;
    defense_occurred: boolean;
    surge_occurred: boolean;
    points: number;
    encrypted_narrative: string;
  }>
): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  if (!records || records.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("incidents")
    .upsert(records, {
      onConflict: "start_time,end_time,tier_level",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    console.error("Error bulk inserting incidents:", error);
    return { success: false, insertedCount: 0, error: error.message };
  }

  revalidatePath("/");
  return { success: true, insertedCount: data ? data.length : records.length };
}

/**
 * Retrieves incident metadata for dashboard display.
 * Strictly omits encrypted_narrative to uphold Zero-Knowledge Dashboard Privacy.
 */
export async function getDashboardData(): Promise<{
  incidents: DashboardIncident[];
  vaultInitialized: boolean;
  inceptionDate: string;
}> {
  const supabase = getServiceSupabase();

  // Query incidents metadata
  const { data: incidentRows, error: incidentErr } = await supabase
    .from("incidents")
    .select(
      "id, created_at, logical_date, start_time, end_time, tier_level, defense_occurred, surge_occurred, points"
    )
    .order("created_at", { ascending: false });

  if (incidentErr) {
    console.error("Error fetching dashboard incidents:", incidentErr);
    throw new Error("Failed to fetch telemetry incidents");
  }

  // Check vault configuration
  const { data: vaultRow } = await supabase
    .from("vault_config")
    .select("created_at")
    .limit(1)
    .maybeSingle();

  const vaultInitialized = !!vaultRow;
  const inceptionDate = vaultRow?.created_at || new Date().toISOString();

  return {
    incidents: (incidentRows || []) as DashboardIncident[],
    vaultInitialized,
    inceptionDate,
  };
}

/**
 * Fetches incidents including encrypted narratives for the Coaching Export workflow.
 */
export async function getIncidentsForExport(filter?: {
  startDate?: string;
  endDate?: string;
}): Promise<Incident[]> {
  const supabase = getServiceSupabase();

  let query = supabase
    .from("incidents")
    .select(
      "id, created_at, logical_date, start_time, end_time, tier_level, defense_occurred, surge_occurred, points, encrypted_narrative"
    )
    .order("start_time", { ascending: true });

  if (filter?.startDate) {
    query = query.gte("logical_date", filter.startDate);
  }
  if (filter?.endDate) {
    query = query.lte("logical_date", filter.endDate);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching incidents for export:", error);
    throw new Error("Failed to fetch export incidents");
  }

  return (data || []) as Incident[];
}

/**
 * Deletes an incident record by ID.
 */
export async function deleteIncident(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceSupabase();

  const { error } = await supabase.from("incidents").delete().eq("id", id);
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
