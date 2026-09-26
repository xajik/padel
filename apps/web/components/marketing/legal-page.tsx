import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { LEGAL } from "@/lib/site";

/** Long-form text page (privacy, terms, support): one column, readable measure, styled headings and lists. */
export function LegalPage({
  title,
  href,
  intro,
  updated = true,
  children,
}: {
  title: string;
  href: string;
  intro?: React.ReactNode;
  updated?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10 leading-relaxed">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: title, href }]} />
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {updated && <p className="text-sm text-muted-foreground">Last updated {LEGAL.updated}</p>}
        {intro && <div className="text-lg text-pretty">{intro}</div>}
      </header>
      <div className="space-y-4 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:scroll-mt-20 [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:pt-2 [&_h3]:font-semibold [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}

export function Mail({ subject }: { subject?: string }) {
  const href = `mailto:${LEGAL.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  return <a href={href} className="underline underline-offset-4">{LEGAL.email}</a>;
}
