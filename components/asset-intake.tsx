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
  currentQuestion,
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
    [stopped, setStopped] = useState(false);
  const [transaction, setTransaction] = useState("Full sale");
  const { data: session } = useAppSession();
  const currentRef = useRef<HTMLDivElement>(null);
  const answers = application?.answers || local;
  const question = application
    ? currentQuestion(application)
    : nextQuestion(answers);
  const complete = application?.state === "submitted";
  const active = activeQuestions(answers);
  const index = question
    ? active.findIndex((q) => q.id === question.id)
    : active.length;
  const previous = index > 0 ? active[index - 1] : null;
  const [saveNotice, setSaveNotice] = useState("");
  const latest = useRef({ application, question, value });
  latest.current = { application, question, value };
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
  async function activity(action: string, withValue = false) {
    const state = latest.current;
    if (!state.application || state.application.state !== "draft") return;
    const response = await fetch("/api/intake/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        question: state.question?.id || null,
        ...(withValue && state.question?.type !== "choice"
          ? { value: state.value }
          : {}),
      }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Could not save. Please try again.");
    if (result.saved === false && action === "draft_saved")
      throw new Error(
        "Progress changed in another tab. Reload before continuing.",
      );
    return result;
  }
  useEffect(() => {
    setValue(
      question
        ? (application?.draft_answers?.[question.id] ??
            answers[question.id] ??
            "")
        : "",
    );
    setSaveNotice("");
  }, [question?.id, application?.revision]);
  useEffect(() => {
    if (application?.state === "draft" && !stopped)
      void activity("viewed").catch(() => {});
  }, [application?.id, question?.id, stopped]);
  useEffect(() => {
    if (
      !application ||
      busy ||
      stopped ||
      !question ||
      question.type === "choice"
    )
      return;
    setSaveNotice("Saving…");
    let alive = true;
    const timer = setTimeout(() => {
      void activity("draft_saved", true)
        .then(() => {
          if (alive) setSaveNotice("Draft saved");
        })
        .catch((e) => {
          if (!alive) return;
          setSaveNotice("Not saved yet");
          setError(e.message);
        });
    }, 1200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [value, question?.id, application?.id, busy, stopped]);
  useEffect(() => {
    if (!application?.id) return;
    let paused = false;
    function pause() {
      const state = latest.current;
      if (paused || !state.application || state.application.state !== "draft")
        return;
      paused = true;
      const payload = JSON.stringify({
        action: "paused",
        question: state.question?.id || null,
        ...(state.question && state.question.type !== "choice"
          ? { value: state.value }
          : {}),
      });
      const blob = new Blob([payload], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/intake/activity", blob))
        void fetch("/api/intake/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
    }
    function visibility() {
      if (document.visibilityState === "hidden") pause();
      else {
        paused = false;
        void activity("viewed").catch(() => {});
      }
    }
    window.addEventListener("pagehide", pause);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pagehide", pause);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [application?.id]);
  async function answer(raw: string) {
    if (!question || busy) return;
    await perform(async () => {
      let parsed: string;
      try {
        parsed = parseAnswer(question, raw);
      } catch (e) {
        if (application && question.type !== "choice")
          await activity("draft_saved", true);
        throw e;
      }
      if (question.id === "contact_consent" && parsed === "Not now") {
        if (application) {
          const result = await activity("stopped");
          if (result?.application) setApplication(result.application);
        }
        setStopped(true);
        return;
      }
      const result = !application
        ? await intake("POST", { answers: { contact_consent: parsed } })
        : await intake("PATCH", {
            action: "answer",
            revision: application.revision,
            question: question.id,
            value: parsed,
          });
      setApplication(result.application);
      setLocal({});
      setValue("");
      setSaveNotice("");
    });
  }
  async function change(action: string, extra: Record<string, unknown> = {}) {
    if (!application) return;
    await perform(async () => {
      if (
        (action === "navigate" || action === "rewind") &&
        question &&
        question.type !== "choice"
      )
        await activity("draft_saved", true);
      const result = await intake("PATCH", {
        action,
        revision: application.revision,
        ...extra,
      });
      if (action === "draft")
        window.location.assign("/dashboard/listings/" + result.id);
      else setApplication(result.application);
      setValue("");
      setSaveNotice("");
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
                    <span>
                      {answers[q.id] || "Skipped for now"}
                      {application &&
                        Object.hasOwn(application.draft_answers, q.id) &&
                        application.draft_answers[q.id] !==
                          (answers[q.id] || "") && (
                          <small className="funnel-unfinished">
                            Unfinished change:{" "}
                            {application.draft_answers[q.id] || "Cleared"} —
                            choose Edit to confirm.
                          </small>
                        )}
                    </span>
                    {!complete && q.section === "asset" && (
                      <button
                        disabled={busy}
                        onClick={() => change("navigate", { question: q.id })}
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
                  {application
                    ? "Your saved progress is kept. Come back whenever you are ready."
                    : "Nothing has been saved. Come back whenever you are ready."}
                </p>
                <button
                  className="btn dark"
                  onClick={() => {
                    setStopped(false);
                    setLocal({});
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
                  Check your answers. Use Back or Edit to make changes; other
                  answers stay saved.
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
                    : `Asset details · ${active.filter((q) => q.section === "asset").findIndex((q) => q.id === question.id) + 1} of ${activeQuestions(answers).filter((q) => q.section === "asset").length}`}
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
            {!complete && !stopped && previous && (
              <button
                className="funnel-back"
                disabled={busy}
                onClick={() => change("navigate", { question: previous.id })}
              >
                ← Back
              </button>
            )}
            <p className="intake-save" role="status">
              {busy
                ? "Saving your answer…"
                : application
                  ? saveNotice || "Saved. You can finish later."
                  : "No account needed. Contact details save after your consent."}
            </p>
          </div>
        </div>
        {(application || error) && (
          <div className="intake-tools">
            {application && !complete && (
              <button
                disabled={busy}
                onClick={() => change("navigate", { question: "contact_name" })}
              >
                Update contact details
              </button>
            )}
            <button
              disabled={busy}
              onClick={() =>
                perform(async () => {
                  await activity("paused", true);
                  await intake("DELETE");
                  setApplication(null);
                  setLocal({});
                  setValue("");
                  setStopped(false);
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
