"use client";

import { getSupabaseBrowserClient } from "./supabase/client";
import type { Property, PropertyInputs, Json } from "./supabase/types";

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function createProperty(
  name: string,
  address: string,
  inputs: PropertyInputs,
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("properties")
    .insert({
      user_id: userId,
      name,
      address: address || null,
      inputs: inputs as unknown as Json,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateProperty(
  id: string,
  name: string,
  address: string,
  inputs: PropertyInputs,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase
    .from("properties")
    .update({
      name,
      address: address || null,
      inputs: inputs as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function getProperty(id: string): Promise<Property | null> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as Property;
}

export async function getAllProperties(): Promise<Property[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as Property[];
}

export async function deleteProperty(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase.from("properties").delete().eq("id", id);

  if (error) throw error;
}
