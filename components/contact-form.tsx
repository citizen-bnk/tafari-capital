"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { ErrorBox } from "@/components/ui";
export function ContactForm() {
  const [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  return done ? (
    <div className="panel success">
      <h3>Your enquiry is with Tafari.</h3>
      <p>
        The team will review it in the back office and contact you using the
        email you supplied.
      </p>
    </div>
  ) : (
    <form
      className="panel form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const d = Object.fromEntries(new FormData(e.currentTarget));
        try {
          await api("enquiries", { ...d, consent: d.consent === "on" });
          setDone(true);
        } catch (x) {
          setError((x as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Your name
        <input
          name="name"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
        />
      </label>
      <label>
        Company
        <input name="company" maxLength={160} autoComplete="organization" />
      </label>
      <label className="full">
        Email
        <input type="email" name="email" required autoComplete="email" />
      </label>
      <label className="full">
        How can we help?
        <textarea
          name="message"
          required
          minLength={20}
          maxLength={5000}
          rows={5}
        />
      </label>
      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="check full">
        <input type="checkbox" name="consent" required />I agree to Tafari using
        these details to respond, as described in the privacy notice.
      </label>
      <div className="full">
        <ErrorBox message={error} />
        <button className="btn dark" disabled={busy}>
          {busy ? "Sending…" : "Send enquiry →"}
        </button>
      </div>
      <small className="muted full">
        Keep technical data and confidential documents out of this first
        enquiry.
      </small>
    </form>
  );
}
