import Link from "next/link";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Logo />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          <Link href="/modes" className="rounded-md px-3 py-2 hover:text-foreground">
            Formats
          </Link>
          <Link href="/schedule" className="rounded-md px-3 py-2 hover:text-foreground">
            Schedules
          </Link>
          <Link href="/docs/mcp" className="rounded-md px-3 py-2 hover:text-foreground">
            AI assistants
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
