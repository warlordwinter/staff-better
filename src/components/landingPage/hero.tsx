'use client';

import Image from 'next/image';

export default function Hero() {
  return (
    <section className="bg-gradient-to-b from-[#F59144] via-[#F59144] via-30% to-white px-6 py-16 min-h-[60vh] text-[#2F2F2F] flex items-center">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 w-full">
        
        {/* Left Text Section */}
        <div className="flex flex-col items-center md:items-start gap-8 max-w-full md:max-w-[476px] text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-black leading-tight md:leading-[72px] tracking-tight md:tracking-[5.76px]">
            Cut Down on No Shows
          </h1>
          <p className="text-lg md:text-3xl font-semibold leading-snug md:leading-10 tracking-normal md:tracking-[2.88px] max-w-sm md:max-w-none">
            An automated SMS and Call reminder system for the temporary staffing companies
          </p>

          {/* Button aligned left, Learn More centered under button */}
          <div className="w-full md:w-80 flex flex-col items-start">
            <button className="h-14 md:h-16 w-full px-6 py-3 bg-blue-600 rounded-full text-white text-lg md:text-2xl font-bold tracking-widest hover:bg-blue-700 transition">
              Book a Demo
            </button>
            <a
              href="#"
              className="text-blue-600 text-sm md:text-lg font-medium tracking-wide mt-1 text-center self-center"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Right Image Section */}
        <div className="flex flex-col md:grid md:grid-cols-2 gap-4 w-full md:w-[55%] items-center">
          <Image
            src="/images/text.jpg"
            alt="Texting"
            width={330}
            height={174}
            className="rounded-2xl object-cover w-[80%] md:w-full"
          />
          <Image
            src="/images/call.jpg"
            alt="Calling"
            width={330}
            height={174}
            className="rounded-2xl object-cover w-[80%] md:w-full"
          />
          <Image
            src="/images/email.jpg"
            alt="Emailing"
            width={330}
            height={174}
            className="rounded-2xl object-cover w-[80%] md:w-full"
          />
          <Image
            src="/images/work.jpg"
            alt="Work"
            width={330}
            height={174}
            className="rounded-2xl object-cover w-[80%] md:w-full"
          />
        </div>
      </div>
    </section>
  );
}
