"use client";
import { useState } from "react";
import { api, useResource } from "@/lib/client";
import {
  Offer,
  Document,
  User,
  Message,
  price,
  date,
  label,
} from "@/lib/types";
import { PageIntro, Badge, ErrorBox, Loading, Empty } from "@/components/ui";
const stages = [
  "Due diligence",
  "Agreements",
  "Regulatory approvals",
  "Closing",
  "Completed",
];
export function DealRoom({ id }: { id: string }) {
  const { data, error, loading, reload } = useResource<{
    offer: Offer;
    messages: Message[];
    documents: Document[];
    actor: User;
  }>("deal/" + id);
  const [saveError, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confidential, setConfidential] = useState(false);
  async function action(v: unknown) {
    setBusy(true);
    setError("");
    try {
      await api("deal/" + id, v);
      await reload();
      return true;
    } catch (x) {
      setError((x as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error} />;
  const o = data.offer,
    isStaff = ["staff", "super_admin"].includes(data.actor.role),
    canManage = isStaff || o.owner_id === data.actor.id;
  return (
    <>
      <PageIntro
        eyebrow="Private deal room"
        title={o.title}
        action={<Badge value={o.status} />}
      >
        {price(o.amount, o.currency)} · Buyer: {o.buyer_name} · Submitted{" "}
        {date(o.created_at)}
      </PageIntro>
      <ErrorBox message={saveError} />
      <div className="detail-grid">
        <div>
          <div className="panel">
            <p className="eyebrow">The offer</p>
            <p className="detail-description">{o.message}</p>
            {o.status === "pending" && (
              <div className="actions">
                {canManage ? (
                  <>
                    <button
                      className="btn dark"
                      disabled={busy}
                      onClick={() => action({ action: "accept" })}
                    >
                      Accept & start diligence
                    </button>
                    <button
                      className="btn outline"
                      disabled={busy}
                      onClick={() => action({ action: "decline" })}
                    >
                      Decline offer
                    </button>
                  </>
                ) : (
                  <button
                    className="btn outline"
                    disabled={busy}
                    onClick={() => action({ action: "withdraw" })}
                  >
                    Withdraw offer
                  </button>
                )}
              </div>
            )}
            <div className="notice">
              Acceptance reserves the asset for this transaction. The sale is
              completed through Tafari’s managed closing process.
            </div>
          </div>
          <div className="panel">
            <div className="heading-row">
              <h3>Conversation</h3>
              <button
                className="btn outline small"
                disabled={busy}
                onClick={reload}
              >
                Refresh
              </button>
            </div>
            {data.messages.length ? (
              <div className="message-list">
                {data.messages.map((m) => (
                  <article className="message" key={m.id}>
                    <header>
                      <strong>
                        {m.author_name}{" "}
                        {["staff", "super_admin"].includes(m.author_role)
                          ? "· Tafari"
                          : ""}
                      </strong>
                      <span>{date(m.created_at)}</span>
                    </header>
                    <p>{m.body}</p>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="Keep the next steps together.">
                <p>
                  Use this private conversation for questions, terms and
                  diligence requests.
                </p>
              </Empty>
            )}
            <form
              className="inline-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = e.currentTarget,
                  body = new FormData(f).get("body");
                if (await action({ action: "message", body })) f.reset();
              }}
            >
              <label>
                Your message
                <textarea name="body" rows={3} required maxLength={5000} />
              </label>
              <button className="btn dark" disabled={busy}>
                {busy ? "Sending…" : "Send message →"}
              </button>
            </form>
          </div>
        </div>
        <aside>
          <div className="panel">
            <p className="eyebrow">Transaction progress</p>
            <h3>{o.stage}</h3>
            <div className="progress-steps">
              {stages.map((s) => (
                <span className={s === o.stage ? "current" : ""} key={s}>
                  {s}
                </span>
              ))}
            </div>
            {isStaff && o.status === "accepted" && (
              <form
                className="inline-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await action({
                    action: "stage",
                    stage: f.get("stage"),
                    notes: f.get("notes"),
                  });
                }}
              >
                <label>
                  Next stage
                  <select name="stage">
                    <option>
                      {stages[stages.indexOf(o.stage) + 1] || "Completed"}
                    </option>
                    <option>Cancelled</option>
                  </select>
                </label>
                <label>
                  Closing record / progress note
                  <textarea
                    name="notes"
                    required
                    minLength={10}
                    maxLength={5000}
                    rows={3}
                  />
                </label>
                <button className="btn dark" disabled={busy}>
                  Record stage →
                </button>
              </form>
            )}
          </div>
          <div className="panel">
            <p className="eyebrow">Private data room</p>
            <h3>Supporting documents</h3>
            {canManage && (
              <label className="check" style={{ marginTop: 20 }}>
                <input
                  type="checkbox"
                  checked={confidential}
                  onChange={(e) => setConfidential(e.target.checked)}
                />
                Confidentiality agreements are in place for sharing with this
                buyer.
              </label>
            )}
            {data.documents.length ? (
              <div className="files">
                {data.documents.map((d) => (
                  <div className="file-row" key={d.id}>
                    <div>
                      <strong>{d.name}</strong>
                      <small>{label(d.kind)}</small>
                    </div>
                    <div className="actions">
                      <a
                        className="btn outline small"
                        href={"/api/documents/" + d.id}
                      >
                        Download ↓
                      </a>
                      {canManage && (
                        <>
                          <button
                            className="btn outline small"
                            disabled={busy || !confidential}
                            onClick={() =>
                              action({
                                action: "grant",
                                document_id: d.id,
                                confidentiality_confirmed: confidential,
                              })
                            }
                          >
                            Grant buyer access
                          </button>
                          <button
                            className="btn outline small"
                            disabled={busy}
                            onClick={() =>
                              action({ action: "revoke", document_id: d.id })
                            }
                          >
                            Revoke access
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ marginTop: 18 }}>
                No documents have been shared with you. Request access in the
                conversation.
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
