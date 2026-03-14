import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

function getBeers(s) {
  if (s.beers !== undefined) return s.beers || 0;
  if (s.drink === "beer") return s.drinks || 0;
  return 0;
}
function getWaters(s) {
  if (s.waters !== undefined) return s.waters || 0;
  if (s.drink === "water") return s.drinks || 0;
  return 0;
}

function StatCard({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-orange-400">
        {value === null ? "—" : value.toLocaleString()}
      </div>
      <div className="text-stone-300 text-xs mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

export default function Landing() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      const usersSnap = await getDocs(collection(db, "users"));
      const userCount = usersSnap.docs.filter(d => d.data().username).length;
      let sessions = 0, steams = 0, beers = 0, waters = 0;
      await Promise.all(usersSnap.docs.map(async (d) => {
        const saunaSnap = await getDocs(collection(db, "users", d.id, "saunas"));
        saunaSnap.docs.forEach(s => {
          const data = s.data();
          sessions++;
          steams += data.steams || 0;
          beers += getBeers(data);
          waters += getWaters(data);
        });
      }));
      setStats({ sessions, steams, beers, waters, userCount });
    };
    load();
  }, []);

  return (
    <div
      className="min-h-screen text-white flex flex-col items-center justify-center px-4 relative"
      style={{
        backgroundImage: "url('/sauna-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
        <img src="/saunastats-logo-white.svg" alt="SaunaStats" className="w-full max-w-xs mx-auto mb-8" />

        {/* Stats */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-6 py-5 mb-8 w-full border border-white/10">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <StatCard value={stats?.sessions ?? null} label="Saunas logged" />
            <StatCard value={stats?.steams ?? null} label="Steams" />
            <StatCard value={stats?.beers ?? null} label="Beers" />
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            <StatCard value={stats?.waters ?? null} label="Waters" />
            <StatCard value={stats?.userCount ?? null} label="Enthusiasts" />
          </div>
        </div>

        <a
          href="/login"
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-10 py-3 rounded-xl text-lg transition w-full max-w-xs text-center"
        >
          Get Started
        </a>

        <div className="flex items-center gap-5 mt-6">
          <a href="https://www.facebook.com/saunastats" target="_blank" rel="noopener noreferrer"
            className="text-stone-500 hover:text-stone-300 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.271h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
          </a>
          <a href="https://www.instagram.com/sauna_stats" target="_blank" rel="noopener noreferrer"
            className="text-stone-500 hover:text-stone-300 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </a>
          <a href="mailto:sauna@saunastats.eu"
            className="text-stone-500 hover:text-stone-300 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
