"use client";

import Link from "next/link";
import { History, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "./auth-provider";
import { GoogleMark } from "./google-mark";

export function UserMenu() {
  const { user, signInWithGoogle } = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LogIn className="size-4" />
          <span className="hidden sm:inline">{user?.isAnonymous === false ? user.displayName : "Sign in"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          Playing as a guest. Games are saved on this device.
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signInWithGoogle()} className="gap-2">
          <GoogleMark className="size-4" />
          Continue with Google
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2">
          <Link href="/me">
            <History className="size-4" />
            My games
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
