import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const data = await Promise.all(
        snap.docs.map(async (d) => {
          const profile = d.data();
          const saunaSnap = await getDocs(collection(db, "users", d.id, "saunas"));
          const saunas = saunaSnap.docs.map((s) => s.data());
          return {
            uid: d.id,
            ...profile,
            sessions: saunas.length,
            steams: saunas.reduce((a, s) => a + (s.steams || 0), 0),
            beers: saunas.reduce((a, s) => a + (s.beers || 0), 0),
          };
        })
      );
      data.sort((a, b) => b.sessions - a.sessions);
      setUsers(data);
    };
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-stone-900 text-white p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">🏆 Leaderboard</h1>
        <Link to="/dashboard" className="text-stone-400 hover:text-white text-sm">Dashboard</Link>
      </div>
      <div className="space-y-3">
        {users.map((u, i) => (
          <Link to={`/${u.username}`} key={u.uid}>
            <div className="bg-stone-800 rounded-xl p-4 flex items-center gap-4 hover:bg-stone-700 transition">
              <div className={`text-2xl font-bold w-8 text-center shrink-0 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-stone-300" : i === 2 ? "text-orange-400" : "text-stone-500"}`}>
                {i + 1}
              </div>
              <img
                src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || "?")}`}
                className="w-10 h-10 rounded-full object-cover shrink-0"
                alt=""
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{u.displayName}</div>
                <div className="text-stone-400 text-sm truncate">@{u.username}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-orange-400 font-bold">{u.sessions} sessions</div>
                <div className="text-stone-400 text-sm">💨 {u.steams} · 🍺 {u.beers}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
