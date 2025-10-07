"use client";

import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";

export default function GroupsPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuthCheck();

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
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: "#F59144" }}
          >
            Groups
          </h1>
          <p className="text-2xl md:text-3xl text-neutral-800">
            Coming Soon! Stay Tuned!
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
