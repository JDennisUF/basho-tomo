"use client";

import { useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { AUTH_PROFILE_UPDATED_EVENT } from "@/lib/auth-events";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Profile = {
  display_name: string | null;
};

export function useAuthState() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [requiresAccountSetup, setRequiresAccountSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    async function loadProfile(nextSession: Session | null) {
      setSession(nextSession);

      if (!nextSession?.user.id) {
        setDisplayName(null);
        setRequiresAccountSetup(false);
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", nextSession.user.id)
        .maybeSingle<Profile>();

      if (isCurrent) {
        setDisplayName(data?.display_name?.trim() || null);
        setRequiresAccountSetup(!nextSession.user.user_metadata?.password_setup_completed_at);
        setIsLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (isCurrent) {
        void loadProfile(data.session);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadProfile(nextSession);
    });

    const handleProfileUpdated = () => {
      void supabase.auth.getSession().then(({ data }) => loadProfile(data.session));
    };

    window.addEventListener(AUTH_PROFILE_UPDATED_EVENT, handleProfileUpdated);

    return () => {
      isCurrent = false;
      listener.subscription.unsubscribe();
      window.removeEventListener(AUTH_PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, [supabase]);

  return {
    displayName,
    email: session?.user.email ?? null,
    isLoading,
    requiresAccountSetup,
    session,
    supabase,
  };
}
