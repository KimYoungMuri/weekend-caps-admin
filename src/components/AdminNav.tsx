import Link from "next/link";
import { SignOutButton } from "@/components/AuthButton";

const links = [
  { href: "/", label: "Overview" },
  { href: "/profiles", label: "Profiles" },
  { href: "/generations", label: "Generations" },
  { href: "/votes", label: "Votes" },
];

export function AdminNav({ name }: { name: string }) {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
            Caps Admin
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm text-slate-600">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-slate-900">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">{name}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
