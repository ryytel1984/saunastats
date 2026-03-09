export default function Landing() {
  return (
    <div className="min-h-screen bg-stone-900 text-white flex flex-col items-center justify-center">
      <h1 className="text-5xl font-bold mb-4">🧖 SaunaStats</h1>
      <p className="text-stone-400 text-xl mb-8">Track your sauna sessions. Compete with friends.</p>
      <a href="/login" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl text-lg transition">
        Get Started
      </a>
    </div>
  );
}