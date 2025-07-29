'use client';

export default function CallToAction() {
  return (
    <section className="bg-white py-20 px-6 flex justify-center items-center">
      <div className="max-w-7xl w-full flex flex-col md:flex-row justify-between items-center gap-12 md:gap-20">
        {/* Left Title */}
        <h2 className="text-4xl md:text-5xl font-bold text-center md:text-left text-black">
          Want to Learn More?
        </h2>

        {/* Right CTA Links */}
        <p className="text-2xl md:text-3xl tracking-wide text-center md:text-left">
          <span className="text-black">Book a demo </span>
          <a href="/book-demo" className="text-blue-600 hover:underline">
            here
          </a>
          <span className="text-black"> or contact us </span>
          <a href="mailto:your@email.com" className="text-blue-600 hover:underline">
            via email
          </a>
        </p>
      </div>
    </section>
  );
}
