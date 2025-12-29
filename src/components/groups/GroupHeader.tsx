"use client";

import React from "react";
import Link from "next/link";
import { Group } from "@/model/interfaces/Group";

interface GroupHeaderProps {
  group: Group;
  onAddNew: () => void;
  onAddExisting: () => void;
  onMassMessage: () => void;
  loadingAssociates: boolean;
}

export default function GroupHeader({
  group,
  onAddNew,
  onAddExisting,
  onMassMessage,
  loadingAssociates,
}: GroupHeaderProps) {
  return (
    <div className="relative flex justify-between items-center">
      <div className="flex items-center gap-4">
        {/* Back Arrow */}
        <Link
          href="/groups"
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          title="Back to Groups"
        >
          <svg
            className="w-6 h-6"
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
        <h1 className="text-black text-5xl font-semibold font-['Inter']">
          {group.group_name}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Add New Associate Button - Primary Action with Gradient */}
        <button
          onClick={onAddNew}
          className="px-3 py-2 bg-gradient-to-r from-[#ffb877] to-[#ff8a42] rounded-xl inline-flex justify-center items-center gap-1 text-white cursor-pointer hover:brightness-110 transition-all"
        >
          <span className="text-sm font-normal font-['Inter']">Add New</span>
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
        </button>

        {/* Add Existing Associate Button - Secondary Action */}
        <button
          onClick={onAddExisting}
          disabled={loadingAssociates}
          className="px-3 py-2 bg-white rounded-xl inline-flex justify-center items-center gap-1 border-2 border-[#F59144] text-[#F59144] cursor-pointer hover:bg-[#FFF5ED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-sm font-normal font-['Inter']">
            {loadingAssociates ? "Loading..." : "Add Existing"}
          </span>
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
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </button>

        {/* Mass Message Button - Secondary Action */}
        <button
          onClick={onMassMessage}
          className="px-3 py-2 bg-white rounded-xl inline-flex justify-center items-center gap-1 border-2 border-[#F59144] text-[#F59144] cursor-pointer hover:bg-[#FFF5ED] transition-colors"
        >
          <span className="text-sm font-normal font-['Inter']">
            Message All
          </span>
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
              d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 9h6M9 13h6M9 17h4"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
