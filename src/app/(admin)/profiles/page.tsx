import { displayName, requireSuperadmin } from "@/lib/admin";


export default async function ProfilesPage() {
  const { supabase } = await requireSuperadmin();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url, is_superadmin, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Profiles
        </h1>
        <p className="text-slate-600">Read-only directory of app users.</p>
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
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((profile) => (
              <tr key={profile.id} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {displayName(profile.first_name, profile.last_name, "?")
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-slate-900">
                      {displayName(profile.first_name, profile.last_name)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {profile.id}
                </td>
                <td className="px-4 py-3">
                  {profile.is_superadmin ? (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
                      superadmin
                    </span>
                  ) : (
                    <span className="text-slate-500">member</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {profile.updated_at
                    ? new Date(profile.updated_at).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
