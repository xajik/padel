import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccountCard } from "@/components/app/delete-account-card";
import { LegalPage, Mail } from "@/components/marketing/legal-page";
import { LEGAL, NATIVE_APP, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Delete your account and data",
  description: `How to delete your ${NATIVE_APP.storeName} and ${SITE.name} account and data, what is deleted, what is kept and for how long.`,
  alternates: { canonical: "/delete-account" },
};

const steps = "list-decimal space-y-1.5 pl-5 [&_li]:pl-1";

export default function DeleteAccountPage() {
  return (
    <LegalPage
      title="Delete your account and data"
      href="/delete-account"
      intro={
        <p>
          How to delete your data from <strong>{NATIVE_APP.storeName}</strong> (the {NATIVE_APP.name} app for Android and iOS)
          and the {SITE.name} website, published by <strong>{LEGAL.publisher}</strong>.
        </p>
      }
    >
      <h2 id="request">Request deletion by email</h2>
      <p>This works for everything we store, whether you use the app, the website or both:</p>
      <ol className={steps}>
        <li>
          Email <Mail subject="Delete my data" /> with the subject “Delete my data”.
        </li>
        <li>
          Include the email address of your Google account if you signed in on the website, and the 6-character codes of any
          games you want deleted from our servers (shown in each game’s share menu).
        </li>
        <li>We confirm by email and delete the data within 30 days.</li>
      </ol>

      <h2 id="account">Delete your website account yourself</h2>
      <p>If you signed in with Google on the website, you can delete the account instantly:</p>
      <ol className={steps}>
        <li>
          Open <Link href="/me">{SITE.url.replace(/^https?:\/\//, "")}/me</Link> (or this page) and sign in with the same
          Google account.
        </li>
        <li>
          Tap <strong>Delete account</strong>, then <strong>Delete permanently</strong>. Google may ask you to confirm it’s you.
        </li>
      </ol>
      <DeleteAccountCard showWhenSignedOut />

      <h2 id="app">Delete data in the app</h2>
      <p>
        The {NATIVE_APP.name} app has no accounts: there is no login, and games are kept on your device and, so they can be
        shared, on our servers.
      </p>
      <ul>
        <li>
          Android: open <strong>Settings › Apps › {NATIVE_APP.name} › Storage</strong> and tap <strong>Clear storage</strong>,
          or uninstall the app.
        </li>
        <li>
          iPhone and iPad: touch and hold a game on the home screen and choose <strong>Remove from this phone</strong>, or
          uninstall the app.
        </li>
        <li>To delete games from our servers as well, send us their codes as described above.</li>
      </ul>

      <h2 id="deleted">What is deleted</h2>
      <ul>
        <li>
          <strong>Website account:</strong> your name, email address, profile photo and account ID from Google sign-in, deleted
          immediately when you delete the account yourself, or within 30 days of an email request.
        </li>
        <li>
          <strong>Games on our servers:</strong> game name, player names, format, courts, scores, game code and organizer key,
          deleted within 30 days of your request. Without a request, every game is deleted automatically 90 days after its last
          change.
        </li>
        <li>
          <strong>Data on your device:</strong> games, settings and widgets, deleted as soon as you clear the app’s storage,
          remove the game, uninstall the app or clear this site’s data in your browser.
        </li>
      </ul>

      <h2 id="kept">What is kept, and for how long</h2>
      <ul>
        <li>
          <strong>Usage analytics</strong> (app-instance ID, device model, OS and app version, approximate region and in-app
          events): not linked to your name, email or games, so we can’t single it out on request. It is deleted automatically
          after at most 14 months.
        </li>
        <li>
          <strong>Backups:</strong> copies of deleted data can remain in our hosting provider’s backups for up to 30 days
          before they are overwritten.
        </li>
        <li>
          <strong>Your deletion request:</strong> we keep the email you sent us and our reply for up to 12 months, to show we
          handled it, unless the law requires longer.
        </li>
        <li>
          <strong>Games other people follow:</strong> copies of a game on another person’s device stay there until they remove
          them.
        </li>
      </ul>

      <p>
        Questions? Email <Mail subject="Privacy request" />. See also our <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/support">Help & Support</Link>.
      </p>
    </LegalPage>
  );
}
