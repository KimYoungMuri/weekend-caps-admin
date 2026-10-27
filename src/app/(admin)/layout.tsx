import { AdminNav } from "@/components/AdminNav";
import { displayName, requireSuperadmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, user } = await requireSuperadmin();
  const name = displayName(profile.first_name, profile.last_name, user.email);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav name={name} />
      <div className="min-w-0 flex-1 px-6 py-8 lg:px-10">{children}</div>
    </div>
  );
}
