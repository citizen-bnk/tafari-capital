"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  activeQuestions,
  answeredQuestions,
  nextQuestion,
  parseAnswer,
  type Answers,
  type AssetApplication,
} from "@/lib/intake/questions";
import { useAppSession } from "@/components/app-session";

async function intake(method: string, data?: unknown) {
  const res = await fetch("/api/intake", {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });
  const result = await res.json();
  if (!res.ok)
    throw new Error(
      result.error || "We could not save your progress. Please try again.",
    );
  return result;
}
export function AssetIntake() {
  const [application, setApplication] = useState<AssetApplication | null>(null);
  const [local, setLocal] = useState<Answers>({});
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [value, setValue] = useState(""),
    [stopped, setStopped] = useState(false),
    [editingContact, setEditingContact] = useState(false);
  const [transaction, setTransaction] = useState("Full sale");
  const { data: session } = useAppSession();
  const currentRef = useRef<HTMLDivElement>(null);
  const answers = editingContact ? local : application?.answers || local;
  const question = nextQuestion(answers);
  const complete = application?.state === "submitted" && !editingContact;
  useEffect(() => {
    let alive = true;
    intake("GET")
      .then((r) => {
        if (alive) setApplication(r.application);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    currentRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [question?.id, complete]);
  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function answer(raw: string) {
    if (!question || busy) return;
    await perform(async () => {
      const parsed = parseAnswer(question, raw);
      if (question.id === "contact_consent" && parsed === "Not now") {
        setStopped(true);
        return;
      }
      if (!application || editingContact) {
        const updated = { ...answers, [question.id]: parsed };
        if (question.id === "contact_consent") {
          const result = await intake(
            editingContact ? "PATCH" : "POST",
            editingContact
              ? {
                  action: "contact",
                  answers: updated,
                  revision: application!.revision,
                }
              : { answers: updated },
          );
          setApplication(result.application);
          setEditingContact(false);
          setLocal({});
        } else setLocal(updated);
      } else {
        const result = await intake("PATCH", {
          action: "answer",
          revision: application.revision,
          question: question.id,
          value: parsed,
        });
        setApplication(result.application);
      }
      setValue("");
    });
  }
  async function change(action: string, extra: Record<string, unknown> = {}) {
    if (!application) return;
    await perform(async () => {
      const result = await intake("PATCH", {
        action,
        revision: application.revision,
        ...extra,
      });
      if (action === "draft")
        window.location.assign("/dashboard/listings/" + result.id);
      else setApplication(result.application);
      setValue("");
    });
  }
  if (loading) return <p role="status">Looking for your saved progress…</p>;
  return (
    <div className="intake-layout">
      <aside className="intake-guide">
        <p className="eyebrow">A conversation with Tafari</p>
        <h1>Tell us about your asset.</h1>
        <p>
          One question at a time. Start with a way to reach you, then tell us
          what you know about your mine or opportunity.
        </p>
        <ol>
          <li>Your contact details</li>
          <li>Your asset and goals</li>
          <li>Review and send to Tafari</li>
        </ol>
        <p>
          No account or documents are needed to begin. Your application stays
          private. Tafari reviews assets before anything appears on the
          Exchange.
        </p>
        {application && (
          <div className="notice">
            <strong>{application.reference}</strong>
            <p>
              Progress saved in this browser for 30 days. The team can follow up
              using your preferred contact method. You can close this page and
              return later on the same browser.
            </p>
            <Link href="/dashboard/applications">My applications →</Link>
          </div>
        )}
        <Link href="/exchange" className="text-link">
          Explore the Exchange →
        </Link>
      </aside>
      <section
        className="intake-chat"
        aria-label="Asset submission conversation"
        aria-busy={busy}
      >
        <div className="intake-chat-heading">
          <strong>Tafari asset assistant</strong>
          <span>Private application</span>
        </div>
        <div className="intake-history">
          <p className="intake-bubble">
            Welcome. You do not need to know every technical detail. We’ll help
            you take the next step.
          </p>
          {answeredQuestions(answers).map((q) => (
            <div key={q.id} className="intake-exchange">
              <p className="intake-bubble">{q.prompt}</p>
              <div className="intake-reply">
                <span>{answers[q.id] || "Skipped for now"}</span>
                {!complete && q.section === "asset" && (
                  <button
                    disabled={busy}
                    onClick={() => change("rewind", { question: q.id })}
                    aria-label={"Edit answer: " + q.prompt}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={currentRef}>
            {error && (
              <div className="notice error" role="alert">
                {error}{" "}
                <button onClick={() => window.location.reload()}>
                  Reload saved progress
                </button>
              </div>
            )}
            {stopped ? (
              <div className="intake-bubble">
                <h2>That’s okay.</h2>
                <p>
                  Your new contact answers have not been saved. You can come
                  back whenever you are ready.
                </p>
                <button
                  className="btn dark"
                  onClick={() => {
                    setStopped(false);
                    setLocal({});
                    setEditingContact(false);
                  }}
                >
                  Return to the conversation
                </button>
              </div>
            ) : complete ? (
              <div className="intake-bubble">
                <h2>Thank you, {application.contact_name.split(" ")[0]}.</h2>
                <p>
                  Your application <strong>{application.reference}</strong> has
                  been sent to Tafari. Our team will use your chosen contact
                  method to discuss the next steps.
                </p>
                <p>This does not publish your asset or confirm a sale.</p>
                {!session ? (
                  <p>
                    <Link className="text-link" href="/auth/sign-up">
                      Create an account
                    </Link>{" "}
                    or{" "}
                    <Link className="text-link" href="/auth/sign-in">
                      sign in
                    </Link>
                    , then return here to link this application and add private
                    documents.
                  </p>
                ) : !application.owner_id ? (
                  <button
                    className="btn dark"
                    disabled={busy}
                    onClick={() => change("claim")}
                  >
                    Link to my verified account
                  </button>
                ) : application.listing_id ? (
                  <Link
                    className="btn dark"
                    href={"/dashboard/listings/" + application.listing_id}
                  >
                    Open private asset draft →
                  </Link>
                ) : (
                  <div>
                    <p>
                      A verified account can turn this application into a
                      private draft and upload supporting documents.
                    </p>
                    <label>
                      Transaction to prepare
                      <select
                        value={transaction}
                        onChange={(e) => setTransaction(e.target.value)}
                      >
                        {[
                          "Full sale",
                          "Partial stake",
                          "Joint venture",
                          "Offtake",
                        ].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="btn dark"
                      disabled={busy}
                      onClick={() =>
                        change("draft", { transaction_type: transaction })
                      }
                    >
                      Prepare private asset draft
                    </button>
                  </div>
                )}
              </div>
            ) : !question ? (
              <div className="intake-bubble">
                <h2>Ready to send?</h2>
                <p>
                  Review your answers above. Editing an answer will ask you the
                  following questions again so your information stays
                  consistent.
                </p>
                <button
                  disabled={busy}
                  className="btn gold"
                  onClick={() => change("submit")}
                >
                  {busy ? "Saving…" : "Send application to Tafari"}
                </button>
              </div>
            ) : (
              <div className="intake-current" key={question.id}>
                <p className="eyebrow">
                  {question.section === "contact"
                    ? "First, let’s get in touch"
                    : `Asset details · ${answeredQuestions(answers).filter((q) => q.section === "asset").length + 1} of ${activeQuestions(answers).filter((q) => q.section === "asset").length}`}
                </p>
                <h2 id="intake-question" aria-live="polite">
                  {question.prompt}
                </h2>
                <p id="intake-hint">{question.hint}</p>
                {question.type === "choice" ? (
                  <div className="intake-options">
                    {question.options?.map((option) => (
                      <button
                        key={option}
                        disabled={busy}
                        onClick={() => answer(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void answer(value);
                    }}
                  >
                    {question.type === "longtext" ? (
                      <textarea
                        autoFocus
                        aria-labelledby="intake-question"
                        aria-describedby="intake-hint"
                        rows={4}
                        value={value}
                        maxLength={question.max || 3000}
                        onChange={(e) => setValue(e.target.value)}
                        disabled={busy}
                      />
                    ) : (
                      <input
                        autoFocus
                        aria-labelledby="intake-question"
                        aria-describedby="intake-hint"
                        type={
                          question.type === "number" ? "text" : question.type
                        }
                        inputMode={
                          question.type === "number" ? "decimal" : undefined
                        }
                        autoComplete={
                          question.type === "email"
                            ? "email"
                            : question.type === "tel"
                              ? "tel"
                              : question.id === "contact_name"
                                ? "name"
                                : "off"
                        }
                        placeholder={question.placeholder}
                        value={value}
                        maxLength={question.max || 3000}
                        onChange={(e) => setValue(e.target.value)}
                        disabled={busy}
                      />
                    )}
                    <div className="actions">
                      <button
                        disabled={busy || !value.trim()}
                        className="btn dark"
                      >
                        {busy ? "Saving…" : "Continue →"}
                      </button>
                      {question.optional && (
                        <button
                          className="btn light"
                          type="button"
                          disabled={busy}
                          onClick={() => answer("")}
                        >
                          Skip for now
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}
            <p className="intake-save" role="status">
              {busy
                ? "Saving your answer…"
                : application
                  ? "Your saved progress is up to date."
                  : "Contact details are saved only after you agree to be contacted."}
            </p>
          </div>
        </div>
        {(application || error) && (
          <div className="intake-tools">
            {application && (
              <button
                disabled={busy}
                onClick={() => {
                  setLocal({});
                  setEditingContact(true);
                  setStopped(false);
                  setValue("");
                }}
              >
                Update contact details
              </button>
            )}
            <button
              disabled={busy}
              onClick={() =>
                perform(async () => {
                  await intake("DELETE");
                  setApplication(null);
                  setLocal({});
                  setValue("");
                  setStopped(false);
                  setEditingContact(false);
                })
              }
            >
              Start another asset
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
