import Navbar from '@/components/navBar';
import Footer from '@/components/footer';

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-12">
        <div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6" style={{ color: '#F59144' }}>
              Give Time Back to Recruiters
        </h1>
        </div>
        <div className="w-full max-w-5xl flex flex-col items-center justify-center gap-12">
          {/* Left Section */}
          <div className="flex-1 flex flex-col items-center text-center justify-center pt-0 gap-4">
            <p className="text-lg text-black font-normal max-w-xs md:max-w-sm">
              We’re Happy to Answer Any Questions! Let us know how we can help your business. We will try and get back to you as fast as we can.
            </p>
          </div>
          {/* Right Section: Contact Form */}
          <div className="flex-1 max-w-md w-full bg-white rounded-2xl shadow-md p-8">
            <div className="text-center text-black mb-6 font-medium text-2xl">We will get back to you shortly</div>
            <form className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Name"
                className="rounded-full border border-gray-400 px-4 py-2 text-base outline-none focus:ring-2 focus:ring-[#F59144] placeholder-gray-400"
              />
              <input
                type="email"
                placeholder="Email"
                className="rounded-full border border-gray-400 px-4 py-2 text-base outline-none focus:ring-2 focus:ring-[#F59144] placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="Company Name"
                className="rounded-full border border-gray-400 px-4 py-2 text-base outline-none focus:ring-2 focus:ring-[#F59144] placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="How did you hear about us?"
                className="rounded-full border border-gray-400 px-4 py-2 text-base outline-none focus:ring-2 focus:ring-[#F59144] placeholder-gray-400"
              />
              <textarea
                placeholder="Message"
                className="rounded-2xl border border-gray-400 px-4 py-2 text-base outline-none focus:ring-2 focus:ring-[#F59144] placeholder-gray-400 min-h-[100px] resize-none"
              />
              <button
                type="button"
                className="mt-2 w-full rounded-full bg-[#F59144] text-white text-lg font-medium py-2 shadow hover:bg-[#e07d1a] transition flex items-center justify-center gap-2"
              >
                Contact Us
                <span className="ml-1">→</span>
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 