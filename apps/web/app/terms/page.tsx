import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Mail } from "@/components/marketing/legal-page";
import { LEGAL, NATIVE_APP, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms for using ${SITE.name} and the ${NATIVE_APP.name} apps.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      href="/terms"
      intro={
        <p>
          These terms apply to the {SITE.name} website, the {NATIVE_APP.name} apps for iOS and Android and our AI assistant
          connector (the “service”), operated by {LEGAL.publisher}. By using the service you agree to them.
        </p>
      }
    >
      <h2 id="service">The service</h2>
      <p>
        The service helps you organize social padel games: it generates rotations, records scores and shows a leaderboard. It is
        free and needs no account. We may change, add or remove features at any time.
      </p>

      <h2 id="your-content">Your games and content</h2>
      <ul>
        <li>You are responsible for what you enter, including player and game names. Only add people who are happy to be listed.</li>
        <li>Anyone with a game’s code or link can view it. Share organizer links only with people who should edit scores.</li>
        <li>You keep any rights you have in your content and give us permission to store and display it to run the service.</li>
        <li>Don’t enter offensive, unlawful or other people’s private information.</li>
      </ul>

      <h2 id="acceptable-use">Acceptable use</h2>
      <p>
        Don’t misuse the service: no attempts to break, overload, scrape at scale or gain unauthorized access to it or to other
        people’s games, and no use that breaks the law.
      </p>

      <h2 id="availability">Availability and data</h2>
      <p>
        We work to keep the service running, but it is provided “as is” and “as available”, without warranties of any kind. Games
        on our servers are deleted 90 days after their last change (see the <Link href="/privacy">Privacy Policy</Link>). Keep
        your own record of results that matter to you.
      </p>

      <h2 id="liability">Limitation of liability</h2>
      <p>
        To the extent the law allows, {LEGAL.publisher} is not liable for indirect or consequential losses, lost data or disputes
        over results. Nothing in these terms limits liability that cannot be limited by law, or your statutory rights as a
        consumer.
      </p>

      <h2 id="app-stores">App stores</h2>
      <p>
        If you downloaded an app from the Apple App Store, Apple’s{" "}
        <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">Standard End User License Agreement</a>{" "}
        also applies; Apple has no obligation to provide support for the app. If you downloaded it from Google Play, the Google
        Play Terms of Service also apply.
      </p>

      <h2 id="changes">Changes and ending use</h2>
      <p>
        We may update these terms and will change the date above when we do. You can stop using the service at any time by
        deleting the app or no longer visiting the website.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        Questions about these terms: <Mail subject="Terms" />. For help with the apps, see <Link href="/support">Support</Link>.
      </p>
    </LegalPage>
  );
}
