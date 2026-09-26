import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Mail } from "@/components/marketing/legal-page";
import { LEGAL, NATIVE_APP, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} and the ${NATIVE_APP.name} apps handle your data: no account needed, no ads, no selling of data.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      href="/privacy"
      intro={
        <p>
          We collect as little as possible. You can create and run games without an account, we show no ads, we don’t track you
          across other apps or websites and we never sell your data.
        </p>
      }
    >
      <h2 id="who">Who we are</h2>
      <p>
        This policy covers the {SITE.name} website ({SITE.url.replace(/^https?:\/\//, "")}), the {NATIVE_APP.name} apps for iOS
        and Android (“{NATIVE_APP.storeName}”) and our AI assistant connector (MCP), together the “service”. The service is
        operated by {LEGAL.publisher} (“we”), the data controller. Contact: <Mail subject="Privacy" />.
      </p>

      <h2 id="collect">What we collect and why</h2>
      <h3>Games</h3>
      <p>
        When you create a game we store what you enter: the game name, player names, format, courts, points and scores, plus a
        6-character game code and an organizer key that allows editing. We need this to run the game, show the schedule and
        leaderboard, and let other people follow it.
      </p>
      <ul>
        <li>Website: games stay in your browser until you tap <strong>Share live</strong>, which stores them on our servers.</li>
        <li>Apps: games are stored on your device and on our servers so they can be shared and followed on other devices.</li>
        <li>AI assistants: games created through the connector are stored on our servers, together with the assistant’s client name (for example “claude-ai”).</li>
      </ul>
      <p>
        Please use first names or nicknames for players. Anyone with a game’s code or link can see its player names and scores;
        only people with the organizer link can change them.
      </p>

      <h3>Sign-in (website only, optional)</h3>
      <p>
        If you sign in with Google on the website, we receive your name, email address and profile photo through Firebase
        Authentication (Google) and use them only to show your profile and keep your games together. The apps have no accounts.
      </p>

      <h3>Usage analytics</h3>
      <p>
        The apps use Google Analytics for Firebase to understand which features are used and to find problems. It collects an
        app-instance identifier, device model, operating system and app version, approximate location (country or region,
        derived from the IP address) and in-app events such as “game created”. Events never contain player names or scores. We
        don’t collect advertising identifiers (IDFA or Android advertising ID) and don’t use analytics data for advertising.
        The website records similar anonymous product events.
      </p>

      <h3>Camera and photos</h3>
      <p>
        If you scan a QR code or a game code, the camera image or the photo you pick is processed on your device only to read
        the code. It is never uploaded or stored.
      </p>

      <h3>Notifications, widgets and Live Activities</h3>
      <p>These are created on your device from your game data. We don’t use push notifications or store push tokens.</p>

      <h3>Technical data</h3>
      <p>
        Our hosting provider processes IP addresses and request metadata to deliver the service and protect it from abuse. We
        don’t store IP addresses with your games.
      </p>

      <h2 id="legal-basis">Legal basis</h2>
      <p>
        We process game and sign-in data to provide the service you ask for (performance of a contract) and analytics and
        technical data based on our legitimate interest in running, securing and improving the service. Where the law requires
        consent, we ask for it.
      </p>

      <h2 id="sharing">Who we share data with</h2>
      <p>We don’t sell or rent personal data. We use these service providers, who process data on our behalf:</p>
      <ul>
        <li>Cloudflare: hosting, game storage and delivery.</li>
        <li>Google (Firebase): website sign-in and app analytics.</li>
      </ul>
      <p>
        They may process data outside your country; transfers are covered by the providers’ Standard Contractual Clauses. We may
        disclose data if required by law.
      </p>

      <h2 id="retention">How long we keep data</h2>
      <ul>
        <li>Games on our servers are deleted automatically 90 days after their last change.</li>
        <li>Games on your device stay until you remove them or uninstall the app or clear your browser data.</li>
        <li>Sign-in data is kept until you ask us to delete it.</li>
        <li>Analytics data is kept for at most 14 months.</li>
      </ul>

      <h2 id="delete-data">Deleting your data</h2>
      <ul>
        <li>iPhone and iPad: touch and hold a game on the home screen and choose <strong>Remove from this phone</strong>.</li>
        <li>Android: clear the app’s storage in system settings, or uninstall the app.</li>
        <li>Website: clear this site’s data in your browser.</li>
        <li>
          Games stored on our servers, and website sign-in accounts: email <Mail subject="Delete my data" /> with the game codes
          or the email address you signed in with. We delete the data within 30 days. Otherwise games are deleted automatically
          after 90 days without changes.
        </li>
      </ul>

      <h2 id="rights">Your rights</h2>
      <p>
        Depending on where you live, you can ask to access, correct, delete or export your personal data, and object to or
        restrict its processing. Email <Mail subject="Privacy request" />. You can also complain to your local data protection
        authority.
      </p>

      <h2 id="children">Children</h2>
      <p>
        The service is not directed at children under 13 and we don’t knowingly collect their personal data. Organizers who
        add children to a game should use first names or nicknames only.
      </p>

      <h2 id="security">Security</h2>
      <p>
        All traffic is encrypted (HTTPS). Editing a game requires its organizer key. Game pages are not indexed by search
        engines because they contain people’s names.
      </p>

      <h2 id="changes">Changes</h2>
      <p>
        We’ll update this page when our practices change and adjust the date above. See also our{" "}
        <Link href="/terms">Terms of Use</Link> and <Link href="/support">Support</Link>.
      </p>
    </LegalPage>
  );
}
