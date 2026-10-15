import Link from "next/link";
import { PageIntro } from "@/components/ui";
export const metadata = { title: "Our services" };
const services = [
  [
    "00",
    "FMCG & distribution",
    "Food staples and consumer goods across Lesotho.",
    [
      "Sourcing, import permits and border clearance",
      "Maseru warehousing and stock rotation",
      "Retailer, wholesaler and institutional delivery routes",
      "Lesotho market entry for brands and manufacturers",
    ],
  ],
  [
    "01",
    "Mining asset facilitation",
    "From first mandate to the right introduction.",
    [
      "Full asset sale, partial stake and joint ventures",
      "Owner mandate and title checks",
      "Buyer-ready profiles and managed data rooms",
      "Commercial terms and deal coordination",
    ],
  ],
  [
    "02",
    "Tafari Minerals Exchange",
    "A workspace for owners, buyers and the Tafari deal desk.",
    [
      "Owner listings with private supporting files",
      "Review before marketplace publication",
      "Buyer offers and a private conversation record",
      "Tafari-managed due diligence and closing",
    ],
  ],
  [
    "03",
    "Operations, processing & export",
    "Make the transaction work beyond the signature.",
    [
      "Equipment supply and hire",
      "Contract mining and processing partners",
      "Road, rail, ports and border coordination",
      "Clearing agents and shipping introductions",
    ],
  ],
  [
    "04",
    "Trade & deal structuring",
    "Practical routes into cross-border markets.",
    [
      "Commodity and consumer goods distribution",
      "Market entry and rollout in Lesotho",
      "MOUs, NCNDAs and joint venture coordination",
      "Financial modelling and funding introductions",
    ],
  ],
];
export default function Services() {
  return (
    <div className="wrap section">
      <PageIntro eyebrow="What we do" title="Trade and mining. One standard.">
        Careful verification, clear agreements and a team that stays with the
        deal.
      </PageIntro>
      <div className="services-list">
        {services.map(([n, title, lede, items]) => (
          <article className="service-row" key={String(n)}>
            <span className="big-number">{n}</span>
            <div>
              <h2>{title}</h2>
              <p className="lede">{lede}</p>
            </div>
            <ul>
              {(items as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <Link className="btn dark" href="/contact">
        Discuss your opportunity →
      </Link>
    </div>
  );
}
