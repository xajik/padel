import type { Metadata } from "next";
import { ConnectAssistant } from "@/components/app/connect-assistant";

export const metadata: Metadata = { title: "Connect your AI assistant", robots: { index: false } };

type Props = { searchParams: Promise<{ state?: string }> };

/** OAuth consent for the signed-in MCP endpoint (/mcp/account): /oauth/authorize sends the browser here. */
export default async function ConnectPage({ searchParams }: Props) {
  const { state } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-12">
      <ConnectAssistant state={state ?? ""} />
    </div>
  );
}
