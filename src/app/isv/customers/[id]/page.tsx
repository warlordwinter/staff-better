"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/ui/navBar";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";

interface OnboardingStatus {
  customer: {
    id: string;
    name: string;
    legal_name: string;
    contact_email: string;
    status: string;
    created_at: string;
  };
  subaccount: {
    sid: string;
    status: string;
  } | null;
  onboardingComplete: boolean;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const customerId = params.id as string;

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/isv/customers/${customerId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch customer status");
        }

        const data = await response.json();
        setStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [customerId, isAuthenticated, authLoading]);

  const handleDeleteSubaccount = async () => {
    if (!status?.subaccount) {
      setDeleteError("No subaccount to delete");
      return;
    }

    // Confirm deletion (this is irreversible)
    const confirmed = window.confirm(
      "Are you sure you want to delete this subaccount? This action is irreversible and will release all associated phone numbers."
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError(null);

      const response = await fetch(
        `/api/isv/subaccounts?customer_id=${customerId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete subaccount");
      }

      // Refresh the page data to show updated status
      const fetchStatus = async () => {
        const statusResponse = await fetch(`/api/isv/customers/${customerId}`);
        if (statusResponse.ok) {
          const data = await statusResponse.json();
          setStatus(data);
        }
      };
      await fetchStatus();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete subaccount"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Navbar />
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 mt-24">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => router.push("/isv/onboarding")}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Back to Onboarding
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 mt-24">
        <div className="mb-8">
          <button
            onClick={() => router.push("/isv/onboarding")}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Back to Onboarding
          </button>
          <h1 className="text-5xl font-semibold text-black mb-2">
            Customer Details
          </h1>
          <p className="text-gray-600 text-lg">
            View customer onboarding status and information
          </p>
        </div>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-black mb-4">
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Name
                </label>
                <p className="text-black mt-1">{status.customer.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Legal Name
                </label>
                <p className="text-black mt-1">{status.customer.legal_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Contact Email
                </label>
                <p className="text-black mt-1">
                  {status.customer.contact_email}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <div className="mt-1">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      status.customer.status
                    )}`}
                  >
                    {status.customer.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Created At
                </label>
                <p className="text-black mt-1">
                  {new Date(status.customer.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Subaccount Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-black">
                Twilio Subaccount
              </h2>
              {status.subaccount && status.subaccount.status !== "deleted" && (
                <button
                  onClick={handleDeleteSubaccount}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeleting ? "Deleting..." : "Delete Subaccount"}
                </button>
              )}
            </div>
            {deleteError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{deleteError}</p>
              </div>
            )}
            {status.subaccount ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Subaccount SID
                  </label>
                  <p className="text-black mt-1 font-mono text-sm">
                    {status.subaccount.sid}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        status.subaccount.status
                      )}`}
                    >
                      {status.subaccount.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">
                No subaccount has been created yet.
              </p>
            )}
          </div>

          {/* Onboarding Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-black mb-4">
              Onboarding Status
            </h2>
            <div className="flex items-center gap-4">
              <div
                className={`flex-1 h-2 rounded-full ${
                  status.onboardingComplete ? "bg-green-500" : "bg-gray-200"
                }`}
              />
              <span
                className={`px-4 py-2 rounded-lg font-medium ${
                  status.onboardingComplete
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {status.onboardingComplete ? "Complete" : "In Progress"}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
