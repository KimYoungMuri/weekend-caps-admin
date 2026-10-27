import Link from "next/link";
import { PageHeader, TableError } from "@/components/PageHeader";
import { requireSuperadmin } from "@/lib/admin";

export default async function ResponsesPage({ searchParams }: PageProps<"/responses">) {
  const { request } = await searchParams;
  const requestId = typeof request === "string" && /^\d+$/.test(request) ? Number(request) : null;
  const { supabase } = await requireSuperadmin();

  let query = supabase
    .from("llm_responses")
    .select("*, prompt_chain_steps(name, step_order)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (requestId) query = query.eq("request_id", requestId);

  const { data, error } = await query;

  return (
    <main className="space-y-6">
      <PageHeader
        badge="Observability"
        title="LLM responses"
        description="Every individual model call made while generating captions: the exact prompt sent, the raw output, the model used, and latency. Failed calls (and the fallback to the next model) show up here too."
      />

      {requestId && (
        <p className="text-sm">
          Showing calls for request #{requestId}.{" "}
          <Link href="/responses" className="font-medium text-teal-700 hover:underline">
            Show all
          </Link>
        </p>
      )}

      {error ? (
        <TableError message={error.message} />
      ) : (data ?? []).length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
          No LLM responses logged yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((row) => {
            const step = row.prompt_chain_steps as unknown as { name: string; step_order: number } | null;
            return (
              <li key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-500">#{row.id}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        row.status === "succeeded" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {row.status}
                    </span>
                    <span className="font-medium text-slate-900">{row.model_name}</span>
                    {step && (
                      <span className="text-slate-500">
                        · step {step.step_order}: {step.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-mono">
                      {row.latency_ms ? `${(row.latency_ms / 1000).toFixed(2)}s` : "—"}
                    </span>
                    <Link href={`/responses?request=${row.request_id}`} className="text-teal-700 hover:underline">
                      request #{row.request_id}
                    </Link>
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {row.error && <p className="mt-2 text-sm text-red-600">{row.error}</p>}
                {row.output_text && (
                  <p className="mt-3 whitespace-pre-wrap rounded-xl bg-teal-50 px-3 py-2 text-sm text-slate-900">
                    {row.output_text}
                  </p>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-900">
                    Prompt sent ({row.input_text.length.toLocaleString()} chars)
                  </summary>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-700">
                    {row.input_text}
                  </pre>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
