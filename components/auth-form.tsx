"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { ErrorBox } from "@/components/ui";
const titles: Record<string, string> = {
  "sign-in": "Welcome back.",
  "sign-up": "Join the Exchange.",
  "verify-email": "Verify your email.",
  "forgot-password": "Recover your account.",
  "reset-password": "Set a new password.",
};
export function AuthForm({ mode }: { mode: string }) {
  const router = useRouter(),
    params = useSearchParams();
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [email, setEmail] = useState(params.get("email") || ""),
    [sent, setSent] = useState(false);
  async function sendCode() {
    setBusy(true);
    setError("");
    try {
      const r = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (r.error) throw new Error(r.error.message);
      setSent(true);
      setNotice("Check your email for a verification code.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-section">
      <div className="panel auth-card">
        <p className="eyebrow">Tafari Capital · Account</p>
        <h1>{titles[mode] || titles["sign-in"]}</h1>
        <p>
          {mode === "sign-up"
            ? "One account to list assets, make offers and work with the Tafari deal desk."
            : mode === "verify-email"
              ? "Email verification protects your account and is required to submit assets, offers and files."
              : "Your workspace keeps opportunities, documents and conversations together."}
        </p>
        <ErrorBox message={error} />
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setNotice("");
            setBusy(true);
            const f = new FormData(e.currentTarget),
              password = String(f.get("password") || "");
            try {
              if (mode === "sign-up") {
                const r = await authClient.signUp.email({
                  email,
                  password,
                  name: String(f.get("name")),
                  callbackURL: location.origin + "/dashboard",
                });
                if (r.error) throw new Error(r.error.message);
                router.push(
                  "/auth/verify-email?email=" + encodeURIComponent(email),
                );
                router.refresh();
              } else if (mode === "verify-email") {
                const r = await authClient.emailOtp.verifyEmail({
                  email,
                  otp: String(f.get("otp")),
                });
                if (r.error) throw new Error(r.error.message);
                router.push("/dashboard");
                router.refresh();
              } else if (mode === "forgot-password") {
                const r = await authClient.requestPasswordReset({
                  email,
                  redirectTo: location.origin + "/auth/reset-password",
                });
                if (r.error) throw new Error(r.error.message);
                setNotice(
                  "If this account exists, check your email for recovery instructions.",
                );
              } else if (mode === "reset-password") {
                const token = params.get("token");
                if (!token)
                  throw new Error(
                    "Open the recovery link from your email first.",
                  );
                const r = await authClient.resetPassword({
                  newPassword: password,
                  token,
                });
                if (r.error) throw new Error(r.error.message);
                setNotice("Password updated. You can now sign in.");
              } else {
                const r = await authClient.signIn.email({ email, password });
                if (r.error) throw new Error(r.error.message);
                router.push("/dashboard");
                router.refresh();
              }
            } catch (x) {
              setError((x as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode === "sign-up" && (
            <label>
              Full name
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
              />
            </label>
          )}
          {mode !== "reset-password" && (
            <label>
              Email address
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
          )}
          {["sign-in", "sign-up", "reset-password"].includes(mode) && (
            <label>
              Password
              <input
                type="password"
                name="password"
                required
                minLength={mode === "sign-in" ? 1 : 12}
                maxLength={128}
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
              />
              {mode !== "sign-in" && (
                <small className="muted">Use at least 12 characters.</small>
              )}
            </label>
          )}
          {mode === "verify-email" && (
            <>
              <button
                className="btn outline"
                type="button"
                onClick={sendCode}
                disabled={busy || !email}
              >
                {sent ? "Send a new code" : "Email me a code"}
              </button>
              <label>
                Verification code
                <input
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  minLength={6}
                  maxLength={8}
                />
              </label>
            </>
          )}
          {mode === "sign-up" && (
            <label className="check">
              <input type="checkbox" required />I agree to the{" "}
              <Link href="/terms">platform terms</Link> and{" "}
              <Link href="/privacy">privacy notice</Link>.
            </label>
          )}
          <button className="btn dark" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "sign-up"
                ? "Create account →"
                : mode === "verify-email"
                  ? "Verify email →"
                  : mode === "forgot-password"
                    ? "Send recovery email →"
                    : mode === "reset-password"
                      ? "Update password →"
                      : "Sign in →"}
          </button>
        </form>
        <div className="auth-links">
          <Link href={mode === "sign-up" ? "/auth/sign-in" : "/auth/sign-up"}>
            {mode === "sign-up"
              ? "Already registered? Sign in"
              : "Create an account"}
          </Link>
          <Link href="/auth/forgot-password">Forgot password?</Link>
        </div>
        <p className="account-note">
          Tafari staff: sign in with your verified staff email, then open the
          back office from your workspace.
        </p>
      </div>
    </div>
  );
}
