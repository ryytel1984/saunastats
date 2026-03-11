import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

const ADMIN_UID = "1tRQDUGWP6MU5BLBgL1XoOE5OzP2";

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

export default function Admin() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [totals, setTotals] = useState({ sessions: 0, steams: 0, beers: 0, waters: 0 });
  const [monthlyGrowth, setMonthlyGrowth] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u === null) {
        // auth fully loaded, no user
        navigate("/login");
      } else if (u.uid !== ADMIN_UID) {
        navigate("/dashboard");
      } else {
        setReady(true);
        loadData();
      }
    });
    return unsub;
  }, []);

  const loadData = async () => {
    setLoading(true);
    const usersSnap = await getDocs(collection(db, "users"));
    const userData = await Promise.all(
      usersSnap.docs.map(async (d) => {
        const prof = d.data();
        const saunaSnap = await getDocs(collection(db, "users", d.id, "saunas"));
        const saunas = saunaSnap.docs.map(s => s.data());
        const thisYear = new Date().getFullYear().toString();
        return {
          uid: d.id,
          displayName: prof.displayName || prof.username || d.id,
          username: prof.username || "",
          avatarUrl: prof.avatarUrl || "",
          isPublic: prof.isPublic !== false,
          sessions: saunas.length,
          sessionsThisYear: saunas.filter(s => s.date?.startsWith(thisYear)).length,
          steams: saunas.reduce((a, s) => a + (s.steams || 0), 0),
          beers: saunas.reduce((a, s) => a + getBeers(s), 0),
          waters: saunas.reduce((a, s) => a + getWaters(s), 0),
          lastSession: saunas.length ? [...saunas].sort((a, b) => b.date?.localeCompare(a.date))[0].date : null,
          allSaunas: saunas,
        };
      })
    );

    setTotals(userData.reduce((acc, u) => ({
      sessions: acc.sessions + u.sessions,
      steams: acc.steams + u.steams,
      beers: acc.beers + u.beers,
      waters: acc.waters + u.waters,
    }), { sessions: 0, steams: 0, beers: 0, waters: 0 }));

    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short", year: "2-digit" });
      const count = userData.reduce((acc, u) =>
        acc + u.allSaunas.filter(s => s.date?.startsWith(key)).length, 0);
      months.push({ key, label, count });
    }
    setMonthlyGrowth(months);
    userData.sort((a, b) => b.sessions - a.sessions);
    setUsers(userData);
    setLoading(false);
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete ${u.displayName} and all their data? This cannot be undone.`)) return;
    for (const sub of ["saunas", "friends", "notifications"]) {
      const snap = await getDocs(collection(db, "users", u.uid, sub));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    await deleteDoc(doc(db, "users", u.uid));
    setUsers(prev => prev.filter(x => x.uid !== u.uid));
  };

  if (!ready || loading) return (
    <div className="min-h-screen text-white flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #3d1a00 0%, #1a0a00 40%, #0d0d0d 100%)" }}>
      <div className="text-stone-400">Loading...</div>
    </div>
  );

  const maxMonthCount = Math.max(1, ...monthlyGrowth.map(m => m.count));

  return (
    <div className="min-h-screen text-white p-4 max-w-2xl mx-auto"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #3d1a00 0%, #1a0a00 40%, #0d0d0d 100%)" }}>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">⚙️ Admin</h1>
        <Link to="/dashboard" className="text-stone-400 hover:text-white text-sm">← Dashboard</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/50 rounded-xl p-4">
          <div className="text-stone-400 text-xs uppercase tracking-wide mb-1">Users</div>
          <div className="text-3xl font-bold text-orange-400">{users.length}</div>
          <div className="text-stone-500 text-xs mt-1">{users.filter(u => u.isPublic).length} public · {users.filter(u => !u.isPublic).length} private</div>
        </div>
        <div className="bg-black/50 rounded-xl p-4">
          <div className="text-stone-400 text-xs uppercase tracking-wide mb-1">Total sessions</div>
          <div className="text-3xl font-bold text-orange-400">{totals.sessions}</div>
          <div className="text-stone-500 text-xs mt-1">across all users</div>
        </div>
        <div className="bg-black/50 rounded-xl p-4">
          <div className="text-stone-400 text-xs uppercase tracking-wide mb-1">Total steams 🌊</div>
          <div className="text-3xl font-bold text-orange-400">{totals.steams}</div>
          <div className="text-stone-500 text-xs mt-1">avg {totals.sessions ? (totals.steams / totals.sessions).toFixed(1) : "—"} per session</div>
        </div>
        <div className="bg-black/50 rounded-xl p-4">
          <div className="text-stone-400 text-xs uppercase tracking-wide mb-1">Beers · Waters</div>
          <div className="text-2xl font-bold">
            <span className="text-orange-400">{totals.beers}</span>
            <span className="text-stone-600"> · </span>
            <span className="text-sky-400">{totals.waters}</span>
          </div>
        </div>
      </div>

      <div className="bg-black/50 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs uppercase tracking-wide mb-4">📊 Monthly sessions (12 months)</div>
        <div className="flex items-end gap-1 h-24">
          {monthlyGrowth.map((m) => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-stone-500 text-xs">{m.count > 0 ? m.count : ""}</div>
              <div className="w-full bg-orange-500 rounded-t"
                style={{ height: `${Math.round((m.count / maxMonthCount) * 72)}px`, minHeight: m.count > 0 ? "4px" : "0" }} />
              <div className="text-stone-600" style={{ fontSize: "9px" }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-black/50 rounded-xl p-4">
        <div className="text-stone-400 text-xs uppercase tracking-wide mb-3">👤 Users ({users.length})</div>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.uid} className="bg-black/40 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <Link to={u.username ? `/${u.username}` : "#"} className="shrink-0">
                  <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}`}
                    className="w-9 h-9 rounded-full object-cover hover:opacity-80 transition" alt="" />
                </Link>
                <Link to={u.username ? `/${u.username}` : "#"} className="flex-1 min-w-0 hover:opacity-80 transition">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{u.displayName}</span>
                    {!u.isPublic && <span className="text-stone-600 text-xs">🔒</span>}
                  </div>
                  <div className="text-stone-500 text-xs">@{u.username || "—"}</div>
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-orange-400 font-bold text-sm">{u.sessions} <span className="text-stone-600 font-normal text-xs">total</span></div>
                    <div className="text-stone-500 text-xs">{u.sessionsThisYear} this year</div>
                  </div>
                  {u.uid !== ADMIN_UID && (
                    <button onClick={() => handleDelete(u)}
                      className="text-stone-600 hover:text-red-400 transition text-lg" title="Delete user">
                      🗑
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-stone-500 pl-12">
                <span>🌊 {u.steams}</span>
                <span>🍺 {u.beers}</span>
                <span>💧 {u.waters}</span>
                {u.lastSession && <span>last: {u.lastSession}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
