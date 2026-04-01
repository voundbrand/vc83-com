import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
] as const;

export function LegalFooterNav() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/80 px-4 py-4 text-xs text-slate-400">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
        <span>© {new Date().getFullYear()} sevenlayers.io</span>
        <nav aria-label="Legal navigation" className="flex items-center gap-4">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-slate-200">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
