"use client";

import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LoginOverlayProps = {
  onClose: () => void;
};

type LoginStatus = {
  tone: "error" | "success";
  message: string;
};

export function LoginOverlay({ onClose }: LoginOverlayProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<LoginStatus | null>(null);

  async function submitPasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setStatus({ tone: "error", message: "メールと合言葉を入力" });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setStatus({ tone: "error", message: error.message });
      return;
    }

    onClose();
  }

  async function submitMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setStatus({ tone: "error", message: "メール未入力" });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setIsSubmitting(false);

    if (error) {
      setStatus({ tone: "error", message: error.message });
      return;
    }

    setStatus({ tone: "success", message: "確認メール送信済み" });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(33,25,21,0.52)] px-4 py-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="texture-panel w-full max-w-md overflow-hidden rounded-[8px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[color:var(--line)] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Login">
                認証
              </div>
              <h2 className="mt-2 text-3xl" title="Login">ログイン</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="fine-label rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              title="Close login"
            >
              閉じる
            </button>
          </div>
        </div>

        <div className="px-5 pt-5 sm:px-6">
          <div className="grid grid-cols-2 rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setStatus(null);
              }}
              className={`rounded-[6px] px-3 py-2 text-base transition ${
                mode === "password"
                  ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                  : "text-[color:var(--ink-soft)]"
              }`}
              title="Password login"
            >
              合言葉
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("magic");
                setStatus(null);
              }}
              className={`rounded-[6px] px-3 py-2 text-base transition ${
                mode === "magic"
                  ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                  : "text-[color:var(--ink-soft)]"
              }`}
              title="Magic link login"
            >
              初回メール
            </button>
          </div>
        </div>

        <form
          className="space-y-4 px-5 py-5 sm:px-6"
          onSubmit={mode === "password" ? submitPasswordLogin : submitMagicLink}
        >
          <label className="flex flex-col gap-2">
            <span className="fine-label text-sm text-[color:var(--ink-soft)]" title="Email address">
              メール
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base"
              autoComplete="email"
              autoFocus
            />
          </label>

          {mode === "password" ? (
            <label className="flex flex-col gap-2">
              <span className="fine-label text-sm text-[color:var(--ink-soft)]" title="Password">
                合言葉
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base"
                autoComplete="current-password"
              />
            </label>
          ) : (
            <p className="text-sm text-[color:var(--ink-soft)]">
              Use the email link the first time. After setup, sign in with email and password.
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="fine-label w-full rounded-[6px] border border-[color:var(--line)] px-3 py-2 text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
            title={mode === "password" ? "Log in with password" : "Send magic link by email"}
          >
            {isSubmitting ? "処理中" : mode === "password" ? "ログイン" : "認証リンク送信"}
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
