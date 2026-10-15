"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  answeredQuestions,
  activeQuestions,
  currentQuestion,
  questionLabel,
  type ApplicationEvent,
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
  const [events, setEvents] = useState<ApplicationEvent[]>([]),
    [eventsTotal, setEventsTotal] = useState(0);
  const eventPage = Math.max(
    0,
    Math.min(100000, Math.floor(Number(params.get("event_page"))) || 0),
  );
  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams(
      id
        ? { id, event_page: String(eventPage) }
        : { status, q: query, page: String(page), scope },
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
          setEvents(data.events || []);
          setEventsTotal(data.eventsTotal || 0);
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
  }, [id, status, query, page, scope, refresh, eventPage]);
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
              {row.contact_name || "Contact details pending"} · Preferred:{" "}
              {row.contact_preference || "Not chosen yet"}
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
          <section className="application-progress">
            <h2>Application progress</h2>
            <dl>
              <div>
                <dt>Last recorded step</dt>
                <dd>
                  {row.state === "submitted"
                    ? "Application sent"
                    : questionLabel(currentQuestion(row)?.id || null)}
                </dd>
              </div>
              <div>
                <dt>Last activity</dt>
                <dd>
                  {new Date(
                    row.last_seen_at || row.updated_at,
                  ).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt>Last action</dt>
                <dd>{eventLabel(row.last_event)}</dd>
              </div>
              <div>
                <dt>Saved answers</dt>
                <dd>
                  {answeredQuestions(row.answers).length} of{" "}
                  {activeQuestions(row.answers).length}
                </dd>
              </div>
            </dl>
            {row.state === "draft" &&
              Date.now() -
                new Date(row.last_seen_at || row.updated_at).getTime() >
                30 * 60000 && (
                <p>
                  No recent activity (30+ minutes). The step above is the last
                  recorded stopping point.
                </p>
              )}
            {Object.keys(row.draft_answers || {}).length > 0 && (
              <details>
                <summary>Unfinished answers</summary>
                <dl>
                  {Object.entries(row.draft_answers)
                    .filter(([key]) =>
                      activeQuestions(row.answers).some((q) => q.id === key),
                    )
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>{questionLabel(key)}</dt>
                        <dd>{value || "Cleared — not confirmed"}</dd>
                      </div>
                    ))}
                </dl>
              </details>
            )}
          </section>
          {staff && (
            <section className="application-timeline">
              <h2>Application history</h2>
              <p>{eventsTotal} recorded events · newest first</p>
              {!events.length && <p>No history has been recorded yet.</p>}
              <ol>
                {events.map((event) => (
                  <li key={event.id}>
                    <div className="timeline-heading">
                      <strong>{eventLabel(event.action)}</strong>
                      <time dateTime={event.occurred_at}>
                        {new Date(event.occurred_at).toLocaleString()}
                      </time>
                    </div>
                    <p>
                      {questionLabel(event.question || event.current_question)}
                    </p>
                    {event.action === "went_back" && (
                      <p>
                        From: {questionLabel(event.previous_question)}
                        <br />
                        To: {questionLabel(event.current_question)}
                      </p>
                    )}
                    {event.before_value !== null && (
                      <p>
                        <b>Before:</b>{" "}
                        {event.before_value || "Skipped / cleared"}
                      </p>
                    )}
                    {event.after_value !== null && (
                      <p>
                        <b>
                          {event.action === "draft_saved" ||
                          event.action === "paused"
                            ? "Unfinished:"
                            : "Saved:"}
                        </b>{" "}
                        {event.after_value || "Skipped / cleared"}
                      </p>
                    )}
                    <details>
                      <summary>Answers at this point</summary>
                      <dl>
                        {answeredQuestions(event.snapshot).map((q) => (
                          <div key={q.id}>
                            <dt>{q.prompt}</dt>
                            <dd>{event.snapshot[q.id] || "Skipped"}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  </li>
                ))}
              </ol>
              <div className="actions">
                <button
                  className="btn light"
                  disabled={!eventPage}
                  onClick={() =>
                    router.push(
                      "/dashboard/applications/" +
                        id +
                        "?event_page=" +
                        (eventPage - 1),
                    )
                  }
                >
                  Newer events
                </button>
                <span>History page {eventPage + 1}</span>
                <button
                  className="btn light"
                  disabled={(eventPage + 1) * 40 >= eventsTotal}
                  onClick={() =>
                    router.push(
                      "/dashboard/applications/" +
                        id +
                        "?event_page=" +
                        (eventPage + 1),
                    )
                  }
                >
                  Older events
                </button>
              </div>
            </section>
          )}
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
                  <th>Last recorded step</th>
                  <th>Last activity</th>
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
                      {a.contact_name || "Contact details pending"}
                      <br />
                      {a.contact_email || a.contact_phone}
                    </td>
                    <td>
                      {a.state === "draft" ? "In progress" : "Sent to Tafari"}
                    </td>
                    <td>{a.status}</td>
                    <td>
                      {a.state === "submitted"
                        ? "Sent"
                        : questionLabel(currentQuestion(a)?.id || null)}
                    </td>
                    <td>
                      {new Date(
                        a.last_seen_at || a.updated_at,
                      ).toLocaleString()}
                    </td>
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

function eventLabel(action: string) {
  return (
    (
      {
        started: "Started with consent",
        resumed: "Conversation resumed",
        answer_saved: "Answer saved",
        answer_confirmed: "Answer confirmed",
        answer_changed: "Answer changed",
        answer_skipped: "Question skipped",
        went_back: "Went back to a question",
        draft_saved: "Unfinished answer saved",
        viewed: "Question viewed / reopened",
        paused: "Page hidden or left",
        stopped: "Applicant chose to stop",
        submitted: "Application sent",
        account_linked: "Account linked",
        contact_updated: "Contact details updated",
        tracking_enabled: "History enabled — earlier changes unavailable",
        legacy: "Previously saved application",
        staff_reviewed: "Tafari review updated",
        draft_created: "Private asset draft created",
      } as Record<string, string>
    )[action] || action
  );
}
