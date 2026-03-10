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
        <img src="/saunastats-logo-white.svg" alt="SaunaStats" className="w-72 mb-8" />
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
