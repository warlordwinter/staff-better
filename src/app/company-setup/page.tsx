"use client";

import { useAuthCheck } from "@/hooks/useAuthCheck";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import CompanySetupForm from "./CompanySetupForm";

export default function CompanySetupPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuthCheck();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      // Check if user has already completed setup
      const hasCompletedSetup =
        user.user_metadata?.company_setup_completed === true;

      if (hasCompletedSetup) {
        router.push("/jobs");
      }
    }
  }, [user, authLoading, router]);

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  // Don't render content if user is not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Image height={80} width={80} alt="Logo" src="/icons/logo.svg" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Staff Better
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please provide some information about your company
          </p>
        </div>

        <CompanySetupForm userEmail={user.email || ""} />
      </div>
    </div>
  );
}
