"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMixWeight } from "@/app/actions/resources";

type MixRow = {
  id: number;
  chainId: number;
  chainName: string;
  weight: number;
  isEnabled: boolean;
  updatedAt: string;
};

function MixRowForm({ row, total }: { row: MixRow; total: number }) {
  const router = useRouter();
  const [weight, setWeight] = useState(row.weight);
  const [enabled, setEnabled] = useState(row.isEnabled);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const share = enabled && total > 0 ? Math.round((row.weight / total) * 100) : 0;

  return (
    <form
      className="grid items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await updateMixWeight(formData);
          if (!result.ok) {
            setError(result.error ?? "Update failed");
            return;
          }
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="id" value={row.id} />
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">{row.chainName}</p>
        <p className="text-xs text-slate-500">
          Live share: {share}% · updated {new Date(row.updatedAt).toLocaleString()}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-teal-600 transition-all" style={{ width: `${share}%` }} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="range"
          name="weight"
          min={0}
          max={100}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className="w-40"
        />
        <span className="w-10 text-right font-mono">{weight}</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Enabled
      </label>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-xs text-teal-700">Saved</span>}
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
    </form>
  );
}

export function MixEditor({ rows }: { rows: MixRow[] }) {
  const total = rows.filter((r) => r.isEnabled).reduce((sum, r) => sum + r.weight, 0);
  if (rows.length === 0) {
    return <p className="text-slate-500">No chains in the mix yet.</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <MixRowForm key={row.id} row={row} total={total} />
      ))}
      {total === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          All weights are 0 or disabled; Weekend Caps falls back to its built-in one-shot prompt.
        </p>
      )}
    </div>
  );
}
