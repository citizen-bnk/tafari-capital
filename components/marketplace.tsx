"use client";
import Link from "next/link";
import { useState } from "react";
import { useResource } from "@/lib/client";
import { Listing } from "@/lib/types";
import {
  PageIntro,
  ListingCard,
  ErrorBox,
  Empty,
  Loading,
} from "@/components/ui";
export function Marketplace() {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0);
  const { data, error, loading } = useResource<{
    listings: Listing[];
    total: number;
  }>("listings?" + query + "&page=" + page);
  return (
    <div className="wrap section">
      <PageIntro
        eyebrow="Tafari Minerals Exchange"
        title="Find your next opportunity."
        action={
          <Link className="btn dark" href="/dashboard/listings/new">
            List an asset ↗
          </Link>
        }
      >
        Mining assets and commodity opportunities, reviewed by the Tafari deal
        desk.
      </PageIntro>
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setPage(0);
          setQuery(
            String(
              new URLSearchParams({
                q: String(f.get("q")),
                country: String(f.get("country")),
                commodity: String(f.get("commodity")),
              }),
            ),
          );
        }}
      >
        <label>
          Search opportunities
          <input
            name="q"
            placeholder="Asset name or commodity"
            maxLength={120}
          />
        </label>
        <label>
          Jurisdiction
          <select name="country">
            <option value="">All countries</option>
            <option>Lesotho</option>
            <option>South Africa</option>
            <option>Other</option>
          </select>
        </label>
        <label>
          Commodity
          <select name="commodity">
            <option value="">All commodities</option>
            {["Coal", "Chrome", "Diamonds", "Gold", "Iron ore", "Other"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        </label>
        <button className="btn dark">Search</button>
      </form>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="list-header">
              <p>
                {data.total} published{" "}
                {data.total === 1 ? "opportunity" : "opportunities"}
              </p>
              <span className="badge">Tafari-reviewed submissions</span>
            </div>
            {data.listings.length ? (
              <div className="asset-grid">
                {data.listings.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            ) : (
              <Empty title="The next opportunity starts here.">
                <p>
                  No published assets match this search. Owners can submit an
                  asset for review; buyers can tell Tafari what they need.
                </p>
                <Link className="btn dark" href="/contact">
                  Speak to the deal desk →
                </Link>
              </Empty>
            )}
          </>
        )
      )}
      <div className="actions" style={{ marginTop: 25 }}>
        <button
          className="btn outline small"
          disabled={page === 0 || loading}
          onClick={() => setPage(page - 1)}
        >
          ← Previous
        </button>
        <span className="muted">Page {page + 1}</span>
        <button
          className="btn outline small"
          disabled={loading || !data || (page + 1) * 30 >= data.total}
          onClick={() => setPage(page + 1)}
        >
          Next →
        </button>
      </div>
      <div className="notice">
        Publication means the submission has passed Tafari’s platform review.
        Buyers must still carry out transaction-specific due diligence. Offers
        are managed by Tafari; the platform does not collect payments.
      </div>
    </div>
  );
}
