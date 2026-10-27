import Link from "next/link";
import { PageHeader, TableError } from "@/components/PageHeader";
import { displayName, requireSuperadmin } from "@/lib/admin";

const STATUS_STYLES: Record<string, string> = {
  succeeded: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-amber-100 text-amber-800",
};

export default async function RequestsPage({ searchParams }: PageProps<"/requests">) {
  const { status } = await searchParams;
  const filter = typeof status === "string" && status in STATUS_STYLES ? status : null;
  const { supabase } = await requireSuperadmin();

  let query = supabase
    .from("generation_requests")
    .select("*, prompt_chains(name), llm_responses(id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter) query = query.eq("status", filter);

  const [{ data, error }, { data: profiles }, { data: all }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, first_name, last_name"),
    supabase.from("generation_requests").select("status, latency_ms"),
  ]);

  const names = new Map(
    (profiles ?? []).map((p) => [p.id, displayName(p.first_name, p.last_name)]),
  );
  const counts = { succeeded: 0, failed: 0, pending: 0 } as Record<string, number>;
  for (const row of all ?? []) counts[row.status] = (counts[row.status] ?? 0) + 1;
  const total = all?.length ?? 0;
  const latencies = (all ?? [])
    .filter((r) => r.status === "succeeded" && r.latency_ms)
    .map((r) => r.latency_ms as number)
    .sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length / 2)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];

  return (
    <main className="space-y-6">
      <PageHeader
        badge="Observability"
        title="Generation requests"
        description="One row per Generate click in Weekend Caps: who asked, which prompt chain ran, how long it took, and whether it produced a caption."
      />

      {error ? (
        <TableError message={error.message} />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Total requests", value: total },
              {
                label: "Success rate",
                value: total ? `${Math.round((counts.succeeded / total) * 100)}%` : "—",
              },
              { label: "p50 latency", value: p50 ? `${(p50 / 1000).toFixed(1)}s` : "—" },
              { label: "p95 latency", value: p95 ? `${(p95 / 1000).toFixed(1)}s` : "—" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </section>

          <nav className="flex gap-2 text-sm">
            {[null, "succeeded", "failed", "pending"].map((s) => (
              <Link
                key={s ?? "all"}
                href={s ? `/requests?status=${s}` : "/requests"}
                className={`rounded-full border px-3 py-1 ${
                  filter === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"
                }`}
              >
                {s ?? "all"} {s ? `(${counts[s] ?? 0})` : `(${total})`}
              </Link>
            ))}
          </nav>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 font-medium">ID</th>
                  <th className="px-3 py-2.5 font-medium">When</th>
                  <th className="px-3 py-2.5 font-medium">User</th>
                  <th className="px-3 py-2.5 font-medium">Prompt</th>
                  <th className="px-3 py-2.5 font-medium">Chain</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Latency</th>
                  <th className="px-3 py-2.5 font-medium">LLM calls</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      No requests yet. Generate a caption in Weekend Caps to see one here.
                    </td>
                  </tr>
                )}
                {(data ?? []).map((row) => {
                  const chain = row.prompt_chains as unknown as { name: string } | null;
                  const calls = (row.llm_responses as unknown as { id: number }[]) ?? [];
                  return (
                    <tr key={row.id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-3 font-mono text-xs text-slate-500">#{row.id}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-3">{names.get(row.user_id) ?? row.user_id.slice(0, 8)}</td>
                      <td className="max-w-xs px-3 py-3">
                        <p>{row.prompt}</p>
                        {row.error && <p className="mt-1 text-xs text-red-600">{row.error}</p>}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{chain?.name ?? "built-in fallback"}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[row.status]}`}>
                          {row.status}
                        </span>
                        {row.generation_id && (
                          <p className="mt-1 font-mono text-xs text-slate-500">gen #{row.generation_id}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">
                        {row.latency_ms ? `${(row.latency_ms / 1000).toFixed(2)}s` : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/responses?request=${row.id}`} className="text-teal-700 hover:underline">
                          {calls.length} →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
