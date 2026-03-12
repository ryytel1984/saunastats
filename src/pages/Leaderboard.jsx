import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import BottomNav from "../components/BottomNav";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const data = await Promise.all(
        snap.docs
          .filter(d => d.data().username && d.data().isPublic !== false)
          .map(async (d) => {
            const profile = d.data();
            const saunaSnap = await getDocs(collection(db, "users", d.id, "saunas"));
            const saunas = saunaSnap.docs.map((s) => s.data());
            const thisYear = new Date().getFullYear().toString();
            const thisYearSaunas = saunas.filter(s => s.date?.startsWith(thisYear));
            return {
              uid: d.id,
              displayName: profile.displayName || profile.username,
              username: profile.username,
              avatarUrl: profile.avatarUrl || "",
              sessions: saunas.length,
              sessionsThisYear: thisYearSaunas.length,
              steams: saunas.reduce((a, s) => a + (s.steams || 0), 0),
              beers: saunas.reduce((a, s) => {
                if (s.beers !== undefined) return a + (s.beers || 0);
                if (s.drink === "beer") return a + (s.drinks || 0);
                return a;
              }, 0),
            };
          })
      );
      data.sort((a, b) => b.sessionsThisYear - a.sessionsThisYear);
      setUsers(data);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const thisYear = new Date().getFullYear();

  return (
    <div className="min-h-screen text-white pb-24"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #3d1a00 0%, #1a0a00 40%, #0d0d0d 100%)" }}>
      <div className="max-w-2xl mx-auto p-4"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #3d1a00 0%, #1a0a00 40%, #0d0d0d 100%)" }}>
      <div className="flex items-center mb-6 pb-4 border-b border-white/5">
        <h1 className="text-lg font-bold">🏆 Leaderboard</h1>
      </div>

      <div className="text-stone-500 text-xs mb-4 uppercase tracking-wide">Ranked by sessions in {thisYear}</div>

      {loading ? (
        <div className="text-stone-500 text-center py-12">Loading...</div>
      ) : users.length === 0 ? (
        <div className="text-stone-500 text-center py-12">No public profiles yet</div>
      ) : (
        <div className="space-y-2">
          {users.map((u, i) => (
            <Link to={`/${u.username}`} key={u.uid}
              className="bg-black/50 rounded-xl p-4 flex items-center gap-4 hover:bg-black/70 transition block">
              <div className={`text-2xl font-bold w-8 text-center shrink-0 ${
                i === 0 ? "text-yellow-400" : i === 1 ? "text-stone-300" : i === 2 ? "text-orange-400" : "text-stone-600"
              }`}>
                {i + 1}
              </div>
              <img
                src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || "?")}`}
                className="w-10 h-10 rounded-full object-cover shrink-0"
                alt=""
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{u.displayName}</div>
                <div className="text-stone-500 text-xs truncate">@{u.username}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-orange-400 font-bold">{u.sessionsThisYear} <span className="text-stone-500 font-normal text-xs">this year</span></div>
                <div className="text-stone-500 text-xs">total {u.sessions} · 🌊 {u.steams}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <BottomNav />
      </div>
    </div>
  );
}
