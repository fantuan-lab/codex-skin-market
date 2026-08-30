"use client";

import { Eye, EyeSlash, GoogleLogo, LockKey } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { safeReturnPath } from "@/lib/auth/paths";
import { getUiCopy, type Locale } from "@/lib/i18n";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

const subscribeToBrowser = () => () => undefined;
const getBrowserSnapshot = () => true;
const getServerSnapshot = () => false;

export function AuthForm({
  initialError,
  locale,
  next,
}: Readonly<{
  initialError?: string;
  locale: Locale;
  next?: string;
}>) {
  const copy = getUiCopy(locale).auth;
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const passwordHintId = useId();
  const configurationId = useId();
  const feedbackId = useId();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [status, setStatus] = useState<string | null>(null);
  const hasCheckedConfiguration = useSyncExternalStore(
    subscribeToBrowser,
    getBrowserSnapshot,
    getServerSnapshot,
  );
  const client = useMemo(
    () => (hasCheckedConfiguration ? createBrowserSupabaseClient() : null),
    [hasCheckedConfiguration],
  );

  const isConfigured = client !== null;
  const fallback = locale === "zh" ? "/zh/workspace" : "/workspace";
  const safeNext = safeReturnPath(next, fallback);

  const resetFeedback = () => {
    setError(null);
    setStatus(null);
  };

  const setAuthMode = (nextMode: AuthMode) => {
    if (isPending || mode === nextMode) return;
    setMode(nextMode);
    setPassword("");
    setShowPassword(false);
    resetFeedback();
  };

  const callbackUrl = () => {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("returnTo", safeNext);
    return url.toString();
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !isConfigured || isPending) return;

    setIsPending(true);
    resetFeedback();

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;

        setStatus(copy.redirecting);
        router.replace(safeNext);
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        setStatus(copy.redirecting);
        router.replace(safeNext);
        router.refresh();
      } else {
        setStatus(copy.signUpNotice);
        setPassword("");
      }
    } catch {
      // Keep the same response for invalid credentials, existing accounts, and
      // provider failures so the form does not reveal whether an account exists.
      setError(copy.genericError);
    } finally {
      setIsPending(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!client || !isConfigured || isPending) return;

    setIsPending(true);
    resetFeedback();
    try {
      const { error: oauthError } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl(),
          scopes: "openid email profile",
        },
      });
      if (oauthError) throw oauthError;
    } catch {
      setError(copy.genericError);
      setIsPending(false);
    }
  };

  return (
    <div className="auth-form-wrap">
      <div className="auth-mode-switch" role="group" aria-label={copy.formAria}>
        <button
          type="button"
          aria-pressed={mode === "sign-in"}
          disabled={isPending}
          onClick={() => setAuthMode("sign-in")}
        >
          {copy.signInTab}
        </button>
        <button
          type="button"
          aria-pressed={mode === "sign-up"}
          disabled={isPending}
          onClick={() => setAuthMode("sign-up")}
        >
          {copy.signUpTab}
        </button>
      </div>

      {hasCheckedConfiguration && !isConfigured ? (
        <p className="auth-configuration-note" id={configurationId} role="status">
          <LockKey weight="duotone" aria-hidden="true" />
          <span>{copy.configurationMissing}</span>
        </p>
      ) : null}

      <form
        className="auth-form"
        aria-label={copy.formAria}
        aria-describedby={hasCheckedConfiguration && !isConfigured ? configurationId : undefined}
        onSubmit={handleEmailAuth}
      >
        <div className="auth-field">
          <label htmlFor={emailId}>{copy.emailLabel}</label>
          <input
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={copy.emailPlaceholder}
            value={email}
            required
            disabled={!isConfigured || isPending}
            onChange={(event) => {
              setEmail(event.target.value);
              resetFeedback();
            }}
          />
        </div>

        <div className="auth-field">
          <label htmlFor={passwordId}>{copy.passwordLabel}</label>
          <div className="password-field">
            <input
              id={passwordId}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={mode === "sign-up" ? 8 : undefined}
              aria-describedby={mode === "sign-up" ? passwordHintId : undefined}
              value={password}
              required
              disabled={!isConfigured || isPending}
              onChange={(event) => {
                setPassword(event.target.value);
                resetFeedback();
              }}
            />
            <button
              type="button"
              className="password-visibility"
              aria-label={showPassword ? copy.hidePassword : copy.showPassword}
              aria-pressed={showPassword}
              disabled={!isConfigured || isPending}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? (
                <EyeSlash aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
            </button>
          </div>
          {mode === "sign-up" ? (
            <p className="auth-field-help" id={passwordHintId}>
              {copy.passwordHint}
            </p>
          ) : null}
        </div>

        <button
          className="auth-submit"
          type="submit"
          disabled={!isConfigured || isPending}
        >
          {isPending
            ? copy.working
            : mode === "sign-in"
              ? copy.signInAction
              : copy.signUpAction}
        </button>
      </form>

      <div className="auth-divider" aria-hidden="true">
        <span>{copy.divider}</span>
      </div>

      <button
        className="google-auth-button"
        type="button"
        disabled={!isConfigured || isPending}
        onClick={handleGoogleAuth}
      >
        <GoogleLogo weight="bold" aria-hidden="true" />
        {copy.googleAction}
      </button>

      <div
        id={feedbackId}
        className="auth-feedback"
        aria-live="polite"
        aria-atomic="true"
      >
        {error ? <p role="alert">{error}</p> : null}
        {status ? <p role="status">{status}</p> : null}
      </div>
    </div>
  );
}
