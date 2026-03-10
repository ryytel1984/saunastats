import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan","Feb","Mar","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dets"];

const emptyForm = {
  date: new Date().toISOString().split("T")[0],
  type: "home",
  location: "",
  steams: 3,
  beers: 0,
  waters: 0,
  companions: "",
};

// Helper: read beers from both old and new format
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

function DrinkRow({ emoji, label, value, onChange, color }) {
  return (
    <div>
      <label className="text-stone-400 text-xs">{emoji} {label}</label>
      <div className="flex gap-2 mt-2 flex-wrap">
        {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
          <button key={n} onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg font-semibold text-sm transition ${value === n ? color : "bg-stone-700 text-stone-300 hover:bg-stone-600"}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function AutocompleteInput({ value, onChange, suggestions, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase())
    .slice(0, 5);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <input type="text" value={value} placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className={className} />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 w-full bg-stone-700 rounded-lg mt-1 shadow-lg overflow-hidden">
          {filtered.map((s) => (
            <div key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
              className="px-3 py-2 hover:bg-stone-600 cursor-pointer text-sm text-white">{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormFields({ f, setF, locationSuggestions, companionSuggestions }) {
  return (
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
          <AutocompleteInput value={f.location} onChange={(val) => setF({ ...f, location: val })}
            suggestions={locationSuggestions} placeholder="nt. Nõmme saun"
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
      <DrinkRow emoji="🍺" label="Õlut" value={f.beers} onChange={(n) => setF({ ...f, beers: n })} color="bg-orange-500 text-white" />
      <DrinkRow emoji="💧" label="Vett" value={f.waters} onChange={(n) => setF({ ...f, waters: n })} color="bg-sky-500 text-white" />
      <div>
        <label className="text-stone-400 text-xs">Kaaslased (komaga eraldatud)</label>
        <AutocompleteInput value={f.companions} onChange={(val) => setF({ ...f, companions: val })}
          suggestions={companionSuggestions} placeholder="nt. Jüri, Mart"
          className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [saunas, setSaunas] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [logTab, setLogTab] = useState(null);
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

  const locationSuggestions = [...new Set(saunas.filter(s => s.location).map(s => s.location))];
  const companionSuggestions = [...new Set(saunas.flatMap(s => s.companions || []))];

  const handleAdd = async () => {
    if (!form.date) return;
    await addDoc(collection(db, "users", user.uid, "saunas"), {
      date: form.date,
      type: form.type,
      location: form.location,
      steams: Number(form.steams),
      beers: Number(form.beers),
      waters: Number(form.waters),
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
      beers: getBeers(s),
      waters: getWaters(s),
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
      beers: Number(editForm.beers),
      waters: Number(editForm.waters),
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
        <div className="mt-3 pt-3 border-t border-stone-700 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-stone-400 text-xs">🍺 Õlu keskmine</span>
            <div className="flex gap-4">
              <span className="text-xs text-stone-500">keskim <span className="text-orange-400 font-bold">{avgBeers}</span></span>
              <span className="text-xs text-stone-500">rekord <span className="text-orange-400 font-bold">{maxBeers}</span></span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-400 text-xs">💧 Vee keskmine</span>
            <div className="flex gap-4">
              <span className="text-xs text-stone-500">keskim <span className="text-sky-400 font-bold">{avgWaters}</span></span>
              <span className="text-xs text-stone-500">rekord <span className="text-sky-400 font-bold">{maxWaters}</span></span>
            </div>
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

      {/* Add session button */}
      <button onClick={() => setShowForm(!showForm)}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl mb-4 transition">
        + Lisa saunasessioon
      </button>

      {/* Add Form */}
      {showForm && (
        <div className="bg-stone-800 rounded-xl p-5 mb-4">
          <FormFields f={form} setF={setForm} locationSuggestions={locationSuggestions} companionSuggestions={companionSuggestions} />
          <button onClick={handleAdd}
            className="w-full bg-orange-500 hover:bg-orange-600 font-semibold py-3 rounded-xl transition mt-4">
            Salvesta 🧖
          </button>
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
          {tabSaunas.map((s) => {
            const b = getBeers(s);
            const w = getWaters(s);
            return (
              <div key={s.id} onClick={() => openEdit(s)}
                className="bg-stone-700 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-stone-600 transition">
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
            <FormFields f={editForm} setF={setEditForm} locationSuggestions={locationSuggestions} companionSuggestions={companionSuggestions} />
            <div className="flex gap-3 mt-4">
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 font-semibold py-3 rounded-xl transition text-sm">
                🗑 Kustuta
              </button>
              <button onClick={handleSaveEdit}
                className="flex-grow bg-orange-500 hover:bg-orange-600 font-semibold py-3 rounded-xl transition">
                Salvesta ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
