import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useParams, Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan","Feb","Mar","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dets"];

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

export default function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [saunas, setSaunas] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [logTab, setLogTab] = useState(null);

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

  const thisYear = new Date().getFullYear().toString();
  const lastYear = (new Date().getFullYear() - 1).toString();
  const todayMMDD = new Date().toISOString().slice(5, 10);

  const thisYearSaunas = saunas.filter((s) => s.date?.startsWith(thisYear));
  const lastYearSaunas = saunas.filter((s) => s.date?.startsWith(lastYear));
  const lastYearSamePeriod = lastYearSaunas.filter((s) => s.date?.slice(5) <= todayMMDD);

  const homeSaunas = thisYearSaunas.filter((s) => s.type === "home");
  const awaySaunas = thisYearSaunas.filter((s) => s.type === "away");
  const lastYearAwaySaunas = lastYearSaunas.filter((s) => s.type === "away");

  const totalBeers = thisYearSaunas.reduce((a, s) => a + getBeers(s), 0);
  const totalWaters = thisYearSaunas.reduce((a, s) => a + getWaters(s), 0);
  const totalSteams = thisYearSaunas.reduce((a, s) => a + (s.steams || 0), 0);
  const avgSteams = thisYearSaunas.length ? (totalSteams / thisYearSaunas.length).toFixed(1) : "—";
  const sessionsWithBeers = thisYearSaunas.filter((s) => getBeers(s) > 0);
  const avgBeers = sessionsWithBeers.length ? (totalBeers / sessionsWithBeers.length).toFixed(1) : "—";
  const maxBeers = Math.max(0, ...thisYearSaunas.map((s) => getBeers(s)));

  const weeksSinceJan1 = Math.max(1, Math.ceil((new Date() - new Date(thisYear + "-01-01")) / (7 * 24 * 60 * 60 * 1000)));
  const tempoThisYear = (thisYearSaunas.length / weeksSinceJan1).toFixed(1);
  const tempoLastYear = lastYearSaunas.length ? (lastYearSaunas.length / 52).toFixed(1) : "—";

  const sortedThis = [...thisYearSaunas].sort((a, b) => a.date.localeCompare(b.date));
  let longestGap = 0;
  for (let i = 1; i < sortedThis.length; i++) {
    const diff = (new Date(sortedThis[i].date) - new Date(sortedThis[i - 1].date)) / (1000 * 60 * 60 * 24);
    if (diff > longestGap) longestGap = diff;
  }

  const awayCount = {};
  awaySaunas.forEach((s) => { if (s.location) awayCount[s.location] = (awayCount[s.location] || 0) + 1; });
  const awayTop = Object.entries(awayCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const awayCountLast = {};
  lastYearAwaySaunas.forEach((s) => { if (s.location) awayCountLast[s.location] = (awayCountLast[s.location] || 0) + 1; });
  const awayTopLast = Object.entries(awayCountLast).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const compCount = {};
  thisYearSaunas.forEach((s) => (s.companions || []).forEach((c) => { compCount[c] = (compCount[c] || 0) + 1; }));
  const compTop = Object.entries(compCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const chartData = MONTHS.map((month, i) => {
    const m = String(i + 1).padStart(2, "0");
    return {
      month,
      [thisYear]: thisYearSaunas.filter((s) => s.date?.startsWith(`${thisYear}-${m}`)).length,
      [lastYear]: lastYearSaunas.filter((s) => s.date?.startsWith(`${lastYear}-${m}`)).length,
    };
  });

  const allYears = [...new Set(saunas.map((s) => s.date?.slice(0, 4)).filter(Boolean))].sort((a, b) => b - a);
  const activeTab = logTab || allYears[0] || thisYear;
  const tabSaunas = saunas.filter((s) => s.date?.startsWith(activeTab));

  return (
    <div className="min-h-screen bg-stone-900 text-white p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <img src={profile.avatarUrl} className="w-16 h-16 rounded-full" alt="" />
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <div className="text-stone-400">@{profile.username}</div>
        </div>
        <Link to="/leaderboard" className="ml-auto text-stone-400 hover:text-white text-sm">Leaderboard</Link>
      </div>

      {/* Year comparison */}
      <div className="bg-stone-800 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs mb-1 uppercase tracking-wide">Aasta võrdlus</div>
        <div className="text-stone-500 text-xs mb-3">sama periood — tänase kuupäevani</div>
        <div className="flex justify-around">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">{thisYearSaunas.length}</div>
            <div className="text-stone-400 text-sm">{thisYear}</div>
            <div className="text-stone-500 text-xs">{tempoThisYear}/nädalas</div>
          </div>
          <div className="text-stone-600 self-center text-xl">↔</div>
          <div className="text-center">
            <div className="text-3xl font-bold text-stone-400">{lastYearSamePeriod.length}</div>
            <div className="text-stone-400 text-sm">{lastYear}</div>
            <div className="text-stone-500 text-xs">{tempoLastYear}/nädalas</div>
          </div>
        </div>
      </div>

      {/* Kodus vs Voorrsil */}
      <div className="bg-stone-800 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">🏠 Kodus vs Võõrsil</div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-16 text-sm text-stone-300">Kodus</div>
            <div className="flex-1 bg-stone-700 rounded-full h-3">
              <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: thisYearSaunas.length ? `${(homeSaunas.length / thisYearSaunas.length) * 100}%` : "0%" }} />
            </div>
            <div className="w-6 text-right font-bold text-orange-400 text-sm">{homeSaunas.length}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 text-sm text-stone-300">Võõrsil</div>
            <div className="flex-1 bg-stone-700 rounded-full h-3">
              <div className="bg-sky-400 h-3 rounded-full transition-all" style={{ width: thisYearSaunas.length ? `${(awaySaunas.length / thisYearSaunas.length) * 100}%` : "0%" }} />
            </div>
            <div className="w-6 text-right font-bold text-sky-400 text-sm">{awaySaunas.length}</div>
          </div>
        </div>
        {thisYearSaunas.length > 0 && (
          <div className="text-stone-500 text-xs mt-3">
            {Math.round((homeSaunas.length / thisYearSaunas.length) * 100)}% kodus · {Math.round((awaySaunas.length / thisYearSaunas.length) * 100)}% võõrsil
          </div>
        )}
      </div>

      {/* Joogid */}
      <div className="bg-stone-800 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">🍺 Joogid ({thisYear})</div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-16 text-sm text-stone-300">🍺 Õlut</div>
            <div className="flex-1 bg-stone-700 rounded-full h-3">
              <div className="bg-orange-500 h-3 rounded-full transition-all"
                style={{ width: (totalBeers + totalWaters) > 0 ? `${(totalBeers / (totalBeers + totalWaters)) * 100}%` : "0%" }} />
            </div>
            <div className="w-6 text-right font-bold text-orange-400 text-sm">{totalBeers}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 text-sm text-stone-300">💧 Vett</div>
            <div className="flex-1 bg-stone-700 rounded-full h-3">
              <div className="bg-sky-400 h-3 rounded-full transition-all"
                style={{ width: (totalBeers + totalWaters) > 0 ? `${(totalWaters / (totalBeers + totalWaters)) * 100}%` : "0%" }} />
            </div>
            <div className="w-6 text-right font-bold text-sky-400 text-sm">{totalWaters}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-stone-700">
          <div className="text-center">
            <div className="text-lg font-bold text-orange-400">{avgBeers}</div>
            <div className="text-stone-500 text-xs">õlut/saun</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-400">{maxBeers}</div>
            <div className="text-stone-500 text-xs">rekord</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-400">{totalBeers + totalWaters}</div>
            <div className="text-stone-500 text-xs">kokku</div>
          </div>
        </div>
      </div>

      {/* Tempo & Leilid */}
      <div className="bg-stone-800 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📅 Tempo & Leilid</div>
        <div className="flex justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{tempoThisYear}</div>
            <div className="text-stone-500 text-xs">sauna nädalas</div>
            <div className="text-stone-600 text-xs">{thisYear} keskmine</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{avgSteams}</div>
            <div className="text-stone-500 text-xs">leili keskmiselt</div>
            <div className="text-stone-600 text-xs">sauna kohta</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{longestGap || "—"}</div>
            <div className="text-stone-500 text-xs">päeva pikim vahe</div>
            <div className="text-stone-600 text-xs">saunade vahel</div>
          </div>
        </div>
      </div>

      {/* Monthly line chart */}
      <div className="bg-stone-800 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📊 Kuude võrdlus</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fill: "#78716c", fontSize: 11 }} />
            <YAxis tick={{ fill: "#78716c", fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#1c1917", border: "none", borderRadius: 8, color: "#fff" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey={thisYear} stroke="#f97316" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey={lastYear} stroke="#57534e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Võõrsil TOP */}
      {(awayTop.length > 0 || awayTopLast.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {awayTop.length > 0 && (
            <div className="bg-stone-800 rounded-xl p-4">
              <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📍 Võõrsil {thisYear}</div>
              {awayTop.map(([loc, count]) => (
                <div key={loc} className="flex justify-between py-1 border-b border-stone-700 last:border-0 text-sm">
                  <span className="truncate mr-2">{loc}</span>
                  <span className="text-orange-400 shrink-0">{count}x</span>
                </div>
              ))}
            </div>
          )}
          {awayTopLast.length > 0 && (
            <div className="bg-stone-800 rounded-xl p-4">
              <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📍 Võõrsil {lastYear}</div>
              {awayTopLast.map(([loc, count]) => (
                <div key={loc} className="flex justify-between py-1 border-b border-stone-700 last:border-0 text-sm">
                  <span className="truncate mr-2">{loc}</span>
                  <span className="text-orange-400 shrink-0">{count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Companions TOP */}
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

      {/* Session log with year tabs */}
      <div className="bg-stone-800 rounded-xl p-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📋 Saunapäevik</div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {allYears.map((year) => (
            <button key={year} onClick={() => setLogTab(year)}
              className={`px-4 py-1 rounded-full text-sm font-medium transition ${activeTab === year ? "bg-orange-500 text-white" : "bg-stone-700 text-stone-400 hover:bg-stone-600"}`}>
              {year}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {tabSaunas.map((s, i) => {
            const b = getBeers(s);
            const w = getWaters(s);
            return (
              <div key={i} className="bg-stone-700 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm">{s.date} · {s.location || (s.type === "home" ? "Kodus" : "Võõrsil")}</div>
                  <div className="text-stone-400 text-xs mt-1">
                    🌊 {s.steams}
                    {b > 0 && ` · 🍺 ${b}`}
                    {w > 0 && ` · 💧 ${w}`}
                    {s.companions?.length > 0 && ` · 👥 ${s.companions.join(", ")}`}
                  </div>
                </div>
                <div className="text-stone-500 text-sm ml-2">{s.type === "home" ? "🏠" : "✈️"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
