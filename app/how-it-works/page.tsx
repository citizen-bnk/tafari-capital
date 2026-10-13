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
      <div className="steps-grid">
        {[
          [
            "01",
            "Create your account",
            "Register and verify your email. Tell us whether you are an owner, buyer or service partner.",
          ],
          [
            "02",
            "Submit an asset",
            "Create a draft listing, upload title/right evidence and a signed mandate, then submit it to Tafari.",
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
      <Link className="btn dark" href="/auth/sign-up">
        Create your account →
      </Link>
    </div>
  );
}
