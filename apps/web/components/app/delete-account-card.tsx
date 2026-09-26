"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isFirebaseConfigured } from "@/lib/config";
import { useAuth } from "./auth-provider";

/** Self-service account deletion for Google sign-in on the website (/me and /delete-account). */
export function DeleteAccountCard({ showWhenSignedOut = false }: { showWhenSignedOut?: boolean }) {
  const { user, ready, deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [removeDeviceGames, setRemoveDeviceGames] = useState(true);
  const [busy, setBusy] = useState(false);
  const signedIn = user?.isAnonymous === false;

  if (!signedIn) {
    if (!showWhenSignedOut || !ready) return null;
    return (
      <div className="space-y-2 rounded-2xl border p-5">
        <p className="font-medium">You’re not signed in on this browser</p>
        <p className="text-sm text-muted-foreground">
          {isFirebaseConfigured
            ? "To delete your account here, sign in with the same Google account first (menu at the top right), then come back to this page. Or email us using the steps below."
            : "Accounts are not available on this site right now. Email us using the steps below."}{" "}
          The apps don’t use accounts: see <Link href="#app" className="underline underline-offset-4">Deleting app data</Link>.
        </p>
      </div>
    );
  }

  const confirm = async () => {
    setBusy(true);
    const deleted = await deleteAccount({ removeDeviceGames });
    setBusy(false);
    if (!deleted) return;
    setOpen(false);
    toast.success("Your account was deleted", {
      description: removeDeviceGames ? "Your games on this device were removed too." : "Your games stay on this device.",
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="font-medium">Delete account</p>
        <p className="text-sm text-muted-foreground">
          Permanently delete the account {user.displayName ? `of ${user.displayName} ` : ""}and its sign-in data.
        </p>
      </div>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="h-11">
            Delete account
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Your Google sign-in, name, email address and profile photo are deleted right away. This can’t be undone. You may
              be asked to confirm with Google.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <Label htmlFor="remove-device-games" className="text-sm font-normal">
              Also remove my games saved in this browser
            </Label>
            <Switch id="remove-device-games" checked={removeDeviceGames} onCheckedChange={setRemoveDeviceGames} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="h-11" disabled={busy}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" className="h-11" disabled={busy} onClick={() => void confirm()}>
              {busy ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
