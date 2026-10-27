import Link from "next/link";
import { PageHeader, TableError } from "@/components/PageHeader";
import { requireSuperadmin } from "@/lib/admin";

type Step = {
  id: number;
  chain_id: number;
  step_order: number;
  name: string;
  instruction: string;
  model_id: number | null;
};

export default async function PromptChainsPage() {
  const { supabase } = await requireSuperadmin();

  const [chains, steps, mix, requests, models] = await Promise.all([
    supabase.from("prompt_chains").select("id, name, description, created_at").order("id"),
    supabase.from("prompt_chain_steps").select("*").order("chain_id").order("step_order"),
    supabase.from("prompt_chain_mix").select("chain_id, weight, is_enabled"),
    supabase.from("generation_requests").select("chain_id, status, latency_ms"),
    supabase.from("llm_models").select("id, display_name"),
  ]);

  if (chains.error) {
    return (
      <main className="space-y-6">
        <PageHeader title="Prompt chains" description="Multi-step prompt pipelines used to write captions." />
        <TableError message={chains.error.message} />
      </main>
    );
  }

  const stepRows = (steps.data ?? []) as Step[];
  const modelName = new Map((models.data ?? []).map((m) => [m.id, m.display_name]));

  return (
    <main className="space-y-6">
      <PageHeader
        badge="Prompting"
        title="Prompt chains"
        description="Each Generate click in Weekend Caps picks one chain (weighted by the mix) and runs its steps in order. Each step's output is passed to the next as {{previous}}."
      />
      <p className="text-sm">
        <Link href="/mix" className="font-medium text-teal-700 hover:underline">
          Edit the chain mix →
        </Link>
      </p>

      {(chains.data ?? []).map((chain) => {
        const chainSteps = stepRows.filter((s) => s.chain_id === chain.id);
        const mixRow = mix.data?.find((m) => m.chain_id === chain.id);
        const runs = (requests.data ?? []).filter((r) => r.chain_id === chain.id);
        const ok = runs.filter((r) => r.status === "succeeded");
        const latencies = ok.map((r) => r.latency_ms ?? 0).filter(Boolean);
        const avgLatency = latencies.length
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : null;

        return (
          <section key={chain.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-slate-500">chain #{chain.id}</p>
                <h2 className="text-xl font-semibold text-slate-900">{chain.name}</h2>
                <p className="text-sm text-slate-600">{chain.description}</p>
              </div>
              <dl className="grid grid-cols-3 gap-4 text-right text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Mix weight</dt>
                  <dd className="font-semibold">
                    {mixRow ? (mixRow.is_enabled ? `${mixRow.weight}%` : "off") : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Runs</dt>
                  <dd className="font-semibold">
                    {ok.length}/{runs.length} ok
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Avg latency</dt>
                  <dd className="font-semibold">{avgLatency ? `${(avgLatency / 1000).toFixed(1)}s` : "—"}</dd>
                </div>
              </dl>
            </div>

            <ol className="space-y-3">
              {chainSteps.map((step) => (
                <li key={step.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-slate-900">
                      Step {step.step_order}: {step.name}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      step #{step.id} · model:{" "}
                      {step.model_id ? (modelName.get(step.model_id) ?? `#${step.model_id}`) : "default priority list"}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-700">
                    {step.instruction}
                  </pre>
                </li>
              ))}
              {chainSteps.length === 0 && <li className="text-sm text-slate-500">No steps.</li>}
            </ol>
          </section>
        );
      })}
    </main>
  );
}
