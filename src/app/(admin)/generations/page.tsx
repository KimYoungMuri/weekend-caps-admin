import {
  CreateGenerationForm,
  EditGenerationRow,
} from "@/components/GenerationForms";
import { displayName, requireSuperadmin } from "@/lib/admin";


export default async function GenerationsPage() {
  const { supabase, user } = await requireSuperadmin();

  const [{ data: generations, error }, { data: profiles }] = await Promise.all([
    supabase
      .from("generations")
      .select("id, user_id, prompt, caption, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, first_name, last_name"),
  ]);

  const profileOptions = (profiles ?? []).map((profile) => ({
    id: profile.id,
    label: displayName(profile.first_name, profile.last_name, profile.id.slice(0, 8)),
  }));

  if (!profileOptions.some((p) => p.id === user.id)) {
    profileOptions.unshift({ id: user.id, label: "You" });
  }

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Generations
        </h1>
        <p className="text-slate-600">
          Create, edit, and delete AI captions stored in Supabase.
        </p>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error.message}
        </p>
      )}

      <CreateGenerationForm
        profiles={profileOptions}
        defaultUserId={user.id}
      />

      <ul className="space-y-3">
        {(generations ?? []).map((generation) => (
          <EditGenerationRow key={generation.id} generation={generation} />
        ))}
      </ul>
    </main>
  );
}
