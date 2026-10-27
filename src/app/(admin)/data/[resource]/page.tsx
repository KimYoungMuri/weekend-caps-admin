import { notFound } from "next/navigation";
import { ResourceManager } from "@/components/ResourceManager";
import { PageHeader, TableError } from "@/components/PageHeader";
import { requireSuperadmin } from "@/lib/admin";
import { getResource } from "@/lib/resources";

export default async function ResourcePage({ params }: PageProps<"/data/[resource]">) {
  const { resource: slug } = await params;
  const resource = getResource(slug);
  if (!resource) notFound();

  const { supabase } = await requireSuperadmin();

  const { data: rows, error } = await supabase
    .from(resource.table)
    .select("*")
    .order(resource.orderBy.column, { ascending: resource.orderBy.ascending });

  const refFields = resource.fields.filter((f) => f.type === "ref" && f.ref);
  const refEntries = await Promise.all(
    refFields.map(async (field) => {
      const { data } = await supabase
        .from(field.ref!.table)
        .select(`id, ${field.ref!.labelColumn}`)
        .order("id");
      const options = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
        id: Number(row.id),
        label: String(row[field.ref!.labelColumn]),
      }));
      return [field.name, options] as const;
    }),
  );

  return (
    <main className="space-y-6">
      <PageHeader title={resource.label} description={resource.description} badge={resource.group} />
      {error ? (
        <TableError message={error.message} />
      ) : (
        <ResourceManager
          slug={resource.slug}
          label={resource.label}
          fields={resource.fields}
          operations={resource.operations}
          rows={(rows ?? []) as (Record<string, unknown> & { id: number })[]}
          refOptions={Object.fromEntries(refEntries)}
          meta={resource.meta ?? []}
        />
      )}
    </main>
  );
}
