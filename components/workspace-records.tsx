"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useResource } from "@/lib/client";
import { recordStatus, recordStatuses } from "@/lib/navigation";
import { Listing, Offer, date, label, price } from "@/lib/types";
import { Badge, Empty, ErrorBox, Loading, PageIntro } from "@/components/ui";
export function WorkspaceRecords({ view }: { view: "listings" | "offers" }) {
  const params = useSearchParams(),
    router = useRouter(),
    status = recordStatus(view, params.get("status")),
    query = (params.get("q") || "").slice(0, 120),
    page = Math.max(
      0,
      Math.min(Math.floor(Number(params.get("page"))) || 0, 100000),
    ),
    base = "/dashboard/" + view;
  const { data, error, loading } = useResource<{
    listings?: Listing[];
    offers?: Offer[];
    total: number;
  }>(
    `records/${view}?status=${status}&q=${encodeURIComponent(query)}&page=${page}`,
  );
  function href(nextPage = 0, nextStatus = status, nextQuery = query) {
    const q = new URLSearchParams();
    if (nextStatus) q.set("status", nextStatus);
    if (nextQuery) q.set("q", nextQuery);
    if (nextPage) q.set("page", String(nextPage));
    return base + (q.size ? "?" + q.toString() : "");
  }
  const title =
    view === "listings"
      ? status === "submitted"
        ? "Assets awaiting review"
        : "Your assets"
      : status === "accepted"
        ? "Active transactions"
        : status === "pending"
          ? "Open offers"
          : "Offers & deal rooms";
  return (
    <>
      <PageIntro
        eyebrow="Your workspace · Records"
        title={title}
        action={
          <Link className="btn outline" href="/dashboard">
            ← Overview
          </Link>
        }
      >
        {view === "listings"
          ? "Inspect your assets, evidence and publication status."
          : "Open the deal room to view terms, messages, shared documents and closing progress."}
      </PageIntro>
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          router.push(
            href(0, String(f.get("status") || ""), String(f.get("q") || "")),
          );
        }}
      >
        <label>
          Search records
          <input
            key={query}
            name="q"
            defaultValue={query}
            placeholder="Asset title"
            maxLength={120}
          />
        </label>
        <label>
          Status filter
          <select
            key={status}
            name="status"
            aria-label="Status filter"
            defaultValue={status}
          >
            <option value="">All statuses</option>
            {recordStatuses[view].map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn dark">Search</button>
        <Link className="text-link" href={base}>
          Show all →
        </Link>
      </form>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <p className="muted" role="status">
              {data.total} matching{" "}
              {view === "listings" ? "assets" : "offers / transactions"}
              {status ? ` · ${label(status)}` : ""}
            </p>
            {data.total ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Terms</th>
                      <th>Status{view === "offers" ? " / stage" : ""}</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view === "listings"
                      ? data.listings?.map((l) => (
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
                        ))
                      : data.offers?.map((o) => (
                          <tr key={o.id}>
                            <td>
                              <strong>{o.title}</strong>
                              <small>
                                {o.buyer_name} · {date(o.created_at)}
                              </small>
                            </td>
                            <td>{price(o.amount, o.currency)}</td>
                            <td>
                              <Badge value={o.status} />
                              <small>{o.stage}</small>
                            </td>
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
              <Empty title="No records match this view.">
                <Link className="text-link" href={base}>
                  View all your {view === "listings" ? "assets" : "offers"} →
                </Link>
              </Empty>
            )}
            <div className="actions" style={{ marginTop: 25 }}>
              {page > 0 && (
                <Link className="btn outline small" href={href(page - 1)}>
                  ← Previous
                </Link>
              )}
              <span className="muted">Page {page + 1} · Up to 30 records</span>
              {(page + 1) * 30 < data.total && (
                <Link className="btn outline small" href={href(page + 1)}>
                  Next →
                </Link>
              )}
            </div>
          </>
        )
      )}
    </>
  );
}
