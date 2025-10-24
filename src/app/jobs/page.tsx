"use client";

import React from "react";
import Navbar from "@/components/ui/navBar";
import JobTable from "@/components/jobTableComp/jobTable";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";

export default function Jobs() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();

  // Show loading spinner while checking authentication
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
    <div>
      <Navbar />
      <JobTable />
    </div>
  );
}
