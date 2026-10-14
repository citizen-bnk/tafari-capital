import Link from "next/link";
import { ArrowUpRight, FileText, MapPin, Pickaxe } from "lucide-react";
import { Listing, price, label, date } from "@/lib/types";
import { CompanyIdentity } from "@/components/company-identity";
export function StatLink({
  count,
  title,
  href,
}: {
  count: number | string;
  title: string;
  href: string;
}) {
  return (
    <Link
      className="stat stat-link"
      href={href}
      aria-label={`View ${title.toLowerCase()}: ${count}`}
    >
      <ArrowUpRight size={17} aria-hidden="true" />
      <b>{count}</b>
      <span>{title}</span>
    </Link>
  );
}
export function Badge({ value }: { value: string }) {
  return <span className={"badge " + value}>{label(value)}</span>;
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="notice error" role="alert">
      {message}
      {message.includes("sign in") && (
        <>
          {" "}
          <Link href="/auth/sign-in">Sign in</Link>
        </>
      )}
      {message.includes("Verify") && (
        <>
          {" "}
          <Link href="/auth/verify-email">Verify email</Link>
        </>
      )}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Loading…
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <FileText size={30} />
      <h3>{title}</h3>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="lede">{children}</p>}
      </div>
      {action}
    </div>
  );
}
export function ListingCard({ listing: l }: { listing: Listing }) {
  return (
    <Link className="asset-card" href={"/exchange/" + l.id}>
      <div className="asset-art">
        <Pickaxe size={48} strokeWidth={1} />
        <span>{l.commodity}</span>
        <Badge value={l.status} />
      </div>
      <div className="asset-body">
        <p className="eyebrow">{l.transaction_type}</p>
        <h3>{l.title}</h3>
        <CompanyIdentity id={l.demo_owner_id || l.owner_id} />
        <p className="muted location">
          <MapPin size={15} />
          {l.location}, {l.country}
        </p>
        <p className="card-description">{l.description}</p>
        <div className="card-bottom">
          <strong>{price(l.asking_price, l.currency)}</strong>
          <ArrowUpRight size={20} />
        </div>
        <small className="muted">Listed {date(l.created_at)}</small>
      </div>
    </Link>
  );
}
