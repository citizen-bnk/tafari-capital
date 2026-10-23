import Link from "next/link";
import { PageIntro } from "@/components/ui";
export const metadata = {
  title: "Frequently asked questions",
  description:
    "Answers about asset applications, listings, offers, private documents and distribution enquiries.",
};
const questions = [
  [
    "Do I need an account to submit an asset?",
    "You can start the guided application without an account. After consenting to progress capture, provide your contact details and describe the opportunity. A verified account is needed to prepare a private listing and use the deal workspace.",
  ],
  [
    "Can I correct an application?",
    "Yes. Use Back to revisit earlier questions. After consent, partial answers and the step you reach are saved for follow-up. Changes to relevant answers can change the later questions you see.",
  ],
  [
    "Does submitting an asset make it public?",
    "No. Applications and draft listings are private. Tafari reviews a submitted listing before it appears on the Exchange.",
  ],
  [
    "Can anyone download my documents?",
    "Private documents require authorised access. Buyers do not gain access simply by registering or submitting an offer. Authorised users can view supported documents and photos inside the application and download them.",
  ],
  [
    "What does an accepted offer mean?",
    "It starts the Tafari-managed transaction process and reserves the asset. Diligence, agreements and required approvals still need to be completed. Ownership transfer and final payment follow the transaction documents.",
  ],
  [
    "Can I pay for an asset on the website?",
    "No. The Exchange records offers and supports managed closing. It does not collect purchase payments online.",
  ],
  [
    "Are fees and timescales fixed?",
    "Scope, fees, responsibilities and timing are discussed for the opportunity. Ask the deal desk for the applicable terms before proceeding. A listing or introduction does not guarantee a sale, finance or a closing date.",
  ],
  [
    "How do I order products or discuss distribution?",
    "Send an enquiry stating the product, pack sizes, estimated volumes, delivery location and timing. Tafari confirms current availability, supply terms and delivery arrangements before an order proceeds.",
  ],
  [
    "How can an equipment or logistics provider work with Tafari?",
    "Use the partnerships enquiry to describe your services, operating locations, capacity and relevant qualifications. Any introduction or appointment follows project-specific assessment and agreement.",
  ],
];
export default function FAQ() {
  return (
    <div className="wrap section">
      <PageIntro
        eyebrow="Help & guidance"
        title="Questions before your next step?"
      >
        Practical answers for owners, buyers and trade partners.
      </PageIntro>
      <div className="faq-list">
        {questions.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
      <div className="resource-links">
        <Link href="/guides/asset-owners">Owner guide →</Link>
        <Link href="/guides/buyers">Buyer guide →</Link>
        <Link href="/partners">Partnerships →</Link>
        <Link href="/contact">Ask the deal desk →</Link>
      </div>
    </div>
  );
}
