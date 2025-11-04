'use client';

export default function CallToAction() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-r from-[#ffb877] to-[#ff8a42] text-white text-center">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <h2 className="text-3xl md:text-4xl mb-6">
          Stop Wasting Time on No-Shows
        </h2>
        <p className="text-lg mb-8 text-white/90">
          Let Staff Better handle your shift reminders automatically while you focus on growing your business
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://calendly.com/john-henry-gilbert-1/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-[#FE6F00] px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors text-lg"
          >
            Book a Demo
          </a>
          <a
            href="mailto:john.henry.gilbert.1@gmail.com"
            className="border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-white/10 transition-colors text-lg"
          >
            Contact Us
          </a>
        </div>
      </div>
    </section>
  );
}
