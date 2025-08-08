import Navbar from '@/components/navBar';
import Footer from '@/components/footer';

export default function GroupsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#F59144' }}>
            Groups
          </h1>
          <p className="text-2xl md:text-3xl text-neutral-800">Coming Soon! Stay Tuned!</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
