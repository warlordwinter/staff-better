"use client";

import { useEffect } from "react";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import LoadingSpinner from "@/components/ui/loadingSpinner";

export default function Jobs() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Redirect to reminders page
      window.location.href = "/reminders";
    }
  }, [authLoading, isAuthenticated]);

  // Show loading spinner while checking authentication or redirecting
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  // Don't render content if user is not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <LoadingSpinner />
    </div>
  );
}
