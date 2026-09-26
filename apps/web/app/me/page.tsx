import type { Metadata } from "next";
import { DeleteAccountCard } from "@/components/app/delete-account-card";
import { RecentGames } from "@/components/app/recent-games";
import { SignInCard } from "@/components/app/sign-in-card";

export const metadata: Metadata = { title: "My games", robots: { index: false } };

export default function MePage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">My games</h1>
      <SignInCard />
      <RecentGames limit={50} title="On this device" />
      <DeleteAccountCard />
    </div>
  );
}
