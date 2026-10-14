"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useResource } from "@/lib/client";
import { useAppSession } from "@/components/app-session";
import { Listing, price } from "@/lib/types";
import { PageIntro, Badge, ErrorBox, Loading } from "@/components/ui";
import { CompanyIdentity } from "@/components/company-identity";
export function AssetDetail({ id }: { id: string }) {
  const { data, error, loading } = useResource<{ listing: Listing }>(
    "listings/" + id,
  );
  const { data: session } = useAppSession();
  const [offerError, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <div className="wrap section">
        <ErrorBox message={error} />
      </div>
    );
  const l = data.listing;
  return (
    <div className="wrap section details-page">
      <Link className="text-link" href="/exchange">
        ← All opportunities
      </Link>
      <PageIntro eyebrow={`${l.commodity} · ${l.country}`} title={l.title}>
        <Badge value={l.status} />
      </PageIntro>
      <div className="detail-grid">
        <div>
          <div className="panel">
            <p className="eyebrow">The opportunity</p>
            <h2>Asset overview</h2>
            <CompanyIdentity id={l.demo_owner_id} />
            <p className="detail-description">{l.description}</p>
            <div className="notice">
              Supporting documents are private. Submit an offer and use the deal
              room to request access under the agreed confidentiality terms.
            </div>
          </div>
          {l.status === "approved" && (
            <form
              className="panel form-grid"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                const f = new FormData(e.currentTarget);
                try {
                  const r = await api<{ id: string }>("offers", {
                    listing_id: id,
                    amount: Number(f.get("amount")),
                    currency: l.currency,
                    message: f.get("message"),
                    consent: f.get("consent") === "on",
                  });
                  router.push("/dashboard/deals/" + r.id);
                } catch (x) {
                  setError((x as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="full">
                <p className="eyebrow">For buyers</p>
                <h3>Make an offer</h3>
                <p className="muted">
                  Tell the owner your proposed terms. Tafari will coordinate the
                  next steps.
                </p>
              </div>
              <label className="full">
                Offer amount ({l.currency})
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                />
              </label>
              <label className="full">
                Your interest & proposed terms
                <textarea
                  name="message"
                  minLength={20}
                  maxLength={5000}
                  required
                  rows={5}
                  placeholder="Describe your mandate, preferred structure and due diligence requirements."
                />
              </label>
              <label className="check full">
                <input type="checkbox" name="consent" required />I understand
                that an offer is subject to due diligence, agreements and
                required approvals.
              </label>
              <div className="full">
                <ErrorBox message={offerError} />
                {session ? (
                  <button className="btn dark" disabled={busy}>
                    {busy ? "Submitting…" : "Submit offer →"}
                  </button>
                ) : (
                  <Link className="btn dark" href="/auth/sign-in">
                    Sign in to make an offer →
                  </Link>
                )}
              </div>
            </form>
          )}
        </div>
        <aside className="detail-summary">
          <p className="eyebrow light">Commercial summary</p>
          <h2>{price(l.asking_price, l.currency)}</h2>
          <p>{l.transaction_type}</p>
          <dl>
            <dt>Commodity</dt>
            <dd>{l.commodity}</dd>
            <dt>Country</dt>
            <dd>{l.country}</dd>
            <dt>Location</dt>
            <dd>{l.location}</dd>
            {l.area_hectares && (
              <>
                <dt>Area</dt>
                <dd>{Number(l.area_hectares).toLocaleString()} ha</dd>
              </>
            )}
          </dl>
          <Link className="btn gold" href="/contact">
            Talk to Tafari ↗
          </Link>
          <p>
            Ownership transfer and settlement are handled through the
            transaction agreements.
          </p>
        </aside>
      </div>
    </div>
  );
}
