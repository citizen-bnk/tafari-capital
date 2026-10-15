"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  answeredQuestions,
  type AssetApplication,
} from "@/lib/intake/questions";
export function Applications({ id }: { id?: string }) {
  const params = useSearchParams(),
    router = useRouter();
  const status = ["new", "contacted", "qualified", "closed"].includes(
    params.get("status") || "",
  )
    ? params.get("status")!
    : "";
  const query = (params.get("q") || "").slice(0, 120),
    scope = params.get("scope") === "mine" ? "mine" : "all";
  const page = Math.max(
    0,
    Math.min(100000, Math.floor(Number(params.get("page"))) || 0),
  );
  function href(nextPage: number, nextStatus = status, nextQuery = query) {
    const q = new URLSearchParams({
      scope,
      status: nextStatus,
      q: nextQuery,
      page: String(nextPage),
    });
    return "/dashboard/applications?" + q;
  }
  const [rows, setRows] = useState<AssetApplication[]>([]),
    [staff, setStaff] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [total, setTotal] = useState(0),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [reviewStatus, setReviewStatus] = useState("new"),
    [notes, setNotes] = useState("");
  const [canResume, setCanResume] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams(
      id ? { id } : { status, q: query, page: String(page), scope },
    );
    fetch("/api/applications?" + params, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok)
          throw new Error(data.error || "Could not load applications.");
        if (active) {
          const items = id ? [data.application] : data.applications;
          setRows(items);
          setStaff(data.staff);
          setCanResume(!!data.canResume);
          setTotal(data.total || 0);
          setError("");
          if (id) {
            setReviewStatus(items[0].status);
            setNotes(items[0].staff_notes || "");
          }
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, status, query, page, scope, refresh]);
  async function action(row: AssetApplication, action: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          revision: row.revision,
          action,
          status: reviewStatus,
          staff_notes: notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save.");
      if (action === "resume") window.location.assign("/submit-asset");
      else {
        setNotice("Review saved.");
        setRefresh((v) => v + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const row = rows[0];
  return (
    <>
      <div className="heading-row">
        <div>
          <p className="eyebrow">
            {staff ? "Tafari deal desk" : "Your workspace"}
          </p>
          <h1>{id ? "Asset application" : "Asset applications"}</h1>
        </div>
        <Link className="btn dark" href="/submit-asset">
          Submit an asset →
        </Link>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {!id && (
        <>
          <p>
            {staff
              ? "Contact requests and asset questionnaires, including applications still in progress."
              : "Applications linked to your account. Guest applications can be linked from the original conversation after you verify your account."}
          </p>
          <form
            className="filter-bar"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              router.push(
                href(
                  0,
                  String(f.get("status") || ""),
                  String(f.get("q") || ""),
                ),
              );
            }}
          >
            <label>
              Search applications
              <input
                key={query}
                name="q"
                defaultValue={query}
                placeholder="Reference, contact or asset"
              />
            </label>
            <label>
              Status
              <select
                name="status"
                key={status}
                defaultValue={status}
                aria-label="Status filter"
              >
                <option value="">All statuses</option>
                {["new", "contacted", "qualified", "closed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button className="btn dark">Search</button>
          </form>
        </>
      )}
      {loading ? (
        <p role="status">Loading applications…</p>
      ) : id && row ? (
        <>
          <p>
            <strong>{row.reference}</strong> ·{" "}
            {row.state === "draft"
              ? "Questionnaire in progress"
              : "Sent to Tafari"}{" "}
            · {row.status}
          </p>
          <div className="notice">
            <h2>Contact details</h2>
            <p>
              {row.contact_name} · Preferred: {row.contact_preference}
            </p>
            {row.contact_email && (
              <p>
                <a href={"mailto:" + row.contact_email}>{row.contact_email}</a>
              </p>
            )}
            {row.contact_phone && (
              <p>
                <a href={"tel:" + row.contact_phone}>{row.contact_phone}</a>
              </p>
            )}
            <p>
              Received {new Date(row.created_at).toLocaleDateString()} · Source:{" "}
              {row.source}
            </p>
          </div>
          <dl className="application-answers">
            {answeredQuestions(row.answers)
              .filter((q) => q.section === "asset")
              .map((q) => (
                <div key={q.id}>
                  <dt>{q.prompt}</dt>
                  <dd>{row.answers[q.id] || "Not provided yet"}</dd>
                </div>
              ))}
          </dl>
          <div className="actions">
            {canResume && (
              <button
                className="btn dark"
                disabled={busy}
                onClick={() => action(row, "resume")}
              >
                Resume my conversation
              </button>
            )}
            {row.listing_id && (
              <Link
                className="btn light"
                href={"/dashboard/listings/" + row.listing_id}
              >
                Open private asset draft
              </Link>
            )}
            <Link className="text-link" href="/dashboard/applications">
              All applications →
            </Link>
          </div>
          {staff && (
            <form
              className="intake-review"
              onSubmit={(e) => {
                e.preventDefault();
                void action(row, "review");
              }}
            >
              <h2>Tafari review</h2>
              <p>
                Contact information and notes are private. This review does not
                publish a listing.
              </p>
              <label>
                Application status
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                >
                  {["new", "contacted", "qualified", "closed"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Private staff notes
                <textarea
                  rows={5}
                  maxLength={4000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              <button className="btn dark" disabled={busy}>
                Save review
              </button>
            </form>
          )}
        </>
      ) : !id ? (
        <>
          <p>
            {total} application{total === 1 ? "" : "s"}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Contact</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link
                        className="table-link"
                        href={"/dashboard/applications/" + a.id}
                      >
                        {a.reference}
                        <br />
                        {a.answers.asset_name || "Asset details pending"}
                      </Link>
                    </td>
                    <td>
                      {a.contact_name}
                      <br />
                      {a.contact_email || a.contact_phone}
                    </td>
                    <td>
                      {a.state === "draft" ? "In progress" : "Sent to Tafari"}
                    </td>
                    <td>{a.status}</td>
                    <td>{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p>No applications match this view.</p>}
          <div className="actions">
            <button
              className="btn light"
              disabled={!page}
              onClick={() => router.push(href(page - 1))}
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              className="btn light"
              disabled={(page + 1) * 30 >= total}
              onClick={() => router.push(href(page + 1))}
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}
