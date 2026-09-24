import type { Metadata } from "next";
import { Suspense } from "react";
import { SetupWizard } from "@/components/setup/setup-wizard";

export const metadata: Metadata = {
  title: "Create a game",
  description: "Set up a padel Americano, Mexicano or team game in three quick steps.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/new" },
};

export default function NewGamePage() {
  return (
    <Suspense>
      <SetupWizard />
    </Suspense>
  );
}
