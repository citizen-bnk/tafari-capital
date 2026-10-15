"use client";
import Link from "next/link";
import {
  Phone,
  Mail,
  Mountain,
  Pickaxe,
  Building2,
  UserRound,
  Users,
  Handshake,
  CircleHelp,
  MapPin,
  Gem,
  Coins,
  FileCheck,
  Check,
  ArrowRight,
  LockKeyhole,
} from "lucide-react";
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
  const stage =
    complete || !question ? 2 : question.section === "contact" ? 0 : 1;
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
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
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
        <p className="funnel-service">
          <Mountain size={23} aria-hidden="true" /> ASSET SUBMISSION
        </p>
        <img
          className="funnel-illustration"
          src={
            "/illustrations/" +
            (complete || !question
              ? "review"
              : question.section === "contact"
                ? "contact"
                : "asset") +
            ".svg"
          }
          alt={
            complete || !question
              ? "An application checklist ready for review"
              : question.section === "contact"
                ? "A phone and a conversation bubble"
                : "A mineral deposit and mining vehicle"
          }
          width={640}
          height={500}
        />
        <h1>
          {complete
            ? "Your next chapter starts here."
            : "Your asset. New possibilities."}
        </h1>
        <p>
          {complete
            ? "We’ll be in touch about the next step."
            : "Sell, find a partner or explore your options."}
        </p>
        <div className="funnel-steps" aria-label="Application stages">
          {["Contact", "Asset", "Review"].map((step, i) => (
            <span
              key={step}
              className={stage === i ? "active" : ""}
              aria-current={stage === i ? "step" : undefined}
            >
              <b>{i + 1}</b>
              {step}
            </span>
          ))}
        </div>
        {application && (
          <p className="funnel-reference">
            <Check size={15} aria-hidden="true" /> Saved ·{" "}
            {application.reference}
            <small>Return on this browser within 30 days.</small>
          </p>
        )}
      </aside>
      <section
        className="intake-chat"
        aria-label="Asset submission conversation"
        aria-busy={busy}
      >
        <div className="intake-chat-heading">
          <strong>Let’s take the first step</strong>
          <span>
            <LockKeyhole size={13} aria-hidden="true" /> Private application
          </span>
        </div>
        <div className="intake-history">
          {answeredQuestions(answers).length > 0 && (
            <details className="funnel-answers" open={!question && !complete}>
              <summary>
                Your answers ({answeredQuestions(answers).length})
              </summary>
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
            </details>
          )}
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
                <p id="intake-hint">
                  {shortHints[question.id] || question.hint}
                </p>
                {question.type === "choice" ? (
                  <div className="intake-options">
                    {question.options?.map((option) => (
                      <button
                        key={option}
                        disabled={busy}
                        onClick={() => answer(option)}
                      >
                        <ChoiceIcon option={option} />
                        <span>{option}</span>
                        <ArrowRight size={16} aria-hidden="true" />
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
                  ? "Saved. You can finish later."
                  : "No account needed. Contact details save after your consent."}
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
      <p className="funnel-legal">
        Managed by Tafari Capital ·{" "}
        <Link href="/privacy" target="_blank" rel="noopener noreferrer">
          Privacy
        </Link>
      </p>
    </div>
  );
}

const shortHints: Record<string, string> = {
  contact_name: "So we know who to speak to.",
  contact_preference: "Choose what works best for you.",
  contact_phone: "Include +266 for Lesotho or +27 for South Africa.",
  contact_email: "An address you check regularly.",
  contact_consent:
    "We’ll save your answers and follow up. Your application stays private.",
  company: "Applying as an individual? You can skip this.",
  relationship: "Choose the closest match. We’ll confirm authority later.",
  asset_type: "Choose the closest match.",
  asset_name: "A working name is fine — or skip.",
  country: "Where is the asset?",
  location: "Nearest town or district is enough.",
  other_country: "Enter the country name.",
  commodity: "Not sure? That’s okay.",
  other_commodity: "Use the mineral name you know.",
  development_stage: "Exploration = investigating. Operating = producing.",
  transaction_goal: "Choose your goal. We can help you decide.",
  description: "A few sentences: what’s available and what help do you need?",
  right_status: "No evidence needed yet. We’ll check this later.",
  right_reference: "If you have it handy. This stays private.",
  asking_price: "Amount only. Skip if you’d prefer to discuss value.",
  currency: "Choose the currency for that amount.",
  area_hectares: "An estimate is fine. Skip if unknown.",
  documents_ready: "You can add files later.",
};
function ChoiceIcon({ option }: { option: string }) {
  const Icon =
    option === "Phone call"
      ? Phone
      : option === "Email"
        ? Mail
        : /not sure|advice|Not now|not yet|needed/i.test(option)
          ? CircleHelp
          : /owner|own the asset/i.test(option)
            ? UserRound
            : /represent|broker|stake/i.test(option)
              ? Users
              : /joint|partner/i.test(option)
                ? Handshake
                : /sale|price|offtake/i.test(option)
                  ? Coins
                  : /right|progress|documents|Granted/i.test(option)
                    ? FileCheck
                    : /Lesotho|South Africa|Other$/.test(option)
                      ? MapPin
                      : /Gold|Diamonds|Chrome|Coal|Iron/.test(option)
                        ? Gem
                        : /Mining|Quarry|Exploration/.test(option)
                          ? Pickaxe
                          : /Operating|Development|maintenance/.test(option)
                            ? Building2
                            : Check;
  return (
    <span className="funnel-choice-icon">
      <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
    </span>
  );
}
