"use client";
import Link from "next/link";
import { useResource } from "@/lib/client";
import { User, Listing, Offer, price, date } from "@/lib/types";
import { PageIntro, Badge, Loading, ErrorBox, Empty } from "@/components/ui";
export function Dashboard() {
  const { data, error, loading } = useResource<{
    actor: User;
    listings: Listing[];
    offers: Offer[];
  }>("dashboard");
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error} />;
  return (
    <>
      <PageIntro
        eyebrow="Your workspace"
        title={`Welcome, ${data.actor.name.split(" ")[0]}.`}
        action={
          <Link className="btn dark" href="/dashboard/listings/new">
            List an asset ↗
          </Link>
        }
      >
        Your assets, offers and conversations with the Tafari deal desk.
      </PageIntro>
      {!data.actor.verified && (
        <div className="notice">
          Verify your email to list assets, submit offers and upload documents.{" "}
          <Link
            href={
              "/auth/verify-email?email=" + encodeURIComponent(data.actor.email)
            }
            className="table-link"
          >
            Verify now →
          </Link>
        </div>
      )}
      <div className="stats">
        <div className="stat">
          <b>{data.listings.length}</b>
          <span>Your listings</span>
        </div>
        <div className="stat">
          <b>{data.listings.filter((x) => x.status === "submitted").length}</b>
          <span>Awaiting review</span>
        </div>
        <div className="stat">
          <b>{data.offers.filter((x) => x.status === "pending").length}</b>
          <span>Open offers</span>
        </div>
        <div className="stat">
          <b>{data.offers.filter((x) => x.status === "accepted").length}</b>
          <span>Active transactions</span>
        </div>
      </div>
      <div className="heading-row">
        <h2>Your assets</h2>
        <Link className="text-link" href="/exchange">
          Browse the Exchange ↗
        </Link>
      </div>
      {data.listings.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Terms</th>
                <th>Status</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {data.listings.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.title}</strong>
                    <small>
                      {l.commodity} · {l.country}
                    </small>
                  </td>
                  <td>
                    {price(l.asking_price, l.currency)}
                    <small>{l.transaction_type}</small>
                  </td>
                  <td>
                    <Badge value={l.status} />
                  </td>
                  <td>
                    <Link
                      className="table-link"
                      href={"/dashboard/listings/" + l.id}
                    >
                      Open listing →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Ready to bring an asset to market?">
          <p>
            Create a draft, upload your evidence and send it to Tafari for
            review.
          </p>
          <Link className="btn dark" href="/dashboard/listings/new">
            Create your first listing →
          </Link>
        </Empty>
      )}
      <div className="compact-heading">
        <h2>Offers & deal rooms</h2>
      </div>
      {data.offers.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Asset / buyer</th>
                <th>Offer</th>
                <th>Stage</th>
                <th>Deal room</th>
              </tr>
            </thead>
            <tbody>
              {data.offers.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.title}</strong>
                    <small>
                      {o.buyer_id === data.actor.id
                        ? "Your offer"
                        : o.buyer_name}{" "}
                      · {date(o.created_at)}
                    </small>
                  </td>
                  <td>
                    {price(o.amount, o.currency)}
                    <small>
                      <Badge value={o.status} />
                    </small>
                  </td>
                  <td>{o.stage}</td>
                  <td>
                    <Link
                      className="table-link"
                      href={"/dashboard/deals/" + o.id}
                    >
                      Open deal room →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Your next deal will appear here.">
          <p>
            Offers you make and offers on your assets will be kept in this
            workspace.
          </p>
        </Empty>
      )}
      {["staff", "super_admin"].includes(data.actor.role) && (
        <div className="notice">
          You have Tafari staff access.{" "}
          <Link className="table-link" href="/back-office">
            Open the back office →
          </Link>
        </div>
      )}
    </>
  );
}
