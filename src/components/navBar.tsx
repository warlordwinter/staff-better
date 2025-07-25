// components/Navbar.tsx
import React from 'react';
import Image from 'next/image';

const Navbar = () => {
  return (
    <nav className="w-full px-5 py-2.5 bg-orange-500 flex justify-between items-center">
      {/* Left: Logo and Brand */}
      <div className="flex items-center gap-3">
      <Image 
      height={50}
      width={50}
      alt="Logo"
      src={"/icons/mainLogo.svg"}
      />
        <span className="text-white text-3xl font-semibold font-inter">Staff Better</span>
      </div>

      {/* Right: Navigation Links */}
      <div className="flex items-center gap-5">
        <a href="#" className="text-white text-xl font-normal hover:underline">
          Jobs
        </a>
        <a href="#" className="text-white text-xl font-normal hover:underline">
          Blogs
        </a>
        {/* Placeholder for profile or button */}
        <div className="w-10 h-10 bg-zinc-300 rounded-full" />
      </div>
    </nav>
  );
};

export default Navbar;
