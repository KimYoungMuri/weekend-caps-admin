import { displayName, requireSuperadmin } from "@/lib/admin";


export default async function VotesPage() {
  const { supabase } = await requireSuperadmin();

  const [{ data: votes, error }, { data: generations }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("votes")
        .select("id, user_id, generation_id, value, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("generations").select("id, caption"),
      supabase.from("profiles").select("id, first_name, last_name"),
    ]);

  const captionById = new Map(
    (generations ?? []).map((g) => [g.id, g.caption]),
  );
  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      displayName(p.first_name, p.last_name, p.id.slice(0, 8)),
    ]),
  );

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Votes
        </h1>
        <p className="text-slate-600">
          Read-only log of every upvote and downvote.
        </p>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Voter</th>
              <th className="px-4 py-3 font-medium">Caption</th>
              <th className="px-4 py-3 font-medium">Vote</th>
            </tr>
          </thead>
          <tbody>
            {(votes ?? []).map((vote) => (
              <tr key={vote.id} className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-500">
                  {new Date(vote.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-800">
                  {nameById.get(vote.user_id) ?? vote.user_id.slice(0, 8)}
                </td>
                <td className="max-w-md truncate px-4 py-3 text-slate-800">
                  {captionById.get(vote.generation_id) ??
                    `#${vote.generation_id}`}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      vote.value === 1
                        ? "bg-teal-100 text-teal-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {vote.value === 1 ? "upvote" : "downvote"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(votes ?? []).length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-500">No votes yet.</p>
        )}
      </div>
    </main>
  );
}
