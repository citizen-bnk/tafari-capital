import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { enquiryHref } from "@/lib/site-content";
export const metadata = {
  title: "Work with Tafari",
  description:
    "Distribution, equipment, processing and logistics partnership enquiries.",
};
export default function Partners() {
  return (
    <div className="wrap section">
      <PageIntro
        eyebrow="Delivery partnerships"
        title="Bring your capability to the opportunity."
      >
        For manufacturers, operators and service providers who want to work with
        Tafari.
      </PageIntro>
      <div className="steps-grid">
        {[
          [
            "Brands & manufacturers",
            "Discuss Lesotho distribution with a product catalogue, pack sizes, intended volumes, target customer and supply locations.",
            "Brand distribution",
          ],
          [
            "Equipment & processing",
            "Describe your equipment or processing capability, service areas, available capacity and the project requirements you can support.",
            "Operations, processing & export",
          ],
          [
            "Logistics & clearing",
            "Share your routes, transport modes, handling capacity, relevant qualifications and border or port services.",
            "Delivery partnership",
          ],
        ].map(([title, copy, topic]) => (
          <article className="panel" key={title}>
            <h2>{title}</h2>
            <p>{copy}</p>
            <Link className="text-link" href={enquiryHref(topic)}>
              Discuss this partnership →
            </Link>
          </article>
        ))}
      </div>
      <section className="prose content-section">
        <h2>Start with a capability brief</h2>
        <p>
          Tell us who you represent, where you operate and the service you
          provide. Tafari will discuss fit, supporting evidence and the proposed
          scope before any appointment. Avoid sending confidential client
          information in an initial enquiry.
        </p>
        <h3>Agree the work before it begins</h3>
        <p>
          Each project needs clear responsibilities, confirmed capacity,
          commercial terms and any required approvals. A partnership enquiry is
          an introduction, not an appointment or an exclusive mandate.
        </p>
      </section>
      <div className="resource-links">
        <Link href="/services/operations-processing-export">
          Operations & export services →
        </Link>
        <Link href="/services/distribution">Distribution services →</Link>
      </div>
    </div>
  );
}
