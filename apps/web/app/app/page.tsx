import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/app/json-ld";
import { Icon, type IconName } from "@/components/icons/icon";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Button } from "@/components/ui/button";
import { NATIVE_APP, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: `${NATIVE_APP.storeName}: the padel Americano app`,
  description: `${NATIVE_APP.name} for iPhone, iPad and Android: fair Americano and Mexicano rotations, scores on court, a live leaderboard, Lock Screen and widgets. Free, no account.`,
  alternates: { canonical: "/app" },
};

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "rotate", title: "Fair rotations", body: "Americano, Mexicano and 6 more formats. Everyone plays with and against as many people as possible." },
  { icon: "scoreboard", title: "Scores on court", body: "Big score pad, one tap per match. Keeps working offline and syncs when you’re back online." },
  { icon: "leaderboard", title: "Live leaderboard", body: "Standings update the moment a score is in, on every phone and on the web." },
  { icon: "share", title: "Join in seconds", body: "Scan the QR code, tap the link or type the 6-character code. No app needed to watch." },
  { icon: "timer", title: "Lock Screen and widgets", body: "Live Activity and Dynamic Island on iPhone, live notification on Android, home screen widgets on both." },
  { icon: "agent", title: "Works with AI assistants", body: "Ask Claude, ChatGPT or Meta Muse to set up the game and share the link." },
];

const SHOTS = [
  { src: "/app/01-game.jpg", alt: "A live Americano round with courts and scores" },
  { src: "/app/03-leaderboard.jpg", alt: "The live leaderboard" },
  { src: "/app/04-share-qr.jpg", alt: "Sharing a game with a QR code" },
];

export default function AppPage() {
  const stores = [
    NATIVE_APP.appStoreUrl && { href: NATIVE_APP.appStoreUrl, label: "Download on the App Store" },
    NATIVE_APP.playStoreUrl && { href: NATIVE_APP.playStoreUrl, label: "Get it on Google Play" },
  ].filter((s): s is { href: string; label: string } => !!s);

  return (
    <article className="mx-auto w-full max-w-5xl space-y-14 px-4 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MobileApplication",
          name: NATIVE_APP.storeName,
          operatingSystem: "iOS, Android",
          applicationCategory: "SportsApplication",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          url: absoluteUrl("/app"),
        }}
      />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "App", href: "/app" }]} />

      <header className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Icon name="logo" size={30} />
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{NATIVE_APP.name}</h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Run your padel Americano or Mexicano from your phone: fair rotations, scores on court and a live leaderboard everyone
            can follow. Free, no ads, no account.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {stores.length > 0 ? (
              stores.map((s) => (
                <Button key={s.href} asChild size="lg" className="h-12 text-base">
                  <a href={s.href}>{s.label}</a>
                </Button>
              ))
            ) : (
              <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">Coming soon to the App Store and Google Play.</p>
            )}
            <Button asChild size="lg" variant="outline" className="h-12 text-base">
              <Link href="/new">Try it on the web</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">iPhone and iPad (iOS 17+) · Android 8+</p>
        </div>
      </header>

      <section aria-label="Screenshots" className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {SHOTS.map((s) => (
          // Plain img: static files in /public, already sized for the web.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s.src}
            src={s.src}
            alt={s.alt}
            width={660}
            height={1434}
            loading="lazy"
            className="w-60 shrink-0 snap-center rounded-3xl border md:w-full"
          />
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="space-y-2 rounded-2xl border p-5">
            <Icon name={f.icon} size={24} />
            <h2 className="font-semibold">{f.title}</h2>
            <p className="text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <p className="text-sm text-muted-foreground">
        <Link href="/support" className="underline underline-offset-4">Help & Support</Link> ·{" "}
        <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link> ·{" "}
        <Link href="/terms" className="underline underline-offset-4">Terms of Use</Link>
      </p>
    </article>
  );
}
