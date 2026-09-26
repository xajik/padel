import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/app/json-ld";
import { LegalPage, Mail } from "@/components/marketing/legal-page";
import { LEGAL, NATIVE_APP, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Help & Support",
  description: `Help for ${SITE.name} and the ${NATIVE_APP.name} apps: creating and joining games, scoring, sharing, widgets and contact.`,
  alternates: { canonical: "/support" },
};

const FAQ: { id: string; q: string; a: React.ReactNode; text: string }[] = [
  {
    id: "create",
    q: "How do I start a game?",
    text: "Tap New game, choose a format (Americano, Mexicano and more), enter the players, courts and points per match, then start. The schedule is generated so everyone plays with and against as many different people as possible.",
    a: (
      <>
        Tap <strong>New game</strong>, choose a format (Americano, Mexicano and more), enter the players, courts and points per
        match, then start. The schedule is generated so everyone plays with and against as many different people as possible.
        Not sure which format? See the <Link href="/modes">format guides</Link>.
      </>
    ),
  },
  {
    id: "join",
    q: "How do other players follow the game?",
    text: "Open the share menu in a game to show its QR code, 6-character code or link. Others scan the QR code, tap the link, or enter the code under Join with a code. The app can also read a code from a photo or screenshot.",
    a: (
      <>
        Open the share menu in a game to show its QR code, 6-character code or link. Others scan the QR code, tap the link, or
        enter the code under <strong>Join with a code</strong>. The app can also read a QR code or game code from a photo or
        screenshot. People without the app see the game on the website.
      </>
    ),
  },
  {
    id: "edit",
    q: "Who can enter scores?",
    text: "The organizer, and anyone they send the organizer link to. Everyone else can watch the schedule and leaderboard live but can't change scores.",
    a: "The organizer, and anyone they send the organizer link to. Everyone else can watch the schedule and leaderboard live but can’t change scores.",
  },
  {
    id: "offline",
    q: "Does it work without internet?",
    text: "Yes. In the apps you can keep scoring offline; changes sync automatically when you're back online. A game created offline gets its shareable code once it syncs.",
    a: "Yes. In the apps you can keep scoring offline; changes sync automatically when you’re back online. A game created offline gets its shareable code once it syncs.",
  },
  {
    id: "lock-screen",
    q: "Can I follow the game from the Lock Screen or home screen?",
    text: "Yes. On iPhone, open the game menu and choose Follow on Lock Screen for a Live Activity, and add the Americanoo widget. On Android, choose Follow in notifications and add the home screen widget.",
    a: (
      <>
        Yes. On iPhone, open the game menu and choose <strong>Follow on Lock Screen</strong> for a Live Activity (also in the
        Dynamic Island), and add the {NATIVE_APP.name} widget. On Android, choose <strong>Follow in notifications</strong> and
        add the home screen widget.
      </>
    ),
  },
  {
    id: "ai",
    q: "Can my AI assistant run the game?",
    text: "Yes. Connect Claude, ChatGPT, Meta Muse or any MCP client and ask it to set up a game; it returns a share link and an organizer link.",
    a: (
      <>
        Yes. Connect Claude, ChatGPT, Meta Muse or any MCP client and ask it to set up a game; it returns a share link and an
        organizer link. See <Link href="/docs/mcp">Connect your AI assistant</Link>.
      </>
    ),
  },
  {
    id: "delete",
    q: "How do I delete a game or my data?",
    text: "On iPhone, touch and hold a game on the home screen and choose Remove from this phone. On Android, clear the app's storage or uninstall it. Games on our servers are deleted automatically 90 days after their last change, or on request by email.",
    a: (
      <>
        On iPhone, touch and hold a game on the home screen and choose <strong>Remove from this phone</strong>. On Android, clear
        the app’s storage or uninstall it. Games on our servers are deleted automatically 90 days after their last change, or
        sooner on request: see <Link href="/privacy#delete-data">Deleting your data</Link>.
      </>
    ),
  },
  {
    id: "cost",
    q: "Is it free? Do I need an account?",
    text: "It's free, has no ads and needs no account.",
    a: "It’s free, has no ads and needs no account.",
  },
];

export default function SupportPage() {
  return (
    <LegalPage
      title="Help & Support"
      href="/support"
      updated={false}
      intro={
        <p>
          Answers to common questions about {SITE.name} and the {NATIVE_APP.name} apps for iPhone, iPad and Android. Can’t find
          what you need? Email <Mail subject={`${NATIVE_APP.name} support`} />; we usually reply within two business days.
        </p>
      }
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.text } })),
        }}
      />
      {FAQ.map((f) => (
        <section key={f.id} className="space-y-2">
          <h2 id={f.id}>{f.q}</h2>
          <p>{f.a}</p>
        </section>
      ))}

      <h2 id="contact">Contact us</h2>
      <p>
        Email <Mail subject={`${NATIVE_APP.name} support`} /> for help, bug reports and feature ideas. Please include your device,
        the app version (in your phone’s settings) and, if it’s about a game, its 6-character code. {LEGAL.publisher} handles
        privacy requests at the same address.
      </p>
      <p>
        <Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Use</Link> · <Link href="/app">Get the app</Link>
      </p>
    </LegalPage>
  );
}
