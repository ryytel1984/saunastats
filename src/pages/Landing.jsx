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
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-6 py-5 mb-8 w-full grid grid-cols-5 gap-4 border border-white/10">
          <StatCard value={stats?.sessions ?? null} label="Saunas logged" />
          <StatCard value={stats?.steams ?? null} label="Steams" />
          <StatCard value={stats?.beers ?? null} label="Beers" />
          <StatCard value={stats?.waters ?? null} label="Waters" />
          <StatCard value={stats?.userCount ?? null} label="Enthusiasts" />
        </div>

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
