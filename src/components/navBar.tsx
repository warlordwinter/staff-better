'use client';

import React, { useState } from 'react';
import Image from 'next/image';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  // 🔐 Change this to reflect actual auth state in your app
  const isLoggedIn = true;

  return (
    <nav className="w-full px-5 py-3 bg-[#F59144]">
      <div className="flex justify-between items-center">
        {/* Logo + Brand */}
        <div className="flex items-center gap-5 cursor-pointer">
          <Image height={50} width={50} alt="Logo" src="/icons/logo.svg" />
          <span className="text-white text-2xl sm:text-3xl font-semibold font-inter">Staff Better</span>
        </div>

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
        <div className="hidden sm:flex items-center gap-6">
          <a href="#" className="text-white text-lg hover:underline">
            Jobs
          </a>

          {isLoggedIn ? (
            <>
              <a href="#" className="text-white text-lg hover:underline">
                Groups
              </a>
              <Image
                src="/images/profile.svg"
                alt="Profile"
                width={36}
                height={36}
                className="rounded-full cursor-pointer"
              />
            </>
          ) : (
            <>
              <a href="#" className="text-white text-lg hover:underline">
                Blogs
              </a>

              <button
                type="button"
                className="w-24 h-9 px-4 bg-[#F59144] rounded-md outline outline-2 outline-offset-[-2px] outline-pink-50 text-white text-base font-bold font-inter leading-tight flex justify-center items-center hover:brightness-105 transition"
              >
                Log In
              </button>

              <button
                type="button"
                className="w-24 h-9 px-4 bg-white rounded-md outline outline-2 outline-offset-[-2px] outline-orange-400 text-orange-400 text-base font-bold font-inter leading-tight flex justify-center items-center hover:bg-orange-50 transition"
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
          <a href="#" className="text-white text-lg hover:underline">
            Jobs
          </a>

          {isLoggedIn ? (
            <>
              <a href="#" className="text-white text-lg hover:underline">
                Groups
              </a>
              <div className="flex justify-start">
                <Image
                  src="/images/profile.svg"
                  alt="Profile"
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              </div>
            </>
          ) : (
            <>
              <a href="#" className="text-white text-lg hover:underline">
                Blogs
              </a>
              <button
                type="button"
                className="w-full h-9 px-4 bg-[#F59144] rounded-md outline outline-2 outline-offset-[-2px] outline-pink-50 text-white text-base font-bold font-inter leading-tight flex justify-center items-center hover:brightness-105 transition"
              >
                Log In
              </button>
              <button
                type="button"
                className="w-full h-9 px-4 bg-white rounded-md outline outline-2 outline-offset-[-2px] outline-orange-400 text-orange-400 text-base font-bold font-inter leading-tight flex justify-center items-center hover:bg-orange-50 transition"
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
