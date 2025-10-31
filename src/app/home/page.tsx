"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";

export default function HomePage() {
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
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 mt-24">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-black mb-2">
            Welcome to Staff Better
          </h1>
          <p className="text-gray-600 text-lg">
            Manage your team, shift reminders, and communications all in one
            place.
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Messages Card */}
          <Link
            href="/messages"
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-black mb-2">
                  Messages
                </h3>
                <div className="mb-1">
                  <span className="text-3xl font-bold text-black">12</span>
                  <span className="text-sm text-gray-600 ml-2">Unread</span>
                </div>
                <p className="text-sm text-gray-500">7 active conversations</p>
              </div>
            </div>
          </Link>

          {/* Reminders Card */}
          <Link
            href="/reminders"
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-black mb-2">
                  Reminders
                </h3>
                <div className="mb-1">
                  <span className="text-3xl font-bold text-black">8</span>
                  <span className="text-sm text-gray-600 ml-2">Active</span>
                </div>
                <p className="text-sm text-gray-500">12 total shift reminders</p>
              </div>
            </div>
          </Link>

          {/* Associates Card */}
          <Link
            href="/groups"
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-black mb-2">
                  Associates
                </h3>
                <div className="mb-1">
                  <span className="text-3xl font-bold text-black">5</span>
                  <span className="text-sm text-gray-600 ml-2">Groups</span>
                </div>
                <p className="text-sm text-gray-500">42 team members</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] rounded flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-black">Recent Activity</h2>
            </div>

            <div className="space-y-4">
              {/* Activity Item 1 */}
              <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <h3 className="text-sm font-semibold text-black mb-1">
                  New message from Sarah Mitchell
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Thanks for the update! See you tomorrow.
                </p>
                <p className="text-xs text-gray-500">1:15 PM</p>
              </div>

              {/* Activity Item 2 */}
              <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <h3 className="text-sm font-semibold text-black mb-1">
                  Reminder confirmed: Evening Dinner Service
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  4 associates confirmed for Oct 30 shift
                </p>
                <p className="text-xs text-gray-500">10:30 AM</p>
              </div>

              {/* Activity Item 3 */}
              <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <h3 className="text-sm font-semibold text-black mb-1">
                  New member added to Kitchen Staff
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  David Chen joined the team
                </p>
                <p className="text-xs text-gray-500">Yesterday</p>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-black mb-6">Quick Actions</h2>

            <div className="space-y-4">
              {/* Schedule Reminder */}
              <Link
                href="/reminders"
                className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-black mb-1">
                    Schedule Reminder
                  </h3>
                  <p className="text-sm text-gray-600">
                    Create a shift reminder for staff.
                  </p>
                </div>
              </Link>

              {/* Manage Teams */}
              <Link
                href="/groups"
                className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-black mb-1">
                    Manage Associates
                  </h3>
                  <p className="text-sm text-gray-600">
                    View and organize staff groups.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

