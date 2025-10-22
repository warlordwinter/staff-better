"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { Group } from "@/model/interfaces/Group";
import { GroupsDataService } from "@/lib/services/groupsDataService";

export default function GroupsPage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Load groups data using the data service
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const groupsData = await GroupsDataService.fetchGroups();
        setGroups(groupsData);
      } catch (error) {
        console.error("Error loading groups:", error);
        // Handle error appropriately in your app
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAuthenticated) {
      loadGroups();
    }
  }, [authLoading, isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
      setNewGroupName("");
      setNewGroupDescription("");
      setShowAddForm(false);
      setDropdownOpen(false);
    } catch (error) {
      console.error("Error adding group:", error);
      // Handle error appropriately in your app
    }
  };

  // Handle deleting a group using the data service
  const handleDeleteGroup = async (groupId: string) => {
    if (window.confirm("Are you sure you want to delete this group?")) {
      try {
        const success = await GroupsDataService.deleteGroup(groupId);
        if (success) {
          setGroups((prevGroups) =>
            prevGroups.filter((group) => group.id !== groupId)
          );
        }
      } catch (error) {
        console.error("Error deleting group:", error);
        // Handle error appropriately in your app
      }
    }
  };

  // Handle manual add button click
  const handleAddManually = () => {
    setShowAddForm(true);
    setDropdownOpen(false);
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
      <main className="flex-1 flex flex-col gap-6 w-full max-w-6xl mx-auto px-4 mt-24">
        {/* Header Section - matching jobs page style */}
        <div className="relative flex justify-between items-center">
          <h1 className="text-black text-5xl font-semibold font-['Inter']">
            Groups
          </h1>

          {/* Add Button with Plus Icon - matching jobs page style */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-3 py-2 bg-blue-600 rounded-xl inline-flex justify-center items-center gap-1 text-white cursor-pointer"
            >
              <span className="text-sm font-normal font-['Inter']">Add</span>
              <div className="w-4 h-4 relative">
                <Image
                  src="/icons/plus-w.svg"
                  alt="Add"
                  width={16}
                  height={16}
                  className="object-contain"
                />
              </div>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={handleAddManually}
                  className="flex items-center gap-3 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
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
                  Add Manually
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Group Cards - centered and taller */}
        <div className="flex justify-center">
          <div className="flex flex-wrap gap-6 justify-center max-w-6xl">
            {groups.map((group) => (
              <div
                key={group.id}
                className="relative flex-shrink-0 w-80 h-48 border border-gray-300 rounded-lg p-6 bg-white hover:shadow-md transition-shadow"
              >
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteGroup(group.id);
                  }}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors z-10"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>

                {/* Clickable Link */}
                <Link href={`/groups/${group.id}`} className="block h-full">
                  <div className="text-center h-full flex flex-col justify-center cursor-pointer">
                    <h3 className="text-lg font-bold text-black mb-2">
                      {group.group_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Total: {group.totalAssociates}
                    </p>
                    {group.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        {group.description}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

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
