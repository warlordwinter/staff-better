'use client';

import Image from 'next/image';

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-[#ffb877] to-[#ff8a42] text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Content */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl mb-6">
              Cut Down on No Shows
            </h1>
            <p className="text-lg md:text-xl mb-8 text-white/90">
              An automated SMS and Call reminder system for temporary staffing companies
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://calendly.com/john-henry-gilbert-1/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg transition-colors text-lg text-center"
              >
                Book a Demo
              </a>
              <a
                href="#quick-access"
                className="text-white hover:text-white/80 flex items-center justify-center gap-2 transition-colors"
              >
                Learn More
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right: Image Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden shadow-lg">
                <Image 
                  src="/images/work.jpg"
                  alt="Warehouse worker"
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover"
                />
              </div>
              <div className="rounded-xl overflow-hidden shadow-lg">
                <Image 
                  src="/images/text.jpg"
                  alt="Person texting on phone"
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover"
                />
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <div className="rounded-xl overflow-hidden shadow-lg">
                <Image 
                  src="/images/call.jpg"
                  alt="Worker checking phone"
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover"
                />
              </div>
              <div className="rounded-xl overflow-hidden shadow-lg">
                <Image 
                  src="/images/email.jpg"
                  alt="Warehouse logistics"
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
