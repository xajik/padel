import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-2xl space-y-4 px-4 py-10 leading-relaxed">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
      <p>We collect as little as possible. You can create and run games without an account.</p>
      <h2 className="pt-2 text-lg font-semibold">What we store</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Games you create: the player names you type, settings and scores.</li>
        <li>If you sign in with Google: your name, photo and email address, used only to show your profile and history.</li>
        <li>Anonymous usage events (for example “game created”) to improve the product. Player names are never included.</li>
      </ul>
      <h2 className="pt-2 text-lg font-semibold">Search engines</h2>
      <p>Game pages are not indexed by search engines because they contain people’s names.</p>
      <h2 className="pt-2 text-lg font-semibold">Deleting data</h2>
      <p>Games saved on your device can be cleared from your browser storage. Signed-in users will be able to delete their account and history from their profile.</p>
    </article>
  );
}
