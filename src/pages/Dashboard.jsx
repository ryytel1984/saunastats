import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [saunas, setSaunas] = useState([]);
  const [form, setForm] = useState({ date: "", type: "home", location: "", steams: 1, beers: 0, companions: "" });
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) navigate("/login");
      else setUser(u);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "saunas"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setSaunas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  const handleAdd = async () => {
    if (!form.date) return;
    await addDoc(collection(db, "users", user.uid, "saunas"), {
      ...form,
      steams: Number(form.steams),
      beers: Number(form.beers),
      companions: form.companions.split(",").map((s) => s.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    });
    setForm({ date: "", type: "home", location: "", steams: 1, beers: 0, companions: "" });
    setShowForm(false);
  };

  const totalSteams = saunas.reduce((a, s) => a + (s.steams || 0), 0);
  const totalBeers = saunas.reduce((a, s) => a + (s.beers || 0), 0);

  return (
    <div className="min-h-screen bg-stone-900 text-white p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">🧖 SaunaStats</h1>
        <button onClick={() => signOut(auth).then(() => navigate("/login"))} className="text-stone-400 hover:text-white text-sm">
          Sign out
        </button>
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

      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl mb-6 transition"
      >
        + Log Sauna Session
      </button>

      {showForm && (
        <div className="bg-stone-800 rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-stone-400 text-sm">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white" />
            </div>
            <div>
              <label className="text-stone-400 text-sm">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white">
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-stone-400 text-sm">Location</label>
            <input type="text" placeholder="e.g. Nõmme saun" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-stone-400 text-sm">Steams</label>
              <input type="number" min="0" value={form.steams} onChange={(e) => setForm({ ...form, steams: e.target.value })}
                className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white" />
            </div>
            <div>
              <label className="text-stone-400 text-sm">Beers</label>
              <input type="number" min="0" value={form.beers} onChange={(e) => setForm({ ...form, beers: e.target.value })}
                className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white" />
            </div>
          </div>
          <div>
            <label className="text-stone-400 text-sm">Companions (comma separated)</label>
            <input type="text" placeholder="e.g. Jüri, Mart" value={form.companions} onChange={(e) => setForm({ ...form, companions: e.target.value })}
              className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white" />
          </div>
          <button onClick={handleAdd} className="w-full bg-orange-500 hover:bg-orange-600 font-semibold py-3 rounded-xl transition">
            Save Session
          </button>
        </div>
      )}

      <div className="space-y-3">
        {saunas.map((s) => (
          <div key={s.id} className="bg-stone-800 rounded-xl p-4 flex justify-between items-center">
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