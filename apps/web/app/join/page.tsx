import type { Metadata } from "next";
import { JoinForm } from "@/components/app/join-form";
import { Icon } from "@/components/icons/icon";

export const metadata: Metadata = { title: "Join a game", robots: { index: false } };

export default function JoinPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border">
        <Icon name="scoreboard" size={28} />
      </span>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Join a game</h1>
        <p className="text-muted-foreground">Enter the 6-character code from the organizer, or scan their QR code.</p>
      </div>
      <JoinForm autoFocus />
    </div>
  );
}
