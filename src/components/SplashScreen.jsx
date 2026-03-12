export default function SplashScreen({ onDone }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "radial-gradient(ellipse at 50% 0%, #3d1a00 0%, #1a0a00 40%, #0d0d0d 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        animation: "splashFade 2.2s ease-forwards",
      }}
      onAnimationEnd={onDone}
    >
      {/* Logo */}
      <div style={{ animation: "logoIn 0.6s ease 0.2s both" }}>
        <img
          src="/08_saunastats-app-icon-gold.svg"
          alt="SaunaStats"
          style={{ width: 96, height: 96, borderRadius: 22 }}
        />
      </div>

      {/* App name */}
      <div style={{
        marginTop: 16, fontSize: 24, fontWeight: 700,
        color: "#fff", letterSpacing: 1,
        animation: "logoIn 0.6s ease 0.4s both",
        fontFamily: "system-ui, sans-serif",
      }}>
        SaunaStats
      </div>

      {/* Steam lines */}
      <div style={{ marginTop: 32, display: "flex", gap: 12, alignItems: "flex-end", height: 60 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 3, borderRadius: 99,
            background: "linear-gradient(to top, #f97316aa, transparent)",
            animation: `steam 1.2s ease-in-out ${0.6 + i * 0.15}s infinite alternate`,
            height: 40 + i * 8,
            opacity: 0.7,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes splashFade {
          0%   { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }
        @keyframes logoIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes steam {
          from { transform: translateY(0) scaleX(1); opacity: 0.6; }
          to   { transform: translateY(-18px) scaleX(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
