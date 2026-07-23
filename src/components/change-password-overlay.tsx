"use client";

import { FormEvent, useState } from "react";
import { AUTH_PROFILE_UPDATED_EVENT } from "@/lib/auth-events";
import { useAuthState } from "@/lib/supabase/auth-state";

type ChangePasswordOverlayProps = {
  onClose: () => void;
};

type ChangePasswordStatus = {
  tone: "error" | "success";
  message: string;
};

export function ChangePasswordOverlay({ onClose }: ChangePasswordOverlayProps) {
  const { email, requiresAccountSetup, session, supabase } = useAuthState();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<ChangePasswordStatus | null>(null);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.user.id) {
      setStatus({ tone: "error", message: "Sign in first." });
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

    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        password_setup_completed_at: new Date().toISOString(),
      },
    });

    setIsSubmitting(false);

    if (error) {
      setStatus({ tone: "error", message: error.message });
      return;
    }

    window.dispatchEvent(new CustomEvent(AUTH_PROFILE_UPDATED_EVENT));
    setStatus({ tone: "success", message: "Password saved." });
    setPassword("");
    setPasswordConfirm("");
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-[rgba(33,25,21,0.52)] px-4 py-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="texture-panel w-full max-w-md overflow-hidden rounded-[8px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[color:var(--line)] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Password">
                Password
              </div>
              <h2 className="mt-2 text-3xl">Change Password</h2>
              {email ? (
                <p className="data-sans mt-2 text-sm text-[color:var(--ink-soft)]">
                  {email}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="fine-label rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              title="Close password dialog"
            >
              閉じる
            </button>
          </div>
        </div>

        <form className="space-y-4 px-5 py-5 sm:px-6" onSubmit={submitPassword}>
          {requiresAccountSetup ? (
            <p className="text-sm text-[color:var(--accent)]">
              Finish first-login setup before changing the password here.
            </p>
          ) : null}

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
            disabled={isSubmitting || requiresAccountSetup}
            className="fine-label w-full rounded-[6px] border border-[color:var(--line)] px-3 py-2 text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
            title="Save password"
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
