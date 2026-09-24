import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ModeInfo } from "@padel/engine";
import { Icon, MODE_ICONS } from "@/components/icons/icon";

export function ModeCard({ mode, href }: { mode: ModeInfo; href: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/40"
    >
      <div className="flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-lg border bg-background">
          <Icon name={MODE_ICONS[mode.id]} size={22} />
        </span>
        <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium">{mode.name}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{mode.summary}</p>
      </div>
    </Link>
  );
}
