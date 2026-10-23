import Link from "next/link";
import { PageIntro } from "@/components/ui";
export const metadata = { title: "How the Exchange works" };
export default function Process() {
  return (
    <div className="wrap section">
      <PageIntro
        eyebrow="From listing to closing"
        title="Every step has a purpose."
      >
        A managed process for owners and buyers, with Tafari coordinating the
        work between them.
      </PageIntro>
      <div className="resource-links">
        <Link href="/guides/asset-owners">Guide for asset owners →</Link>
        <Link href="/guides/buyers">Guide for buyers →</Link>
        <Link href="/faq">Questions & answers →</Link>
      </div>
      <div className="steps-grid">
        {[
          [
            "01",
            "Tell us about your asset",
            "Start a private conversation with Tafari. Share your contact details and answer one simple question at a time. No account is needed to begin.",
          ],
          [
            "02",
            "Prepare your listing",
            "Tafari follows up on your application. With a verified account, turn it into a private draft, upload title/right evidence and a mandate, then request review.",
          ],
          [
            "03",
            "Tafari reviews",
            "The deal desk reviews your submission and may request changes. Approved listings appear on the Exchange.",
          ],
          [
            "04",
            "Receive an offer",
            "Buyers submit an amount, their interest and proposed terms. Owners review and respond in the deal room.",
          ],
          [
            "05",
            "Open due diligence",
            "An accepted offer reserves the asset. Confidential documents are shared only with explicit permission after agreements are in place.",
          ],
          [
            "06",
            "Close with Tafari",
            "The back office tracks diligence, agreements, regulatory approvals and closing. A sale is marked complete only by Tafari.",
          ],
        ].map(([n, t, b]) => (
          <article className="panel" key={n}>
            <p className="eyebrow">STEP {n}</p>
            <h3>{t}</h3>
            <p>{b}</p>
          </article>
        ))}
      </div>
      <div className="notice">
        An accepted offer starts the managed transaction process. Ownership
        transfers and final payment take place under the agreed legal documents
        and required approvals.
      </div>
      <Link className="btn dark" href="/submit-asset">
        Tell us about your asset →
      </Link>
    </div>
  );
}
