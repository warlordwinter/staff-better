'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setProfileDropdownOpen(false);
      setMenuOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav className="w-full px-5 py-3 bg-[#F59144]">
      <div className="flex justify-between items-center">
        {/* Logo + Brand */}
        <Link href="/landingpage" className="flex items-center gap-5 cursor-pointer">
          <Image height={50} width={50} alt="Logo" src="/icons/logo.svg" />
          <span className="text-white text-2xl sm:text-3xl font-semibold font-inter">Staff Better</span>
        </Link>

        {/* Hamburger Icon */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden flex items-center px-2 py-1 border rounded text-white border-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Desktop Nav */}
        <div className="hidden sm:flex items-center gap-8">
          {isLoggedIn ? (
            <>
              <Link 
                href="/jobs" 
                className={`text-white text-lg font-medium transition-colors ${
                  isActiveLink('/jobs') 
                    ? 'text-white font-semibold' 
                    : 'hover:underline hover:text-gray-200'
                }`}
              >
                Jobs
              </Link>
              <Link 
                href="/groups" 
                className={`text-white text-lg font-medium transition-colors ${
                  isActiveLink('/groups') 
                    ? 'text-white font-semibold' 
                    : 'hover:underline hover:text-gray-200'
                }`}
              >
                Groups
              </Link>
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
                  >
                    <Image
                      src="/images/profile.svg"
                      alt="Profile"
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
              <a href="/get-started" className="text-white text-lg hover:underline">
                Get Started
              </a>
              <a href="/blogs" className="text-white text-lg hover:underline">
                Blogs
              </a>
              <button
                type="button"
                onClick={() => (window.location.href = '/login')}
                className="w-24 h-9 px-4 bg-[#F59144] rounded-md border border-[#FFD9B3] text-white text-base font-normal font-inter leading-tight flex justify-center items-center hover:brightness-105 transition"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = '/login')}
                className="w-24 h-9 px-4 bg-white rounded-md border border-[#FFD9B3] text-base font-normal font-inter leading-tight flex justify-center items-center transition"
                style={{ color: '#F59144' }}
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
                href="/jobs" 
                className={`text-white text-lg font-medium transition-colors ${
                  isActiveLink('/jobs') 
                    ? 'text-white font-semibold' 
                    : 'hover:underline hover:text-gray-200'
                }`}
              >
                Jobs
              </Link>
              <Link 
                href="/groups" 
                className={`text-white text-lg font-medium transition-colors ${
                  isActiveLink('/groups') 
                    ? 'text-white font-semibold' 
                    : 'hover:underline hover:text-gray-200'
                }`}
              >
                Groups
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
              <a href="/get-started" className="text-white text-lg hover:underline">
                Get Started
              </a>
              <a href="/blogs" className="text-white text-lg hover:underline">
                Blogs
              </a>
              <button
                type="button"
                onClick={() => (window.location.href = '/login')}
                className="w-full h-9 px-4 bg-[#F59144] rounded-md border border-[#FFD9B3] text-white text-base font-normal font-inter leading-tight flex justify-center items-center hover:brightness-105 transition"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = '/login')}
                className="w-full h-9 px-4 bg-white rounded-md border border-[#FFD9B3] text-base font-normal font-inter leading-tight flex justify-center items-center transition"
                style={{ color: '#F59144' }}
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
