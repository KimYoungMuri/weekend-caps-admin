import { MixEditor } from "@/components/MixEditor";
import { PageHeader, TableError } from "@/components/PageHeader";
import { requireSuperadmin } from "@/lib/admin";

export default async function MixPage() {
  const { supabase } = await requireSuperadmin();
  const { data, error } = await supabase
    .from("prompt_chain_mix")
    .select("id, chain_id, weight, is_enabled, updated_at, prompt_chains(name)")
    .order("chain_id");

  const rows = (data ?? []).map((row) => {
    const chain = row.prompt_chains as unknown as { name: string } | null;
    return {
      id: row.id as number,
      chainId: row.chain_id as number,
      chainName: chain?.name ?? `Chain #${row.chain_id}`,
      weight: row.weight as number,
      isEnabled: row.is_enabled as boolean,
      updatedAt: row.updated_at as string,
    };
  });

  return (
    <main className="space-y-6">
      <PageHeader
        badge="Prompting"
        title="Prompt chain mix"
        description="Traffic split between prompt chains. Weights are relative: each Generate click picks an enabled chain with probability weight ÷ total enabled weight."
      />
      {error ? <TableError message={error.message} /> : <MixEditor rows={rows} />}
    </main>
  );
}
