"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { MessagesDataService } from "@/lib/services/messagesDataService";
import { GroupsDataService } from "@/lib/services/groupsDataService";
import { Job } from "@/model/interfaces/Job";

interface RecentActivity {
  type: "message" | "reminder" | "member";
  title: string;
  description: string;
  timestamp: string;
}

export default function HomePage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();

  // State for dashboard data
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activeConversations, setActiveConversations] = useState(0);
  const [activeReminders, setActiveReminders] = useState(0);
  const [totalReminders, setTotalReminders] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalTeamMembers, setTotalTeamMembers] = useState(0);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch dashboard data
  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setDataLoading(true);

        // Fetch messages/conversations
        const conversationsRes = await fetch("/api/conversations");
        if (conversationsRes.ok) {
          const conversationsData = await conversationsRes.json();

          // Count active conversations
          setActiveConversations(conversationsData.length);

          // Count unread messages (for now, all are marked as unread: false in the service)
          // When unread tracking is implemented, this will work automatically
          const conversations = await MessagesDataService.fetchConversations();
          const unreadCount = conversations.filter(
            (conv) => conv.unread
          ).length;
          setUnreadMessages(unreadCount);

          // Build recent activity from raw data for proper timestamps
          const recentMessages = conversationsData
            .filter((conv: any) => conv.messages && conv.messages.length > 0)
            .map((conv: any) => {
              const lastMessage = conv.messages[conv.messages.length - 1];
              const sentAt =
                lastMessage?.sent_at ||
                conv.last_message_time ||
                conv.updated_at;
              const timestamp = sentAt
                ? new Date(sentAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "";

              return {
                type: "message" as const,
                title: `New message from ${conv.associate_name || "Unknown"}`,
                description: lastMessage?.body || conv.last_message || "",
                timestamp,
                sortTime: sentAt,
              };
            })
            .sort((a: any, b: any) => {
              // Sort by timestamp (most recent first)
              if (!a.sortTime || !b.sortTime) return 0;
              return (
                new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime()
              );
            })
            .slice(0, 3)
            .map((item: any) => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { sortTime, ...rest } = item;
              return rest;
            });

          setRecentActivity(recentMessages);
        } else {
          // Fallback to using service data
          const conversations = await MessagesDataService.fetchConversations();
          const unreadCount = conversations.filter(
            (conv) => conv.unread
          ).length;
          setUnreadMessages(unreadCount);
          setActiveConversations(conversations.length);

          const recentMessages = conversations
            .filter((conv) => conv.messages.length > 0)
            .slice(0, 3)
            .map((conv) => {
              const lastMessage = conv.messages[conv.messages.length - 1];
              return {
                type: "message" as const,
                title: `New message from ${conv.name}`,
                description: lastMessage.text || "",
                timestamp: lastMessage.timestamp || "",
              };
            });
          setRecentActivity(recentMessages);
        }

        // Fetch jobs/reminders
        const jobsRes = await fetch("/api/jobs");
        if (jobsRes.ok) {
          const jobs: Job[] = await jobsRes.json();
          setTotalReminders(jobs.length);

          // Count active reminders (jobs that need reminders)
          // For now, we'll count all jobs as active reminders
          // In the future, this could be filtered by num_reminders > 0
          setActiveReminders(jobs.length);
        }

        // Fetch groups
        const groups = await GroupsDataService.fetchGroups();
        setTotalGroups(groups.length);

        // Fetch all associates to get total team members
        const associates = await GroupsDataService.fetchAllAssociates();
        setTotalTeamMembers(associates.length);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, authLoading]);

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
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
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
                  <span className="text-3xl font-bold text-black">
                    {dataLoading ? "..." : unreadMessages}
                  </span>
                  <span className="text-sm text-gray-600 ml-2">Unread</span>
                </div>
                <p className="text-sm text-gray-500">
                  {dataLoading
                    ? "Loading..."
                    : `${activeConversations} active conversations`}
                </p>
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
                  <span className="text-3xl font-bold text-black">
                    {dataLoading ? "..." : activeReminders}
                  </span>
                  <span className="text-sm text-gray-600 ml-2">Active</span>
                </div>
                <p className="text-sm text-gray-500">
                  {dataLoading
                    ? "Loading..."
                    : `${totalReminders} total shift reminders`}
                </p>
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
                  <span className="text-3xl font-bold text-black">
                    {dataLoading ? "..." : totalGroups}
                  </span>
                  <span className="text-sm text-gray-600 ml-2">Groups</span>
                </div>
                <p className="text-sm text-gray-500">
                  {dataLoading
                    ? "Loading..."
                    : `${totalTeamMembers} team members`}
                </p>
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
              {dataLoading ? (
                <div className="text-center py-8">
                  <LoadingSpinner />
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >
                    <h3 className="text-sm font-semibold text-black mb-1">
                      {activity.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.timestamp}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
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
