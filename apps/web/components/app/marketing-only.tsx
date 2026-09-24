"use client";

import { usePathname } from "next/navigation";

/** Hides marketing chrome (footer) on focused app screens with a bottom action bar. */
export function MarketingOnly({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/new") || path.startsWith("/g/")) return null;
  return <>{children}</>;
}
