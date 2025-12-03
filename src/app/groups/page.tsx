"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { Group } from "@/model/interfaces/Group";
import { GroupsDataService } from "@/lib/services/groupsDataService";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";

// Helper function to get group icon color based on index
const getGroupIconColor = (index: number): string => {
  const colors = [
    "#8B5CF6", // Purple
    "#10B981", // Green
    "#8B5CF6", // Purple (repeat)
    "#EF4444", // Red
  ];
  return colors[index % colors.length];
};

// Helper function to get initials from name
const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return `${first}${last}`;
};

// Group icon SVG component
const GroupIcon = ({ color }: { color: string }) => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M24 20C27.866 20 31 16.866 31 13C31 9.13401 27.866 6 24 6C20.134 6 17 9.13401 17 13C17 16.866 20.134 20 24 20Z"
      fill={color}
    />
    <path
      d="M12 32C12 27.5817 15.5817 24 20 24H28C32.4183 24 36 27.5817 36 32V38H12V32Z"
      fill={color}
    />
  </svg>
);

export default function GroupsPage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsWithMembers, setGroupsWithMembers] = useState<
    Array<Group & { members: AssociateGroup[] }>
  >([]);
  const [loading, setLoading] = useState(true);

  // Load groups data and members using the data service
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const groupsData = await GroupsDataService.fetchGroups();
        setGroups(groupsData);

        // Fetch first 3-4 members for each group for display
        const groupsWithMembersData = await Promise.all(
          groupsData.map(async (group) => {
            try {
              const members = await GroupsDataService.fetchAssociatesByGroupId(
                group.id
              );
              return {
                ...group,
                members: members.slice(0, 4), // Only first 4 for display
              };
            } catch {
              // If members can't be loaded, just return empty array
              return {
                ...group,
                members: [],
              };
            }
          })
        );

        setGroupsWithMembers(groupsWithMembersData);
      } catch (error) {
        console.error("Error loading groups:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAuthenticated) {
      loadGroups();
    }
  }, [authLoading, isAuthenticated]);

  // Handle adding a new group using the data service
  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const newGroup = await GroupsDataService.createGroup({
        group_name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        totalAssociates: 0, // New groups start with 0 associates
      });

      setGroups((prevGroups) => [...prevGroups, newGroup]);
      setGroupsWithMembers((prev) => [...prev, { ...newGroup, members: [] }]);
      setNewGroupName("");
      setNewGroupDescription("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding group:", error);
    }
  };

  // Handle deleting a group using the data service
  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this group?")) {
      try {
        const success = await GroupsDataService.deleteGroup(groupId);
        if (success) {
          setGroups((prevGroups) =>
            prevGroups.filter((group) => group.id !== groupId)
          );
          setGroupsWithMembers((prev) =>
            prev.filter((group) => group.id !== groupId)
          );
        }
      } catch (error) {
        console.error("Error deleting group:", error);
      }
    }
  };

  // Handle form submission with Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newGroupName.trim()) {
      handleAddGroup();
    } else if (e.key === "Escape") {
      setShowAddForm(false);
      setNewGroupName("");
      setNewGroupDescription("");
    }
  };

  // Calculate total members
  const totalMembers = groups.reduce(
    (sum, group) => sum + group.totalAssociates,
    0
  );

  // Filter groups based on search query
  const filteredGroups = groupsWithMembers.filter((group) => {
    const query = searchQuery.toLowerCase();
    const matchesGroupName = group.group_name.toLowerCase().includes(query);
    const matchesDescription =
      group.description?.toLowerCase().includes(query) || false;
    const matchesMembers = group.members.some((member) =>
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(query)
    );
    return matchesGroupName || matchesDescription || matchesMembers;
  });

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

  // Show loading spinner while fetching groups data
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-black text-5xl font-semibold font-['Inter']">
              Groups
            </h1>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-3 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Group
            </button>
          </div>
          <p className="text-gray-600 text-lg">
            {groups.length} {groups.length === 1 ? "team" : "teams"} •{" "}
            {totalMembers} total {totalMembers === 1 ? "member" : "members"}
          </p>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          {/* Search Bar */}
          <div className="relative w-full">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups or associates..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:bg-white"
            />
          </div>
        </div>

        {/* Group Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGroups.map((group, index) => {
            const remainingMembers =
              group.totalAssociates - group.members.length;
            const iconColor = getGroupIconColor(index);

            return (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="relative bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col cursor-pointer"
              >
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteGroup(group.id, e);
                  }}
                  className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 transition-colors z-10"
                  title="Delete group"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* Group Icon and Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0">
                    <GroupIcon color={iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-black mb-1 hover:text-[#FE6F00] transition-colors">
                      {group.group_name}
                    </h3>
                    {group.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {group.description}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {group.totalAssociates}{" "}
                      {group.totalAssociates === 1 ? "member" : "members"}
                    </p>
                  </div>
                </div>

                {/* Members List */}
                <div className="mb-4 flex-1 min-h-[80px]">
                  {group.members.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {group.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 min-w-0"
                          >
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {getInitials(member.firstName, member.lastName)}
                            </div>
                            {/* Name and Role */}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {member.firstName} {member.lastName}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {remainingMembers > 0 && (
                        <span className="text-sm text-[#FE6F00] hover:underline">
                          +{remainingMembers} more{" "}
                          {remainingMembers === 1 ? "member" : "members"}
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No members yet</p>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 my-4"></div>

                {/* Action Buttons */}
                <div
                  className="flex gap-3 mt-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.href = `/groups/${group.id}`;
                    }}
                    className="flex-1 px-4 py-2 border border-[#FE6F00] rounded-lg text-[#FE6F00] font-medium text-center hover:bg-orange-50 transition-colors inline-flex items-center justify-center gap-2"
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
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    Add Member
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.href = `/groups/${group.id}`;
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium text-center hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 shadow-sm"
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Message Group
                  </button>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredGroups.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {searchQuery
                ? "No groups found matching your search."
                : "No groups yet. Create your first group to get started!"}
            </p>
          </div>
        )}

        {/* Add Group Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
              <h2 className="text-xl font-bold text-black mb-4">
                Add New Group
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="groupName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Group Name *
                  </label>
                  <input
                    type="text"
                    id="groupName"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter group name"
                    autoFocus
                  />
                </div>

                <div>
                  <label
                    htmlFor="groupDescription"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    id="groupDescription"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter group description"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewGroupName("");
                    setNewGroupDescription("");
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddGroup}
                  disabled={!newGroupName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Group
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
