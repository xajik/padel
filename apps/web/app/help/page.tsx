import { permanentRedirect } from "next/navigation";

/** /help is what people (and store reviewers) guess; the content lives on /support. */
export default function HelpPage() {
  permanentRedirect("/support");
}
