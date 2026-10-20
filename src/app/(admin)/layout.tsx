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
    <>
      <AdminNav name={name} />
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</div>
    </>
  );
}
