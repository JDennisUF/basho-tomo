"use client";

import { FormEvent, useState } from "react";
import { AUTH_PROFILE_UPDATED_EVENT } from "@/lib/auth-events";
import { useAuthState } from "@/lib/supabase/auth-state";

type SetupStatus = {
  tone: "error" | "success";
  message: string;
};

export function AccountSetupOverlay() {
  const { displayName, email, requiresAccountSetup, session, supabase } = useAuthState();
  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const nickname = nicknameDraft ?? displayName ?? "";

  async function submitSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.user.id) {
      return;
    }

    if (password.length < 8) {
      setStatus({ tone: "error", message: "Password must be at least 8 characters." });
      return;
    }

    if (password !== passwordConfirm) {
      setStatus({ tone: "error", message: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const { error: passwordError } = await supabase.auth.updateUser({
      password,
      data: {
        password_setup_completed_at: new Date().toISOString(),
      },
    });
    if (passwordError) {
      setIsSubmitting(false);
      setStatus({ tone: "error", message: passwordError.message });
      return;
    }

    const normalizedNickname = nickname.trim();
    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: session.user.id,
      display_name: normalizedNickname || null,
    });

    setIsSubmitting(false);

    if (profileError) {
      setStatus({ tone: "error", message: profileError.message });
      return;
    }

    setPassword("");
    setPasswordConfirm("");
    window.dispatchEvent(new CustomEvent(AUTH_PROFILE_UPDATED_EVENT));
    setStatus({ tone: "success", message: "Account setup complete." });
  }

  if (!email || !requiresAccountSetup) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[rgba(33,25,21,0.72)] px-4 py-6 sm:items-center">
      <div className="texture-panel w-full max-w-md overflow-hidden rounded-[8px]">
        <div className="border-b border-[color:var(--line)] px-5 py-4 sm:px-6">
          <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Account setup">
            Account
          </div>
          <h2 className="mt-2 text-3xl">Finish Setup</h2>
          <p className="data-sans mt-2 text-sm text-[color:var(--ink-soft)]">
            Set a password for {email}. Nickname is optional.
          </p>
        </div>

        <form className="space-y-4 px-5 py-5 sm:px-6" onSubmit={submitSetup}>
          <label className="flex flex-col gap-2">
            <span className="fine-label text-sm text-[color:var(--ink-soft)]" title="Nickname">
              Nickname
            </span>
            <input
              type="text"
              value={nickname}
              onChange={(event) => setNicknameDraft(event.target.value)}
              className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base"
              autoComplete="nickname"
              maxLength={80}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="fine-label text-sm text-[color:var(--ink-soft)]" title="Password">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base"
              autoComplete="new-password"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="fine-label text-sm text-[color:var(--ink-soft)]" title="Confirm password">
              Confirm Password
            </span>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base"
              autoComplete="new-password"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="fine-label w-full rounded-[6px] border border-[color:var(--line)] px-3 py-2 text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
            title="Complete account setup"
          >
            {isSubmitting ? "Saving" : "Save Password"}
          </button>

          {status ? (
            <p
              className={`text-sm ${
                status.tone === "error" ? "text-[color:var(--accent)]" : "text-[color:var(--ink)]"
              }`}
              role={status.tone === "error" ? "alert" : "status"}
            >
              {status.message}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
