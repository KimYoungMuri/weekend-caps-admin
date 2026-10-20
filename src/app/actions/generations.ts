"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/admin";

export type ActionResult = { ok: boolean; error?: string };

export async function createGeneration(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireSuperadmin();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const userId = String(formData.get("user_id") ?? user.id).trim() || user.id;

  if (!prompt || !caption) {
    return { ok: false, error: "Prompt and caption are required." };
  }

  const { error } = await supabase.from("generations").insert({
    user_id: userId,
    prompt,
    caption,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/generations");
  revalidatePath("/");
  return { ok: true };
}

export async function updateGeneration(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireSuperadmin();
  const id = Number(formData.get("id"));
  const prompt = String(formData.get("prompt") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();

  if (!id || !prompt || !caption) {
    return { ok: false, error: "Id, prompt, and caption are required." };
  }

  const { error } = await supabase
    .from("generations")
    .update({ prompt, caption })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/generations");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteGeneration(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireSuperadmin();
  const id = Number(formData.get("id"));

  if (!id) return { ok: false, error: "Missing generation id." };

  const { error } = await supabase.from("generations").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/generations");
  revalidatePath("/");
  revalidatePath("/votes");
  return { ok: true };
}
