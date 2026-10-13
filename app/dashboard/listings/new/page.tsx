import { PageIntro } from "@/components/ui";
import { ListingForm } from "@/components/listing-form";
export default function New() {
  return (
    <>
      <PageIntro eyebrow="Owner workspace" title="Bring your asset to market.">
        Create a draft first. You can then upload your supporting documents and
        submit it for Tafari review.
      </PageIntro>
      <ListingForm />
    </>
  );
}
