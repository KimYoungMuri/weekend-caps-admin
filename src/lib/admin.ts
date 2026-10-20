import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_superadmin: boolean | null;
  updated_at: string | null;
};

export type AdminGeneration = {
  id: number;
  user_id: string;
  prompt: string;
  caption: string;
  created_at: string;
};

export type AdminVote = {
  id: number;
  user_id: string;
  generation_id: number;
  value: number;
  created_at: string;
};

export async function requireSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url, is_superadmin, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_superadmin) {
    redirect("/forbidden");
  }

  return { supabase, user, profile };
}

export function displayName(
  first: string | null | undefined,
  last: string | null | undefined,
  fallback = "Anonymous",
) {
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || fallback;
}
