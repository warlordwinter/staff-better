"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { user, signOut } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const isLoggedIn = !!user;

  // Helper function to determine if a link is active
  const isActiveLink = (path: string) => {
    return pathname === path;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setProfileDropdownOpen(false);
      setMenuOpen(false);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <nav className="w-full px-5 py-3 bg-gradient-to-r from-[#ffb877] to-[#ff8a42] min-h-[72px] flex-shrink-0 overflow-hidden">
      <div className="flex justify-between items-center w-full">
        {/* Logo + Brand */}
        <Link
          href="/home"
          className="flex items-center gap-5 cursor-pointer flex-shrink-0"
        >
          <Image height={50} width={50} alt="Logo" src="/icons/logo.svg" />
          <span className="text-white text-2xl sm:text-3xl font-bold font-inter whitespace-nowrap">
            Staff Better
          </span>
        </Link>

        {/* Hamburger Icon */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden flex items-center px-2 py-1 border rounded text-white border-white"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Desktop Nav */}
        <div className="hidden sm:flex items-center gap-6 flex-shrink-0 min-w-0">
          {isLoggedIn ? (
            <>
              <Link
                href="/home"
                className={`text-white text-lg font-bold transition-colors inline-flex items-center gap-2 px-3 py-1.5 rounded ${
                  isActiveLink("/home")
                    ? "border-2 border-white border-opacity-100"
                    : "hover:opacity-80"
                }`}
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
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Home
              </Link>
              <Link
                href="/messages"
                className={`text-white text-lg font-bold transition-colors ${
                  isActiveLink("/messages") ? "" : "hover:opacity-80"
                }`}
              >
                Messages
              </Link>
              <Link
                href="/reminders"
                className={`text-white text-lg font-bold transition-colors ${
                  isActiveLink("/reminders") || isActiveLink("/jobs")
                    ? ""
                    : "hover:opacity-80"
                }`}
              >
                Reminders
              </Link>
              <Link
                href="/groups"
                className={`text-white text-lg font-bold transition-colors ${
                  isActiveLink("/groups") ? "" : "hover:opacity-80"
                }`}
              >
                Groups
              </Link>
              <Link
                href="/associates"
                className={`text-white text-lg font-bold transition-colors ${
                  isActiveLink("/associates")
                    ? "bg-[#ff8a42] text-white px-3 py-1.5 rounded"
                    : "hover:opacity-80"
                }`}
              >
                Associates
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <button
                    ref={profileButtonRef}
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className={`flex items-center gap-2 text-white hover:opacity-80 transition-opacity ${
                      profileDropdownOpen
                        ? "outline outline-2 outline-white outline-offset-2 rounded-full"
                        : ""
                    }`}
                  >
                    <Image
                      src="/images/profile.svg"
                      alt="Profile"
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <a
                href="/get-started"
                className="text-white text-lg hover:underline"
              >
                Get Started
              </a>
              <a href="/blogs" className="text-white text-lg hover:underline">
                Blogs
              </a>
              <button
                type="button"
                onClick={() => (window.location.href = "/login")}
                className="w-24 h-9 px-4 bg-[#F59144] rounded-md border border-[#FFD9B3] text-white text-base font-normal font-inter leading-tight flex justify-center items-center hover:brightness-105 transition"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = "/login")}
                className="w-24 h-9 px-4 bg-white rounded-md border border-[#FFD9B3] text-base font-normal font-inter leading-tight flex justify-center items-center transition"
                style={{ color: "#F59144" }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <div className="sm:hidden flex flex-col mt-4 gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/home"
                className={`text-white text-lg font-bold transition-colors inline-flex items-center gap-2 px-3 py-1.5 rounded ${
                  isActiveLink("/home")
                    ? "border-2 border-white"
                    : "hover:opacity-80"
                }`}
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
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Home
              </Link>
              <Link
                href="/messages"
                className={`text-white text-lg font-bold transition-colors ${
                  isActiveLink("/messages") ? "" : "hover:opacity-80"
                }`}
              >
                Messages
              </Link>
              <Link
                href="/reminders"
                className={`text-white text-lg font-bold transition-colors ${
                  isActiveLink("/reminders") || isActiveLink("/jobs")
                    ? ""
                    : "hover:opacity-80"
                }`}
              >
                Reminders
              </Link>
              <Link
                href="/groups"
                className={`text-white text-lg font-bold transition-colors ${
                  isActiveLink("/groups") ? "" : "hover:opacity-80"
                }`}
              >
                Groups
              </Link>
              <Link
                href="/associates"
                className={`text-white text-lg font-bold transition-colors ${
                  isActiveLink("/associates")
                    ? "bg-[#ff8a42] text-white px-3 py-1.5 rounded"
                    : "hover:opacity-80"
                }`}
              >
                Associates
              </Link>
              <Link
                href="/settings"
                className={`text-white text-lg font-bold transition-colors ${
                  isActiveLink("/settings") ? "" : "hover:opacity-80"
                }`}
              >
                Settings
              </Link>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSignOut}
                  className="text-white text-sm hover:underline"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <a
                href="/get-started"
                className="text-white text-lg hover:underline"
              >
                Get Started
              </a>
              <a href="/blogs" className="text-white text-lg hover:underline">
                Blogs
              </a>
              <button
                type="button"
                onClick={() => (window.location.href = "/login")}
                className="w-full h-9 px-4 bg-[#F59144] rounded-md border border-[#FFD9B3] text-white text-base font-normal font-inter leading-tight flex justify-center items-center hover:brightness-105 transition"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = "/login")}
                className="w-full h-9 px-4 bg-white rounded-md border border-[#FFD9B3] text-base font-normal font-inter leading-tight flex justify-center items-center transition"
                style={{ color: "#F59144" }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      )}

      {/* Profile Dropdown - Fixed Position */}
      {profileDropdownOpen && (
        <div
          ref={dropdownRef}
          className="fixed right-0 top-[72px] w-48 bg-white shadow-xl z-50 rounded-b-lg border border-gray-200"
        >
          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setProfileDropdownOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
            >
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </Link>
            <Link
              href="/billing"
              onClick={() => setProfileDropdownOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
            >
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
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Billing
            </Link>
            <Link
              href="/usage"
              onClick={() => setProfileDropdownOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
            >
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Usage
            </Link>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-gray-100 transition-colors rounded-b-lg"
            >
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
