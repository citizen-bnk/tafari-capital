import { PageIntro } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
import Link from "next/link";
import { enquiryTopics } from "@/lib/site-content";
export const metadata = { title: "Contact Tafari" };
export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const { topic: requestedTopic } = await searchParams;
  const topic =
    typeof requestedTopic === "string" && enquiryTopics.includes(requestedTopic)
      ? requestedTopic
      : "";
  return (
    <div className="wrap section">
      <PageIntro
        eyebrow="Start a conversation"
        title="A good deal begins with a clear brief."
      >
        Tell us what you hold or what you are looking for.
      </PageIntro>
      <div className="split contact-grid">
        <div className="prose">
          <h3>The Tafari deal desk</h3>
          <p>
            <a href="mailto:phafanep@gmail.com">phafanep@gmail.com</a>
            <br />
            <a href="tel:+27728151383">+27 72 815 1383</a>
          </p>
          <h3>Postal address</h3>
          <p>
            PO Box 7961
            <br />
            Khubetsoana, Maseru 100
            <br />
            Kingdom of Lesotho
          </p>
          <div className="notice">
            Already have an account?{" "}
            <Link href="/dashboard">Use your workspace</Link> to submit
            listings, manage offers and keep documents in one place.
          </div>
        </div>
        <ContactForm key={topic} topic={topic} />
      </div>
    </div>
  );
}
