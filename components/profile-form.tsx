"use client";
import { useState } from "react";
import { api, useResource } from "@/lib/client";
import { User } from "@/lib/types";
import { PageIntro, ErrorBox, Loading } from "@/components/ui";
export function ProfileForm() {
  const { data, error, loading } = useResource<{ actor: User }>("dashboard");
  const [message, setMessage] = useState(""),
    [saveError, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error} />;
  return (
    <>
      <PageIntro eyebrow="Account details" title="Tell us how you work.">
        Your role helps Tafari understand your interests. You can both list
        assets and make offers with the same account.
      </PageIntro>
      <form
        className="panel form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          const f = Object.fromEntries(new FormData(e.currentTarget));
          try {
            await api("profile", f);
            setMessage("Profile saved.");
          } catch (x) {
            setError((x as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          I am a
          <select
            name="role"
            defaultValue={
              ["owner", "buyer", "partner"].includes(data.actor.role)
                ? data.actor.role
                : "member"
            }
          >
            <option value="member">Participant</option>
            <option value="owner">Asset owner</option>
            <option value="buyer">Buyer or investor</option>
            <option value="partner">Service partner</option>
          </select>
        </label>
        <label>
          Company
          <input
            name="company"
            defaultValue={data.actor.company}
            maxLength={160}
          />
        </label>
        <label>
          Phone
          <input
            name="phone"
            defaultValue={data.actor.phone}
            maxLength={40}
            type="tel"
          />
        </label>
        <label>
          Country
          <select name="country" defaultValue={data.actor.country || "Lesotho"}>
            <option>Lesotho</option>
            <option>South Africa</option>
            <option>Other</option>
          </select>
        </label>
        <div className="full">
          <p className="muted">Account email: {data.actor.email}</p>
          <ErrorBox message={saveError} />
          {message && (
            <div className="notice success" role="status">
              {message}
            </div>
          )}
          <button className="btn dark" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </>
  );
}
