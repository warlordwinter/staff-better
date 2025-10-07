"use client";

import { signInWithGoogle, signInWithAzure } from "@/lib/auth/actions";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/loadingSpinner";

export default function LoginPage() {
  const { user, loading, isAuthenticated } = useAuthCheck();
  const router = useRouter();

  // Handle redirect for authenticated users with setup completion check
  useEffect(() => {
    if (!loading && user) {
      // Check if user has completed company setup
      const hasCompletedSetup =
        user.user_metadata?.company_setup_completed === true;

      if (hasCompletedSetup) {
        router.push("/jobs");
      } else {
        router.push("/company-setup");
      }
    }
  }, [user, loading, router]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  // Don't render login form if user is authenticated (will redirect)
  if (isAuthenticated) {
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
            Sign in to your account or create a new one
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Social Login Buttons */}
          <div className="space-y-4">
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ "--tw-ring-color": "#F59144" } as React.CSSProperties}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>
            </form>

            <form action={signInWithAzure}>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="9" height="9" fill="#F35325" />
                  <rect x="13" y="2" width="9" height="9" fill="#81BC06" />
                  <rect x="2" y="13" width="9" height="9" fill="#05A6F0" />
                  <rect x="13" y="13" width="9" height="9" fill="#FFBA08" />
                </svg>
                Continue with Microsoft
              </button>
            </form>
          </div>

          {/* Additional Info for New Users */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              New users will be guided through a quick company setup process
            </p>
          </div>

          {/* Back Link */}
          <div className="text-left">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
