import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
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

  const totalSteams = saunas.reduce((a, s) => a + (s.steams || 0), 0);
  const totalBeers = saunas.reduce((a, s) => a + (s.beers || 0), 0);

  return (
    <div className="min-h-screen bg-stone-900 text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <img src={profile.avatarUrl} className="w-16 h-16 rounded-full" />
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <div className="text-stone-400">@{profile.username}</div>
        </div>
        <Link to="/leaderboard" className="ml-auto text-stone-400 hover:text-white text-sm">Leaderboard</Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-stone-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-orange-400">{saunas.length}</div>
          <div className="text-stone-400 text-sm mt-1">Sessions</div>
        </div>
        <div className="bg-stone-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-orange-400">{totalSteams}</div>
          <div className="text-stone-400 text-sm mt-1">Steams</div>
        </div>
        <div className="bg-stone-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-orange-400">{totalBeers}</div>
          <div className="text-stone-400 text-sm mt-1">Beers</div>
        </div>
      </div>

      <div className="space-y-3">
        {saunas.map((s, i) => (
          <div key={i} className="bg-stone-800 rounded-xl p-4 flex justify-between items-center">
            <div>
              <div className="font-semibold">{s.date} · {s.location || s.type}</div>
              <div className="text-stone-400 text-sm mt-1">💨 {s.steams} steams · 🍺 {s.beers} beers</div>
            </div>
            <div className="text-stone-500 text-sm capitalize">{s.type}</div>
          </div>
        ))}
      </div>
    </div>
  );
}