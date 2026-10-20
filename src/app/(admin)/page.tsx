import Link from "next/link";
import { requireSuperadmin } from "@/lib/admin";


export default async function AdminHomePage() {
  const { supabase } = await requireSuperadmin();

  const [
    { count: profileCount },
    { count: generationCount },
    { count: voteCount },
    { data: votes },
    { data: generations },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("generations").select("*", { count: "exact", head: true }),
    supabase.from("votes").select("*", { count: "exact", head: true }),
    supabase.from("votes").select("value, generation_id, user_id"),
    supabase
      .from("generations")
      .select("id, caption, prompt, user_id, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, first_name, last_name, is_superadmin"),
  ]);

  const upvotes = (votes ?? []).filter((v) => v.value === 1).length;
  const downvotes = (votes ?? []).filter((v) => v.value === -1).length;
  const upvoteRate =
    (upvotes + downvotes) > 0
      ? Math.round((upvotes / (upvotes + downvotes)) * 100)
      : 0;

  const scoreByGeneration = new Map<number, number>();
  for (const vote of votes ?? []) {
    scoreByGeneration.set(
      vote.generation_id,
      (scoreByGeneration.get(vote.generation_id) ?? 0) + vote.value,
    );
  }

  const top = [...(generations ?? [])]
    .map((g) => ({ ...g, score: scoreByGeneration.get(g.id) ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const captionsByUser = new Map<string, number>();
  for (const g of generations ?? []) {
    captionsByUser.set(g.user_id, (captionsByUser.get(g.user_id) ?? 0) + 1);
  }

  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id.slice(0, 8),
    ]),
  );

  const topCreators = [...captionsByUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const last7 = (generations ?? []).filter((g) => {
    const age = Date.now() - new Date(g.created_at).getTime();
    return age < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const superadmins = (profiles ?? []).filter((p) => p.is_superadmin).length;

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Weekend Caps · Admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Ops overview
        </h1>
        <p className="max-w-2xl text-slate-600">
          Live pulse of profiles, AI captions, and vote energy across the app.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Profiles" value={profileCount ?? 0} href="/profiles" />
        <StatCard
          label="Generations"
          value={generationCount ?? 0}
          href="/generations"
        />
        <StatCard label="Votes cast" value={voteCount ?? 0} href="/votes" />
        <StatCard label="Upvote rate" value={`${upvoteRate}%`} href="/votes" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Hottest captions
          </h2>
          {top.length === 0 ? (
            <p className="text-sm text-slate-500">No generations yet.</p>
          ) : (
            <ul className="space-y-3">
              {top.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{item.caption}</p>
                    <p className="truncate text-sm italic text-slate-500">
                      “{item.prompt}”
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-teal-700 px-2.5 py-1 text-sm font-semibold text-white">
                    {item.score}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Activity
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Captions last 7 days</dt>
                <dd className="font-semibold text-slate-900">{last7}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Upvotes</dt>
                <dd className="font-semibold text-slate-900">{upvotes}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Downvotes</dt>
                <dd className="font-semibold text-slate-900">{downvotes}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Superadmins</dt>
                <dd className="font-semibold text-slate-900">{superadmins}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Top creators
            </h2>
            {topCreators.length === 0 ? (
              <p className="text-sm text-slate-500">No creators yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topCreators.map(([id, count]) => (
                  <li key={id} className="flex justify-between gap-3">
                    <span className="truncate text-slate-700">
                      {nameById.get(id)}
                    </span>
                    <span className="font-semibold text-slate-900">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </Link>
  );
}
