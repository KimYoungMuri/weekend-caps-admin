import { SignOutButton } from "@/components/AuthButton";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Not a superadmin
      </h1>
      <p className="text-slate-600">
        You’re signed in, but this admin area only allows users with{" "}
        <code className="rounded bg-slate-100 px-1 text-sm">
          profiles.is_superadmin = true
        </code>
        .
      </p>
      <p className="text-sm text-slate-500">
        Fix: run <code>supabase/admin-setup.sql</code> in the Supabase SQL
        Editor (or manually update your profile row), then sign in again.
      </p>
      <SignOutButton />
    </main>
  );
}
