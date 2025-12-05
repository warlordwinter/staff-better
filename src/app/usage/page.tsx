"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { Card } from "@/components/ui/card";

// Types for future Twilio API integration
interface UsageData {
  smsMessages: number;
  whatsappMessages: number;
  smsCredits: number;
  whatsappCredits: number;
  totalCreditsUsed: number;
  creditLimit: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
}

interface ActivityData {
  date: string;
  sms: number;
  whatsapp: number;
  credits: number;
}

// Fetch usage data from Twilio API
async function fetchUsageData(
  month: string,
  year: string
): Promise<UsageData> {
  const response = await fetch(
    `/api/twilio/usage?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch usage data: ${response.statusText}`
    );
  }

  const data = await response.json();
  
  // Convert ISO date strings back to Date objects
  return {
    ...data,
    billingPeriodStart: new Date(data.billingPeriodStart),
    billingPeriodEnd: new Date(data.billingPeriodEnd),
  };
}

// Placeholder function for future Twilio API integration
async function fetchActivityData(
  month: string,
  year: string
): Promise<ActivityData[]> {
  // This will be replaced with actual Twilio API integration
  // Example: const response = await fetch(`/api/twilio/activity?month=${month}&year=${year}`);
  // return await response.json();
  
  // Suppress unused variable warnings - these will be used when API is integrated
  void month;
  void year;
  
  // Mock data for now
  return [
    { date: "Dec 2, 2024", sms: 23, whatsapp: 18, credits: (23 * 7) + (18 * 5) },
    { date: "Dec 1, 2024", sms: 31, whatsapp: 22, credits: (31 * 7) + (22 * 5) },
    { date: "Nov 30, 2024", sms: 28, whatsapp: 19, credits: (28 * 7) + (19 * 5) },
    { date: "Nov 29, 2024", sms: 25, whatsapp: 21, credits: (25 * 7) + (21 * 5) },
    { date: "Nov 28, 2024", sms: 29, whatsapp: 17, credits: (29 * 7) + (17 * 5) },
  ];
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const years = ["2025", "2026", "2027", "2028", "2029", "2030"];

export default function UsagePage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const [selectedMonth, setSelectedMonth] = useState("December");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch usage data when month/year changes
  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [usage, activity] = await Promise.all([
          fetchUsageData(selectedMonth.toLowerCase(), selectedYear),
          fetchActivityData(selectedMonth.toLowerCase(), selectedYear),
        ]);
        setUsageData(usage);
        setActivityData(activity);
      } catch (error) {
        console.error("Error fetching usage data:", error);
        // Set error state - you might want to add an error state variable
        // For now, we'll just log it and keep loading false
        setUsageData(null);
        setActivityData([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedMonth, selectedYear, isAuthenticated, authLoading]);

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

  const creditPercentage = usageData
    ? (usageData.totalCreditsUsed / usageData.creditLimit) * 100
    : 0;

  const formatBillingPeriod = () => {
    if (!usageData) return "";
    const start = usageData.billingPeriodStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const end = usageData.billingPeriodEnd.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${start} - ${end}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/home"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-black">Usage</h1>
          </div>

          {/* Billing Period and Date Selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-4">
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="appearance-none px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-white text-gray-900 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FE6F00] focus:border-transparent transition-colors"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="appearance-none px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-white text-gray-900 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FE6F00] focus:border-transparent transition-colors"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
            <p className="text-gray-600">
              Current billing period: {usageData ? formatBillingPeriod() : "Loading..."}
            </p>
          </div>
        </div>

        {/* Usage Overview Card */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        ) : usageData ? (
          <div className="mb-8">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg
                      className="w-5 h-5 text-[#FE6F00]"
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
                    <h3 className="text-lg font-semibold text-black">Credits</h3>
                  </div>
                  <p className="text-sm text-gray-600">Used this period</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-black">
                    {usageData.totalCreditsUsed.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-500">
                    of {usageData.creditLimit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] rounded-full transition-all"
                  style={{ width: `${Math.min(creditPercentage, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {creditPercentage.toFixed(1)}% used
              </p>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-[#5B7EF5]" />
                    <span className="text-sm text-gray-600">SMS Messages</span>
                  </div>
                  <p className="text-lg font-semibold text-black">
                    {usageData.smsMessages.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {usageData.smsCredits.toLocaleString()} credits (7 each)
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-[#25D366]" />
                    <span className="text-sm text-gray-600">
                      WhatsApp Messages
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-black">
                    {usageData.whatsappMessages.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {usageData.whatsappCredits.toLocaleString()} credits (5 each)
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h2 className="text-xl font-bold text-black">Recent Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    SMS Messages
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    WhatsApp Messages
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Credits Used
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8">
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : activityData.length > 0 ? (
                  activityData.map((activity, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-700">{activity.date}</td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        {activity.sms}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        {activity.whatsapp}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700 font-medium">
                        {activity.credits}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">
                      No activity data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

