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
    <section className="bg-white py-20 px-6 flex flex-col items-center text-center text-neutral-800">
      {/* Title */}
      <h2 className="text-5xl font-black mb-16">Industries</h2>

      {/* Industry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 max-w-7xl w-full">
        {industries.map((industry) => (
            <div
            key={industry.name}
            className="bg-orange-400 rounded-xl flex flex-col items-center px-7 py-14 h-72 justify-center hover:shadow-2xl hover:scale-105 transform transition duration-300"
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
    </section>
  );
}
