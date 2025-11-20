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
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
        <Link href="/home" className="flex items-center gap-5 cursor-pointer flex-shrink-0">
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
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity"
                  >
                    <Image
                      src="/images/profile.svg"
                      alt="Profile"
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
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
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
                {/* Profile Dropdown */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg py-1 z-50">
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
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
    </nav>
  );
};

export default Navbar;
