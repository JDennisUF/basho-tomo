"use client";

import { useState } from "react";
import { useAuthState } from "@/lib/supabase/auth-state";

type AuthStatusProps = {
  onLogin: () => void;
};

export function AuthStatus({ onLogin }: AuthStatusProps) {
  const { displayName, email, isLoading, supabase } = useAuthState();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
  }

  const buttonClass =
    "inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[6px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60";

  if (isLoading) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)]">
          <span className="h-2 w-2 rounded-full bg-[color:var(--line-strong)]" aria-hidden="true" />
          <span className="fine-label">確認中</span>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)]">
          <span className="h-2 w-2 rounded-full bg-[color:var(--line-strong)]" aria-hidden="true" />
          <span className="fine-label">未接続</span>
        </div>
        <button
          type="button"
          onClick={onLogin}
          className={buttonClass}
          title="Log in"
          aria-label="Log in"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M10 7V5.8c0-1 .8-1.8 1.8-1.8h5.4c1 0 1.8.8 1.8 1.8v12.4c0 1-.8 1.8-1.8 1.8h-5.4c-1 0-1.8-.8-1.8-1.8V17"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M4 12h9m0 0-3.2-3.2M13 12l-3.2 3.2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    );
  }

  const visibleName = displayName ?? email;

  return (
    <div className="mt-2 flex max-w-full items-center gap-2">
      <div
        className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)]"
        title={displayName ? email : undefined}
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--accent)]" aria-hidden="true" />
        <span className="fine-label shrink-0">接続中</span>
        <span className="data-sans min-w-0 truncate text-[color:var(--ink)]">{visibleName}</span>
      </div>
      <button
        type="button"
        onClick={signOut}
        disabled={isSigningOut}
        className={buttonClass}
        title="Log out"
        aria-label="Log out"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path
            d="M14 7V5.8c0-1-.8-1.8-1.8-1.8H6.8c-1 0-1.8.8-1.8 1.8v12.4c0 1 .8 1.8 1.8 1.8h5.4c1 0 1.8-.8 1.8-1.8V17"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M20 12h-9m0 0 3.2-3.2M11 12l3.2 3.2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
