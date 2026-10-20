import { SignInWithGoogleButton } from "@/components/AuthButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Caps Admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Superadmin sign-in
        </h1>
        <p className="text-slate-600">
          Google login required. Access is limited to profiles with{" "}
          <code className="rounded bg-slate-100 px-1 text-sm">is_superadmin</code>
          .
        </p>
        {params.error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error}
          </p>
        )}
        <SignInWithGoogleButton />
      </div>
    </main>
  );
}
