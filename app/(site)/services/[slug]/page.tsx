import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/ui";
import { services, enquiryHref } from "@/lib/site-content";
export const dynamicParams = false;
export function generateStaticParams() {
  return services.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);
  return { title: service?.title, description: service?.summary };
}
export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);
  if (!service) notFound();
  return (
    <div className="wrap section service-detail">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/services">All services</Link>
        <span aria-hidden="true"> / </span>
        <span>{service.title}</span>
      </nav>
      <PageIntro
        eyebrow="How we can help"
        title={service.title}
        action={
          <Link className="btn dark" href={service.href}>
            {service.actionLabel} ↗
          </Link>
        }
      >
        {service.summary}
      </PageIntro>
      <div className="split">
        <div className="prose">
          <h2>A clear brief. A practical route.</h2>
          <p>{service.introduction}</p>
          <h3>Who it’s for</h3>
          <p>{service.audience}</p>
        </div>
        <article className="panel">
          <h2>What we help with</h2>
          <ul>
            {service.scope.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
      <section className="content-section" aria-labelledby="process">
        <p className="eyebrow">The process</p>
        <h2 id="process">How we work together</h2>
        <div className="steps-grid">
          {service.steps.map(([title, copy], index) => (
            <article className="panel" key={title}>
              <p className="eyebrow">0{index + 1}</p>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="split content-section">
        <article className="panel">
          <h2>What to prepare</h2>
          <ul>
            {service.prepare.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="muted">
            Start with a short brief. Share confidential supporting files
            through an authorised private workspace when requested.
          </p>
        </article>
        <div className="prose">
          <h2>What comes next</h2>
          <p>{service.outcome}</p>
          <Link className="btn dark" href={enquiryHref(service.title)}>
            {service.action} →
          </Link>
        </div>
      </section>
      <section className="content-section">
        <h2>Keep exploring</h2>
        <div className="resource-links">
          <Link href="/guides/asset-owners">Owner guide →</Link>
          <Link href="/guides/buyers">Buyer guide →</Link>
          <Link href="/faq">Frequently asked questions →</Link>
        </div>
        <nav className="service-directory" aria-label="Other services">
          {services
            .filter((item) => item.slug !== slug)
            .map((item) => (
              <Link href={`/services/${item.slug}`} key={item.slug}>
                {item.title} ↗
              </Link>
            ))}
        </nav>
      </section>
    </div>
  );
}
