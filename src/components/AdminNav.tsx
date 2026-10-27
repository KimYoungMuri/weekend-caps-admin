import Link from "next/link";
import { SignOutButton } from "@/components/AuthButton";

const groups = [
  {
    label: "Overview",
    links: [{ href: "/", label: "Dashboard" }],
  },
  {
    label: "Content",
    links: [
      { href: "/profiles", label: "Users" },
      { href: "/generations", label: "AI captions" },
      { href: "/votes", label: "Votes" },
      { href: "/images", label: "Images" },
    ],
  },
  {
    label: "Prompting",
    links: [
      { href: "/prompt-chains", label: "Prompt chains & steps" },
      { href: "/mix", label: "Chain mix" },
      { href: "/data/terms", label: "Terms" },
      { href: "/data/examples", label: "Generation examples" },
    ],
  },
  {
    label: "LLM",
    links: [
      { href: "/data/providers", label: "Providers" },
      { href: "/data/models", label: "Models" },
    ],
  },
  {
    label: "Observability",
    links: [
      { href: "/requests", label: "Generation requests" },
      { href: "/responses", label: "LLM responses" },
    ],
  },
  {
    label: "Access",
    links: [
      { href: "/data/domains", label: "Signup domains" },
      { href: "/data/whitelist", label: "Whitelisted emails" },
    ],
  },
];

export function AdminNav({ name }: { name: string }) {
  return (
    <aside className="border-b border-slate-200 bg-white/90 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block lg:space-y-1">
        <Link href="/" className="block text-lg font-semibold tracking-tight text-slate-900">
          Caps Admin
        </Link>
        <p className="truncate text-xs text-slate-500">Signed in as {name}</p>
      </div>
      <nav className="flex gap-6 overflow-x-auto px-5 pb-4 text-sm lg:block lg:space-y-5 lg:overflow-visible">
        {groups.map((group) => (
          <div key={group.label} className="shrink-0 space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">{group.label}</p>
            <ul className="space-y-1">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="block whitespace-nowrap text-slate-600 hover:text-slate-950">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="shrink-0 pt-2">
          <SignOutButton />
        </div>
      </nav>
    </aside>
  );
}
