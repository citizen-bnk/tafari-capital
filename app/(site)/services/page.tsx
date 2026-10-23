import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageIntro } from "@/components/ui";
import { services } from "@/lib/site-content";
export const metadata = {
  title: "Our services",
  description:
    "Explore Tafari’s distribution, mining asset, Exchange, operations and trade services.",
};
export default function Services() {
  return (
    <div className="wrap section">
      <PageIntro eyebrow="What we do" title="Trade and mining. One standard.">
        Choose a service to see how it works, what to prepare and how to begin.
      </PageIntro>
      <div className="services-list">
        {services.map((service, index) => (
          <article className="service-row" key={service.slug}>
            <span className="big-number">0{index + 1}</span>
            <div>
              <h2>
                <Link href={`/services/${service.slug}`}>{service.title}</Link>
              </h2>
              <p className="lede">{service.summary}</p>
              <Link className="text-link" href={`/services/${service.slug}`}>
                Explore {service.title} <ArrowUpRight size={18} />
              </Link>
            </div>
            <ul>
              {service.scope.map((item) => (
                <li key={item}>{item}</li>
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
