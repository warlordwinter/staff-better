'use client';

import { FaLinkedin, FaFacebook, FaTwitter } from 'react-icons/fa';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white mt-20 px-6 py-10 text-neutral-600 text-sm font-normal flex flex-col items-center">
      {/* Top Divider Line */}
      <div className="w-3/4 h-px bg-gray-300 mb-8" />

      {/* Footer Content */}
      <div className="w-3/4 flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Brand */}
        <div className="text-3xl font-black tracking-tight" style={{ color: '#F59144' }}>Staff Better</div>

        {/* Legal Links */}
        <div className="flex gap-6 text-base">
          <Link href="/legal/terms" className="hover:underline">Terms</Link>
          <Link href="/legal/privacy" className="hover:underline">Privacy</Link>
          <Link href="/legal/cookies" className="hover:underline">Cookies</Link>
          <Link href="/legal/data-deletion" className="hover:underline">Delete Data</Link>
        </div>

        {/* Social Media */}
        <div className="flex gap-4 text-xl text-gray-500">
          <a href="#" className="hover:text-blue-600 transition"><FaLinkedin /></a>
          <a href="#" className="hover:text-blue-500 transition"><FaFacebook /></a>
          <a href="#" className="hover:text-blue-400 transition"><FaTwitter /></a>
        </div>
      </div>
    </footer>
  );
}
