"use client";
import { useState } from "react";
import Link from "next/link";
import { api, useResource } from "@/lib/client";
import { Listing, Document, label } from "@/lib/types";
import { PageIntro, Badge, ErrorBox, Loading, Empty } from "@/components/ui";
import { ListingForm } from "@/components/listing-form";
import { DocumentUpload } from "@/components/document-upload";
import { CompanyIdentity } from "@/components/company-identity";
export function OwnerAsset({ id }: { id: string }) {
  const { data, error, loading, reload } = useResource<{
    listing: Listing;
    documents: Document[];
  }>("asset/" + id);
  const [actionError, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  async function action(data: unknown, path = "asset/" + id) {
    setBusy(true);
    setError("");
    try {
      await api(path, data);
      await reload();
    } catch (x) {
      setError((x as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error} />;
  const l = data.listing,
    editable = ["draft", "changes_requested"].includes(l.status);
  return (
    <>
      <PageIntro
        eyebrow="Owner listing"
        title={l.title}
        action={<Badge value={l.status} />}
      >
        {l.commodity} · {l.location}, {l.country} · {l.transaction_type}
      </PageIntro>
      <CompanyIdentity id={l.owner_id} />
      <ErrorBox message={actionError} />
      {l.review_notes && (
        <div className="notice">
          <strong>Tafari review:</strong> {l.review_notes}
        </div>
      )}
      <div className="actions">
        <button
          className="btn outline"
          onClick={() => setEdit(!edit)}
          disabled={!editable}
        >
          {edit ? "Close editor" : "Edit listing"}
        </button>
        {["approved", "submitted", "changes_requested"].includes(l.status) && (
          <button
            className="btn outline"
            disabled={busy}
            onClick={() => action({ action: "withdraw" })}
          >
            Return to draft
          </button>
        )}
        {["approved", "under_offer", "sold"].includes(l.status) && (
          <Link className="btn outline" href={"/exchange/" + id}>
            View public listing ↗
          </Link>
        )}
      </div>
      {edit && editable && (
        <div style={{ marginTop: 25 }}>
          <ListingForm
            listing={l}
            onSaved={() => {
              setEdit(false);
              reload();
            }}
          />
        </div>
      )}
      <div className="compact-heading">
        <h2>Supporting documents</h2>
        <p className="muted">
          Private to you and Tafari. Share individual files with buyers from the
          deal room.
        </p>
      </div>
      {data.documents.length ? (
        <div className="files">
          {data.documents.map((d) => (
            <div className="file-row" key={d.id}>
              <div>
                <strong>{d.name}</strong>
                <small>
                  {label(d.kind)} · {(Number(d.size) / 1024 / 1024).toFixed(2)}{" "}
                  MB · {d.state}
                </small>
              </div>
              <div className="actions">
                {d.state === "ready" && (
                  <>
                    <Link
                      className="btn outline small"
                      href={"/dashboard/documents/" + d.id}
                    >
                      View ↗
                    </Link>
                    <a
                      className="btn outline small"
                      href={"/api/documents/" + d.id}
                    >
                      Download ↓
                    </a>
                  </>
                )}
                <button
                  className="btn danger small"
                  disabled={busy || !editable}
                  onClick={() =>
                    action({ action: "delete" }, "documents/" + d.id)
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="Add the evidence behind your asset.">
          <p>
            Title/right evidence and a signed mandate are required to submit a
            listing.
          </p>
        </Empty>
      )}
      <DocumentUpload listingId={id} onUploaded={reload} />
      {editable && (
        <div className="panel" style={{ marginTop: 25 }}>
          <h3>Ready for Tafari review?</h3>
          <p>
            Check the public description and upload your title/right evidence
            and signed mandate before submitting.
          </p>
          <label className="check" style={{ margin: "20px 0" }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I am authorized to offer this asset and the details and evidence
            supplied are accurate to the best of my knowledge.
          </label>
          <button
            className="btn dark"
            disabled={busy || !confirmed}
            onClick={() =>
              action({ action: "submit", mandate_confirmed: confirmed })
            }
          >
            {busy ? "Submitting…" : "Submit for review →"}
          </button>
        </div>
      )}
    </>
  );
}
