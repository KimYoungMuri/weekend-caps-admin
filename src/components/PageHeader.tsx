export function PageHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <header className="space-y-1">
      {badge && (
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-teal-700">{badge}</p>
      )}
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="max-w-3xl text-slate-600">{description}</p>
    </header>
  );
}

export function TableError({ message }: { message: string }) {
  const missing = /schema cache|does not exist/i.test(message);
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {missing
        ? "This table doesn't exist yet. Run supabase/week7-observability.sql in the Supabase SQL Editor."
        : message}
    </p>
  );
}
