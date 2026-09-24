"use client";

import Link from "next/link";
import { History, LogIn, LogOut } from "lucide-react";
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
  const { user, signInWithGoogle, signOut } = useAuth();
  const signedIn = user?.isAnonymous === false;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label="Account and sign in">
          <LogIn className="size-4" />
          <span className="hidden sm:inline">{signedIn ? (user.displayName ?? "Account") : "Sign in"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          {signedIn ? `Signed in as ${user.displayName ?? "Google user"}.` : "Playing as a guest. Games are saved on this device."}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!signedIn && (
          <DropdownMenuItem onSelect={() => void signInWithGoogle()} className="gap-2">
            <GoogleMark className="size-4" />
            Continue with Google
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="gap-2">
          <Link href="/me">
            <History className="size-4" />
            My games
          </Link>
        </DropdownMenuItem>
        {signedIn && (
          <DropdownMenuItem onSelect={() => void signOut()} className="gap-2">
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
