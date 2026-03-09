import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useParams, Link } from "react-router-dom";

export default function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [saunas, setSaunas] = useState([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDocs(collection(db, "users"));
      const match = snap.docs.find((d) => d.data().username === username);
      if (!match) { setNotFound(true); return; }
      setProfile({ uid: match.id, ...match.data() });
      const saunaSnap = await getDocs(collection(db, "users", match.id, "saunas"));
      setSaunas(saunaSnap.docs.map((d) => d.data()).sort((a, b) => b.date.localeCompare(a.date)));
    };
    fetchProfile();
  }, [username]);

  if (notFound) return (
    <div className="min-h-screen bg-stone-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">User not found</h1>
        <Link to="/" className="text-orange-400 hover:underline">Go home</Link>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-stone-900 text-white flex items-center justify-center">
      <div className="text-stone-400">Loading...</div>
    </div>
  );

  // Stats
  const thisYear = new Date().getFullYear().toString();
  const lastYear = (new Date().getFullYear() - 1).toString();
  const thisYearSaunas = saunas.filter((s) => s.date?.startsWith(thisYear));
  const lastYearSaunas = saunas.filter((s) => s.date?.startsWith(lastYear));
  const homeSaunas = thisYearSaunas.filter((s) => s.type === "home");
  const awaySaunas = thisYearSaunas.filter((s) => s.type === "away");
  const totalSteams = saunas.reduce((a, s) => a + (s.steams || 0), 0);
  const totalBeers = saunas.filter((s) => s.drink === "beer").reduce((a, s) => a + (s.drinks || 0), 0);
  const thisYearSteams = thisYearSaunas.reduce((a, s) => a + (s.steams || 0), 0);
  const thisYearBeers = thisYearSaunas.filter((s) => s.drink === "beer").reduce((a, s) => a + (s.drinks || 0), 0);
  const avgSteams = thisYearSaunas.length ? (thisYearSteams / thisYearSaunas.length).toFixed(1) : 0;
  const avgBeers = thisYearSaunas.filter((s) => s.drink === "beer").length
    ? (thisYearBeers / thisYearSaunas.filter((s) => s.drink === "beer").length).toFixed(1) : 0;
  const maxBeers = Math.max(0, ...thisYearSaunas.map((s) => s.drinks || 0));

  const awayCount = {};
  awaySaunas.forEach((s) => { if (s.location) awayCount[s.location] = (awayCount[s.location] || 0) + 1; });
  const awayTop = Object.entries(awayCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const compCount = {};
  thisYearSaunas.forEach((s) => (s.companions || []).forEach((c) => { compCount[c] = (compCount[c] || 0) + 1; }));
  const compTop = Object.entries(compCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const weeksSinceJan1 = Math.ceil((new Date() - new Date(thisYear + "-01-01")) / (7 * 24 * 60 * 60 * 1000));
  const tempoThisYear = (thisYearSaunas.length / weeksSinceJan1).toFixed(1);
  const tempoLastYear = lastYearSaunas.length ? (lastYearSaunas.length / 52).toFixed(1) : "—";

  const sorted = [...thisYearSaunas].sort((a, b) => a.date.localeCompare(b.date));
  let longestGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / (1000 * 60 * 60 * 24);
    if (diff > longestGap) longestGap = diff;
  }

  return (
    <div className="min-h-screen bg-stone-900 text-white p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <img src={profile.avatarUrl} className="w-16 h-16 rounded-full" />
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <div className="text-stone-400">@{profile.username}</div>
        </div>
        <Link to="/leaderboard" className="ml-auto text-stone-400 hover:text-white text-sm">Leaderboard</Link>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-stone-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-orange-400">{saunas.length}</div>
          <div className="text-stone-400 text-sm mt-1">Sessions kokku</div>
        </div>
        <div className="bg-stone-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-orange-400">{totalSteams}</div>
          <div className="text-stone-400 text-sm mt-1">Leilid kokku</div>
        </div>
        <div className="bg-stone-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-orange-400">{totalBeers}</div>
          <div className="text-stone-400 text-sm mt-1">Õlled kokku</div>
        </div>
      </div>

      {/* Year comparison */}
      <div className="bg-stone-800 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">Tempo võrdlus</div>
        <div className="flex justify-around">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">{thisYearSaunas.length}</div>
            <div className="text-stone-400 text-sm">{thisYear}</div>
            <div className="text-stone-500 text-xs">{tempoThisYear}/nädalas</div>
          </div>
          <div className="text-stone-600 self-center text-xl">↔</div>
          <div className="text-center">
            <div className="text-3xl font-bold text-stone-400">{lastYearSaunas.length}</div>
            <div className="text-stone-400 text-sm">{lastYear}</div>
            <div className="text-stone-500 text-xs">{tempoLastYear}/nädalas</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-stone-800 rounded-xl p-4">
          <div className="text-stone-400 text-xs mb-2">🏠 Kodus vs Võõrsil</div>
          <div className="flex justify-between">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{homeSaunas.length}</div>
              <div className="text-stone-500 text-xs">kodus</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{awaySaunas.length}</div>
              <div className="text-stone-500 text-xs">võõrsil</div>
            </div>
          </div>
        </div>
        <div className="bg-stone-800 rounded-xl p-4">
          <div className="text-stone-400 text-xs mb-2">🌊 Leilid ({thisYear})</div>
          <div className="flex justify-between">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{thisYearSteams}</div>
              <div className="text-stone-500 text-xs">kokku</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{avgSteams}</div>
              <div className="text-stone-500 text-xs">keskmine</div>
            </div>
          </div>
        </div>
        <div className="bg-stone-800 rounded-xl p-4">
          <div className="text-stone-400 text-xs mb-2">🍺 Õlled ({thisYear})</div>
          <div className="flex justify-between">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{thisYearBeers}</div>
              <div className="text-stone-500 text-xs">kokku</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{avgBeers}</div>
              <div className="text-stone-500 text-xs">keskmine</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{maxBeers}★</div>
              <div className="text-stone-500 text-xs">rekord</div>
            </div>
          </div>
        </div>
        <div className="bg-stone-800 rounded-xl p-4">
          <div className="text-stone-400 text-xs mb-2">📅 Tempo</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{longestGap || "—"}</div>
            <div className="text-stone-500 text-xs">pikim vahe (päeva)</div>
          </div>
        </div>
      </div>

      {/* TOP lists */}
      {awayTop.length > 0 && (
        <div className="bg-stone-800 rounded-xl p-4 mb-4">
          <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📍 Võõrsil TOP ({thisYear})</div>
          {awayTop.map(([loc, count]) => (
            <div key={loc} className="flex justify-between py-1 border-b border-stone-700 last:border-0">
              <span>{loc}</span>
              <span className="text-orange-400">{count}x</span>
            </div>
          ))}
        </div>
      )}

      {compTop.length > 0 && (
        <div className="bg-stone-800 rounded-xl p-4 mb-4">
          <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">👥 Kaaslased TOP ({thisYear})</div>
          {compTop.map(([name, count]) => (
            <div key={name} className="flex justify-between py-1 border-b border-stone-700 last:border-0">
              <span>{name}</span>
              <span className="text-orange-400">{count}x</span>
            </div>
          ))}
        </div>
      )}

      {/* Session list */}
      <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">Kõik sessioonid</div>
      <div className="space-y-2">
        {saunas.map((s, i) => (
          <div key={i} className="bg-stone-800 rounded-xl p-4 flex justify-between items-center">
            <div>
              <div className="font-semibold">{s.date} · {s.location || (s.type === "home" ? "Kodus" : "Võõrsil")}</div>
              <div className="text-stone-400 text-sm mt-1">
                🌊 {s.steams} leili · {s.drink === "beer" ? "🍺" : s.drink === "water" ? "💧" : "🚫"} {s.drink !== "none" ? s.drinks : ""}
                {s.companions?.length > 0 && ` · 👥 ${s.companions.join(", ")}`}
              </div>
            </div>
            <div className="text-stone-500 text-sm">{s.type === "home" ? "🏠" : "✈️"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
