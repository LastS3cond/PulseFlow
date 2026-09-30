"use server";

import { getServiceSupabase } from "@/lib/supabase/server";

export interface VaultStatus {
  initialized: boolean;
  public_key_spki?: string;
  encrypted_private_key?: string;
  salt?: string;
  created_at?: string;
}

/**
 * Retrieves the current vault configuration from Supabase.
 */
export async function getVaultConfig(): Promise<VaultStatus> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("vault_config")
    .select("public_key_spki, encrypted_private_key, salt, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching vault_config:", error);
    throw new Error("Failed to query vault configuration");
  }

  if (!data) {
    return { initialized: false };
  }

  return {
    initialized: true,
    public_key_spki: data.public_key_spki,
    encrypted_private_key: data.encrypted_private_key,
    salt: data.salt,
    created_at: data.created_at,
  };
}

/**
 * Initializes the vault configuration in Supabase.
 * Should only be called if no vault configuration exists.
 */
export async function initVaultConfig(payload: {
  public_key_spki: string;
  encrypted_private_key: string;
  salt: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceSupabase();

  // Check if already initialized
  const { data: existing } = await supabase.from("vault_config").select("id").limit(1).maybeSingle();
  if (existing) {
    return { success: false, error: "Vault has already been initialized." };
  }

  const { error } = await supabase.from("vault_config").insert({
    public_key_spki: payload.public_key_spki,
    encrypted_private_key: payload.encrypted_private_key,
    salt: payload.salt,
  });

  if (error) {
    console.error("Error inserting vault_config:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
