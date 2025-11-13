"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";

export const useAuthCheck = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const wasAuthenticatedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!loading) {
      // If user was previously authenticated but is now null, they logged out
      if (wasAuthenticatedRef.current && !user) {
        router.push("/");
      }
      // If user was never authenticated and is still null, redirect to login
      else if (!wasAuthenticatedRef.current && !user) {
        router.push("/login");
      }
      
      // Update the ref to track current authentication state
      wasAuthenticatedRef.current = !!user;
    }
  }, [user, loading, router]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
};
