"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { BillingPage } from "@/components/BillingPage";

export default function Billing() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const router = useRouter();

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
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <BillingPage onBack={() => router.push("/home")} />
      <Footer />
    </div>
  );
}
