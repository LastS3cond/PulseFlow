"use server";

import { getServiceSupabase } from "@/lib/supabase/server";
import { Incident } from "@/lib/types";
import { revalidatePath } from "next/cache";

export type DashboardIncident = Omit<Incident, "encrypted_narrative">;

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
  revalidatePath("/analytics");
  return { success: true, incident: data };
}

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
  if (!records || records.length === 0) return { success: true, insertedCount: 0 };

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
  revalidatePath("/analytics");
  return { success: true, insertedCount: data ? data.length : records.length };
}

/**
 * Concurrently queries incident metadata and vault configuration in parallel.
 * Omits encrypted_narrative to uphold Zero-Knowledge Dashboard Privacy.
 */
export async function getDashboardData(): Promise<{
  incidents: DashboardIncident[];
  vaultInitialized: boolean;
  inceptionDate: string;
}> {
  const supabase = getServiceSupabase();

  const [incidentRes, vaultRes] = await Promise.all([
    supabase
      .from("incidents")
      .select(
        "id, created_at, logical_date, start_time, end_time, tier_level, defense_occurred, surge_occurred, points"
      )
      .order("start_time", { ascending: false }),
    supabase
      .from("vault_config")
      .select("created_at")
      .limit(1)
      .maybeSingle(),
  ]);

  if (incidentRes.error) {
    console.error("Error fetching incidents:", incidentRes.error);
    throw new Error("Failed to fetch telemetry incidents");
  }

  const vaultRow = vaultRes.data;
  return {
    incidents: (incidentRes.data || []) as DashboardIncident[],
    vaultInitialized: !!vaultRow,
    inceptionDate: vaultRow?.created_at || new Date().toISOString(),
  };
}

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

  if (filter?.startDate) query = query.gte("logical_date", filter.startDate);
  if (filter?.endDate) query = query.lte("logical_date", filter.endDate);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching incidents for export:", error);
    throw new Error("Failed to fetch export incidents");
  }

  return (data || []) as Incident[];
}

export async function deleteIncident(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceSupabase();

  const { error } = await supabase.from("incidents").delete().eq("id", id);

  if (error) {
    console.error("Error deleting incident:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}

export async function updateIncident(
  id: string,
  payload: {
    logical_date: string;
    start_time: string;
    end_time: string;
    tier_level: number;
    defense_occurred: boolean;
    surge_occurred: boolean;
    points: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from("incidents")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("Error updating incident:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}
