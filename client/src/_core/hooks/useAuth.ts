import { trpc } from "@/lib/trpc";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

export function useAuth() {
  const supabase = getBrowserSupabase();
  const utils = trpc.useUtils();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    let mounted = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setSession(error ? null : data.session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      if (!nextSession) setIsPasswordRecovery(false);
      setAuthLoading(false);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: Boolean(session?.access_token),
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const signIn = useCallback(async (email: string, password: string) => {
    const client = getBrowserSupabase();
    if (!client) throw new Error("Supabase Auth is not configured for this site.");
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    await utils.auth.me.invalidate();
  }, [utils]);

  const resetPassword = useCallback(async (email: string) => {
    const client = getBrowserSupabase();
    if (!client) throw new Error("Supabase Auth is not configured for this site.");
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin?recovery=1`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const client = getBrowserSupabase();
    if (!client) throw new Error("Supabase Auth is not configured for this site.");
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
    setIsPasswordRecovery(false);
    await utils.auth.me.invalidate();
  }, [utils]);

  const logout = useCallback(async () => {
    const client = getBrowserSupabase();
    if (client) {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    }
    setSession(null);
    setIsPasswordRecovery(false);
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [utils]);

  const refresh = useCallback(async () => {
    const client = getBrowserSupabase();
    if (client) {
      const { data } = await client.auth.getSession();
      setSession(data.session);
    }
    await utils.auth.me.invalidate();
  }, [utils]);

  return {
    user: meQuery.data ?? null,
    loading: authLoading || Boolean(session && meQuery.isLoading),
    error: meQuery.error ?? null,
    isAuthenticated: Boolean(session && meQuery.data),
    isPasswordRecovery,
    signIn,
    resetPassword,
    updatePassword,
    refresh,
    logout,
  };
}
