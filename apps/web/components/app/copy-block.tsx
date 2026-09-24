"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Code/prompt block with a copy button. */
export function CopyBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border">
      <div className="flex items-center justify-between gap-2 border-b py-1.5 pr-1.5 pl-4">
        <p className="text-sm font-medium">{title}</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-sm leading-relaxed whitespace-pre-wrap">{text}</pre>
    </div>
  );
}
