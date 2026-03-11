import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useParams, Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
  const [activeMainTab, setActiveMainTab] = useState("stats");
  const [friendsList, setFriendsList] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null); // null | "friends" | "sent" | "received"
  const [addingFriend, setAddingFriend] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setCurrentUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDocs(collection(db, "users"));
      const match = snap.docs.find((d) => d.data().username === username);
      if (!match) { setNotFound(true); return; }
      setProfile({ uid: match.id, ...match.data() });
      const uid = match.id;

      const saunaSnap = await getDocs(collection(db, "users", uid, "saunas"));
      setSaunas(saunaSnap.docs.map((d) => d.data()).sort((a, b) => b.date.localeCompare(a.date)));

      const friendsSnap = await getDocs(collection(db, "users", uid, "friends"));
      const accepted = friendsSnap.docs.filter(d => d.data().status === "accepted");
      const list = await Promise.all(accepted.map(async (d) => {
        const profSnap = await getDoc(doc(db, "users", d.id));
        const prof = profSnap.exists() ? profSnap.data() : {};
        return { uid: d.id, displayName: prof.displayName || d.id, username: prof.username || "", avatarUrl: prof.avatarUrl || "" };
      }));
      setFriendsList(list);
    };
    fetchProfile();
  }, [username]);

  useEffect(() => {
    const checkFriendStatus = async () => {
      if (!currentUser || !profile || currentUser.uid === profile.uid) return;
      const snap = await getDoc(doc(db, "users", currentUser.uid, "friends", profile.uid));
      if (!snap.exists()) { setFriendStatus(null); return; }
      const d = snap.data();
      if (d.status === "accepted") setFriendStatus("friends");
      else if (d.direction === "sent") setFriendStatus("sent");
      else setFriendStatus("received");
    };
    checkFriendStatus();
  }, [currentUser, profile]);

  const handleAddFriend = async () => {
    if (!currentUser || !profile) return;
    setAddingFriend(true);
    await setDoc(doc(db, "users", currentUser.uid, "friends", profile.uid), { status: "pending", direction: "sent", addedAt: serverTimestamp() });
    await setDoc(doc(db, "users", profile.uid, "friends", currentUser.uid), { status: "pending", direction: "received", addedAt: serverTimestamp() });
    setFriendStatus("sent");
    setAddingFriend(false);
  };

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
  const sessionsWithWaters = thisYearSaunas.filter((s) => getWaters(s) > 0);
  const avgWaters = sessionsWithWaters.length ? (totalWaters / sessionsWithWaters.length).toFixed(1) : "—";
  const maxWaters = Math.max(0, ...thisYearSaunas.map((s) => getWaters(s)));

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
    <div className="min-h-screen text-white" style={{ background: "radial-gradient(ellipse at 50% 0%, #3d1a00 0%, #1a0a00 40%, #0d0d0d 100%)" }}>
      <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-4">
        <img src={profile.avatarUrl} className="w-16 h-16 rounded-full object-cover shrink-0" alt="" />
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <div className="text-stone-400">@{profile.username}</div>
        </div>
        <div className="ml-auto flex flex-col items-end gap-2">
          <img src="/saunastats-logo-white.svg" alt="SaunaStats" className="h-8 opacity-60" />
          {currentUser && currentUser.uid !== profile.uid && (
            <>
              {friendStatus === null && (
                <button onClick={handleAddFriend} disabled={addingFriend}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
                  + Add friend
                </button>
              )}
              {friendStatus === "sent" && <span className="text-stone-400 text-xs">Request sent</span>}
              {friendStatus === "received" && <span className="text-orange-400 text-xs">Wants to be friends</span>}
              {friendStatus === "friends" && <span className="text-green-400 text-xs">✓ Friends</span>}
            </>
          )}
          <Link to="/leaderboard" className="text-stone-400 hover:text-white text-xs">Leaderboard</Link>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setActiveMainTab("stats")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition ${activeMainTab === "stats" ? "bg-orange-500 text-white" : "bg-stone-800 text-stone-400 hover:bg-stone-700"}`}>
          📊 Stats
        </button>
        <button onClick={() => setActiveMainTab("friends")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition ${activeMainTab === "friends" ? "bg-orange-500 text-white" : "bg-stone-800 text-stone-400 hover:bg-stone-700"}`}>
          👥 Friends {friendsList.length > 0 && <span className="ml-1 opacity-70">({friendsList.length})</span>}
        </button>
      </div>

      {/* Friends tab */}
      {activeMainTab === "friends" && (
        <div className="bg-black/50 rounded-xl p-4">
          {friendsList.length === 0 ? (
            <div className="text-stone-500 text-sm text-center py-8">No friends yet</div>
          ) : (
            <div className="space-y-2">
              {friendsList.map((f) => (
                <Link key={f.uid} to={`/${f.username}`}
                  className="flex items-center gap-3 bg-stone-700 hover:bg-stone-600 rounded-xl p-3 transition">
                  <img src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.displayName)}`}
                    className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                  <div>
                    <div className="font-semibold text-sm">{f.displayName}</div>
                    <div className="text-stone-400 text-xs">@{f.username}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats tab */}
      {activeMainTab === "stats" && (<>

      {lastYearSaunas.length > 0 && (
      <div className="bg-black/50 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs mb-1 uppercase tracking-wide">Year comparison</div>
        <div className="text-stone-500 text-xs mb-3">same period — up to today</div>
        <div className="flex justify-around items-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">{thisYearSaunas.length}</div>
            <div className="text-stone-400 text-sm">{thisYear}</div>
            <div className="text-stone-500 text-xs">{tempoThisYear}/week</div>
          </div>
          <div className="text-center">
            {(() => {
              const diff = thisYearSaunas.length - lastYearSamePeriod.length;
              if (diff > 0) return <><div className="text-green-400 font-bold text-lg">+{diff}</div><div className="text-stone-500 text-xs">ahead</div></>;
              if (diff < 0) return <><div className="text-red-400 font-bold text-lg">{diff}</div><div className="text-stone-500 text-xs">behind</div></>;
              return <><div className="text-stone-400 font-bold text-lg">—</div><div className="text-stone-500 text-xs">equal</div></>;
            })()}
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-stone-400">{lastYearSamePeriod.length}</div>
            <div className="text-stone-400 text-sm">{lastYear}</div>
            <div className="text-stone-500 text-xs">{tempoLastYear}/week</div>
          </div>
        </div>
      </div>
      )}

      <div className="bg-black/50 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">🏠 Home vs Away</div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 text-sm text-stone-300">Home</div>
            <div className="flex-1 bg-stone-700 rounded-full h-3">
              <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: thisYearSaunas.length ? `${(homeSaunas.length / thisYearSaunas.length) * 100}%` : "0%" }} />
            </div>
            <div className="w-6 text-right font-bold text-orange-400 text-sm">{homeSaunas.length}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 text-sm text-stone-300">Away</div>
            <div className="flex-1 bg-stone-700 rounded-full h-3">
              <div className="bg-sky-400 h-3 rounded-full transition-all" style={{ width: thisYearSaunas.length ? `${(awaySaunas.length / thisYearSaunas.length) * 100}%` : "0%" }} />
            </div>
            <div className="w-6 text-right font-bold text-sky-400 text-sm">{awaySaunas.length}</div>
          </div>
        </div>
        {thisYearSaunas.length > 0 && (
          <div className="text-stone-500 text-xs mt-3">
            {Math.round((homeSaunas.length / thisYearSaunas.length) * 100)}% home · {Math.round((awaySaunas.length / thisYearSaunas.length) * 100)}% away
          </div>
        )}
      </div>

      <div className="bg-black/50 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">🍺 Drinks ({thisYear})</div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 text-sm text-stone-300">🍺 Beer</div>
            <div className="flex-1 bg-stone-700 rounded-full h-3">
              <div className="bg-orange-500 h-3 rounded-full transition-all"
                style={{ width: (totalBeers + totalWaters) > 0 ? `${(totalBeers / (totalBeers + totalWaters)) * 100}%` : "0%" }} />
            </div>
            <div className="w-6 text-right font-bold text-orange-400 text-sm">{totalBeers}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 text-sm text-stone-300">💧 Water</div>
            <div className="flex-1 bg-stone-700 rounded-full h-3">
              <div className="bg-sky-400 h-3 rounded-full transition-all"
                style={{ width: (totalBeers + totalWaters) > 0 ? `${(totalWaters / (totalBeers + totalWaters)) * 100}%` : "0%" }} />
            </div>
            <div className="w-6 text-right font-bold text-sky-400 text-sm">{totalWaters}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-stone-700 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-stone-400 text-xs">🍺 Beer avg</span>
            <div className="flex gap-4">
              <span className="text-xs text-stone-500">avg <span className="text-orange-400 font-bold">{avgBeers}</span></span>
              <span className="text-xs text-stone-500">record <span className="text-orange-400 font-bold">{maxBeers}</span></span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-400 text-xs">💧 Water avg</span>
            <div className="flex gap-4">
              <span className="text-xs text-stone-500">avg <span className="text-sky-400 font-bold">{avgWaters}</span></span>
              <span className="text-xs text-stone-500">record <span className="text-sky-400 font-bold">{maxWaters}</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-black/50 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📅 Pace & Steams</div>
        <div className="flex justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{totalSteams}</div>
            <div className="text-stone-500 text-xs">total steams</div>
            <div className="text-stone-600 text-xs">{thisYear}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{avgSteams}</div>
            <div className="text-stone-500 text-xs">steams avg</div>
            <div className="text-stone-600 text-xs">per session</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{longestGap || "—"}</div>
            <div className="text-stone-500 text-xs">day longest gap</div>
            <div className="text-stone-600 text-xs">between saunas</div>
          </div>
        </div>
      </div>

      <div className="bg-black/50 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📊 Monthly comparison</div>
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

      {(awayTop.length > 0 || awayTopLast.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {awayTop.length > 0 && (
            <div className="bg-black/50 rounded-xl p-4">
              <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📍 Away {thisYear}</div>
              {awayTop.map(([loc, count]) => (
                <div key={loc} className="flex justify-between py-1 border-b border-stone-700 last:border-0 text-sm">
                  <span className="truncate mr-2">{loc}</span>
                  <span className="text-orange-400 shrink-0">{count}x</span>
                </div>
              ))}
            </div>
          )}
          {awayTopLast.length > 0 && (
            <div className="bg-black/50 rounded-xl p-4">
              <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📍 Away {lastYear}</div>
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

      {compTop.length > 0 && (
        <div className="bg-black/50 rounded-xl p-4 mb-4">
          <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">👥 Top companions ({thisYear})</div>
          {compTop.map(([name, count]) => (
            <div key={name} className="flex justify-between py-1 border-b border-stone-700 last:border-0">
              <span>{name}</span>
              <span className="text-orange-400">{count}x</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-black/50 rounded-xl p-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📋 Sauna log</div>
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
              <div key={i} className="bg-black/40 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm">{s.date} · {s.location || (s.type === "home" ? "Home" : "Away")}</div>
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
      </>)}
    </div>
    </div>
  );
}
