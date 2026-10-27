import { ImageManager, type StoredImage } from "@/components/ImageManager";
import { PageHeader } from "@/components/PageHeader";
import { displayName, requireSuperadmin } from "@/lib/admin";

const BUCKET = "avatars";

export default async function ImagesPage() {
  const { supabase } = await requireSuperadmin();

  const [{ data: folders, error }, { data: profiles }] = await Promise.all([
    supabase.storage.from(BUCKET).list("", { limit: 1000 }),
    supabase.from("profiles").select("id, first_name, last_name, avatar_url"),
  ]);

  const owners = new Map(
    (profiles ?? []).map((p) => [p.id, displayName(p.first_name, p.last_name)]),
  );
  const inUse = new Set((profiles ?? []).map((p) => p.avatar_url).filter(Boolean));

  const folderNames = (folders ?? []).filter((f) => f.id === null).map((f) => f.name);
  const listings = await Promise.all(
    folderNames.map(async (folder) => {
      const { data } = await supabase.storage
        .from(BUCKET)
        .list(folder, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
      return (data ?? [])
        .filter((file) => file.id !== null)
        .map<StoredImage>((file) => {
          const path = `${folder}/${file.name}`;
          const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
          return {
            path,
            url,
            folder,
            owner: owners.get(folder) ?? (folder === "admin" ? "Admin uploads" : folder.slice(0, 8)),
            size: (file.metadata?.size as number | undefined) ?? null,
            createdAt: file.created_at ?? null,
            inUse: inUse.has(url),
          };
        });
    }),
  );

  const images = listings.flat().sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return (
    <main className="space-y-6">
      <PageHeader
        badge="Content"
        title="Images"
        description="Every image uploaded to Weekend Caps (profile photos in the Supabase Storage “avatars” bucket). Upload new images, replace a file in place, or delete it."
      />
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
      )}
      <ImageManager bucket={BUCKET} images={images} />
    </main>
  );
}
