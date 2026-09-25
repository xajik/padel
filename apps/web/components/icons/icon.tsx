import { ICONS, type IconName } from "@padel/design";
import type { ModeId } from "@padel/engine";
import { cn } from "@/lib/utils";

export type { IconName };

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  title?: string;
}

/** Custom padel icon set (packages/design/icons.ts), shared with the native apps as SVG files. */
export function Icon({ name, size = 24, strokeWidth = 1.75, title, className, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("shrink-0", className)}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : "") + ICONS[name] }}
      {...rest}
    />
  );
}

export const MODE_ICONS: Record<ModeId, IconName> = {
  americano: "rotate",
  "team-americano": "pair",
  mexicano: "ladder",
  "team-mexicano": "ladder",
  mixicano: "mixed",
  "beat-the-box": "box",
  "up-and-down": "updown",
  "team-up-and-down": "updown",
};
