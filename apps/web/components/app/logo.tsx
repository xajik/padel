import Link from "next/link";
import { Icon } from "@/components/icons/icon";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Icon name="logo" size={24} />
      </span>
      <span className="text-[15px]">
        Padel<span className="text-muted-foreground"> Americano</span>
      </span>
    </Link>
  );
}
