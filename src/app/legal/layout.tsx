import React from 'react';
import Navbar from '@/components/ui/navBar';
import Footer from '@/components/ui/footer';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 px-6 py-12 flex justify-center">
        <div className="w-full max-w-3xl">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
