"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Create the Supabase client once and keep it stable
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Get initial user
    const getInitialUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          setAuthState((prev) => ({
            ...prev,
            error: error.message,
            loading: false,
          }));
          return;
        }

        setAuthState((prev) => ({
          ...prev,
          user: user ?? null,
          loading: false,
        }));
      } catch {
        setAuthState((prev) => ({
          ...prev,
          error: "Failed to get user",
          loading: false,
        }));
      }
    };

    getInitialUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        loading: false,
      }));
    });

    return () => subscription.unsubscribe();
  }, [supabase]); // ✅ include supabase so the hook passes exhaustive-deps

  const signInWithAzure = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "openid profile email",
        },
      });

      if (error) {
        setAuthState((prev) => ({
          ...prev,
          error: error.message,
          loading: false,
        }));
      }
    } catch {
      setAuthState((prev) => ({
        ...prev,
        error: "Failed to sign in with Azure",
        loading: false,
      }));
    }
  };

  const signOut = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signOut();

      if (error) {
        setAuthState((prev) => ({
          ...prev,
          error: error.message,
          loading: false,
        }));
      }
    } catch {
      setAuthState((prev) => ({
        ...prev,
        error: "Failed to sign out",
        loading: false,
      }));
    }
  };

  const signInWithGoogle = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setAuthState((prev) => ({
          ...prev,
          error: error.message,
          loading: false,
        }));
      }
    } catch {
      setAuthState((prev) => ({
        ...prev,
        error: "Failed to sign in with Google",
        loading: false,
      }));
    }
  };

  return {
    ...authState,
    signInWithAzure,
    signInWithGoogle,
    signOut,
  };
};
