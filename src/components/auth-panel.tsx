"use client";

import { FormEvent, useState } from "react";
import { AUTH_PROFILE_UPDATED_EVENT } from "@/lib/auth-events";
import { useAuthState } from "@/lib/supabase/auth-state";

type AuthPanelStatus = {
  tone: "neutral" | "error" | "success";
  message: string;
};

export function AuthPanel() {
  const { displayName, email, session, supabase } = useAuthState();
  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<AuthPanelStatus | null>(null);
  const nickname = nicknameDraft ?? displayName ?? "";

  async function saveNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.user.id) {
      return;
    }

    const normalizedNickname = nickname.trim();
    setIsSubmitting(true);
    setStatus(null);

    const { error } = await supabase.from("profiles").upsert({
      user_id: session.user.id,
      display_name: normalizedNickname || null,
    });

    setIsSubmitting(false);

    if (error) {
      setStatus({ tone: "error", message: error.message });
      return;
    }

    setNicknameDraft(normalizedNickname);
    window.dispatchEvent(new CustomEvent(AUTH_PROFILE_UPDATED_EVENT));
    setStatus({ tone: "success", message: "表示名保存済み" });
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.user.id) {
      return;
    }

    if (password.length < 8) {
      setStatus({ tone: "error", message: "合言葉は8文字以上" });
      return;
    }

    if (password !== passwordConfirm) {
      setStatus({ tone: "error", message: "合言葉が一致しません" });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const { error } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (error) {
      setStatus({ tone: "error", message: error.message });
      return;
    }

    setPassword("");
    setPasswordConfirm("");
    setStatus({ tone: "success", message: "合言葉保存済み" });
  }

  if (!email) {
    return null;
  }

  const statusClass =
    status?.tone === "error"
      ? "text-[color:var(--accent)]"
      : status?.tone === "success"
        ? "text-[color:var(--ink)]"
        : "text-[color:var(--ink-soft)]";

  return (
    <section className="border-t border-[color:var(--line)] pt-5">
      <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Account">
        帳合
      </div>
      <div className="mt-3 space-y-3">
        <form className="space-y-3" onSubmit={saveNickname}>
          <label className="flex flex-col gap-2">
            <span className="fine-label text-xs text-[color:var(--ink-soft)]" title="Nickname">
              呼名
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
          <button
            type="submit"
            disabled={isSubmitting}
            className="fine-label w-full rounded-[6px] border border-[color:var(--line)] px-3 py-2 text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
            title="Save nickname"
          >
            表示名保存
          </button>
        </form>
        <form className="space-y-3 border-t border-[color:var(--line)] pt-4" onSubmit={savePassword}>
          <label className="flex flex-col gap-2">
            <span className="fine-label text-xs text-[color:var(--ink-soft)]" title="Password">
              合言葉
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
            <span className="fine-label text-xs text-[color:var(--ink-soft)]" title="Confirm password">
              合言葉確認
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
            title="Save password"
          >
            合言葉保存
          </button>
        </form>
      </div>
      {status ? (
        <p className={`mt-3 text-sm ${statusClass}`} role={status.tone === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
