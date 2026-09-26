import Link from "next/link";
import { MODE_GUIDES } from "@padel/content";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t pb-[env(safe-area-inset-bottom)] text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="font-medium text-foreground">{SITE.name}</p>
          <p>{SITE.tagline}. Free, no sign-up needed.</p>
        </div>
        <nav aria-label="Formats" className="space-y-2">
          <p className="font-medium text-foreground">Formats</p>
          <ul className="grid grid-cols-2 gap-1">
            {MODE_GUIDES.map((m) => (
              <li key={m.id}>
                <Link href={`/modes/${m.id}`} className="hover:text-foreground">
                  {m.title.replace(/^Padel /, "")}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Resources" className="space-y-2">
          <p className="font-medium text-foreground">Resources</p>
          <ul className="space-y-1">
            <li><Link href="/schedule" className="hover:text-foreground">Americano schedules</Link></li>
            <li><Link href="/docs/mcp" className="hover:text-foreground">Connect your AI assistant</Link></li>
            <li><Link href="/docs/muse" className="hover:text-foreground">Meta Muse connector</Link></li>
            <li><Link href="/llms.txt" className="hover:text-foreground">llms.txt</Link></li>
            <li><Link href="/app" className="hover:text-foreground">iPhone & Android app</Link></li>
            <li><Link href="/support" className="hover:text-foreground">Help & Support</Link></li>
            <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-foreground">Terms of Use</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
