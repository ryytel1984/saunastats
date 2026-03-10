export default function Landing() {
  return (
    <div
      className="min-h-screen text-white flex flex-col items-center justify-center px-4 relative"
      style={{
        backgroundImage: "url('/sauna-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
        <h1
          className="text-6xl font-bold tracking-tight mb-4"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "-0.02em" }}
        >
          SaunaStats
        </h1>
        <p className="text-stone-300 text-lg mb-10 leading-relaxed">
          Track your sauna sessions.<br />Compete with friends.
        </p>
        <a
          href="/login"
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-10 py-3 rounded-xl text-lg transition w-full max-w-xs text-center"
        >
          Get Started
        </a>
      </div>
    </div>
  );
}
