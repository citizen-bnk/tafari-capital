import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/ui";
import { guides } from "@/lib/site-content";
export const dynamicParams = false;
export function generateStaticParams() {
  return guides.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = guides.find((item) => item.slug === slug);
  return { title: guide?.title, description: guide?.summary };
}
export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = guides.find((item) => item.slug === slug);
  if (!guide) notFound();
  return (
    <div className="wrap section">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/how-it-works">How it works</Link>
      </nav>
      <PageIntro eyebrow="Your next steps" title={guide.title}>
        {guide.summary}
      </PageIntro>
      <div className="guide-steps">
        {guide.steps.map(([title, copy], index) => (
          <article className="panel" key={title}>
            <p className="eyebrow">Step 0{index + 1}</p>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </div>
      <div className="notice">{guide.note}</div>
      <div className="actions">
        <Link className="btn dark" href={guide.href}>
          {guide.action} →
        </Link>
        <Link className="text-link" href="/faq">
          Questions & answers →
        </Link>
        <Link className="text-link" href="/privacy">
          Privacy notice →
        </Link>
      </div>
    </div>
  );
}
