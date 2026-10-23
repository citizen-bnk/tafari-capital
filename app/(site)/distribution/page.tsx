import Link from "next/link";
import { enquiryHref } from "@/lib/site-content";
import { PageIntro } from "@/components/ui";
export const metadata = { title: "FMCG & distribution" };
const products = [
  ["Canned fish", "Shelf-stable retail packs in tomato and chilli sauces."],
  ["Rice", "Fragrant and long-grain rice in retail pouches and bulk bags."],
  ["Maize meal", "Household and bulk sizes for Lesotho’s daily staple."],
  ["Sorghum", "Sorghum meal and grain for households and traditional brewing."],
  [
    "Pantry staples",
    "Further dry and packaged goods as supplier agreements are signed.",
  ],
  [
    "Your product",
    "Manufacturers and brand owners: discuss distribution in Lesotho with Tafari.",
  ],
];
export default function Distribution() {
  return (
    <div className="wrap section">
      <PageIntro
        eyebrow="FMCG & distribution"
        title="From supplier to shelf in Lesotho."
        action={
          <Link className="btn dark" href={enquiryHref("FMCG & distribution")}>
            Discuss distribution ↗
          </Link>
        }
      >
        Food staples and consumer goods for retailers, wholesalers and
        institutions, with a local partner for brands entering Lesotho.
      </PageIntro>
      <div className="steps-grid">
        {products.map(([title, copy]) => (
          <article className="panel" key={title}>
            <p className="eyebrow">Product range</p>
            <h3>{title}</h3>
            <p>{copy}</p>
            <Link
              className="text-link"
              href={enquiryHref(
                title === "Your product" ? "Brand distribution" : title,
              )}
            >
              Enquire about{" "}
              {title === "Your product"
                ? "brand distribution"
                : title.toLowerCase()}{" "}
              →
            </Link>
          </article>
        ))}
      </div>
      <div className="section-heading" style={{ marginTop: 60 }}>
        <div>
          <p className="eyebrow">Route to market</p>
          <h2>
            Source. Clear.
            <br />
            Store. Deliver.
          </h2>
        </div>
        <p className="lede">
          Written supply terms and accountable distribution, from the border to
          the retailer.
        </p>
      </div>
      <div className="steps-grid">
        {[
          [
            "Source",
            "Supplier relationships in South Africa, Botswana and further afield.",
          ],
          [
            "Import & clear",
            "Import permits and border clearance through Maseru Bridge or Maputsoe Bridge.",
          ],
          [
            "Store & deliver",
            "Maseru warehousing, stock rotation, expiry tracking and set delivery routes, starting in Maseru, Berea and Leribe.",
          ],
        ].map(([title, copy]) => (
          <article className="panel" key={title}>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
      <div className="split" style={{ marginTop: 40 }}>
        <article className="panel">
          <h3>For brands & manufacturers</h3>
          <ul>
            <li>Local market entry and distribution</li>
            <li>Retail listings and in-store presence</li>
            <li>Sell-through reporting by outlet and product</li>
            <li>Agreed pricing and promotions</li>
          </ul>
        </article>
        <article className="panel">
          <h3>For retailers & wholesalers</h3>
          <ul>
            <li>Supply of fast-moving lines</li>
            <li>Regular deliveries on set routes</li>
            <li>Orders by phone or email</li>
            <li>Mixed loads across the range</li>
          </ul>
        </article>
      </div>
      <div className="resource-links">
        <Link href="/services/distribution">
          How our distribution service works →
        </Link>
        <Link href="/partners">For brands & delivery partners →</Link>
      </div>
      <div className="notice">
        Contact Tafari for current availability, supply terms and delivery
        arrangements.
      </div>
    </div>
  );
}
