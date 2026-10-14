"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Users,
  FileCheck,
  Handshake,
  FolderLock,
  Inbox,
  History,
  LayoutDashboard,
} from "lucide-react";
import { api, useResource } from "@/lib/client";
import {
  User,
  Listing,
  Offer,
  Document,
  Enquiry,
  Audit,
  price,
  date,
  label,
} from "@/lib/types";
import { PageIntro, Badge, ErrorBox, Loading, Empty } from "@/components/ui";
type Data = {
  actor: User;
  listings: Listing[];
  offers: Offer[];
  users: User[];
  documents: Document[];
  enquiries: Enquiry[];
  audits: Audit[];
  stats: { review: number; deals: number; users: number; enquiries: number };
};
const tabs = [
  ["overview", "Overview", LayoutDashboard],
  ["listings", "Asset review", FileCheck],
  ["offers", "Transactions", Handshake],
  ["users", "Users & permissions", Users],
  ["documents", "Document library", FolderLock],
  ["enquiries", "Enquiries", Inbox],
  ["audits", "Audit trail", History],
] as const;
export function BackOffice() {
  const [tab, setTab] = useState("overview"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0);
  const { data, error, loading, reload } = useResource<Data>(
    "admin?q=" + encodeURIComponent(query) + "&page=" + page,
  );
  const [saveError, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function action(path: string, v: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, v);
      setNotice("Change recorded.");
      await reload();
    } catch (x) {
      setError((x as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error} />;
  return (
    <>
      <PageIntro eyebrow="Tafari Capital · Back office" title="The deal desk.">
        Manage participants, asset submissions and the journey to closing.
      </PageIntro>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <h3>Tafari Capital</h3>
          <p>
            {data.actor.email}
            <br />
            {label(data.actor.role)}
          </p>
          {tabs.map(([value, text, Icon]) => (
            <button
              className={tab === value ? "active" : ""}
              onClick={() => {
                setTab(value);
                setPage(0);
                setQuery("");
              }}
              key={value}
            >
              <Icon size={16} />
              {text}
            </button>
          ))}
          <Link className="text-link" href="/dashboard">
            My workspace →
          </Link>
        </aside>
        <div className="admin-content">
          <ErrorBox message={saveError} />
          {notice && (
            <div className="notice success" role="status">
              {notice}
            </div>
          )}
          {tab !== "overview" && (
            <form
              className="filter-bar"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(0);
                setQuery(String(new FormData(e.currentTarget).get("q") || ""));
              }}
            >
              <label>
                Search records
                <input name="q" placeholder="Name, title, email or action" />
              </label>
              <button className="btn dark">Search</button>
            </form>
          )}
          {tab === "overview" && (
            <>
              <div className="stats">
                <div className="stat">
                  <b>{data.stats.review}</b>
                  <span>Awaiting review</span>
                </div>
                <div className="stat">
                  <b>{data.stats.deals}</b>
                  <span>Active deals</span>
                </div>
                <div className="stat">
                  <b>{data.stats.users}</b>
                  <span>Participants</span>
                </div>
                <div className="stat">
                  <b>{data.stats.enquiries}</b>
                  <span>New enquiries</span>
                </div>
              </div>
              <div className="panel">
                <p className="eyebrow">Your operating rhythm</p>
                <h2>Review. Connect. Close.</h2>
                <p>
                  Start with submitted assets. Review the title, owner mandate
                  and technical evidence before approving publication. Follow
                  buyer offers into the deal room, grant documents under
                  confidentiality, and record each closing stage.
                </p>
                <div className="actions" style={{ marginTop: 20 }}>
                  <button
                    className="btn dark"
                    onClick={() => setTab("listings")}
                  >
                    Review submissions →
                  </button>
                  <button
                    className="btn outline"
                    onClick={() => setTab("offers")}
                  >
                    Manage transactions →
                  </button>
                </div>
              </div>
              <div className="notice">
                The verified account phafanep@gmail.com is the designated super
                administrator. Only the super administrator can assign staff
                permissions or suspend participants.
              </div>
            </>
          )}
          {tab === "listings" && (
            <>
              <div className="heading-row">
                <h2>Asset submissions</h2>
                <span className="muted">Review before publication</span>
              </div>
              {data.listings.length ? (
                <div className="list-stack">
                  {data.listings.map((l) => (
                    <article className="panel review-card" key={l.id}>
                      <header>
                        <div>
                          <h3>{l.title}</h3>
                          <p className="muted">
                            {l.commodity} · {l.country} · {l.owner_name}
                          </p>
                          <small>{l.owner_email}</small>
                        </div>
                        <Badge value={l.status} />
                      </header>
                      <p>{l.description}</p>
                      <div className="actions">
                        <Link
                          className="btn outline small"
                          href={"/dashboard/listings/" + l.id}
                        >
                          Inspect asset & documents ↗
                        </Link>
                        <strong>{price(l.asking_price, l.currency)}</strong>
                      </div>
                      {["submitted", "approved", "changes_requested"].includes(
                        l.status,
                      ) && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            action("asset/" + l.id, {
                              action: "review",
                              status: f.get("status"),
                              notes: f.get("notes"),
                            });
                          }}
                        >
                          <label>
                            Decision
                            <select name="status">
                              <option value="approved">
                                Approve publication
                              </option>
                              <option value="changes_requested">
                                Request changes
                              </option>
                              <option value="withdrawn">
                                Withdraw from marketplace
                              </option>
                            </select>
                          </label>
                          <label style={{ flex: 1 }}>
                            Review note
                            <textarea
                              name="notes"
                              required
                              minLength={5}
                              maxLength={3000}
                              placeholder="Record the basis for this decision."
                              rows={2}
                            />
                          </label>
                          <button className="btn dark small" disabled={busy}>
                            Record review
                          </button>
                        </form>
                      )}
                      {l.review_notes && (
                        <div className="notice">{l.review_notes}</div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <Empty title="No asset submissions found." />
              )}
            </>
          )}
          {tab === "offers" && (
            <>
              <h2 className="compact-heading">Transactions</h2>
              {data.offers.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Asset / buyer</th>
                        <th>Offer</th>
                        <th>Status / stage</th>
                        <th>Manage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.offers.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <strong>{o.title}</strong>
                            <small>
                              {o.buyer_name}
                              <br />
                              {o.buyer_email}
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
                <Empty title="No transactions found." />
              )}
            </>
          )}
          {tab === "users" && (
            <>
              <h2 className="compact-heading">Users & permissions</h2>
              {data.users.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Participant</th>
                        <th>Role / status</th>
                        <th>Manage access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.name}</strong>
                            <small>
                              {u.email}
                              <br />
                              {u.company} {u.phone}
                              {u.organization_type && <><br />{u.organization_type} · Fictional demo organization</>}
                            </small>
                          </td>
                          <td>
                            {label(u.role)}
                            <br />
                            <Badge value={u.status} />
                          </td>
                          <td>
                            {data.actor.role === "super_admin" &&
                            u.role !== "super_admin" ? (
                              <form
                                className="table-controls"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const f = new FormData(e.currentTarget);
                                  action("admin/users", {
                                    id: u.id,
                                    role: f.get("role"),
                                    status: f.get("status"),
                                  });
                                }}
                              >
                                <select
                                  name="role"
                                  aria-label={`Role for ${u.name}`}
                                  defaultValue={u.role}
                                >
                                  {[
                                    "member",
                                    "owner",
                                    "buyer",
                                    "partner",
                                    "staff",
                                  ].map((r) => (
                                    <option key={r} value={r}>
                                      {label(r)}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  name="status"
                                  aria-label={`Account status for ${u.name}`}
                                  defaultValue={u.status}
                                >
                                  <option value="active">Active</option>
                                  <option value="suspended">Suspended</option>
                                </select>
                                <button
                                  className="btn dark small"
                                  disabled={busy}
                                >
                                  Save
                                </button>
                              </form>
                            ) : (
                              <span className="muted">
                                {u.role === "super_admin"
                                  ? "Protected super administrator"
                                  : "Super administrator required"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="No participants found." />
              )}
            </>
          )}
          {tab === "documents" && (
            <>
              <h2 className="compact-heading">Private document library</h2>
              {data.documents.length ? (
                <div className="files">
                  {data.documents.map((d) => (
                    <div className="file-row" key={d.id}>
                      <div>
                        <strong>{d.name}</strong>
                        <small>
                          {d.title} · {label(d.kind)} ·{" "}
                          {(Number(d.size) / 1024 / 1024).toFixed(2)} MB ·{" "}
                          {d.state}
                        </small>
                      </div>
                      <div className="actions">
                        {d.state === "ready" && (
                          <a
                            className="btn outline small"
                            href={"/api/documents/" + d.id}
                          >
                            Download ↓
                          </a>
                        )}
                        <Link
                          className="btn outline small"
                          href={"/dashboard/listings/" + d.listing_id}
                        >
                          Asset ↗
                        </Link>
                        <button
                          className="btn danger small"
                          disabled={busy}
                          onClick={() =>
                            action("documents/" + d.id, { action: "delete" })
                          }
                        >
                          Remove file
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty title="No documents found." />
              )}
            </>
          )}
          {tab === "enquiries" && (
            <>
              <h2 className="compact-heading">Enquiries</h2>
              {data.enquiries.length ? (
                <div className="list-stack">
                  {data.enquiries.map((q) => (
                    <article className="panel review-card" key={q.id}>
                      <header>
                        <div>
                          <h3>{q.name}</h3>
                          <p>
                            {q.company} ·{" "}
                            <a href={"mailto:" + q.email}>{q.email}</a>
                          </p>
                        </div>
                        <Badge value={q.status} />
                      </header>
                      <p className="detail-description">{q.message}</p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          action("admin/enquiries", {
                            id: q.id,
                            status: new FormData(e.currentTarget).get("status"),
                          });
                        }}
                      >
                        <select
                          name="status"
                          aria-label="Enquiry status"
                          defaultValue={q.status}
                        >
                          <option value="new">New</option>
                          <option value="in_progress">In progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                        <button className="btn dark small" disabled={busy}>
                          Update status
                        </button>
                      </form>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty title="No enquiries found." />
              )}
            </>
          )}
          {tab === "audits" && (
            <>
              <h2 className="compact-heading">Audit trail</h2>
              {data.audits.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>When / who</th>
                        <th>Action</th>
                        <th>Record</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.audits.map((a) => (
                        <tr key={a.id}>
                          <td>
                            {date(a.created_at)}
                            <small>{a.actor_name}</small>
                          </td>
                          <td>
                            {label(a.action)}
                            <small>{a.details}</small>
                          </td>
                          <td>
                            {a.entity}
                            <small>{a.entity_id}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="No audit events found." />
              )}
            </>
          )}
          {tab !== "overview" && (
            <div className="actions" style={{ marginTop: 25 }}>
              <button
                className="btn outline small"
                disabled={page === 0 || loading}
                onClick={() => setPage(page - 1)}
              >
                ← Previous
              </button>
              <span className="muted">Page {page + 1} · Up to 50 records</span>
              <button
                className="btn outline small"
                disabled={
                  loading || (data[tab as keyof Data] as unknown[]).length < 50
                }
                onClick={() => setPage(page + 1)}
              >
                Next →
              </button>
              <button
                className="btn outline small"
                disabled={loading}
                onClick={reload}
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
