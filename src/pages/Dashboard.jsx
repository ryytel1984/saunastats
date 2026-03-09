import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";

const DRINK_OPTIONS = [
  { value: "beer", label: "🍺 Beer" },
  { value: "water", label: "💧 Water/other" },
  { value: "none", label: "🚫 Nothing" },
];

const emptyForm = {
  date: new Date().toISOString().split("T")[0],
  type: "home",
  location: "",
  steams: 3,
  drink: "beer",
  drinks: 0,
  companions: "",
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [saunas, setSaunas] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState(null); // session being edited
  const [editForm, setEditForm] = useState(null);
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
      date: form.date,
      type: form.type,
      location: form.location,
      steams: Number(form.steams),
      drink: form.drink,
      drinks: form.drink === "none" ? 0 : Number(form.drinks),
      companions: form.companions.split(",").map((s) => s.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    });
    setForm(emptyForm);
    setShowForm(false);
  };

  const openEdit = (s) => {
    setEditSession(s);
    setEditForm({
      date: s.date,
      type: s.type,
      location: s.location || "",
      steams: s.steams || 3,
      drink: s.drink || "beer",
      drinks: s.drinks || 0,
      companions: (s.companions || []).join(", "),
    });
  };

  const handleSaveEdit = async () => {
    if (!editSession) return;
    await updateDoc(doc(db, "users", user.uid, "saunas", editSession.id), {
      date: editForm.date,
      type: editForm.type,
      location: editForm.location,
      steams: Number(editForm.steams),
      drink: editForm.drink,
      drinks: editForm.drink === "none" ? 0 : Number(editForm.drinks),
      companions: editForm.companions.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setEditSession(null);
    setEditForm(null);
  };

  const handleDelete = async () => {
    if (!editSession) return;
    if (!window.confirm("Kustuta see sessioon?")) return;
    await deleteDoc(doc(db, "users", user.uid, "saunas", editSession.id));
    setEditSession(null);
    setEditForm(null);
  };

  // Stats
  const thisYear = new Date().getFullYear().toString();
  const lastYear = (new Date().getFullYear() - 1).toString();
  const thisYearSaunas = saunas.filter((s) => s.date?.startsWith(thisYear));
  const lastYearSaunas = saunas.filter((s) => s.date?.startsWith(lastYear));
  const homeSaunas = thisYearSaunas.filter((s) => s.type === "home");
  const awaySaunas = thisYearSaunas.filter((s) => s.type === "away");
  const totalSteams = thisYearSaunas.reduce((a, s) => a + (s.steams || 0), 0);
  const totalBeers = thisYearSaunas.filter((s) => s.drink === "beer").reduce((a, s) => a + (s.drinks || 0), 0);
  const avgSteams = thisYearSaunas.length ? (totalSteams / thisYearSaunas.length).toFixed(1) : 0;
  const avgBeers = thisYearSaunas.filter((s) => s.drink === "beer").length
    ? (totalBeers / thisYearSaunas.filter((s) => s.drink === "beer").length).toFixed(1) : 0;
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

  const FormFields = ({ f, setF }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-stone-400 text-xs">Kuupäev</label>
          <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })}
            className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white" />
        </div>
        <div>
          <label className="text-stone-400 text-xs">Tüüp</label>
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}
            className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white">
            <option value="home">🏠 Kodus</option>
            <option value="away">✈️ Võõrsil</option>
          </select>
        </div>
      </div>

      {f.type === "away" && (
        <div>
          <label className="text-stone-400 text-xs">Koht</label>
          <input type="text" placeholder="nt. Nõmme saun" value={f.location}
            onChange={(e) => setF({ ...f, location: e.target.value })}
            className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white" />
        </div>
      )}

      <div>
        <label className="text-stone-400 text-xs">Leilid 🌊</label>
        <div className="flex gap-2 mt-2 flex-wrap">
          {[1,2,3,4,5,6,7,8,9,10].map((n) => (
            <button key={n} onClick={() => setF({ ...f, steams: n })}
              className={`w-9 h-9 rounded-lg font-semibold text-sm transition ${f.steams === n ? "bg-orange-500 text-white" : "bg-stone-700 text-stone-300 hover:bg-stone-600"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-stone-400 text-xs">Jook</label>
        <div className="flex gap-2 mt-2">
          {DRINK_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setF({ ...f, drink: opt.value, drinks: 0 })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${f.drink === opt.value ? "bg-orange-500 text-white" : "bg-stone-700 text-stone-300 hover:bg-stone-600"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {f.drink !== "none" && (
        <div>
          <label className="text-stone-400 text-xs">Kogus</label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
              <button key={n} onClick={() => setF({ ...f, drinks: n })}
                className={`w-9 h-9 rounded-lg font-semibold text-sm transition ${f.drinks === n ? "bg-orange-500 text-white" : "bg-stone-700 text-stone-300 hover:bg-stone-600"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-stone-400 text-xs">Kaaslased (komaga eraldatud)</label>
        <input type="text" placeholder="nt. Jüri, Mart" value={f.companions}
          onChange={(e) => setF({ ...f, companions: e.target.value })}
          className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-900 text-white p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🧖 SaunaStats</h1>
        <div className="flex gap-4 text-sm text-stone-400">
          <Link to="/leaderboard" className="hover:text-white">Leaderboard</Link>
          <button onClick={() => signOut(auth).then(() => navigate("/login"))} className="hover:text-white">Sign out</button>
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
          <div className="text-stone-400 text-xs mb-2">🌊 Leilid</div>
          <div className="flex justify-between">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{totalSteams}</div>
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
              <div className="text-2xl font-bold text-orange-400">{totalBeers}</div>
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

      {/* Add session button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl mb-4 transition"
      >
        + Lisa saunasessioon
      </button>

      {/* Add Form */}
      {showForm && (
        <div className="bg-stone-800 rounded-xl p-5 mb-4">
          <FormFields f={form} setF={setForm} />
          <button onClick={handleAdd}
            className="w-full bg-orange-500 hover:bg-orange-600 font-semibold py-3 rounded-xl transition mt-4">
            Salvesta 🧖
          </button>
        </div>
      )}

      {/* Session list */}
      <div className="space-y-2">
        {saunas.map((s) => (
          <div key={s.id} onClick={() => openEdit(s)}
            className="bg-stone-800 rounded-xl p-4 flex justify-between items-center cursor-pointer hover:bg-stone-700 transition">
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

      {/* Edit Modal */}
      {editSession && editForm && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setEditSession(null); setEditForm(null); } }}>
          <div className="bg-stone-800 rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Muuda sessiooni</h2>
              <button onClick={() => { setEditSession(null); setEditForm(null); }}
                className="text-stone-400 hover:text-white text-xl">✕</button>
            </div>

            <FormFields f={editForm} setF={setEditForm} />

            <div className="flex gap-3 mt-4">
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 font-semibold py-3 rounded-xl transition text-sm">
                🗑 Kustuta
              </button>
              <button onClick={handleSaveEdit}
                className="flex-2 flex-grow bg-orange-500 hover:bg-orange-600 font-semibold py-3 rounded-xl transition">
                Salvesta ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
