'use client';

import Image from 'next/image';

const industries = [
  { name: 'Light Industrial', icon: '/icons/hard-hat.svg' },
  { name: 'Manufacturing', icon: '/icons/gear-six.svg' },
  { name: 'Distribution', icon: '/icons/package.svg' },
  { name: 'Facilities Services', icon: '/icons/broom.svg' },
];

export default function Industries() {
  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2 className="text-3xl md:text-4xl text-center mb-4">Industries We Serve</h2>
        <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
          Trusted by staffing companies across multiple industries
        </p>

        {/* Industry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {industries.map((industry) => (
            <div
              key={industry.name}
              className="bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] rounded-xl flex flex-col items-center px-7 py-14 justify-center hover:shadow-2xl hover:scale-105 transform transition duration-300"
            >
              {/* Icon */}
              <div className="w-24 h-24 flex justify-center items-center mb-6">
                <Image
                  src={industry.icon}
                  alt={industry.name}
                  width={80}
                  height={80}
                  className="invert brightness-0"
                />
              </div>

              {/* Label */}
              <p className="text-white text-xl font-bold">{industry.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
