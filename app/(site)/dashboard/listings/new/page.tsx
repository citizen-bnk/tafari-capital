import { PageIntro } from "@/components/ui";
import { ListingForm } from "@/components/listing-form";
import Link from "next/link";
export default function New() {
  return (
    <>
      <PageIntro eyebrow="Owner workspace" title="Bring your asset to market.">
        Create a draft first. You can then upload your supporting documents and
        submit it for Tafari review.
      </PageIntro>
      <p>
        <Link className="text-link" href="/submit-asset">
          Prefer one question at a time? Start a guided asset conversation →
        </Link>
      </p>
      <ListingForm />
    </>
  );
}
