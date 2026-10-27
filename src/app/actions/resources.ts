"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/admin";
import { getResource, parseRow, type Operation } from "@/lib/resources";

export type ActionResult = { ok: boolean; error?: string };

async function load(slug: string, operation: Operation) {
  const resource = getResource(slug);
  if (!resource || !resource.operations.includes(operation)) {
    throw new Error(`Cannot ${operation} ${slug}.`);
  }
  const { supabase } = await requireSuperadmin();
  return { resource, supabase };
}

function toResult(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : String(error) };
}

export async function createRow(slug: string, formData: FormData): Promise<ActionResult> {
  try {
    const { resource, supabase } = await load(slug, "create");
    const { error } = await supabase.from(resource.table).insert(parseRow(resource, formData));
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/data/${slug}`);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function updateRow(slug: string, formData: FormData): Promise<ActionResult> {
  try {
    const { resource, supabase } = await load(slug, "update");
    const id = Number(formData.get("id"));
    if (!id) return { ok: false, error: "Missing id." };
    const { error } = await supabase
      .from(resource.table)
      .update(parseRow(resource, formData))
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/data/${slug}`);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function deleteRow(slug: string, id: number): Promise<ActionResult> {
  try {
    const { resource, supabase } = await load(slug, "delete");
    const { error } = await supabase.from(resource.table).delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/data/${slug}`);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function updateMixWeight(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireSuperadmin();
  const id = Number(formData.get("id"));
  const weight = Number(formData.get("weight"));
  const isEnabled = formData.get("is_enabled") === "on";

  if (!id || !Number.isInteger(weight) || weight < 0 || weight > 100) {
    return { ok: false, error: "Weight must be a whole number from 0 to 100." };
  }

  const { error } = await supabase
    .from("prompt_chain_mix")
    .update({ weight, is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/prompt-chains");
  return { ok: true };
}
