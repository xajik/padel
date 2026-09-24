"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import { isFirebaseConfigured } from "@/lib/config";

export function ShareDialog({
  open,
  onOpenChange,
  code,
  name,
  standingsText,
  live = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  code: string;
  name: string;
  standingsText: string;
  live?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    track("share_opened", { code_length: code.length });
    const u = `${window.location.origin}/g/${code}`;
    setUrl(u);
    void QRCode.toString(u, { type: "svg", margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" } }).then(setQr);
  }, [open, code]);

  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share game</DialogTitle>
          <DialogDescription>
            {isFirebaseConfigured || live
              ? "Anyone with the link can follow the scores live."
              : "Live sharing across phones switches on when cloud sync is connected. For now the game lives on this device."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div
            className="size-48 rounded-xl border bg-white p-2 [&>svg]:size-full"
            aria-label={`QR code for ${url}`}
            role="img"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Game code</p>
            <p className="font-mono text-3xl font-semibold tracking-[0.25em]">{code}</p>
          </div>
          <div className="flex w-full gap-2">
            <Input readOnly value={url} className="h-11 font-mono text-xs" aria-label="Game link" />
            <Button variant="outline" className="h-11 w-11 shrink-0" aria-label="Copy link" onClick={() => copy(url, "link")}>
              {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" onClick={() => copy(standingsText, "text")}>
              {copied === "text" ? "Copied" : "Copy standings"}
            </Button>
            <Button
              className="h-11 gap-2"
              onClick={() =>
                navigator.share
                  ? navigator.share({ title: name, text: `Follow “${name}” live`, url }).catch(() => {})
                  : copy(url, "link")
              }
            >
              <Share2 className="size-4" /> Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
