import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const emptyForm = {
  date: new Date().toISOString().split("T")[0],
  type: "home",
  location: "",
  steams: 3,
  beers: 0,
  waters: 0,
  companions: [], // [{uid}] for friends, [{text}] for manual
};

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

// Resolve display name: uid → userMap lookup, text → as-is, old string → as-is
function resolveCompanionName(c, userMap) {
  if (typeof c === "string") return c;
  if (c.uid) return userMap[c.uid] || c.uid;
  if (c.text) return c.text;
  return "";
}

function getCompanionNames(companions, userMap = {}) {
  if (!companions || companions.length === 0) return [];
  return companions.map(c => resolveCompanionName(c, userMap)).filter(Boolean);
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

function FormFields({ f, setF, locationSuggestions, friendsList }) {
  const [compOpen, setCompOpen] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const compRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (compRef.current && !compRef.current.contains(e.target)) setCompOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const companions = f.companions || [];
  const selectedUids = companions.filter(c => c.uid).map(c => c.uid);

  const toggleFriend = (friend) => {
    const already = selectedUids.includes(friend.uid);
    if (already) {
      setF({ ...f, companions: companions.filter(c => c.uid !== friend.uid) });
    } else {
      setF({ ...f, companions: [...companions, { uid: friend.uid }] });
    }
  };

  const addManual = () => {
    const name = manualInput.trim();
    if (!name) return;
    const alreadyText = companions.find(c => c.text && c.text.toLowerCase() === name.toLowerCase());
    const alreadyFriend = companions.find(c => c.uid && friendsList.find(f => f.uid === c.uid && f.displayName.toLowerCase() === name.toLowerCase()));
    if (!alreadyText && !alreadyFriend) {
      setF({ ...f, companions: [...companions, { text: name }] });
    }
    setManualInput("");
  };

  const removeCompanion = (idx) => {
    setF({ ...f, companions: companions.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-stone-400 text-xs">Date</label>
          <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })}
            className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white" />
        </div>
        <div>
          <label className="text-stone-400 text-xs">Type</label>
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}
            className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white">
            <option value="home">🏠 Home</option>
            <option value="away">✈️ Away</option>
          </select>
        </div>
      </div>
      {f.type === "away" && (
        <div>
          <label className="text-stone-400 text-xs">Location</label>
          <AutocompleteInput value={f.location} onChange={(val) => setF({ ...f, location: val })}
            suggestions={locationSuggestions} placeholder="e.g. Nõmme saun"
            className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white" />
        </div>
      )}
      <div>
        <label className="text-stone-400 text-xs">Steams 🌊</label>
        <div className="flex gap-2 mt-2 flex-wrap">
          {[1,2,3,4,5,6,7,8,9,10].map((n) => (
            <button key={n} onClick={() => setF({ ...f, steams: n })}
              className={`w-9 h-9 rounded-lg font-semibold text-sm transition ${f.steams === n ? "bg-orange-500 text-white" : "bg-stone-700 text-stone-300 hover:bg-stone-600"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <DrinkRow emoji="🍺" label="Beers" value={f.beers} onChange={(n) => setF({ ...f, beers: n })} color="bg-orange-500 text-white" />
      <DrinkRow emoji="💧" label="Waters" value={f.waters} onChange={(n) => setF({ ...f, waters: n })} color="bg-sky-500 text-white" />

      <div>
        <label className="text-stone-400 text-xs">Companions</label>

        {companions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 mb-2">
            {companions.map((c, i) => {
              const friend = c.uid ? friendsList.find(f => f.uid === c.uid) : null;
              const label = friend ? friend.displayName : (c.text || c.uid);
              return (
                <div key={i} className="flex items-center gap-1 bg-stone-600 rounded-full px-2 py-1 text-xs">
                  {friend?.avatarUrl && <img src={friend.avatarUrl} className="w-4 h-4 rounded-full object-cover" alt="" />}
                  <span>{label}</span>
                  <button onClick={() => removeCompanion(i)} className="text-stone-400 hover:text-white ml-1">✕</button>
                </div>
              );
            })}
          </div>
        )}

        {friendsList && friendsList.length > 0 && (
          <div className="relative mt-1" ref={compRef}>
            <button type="button" onClick={() => setCompOpen(!compOpen)}
              className="w-full bg-stone-700 rounded-lg px-3 py-2 text-left text-sm text-stone-400 flex justify-between items-center">
              <span>Add from friends...</span>
              <span>{compOpen ? "▲" : "▼"}</span>
            </button>
            {compOpen && (
              <div className="absolute z-10 w-full bg-stone-700 rounded-lg mt-1 shadow-lg overflow-hidden">
                {friendsList.map((friend) => {
                  const selected = selectedUids.includes(friend.uid);
                  return (
                    <div key={friend.uid} onMouseDown={() => toggleFriend(friend)}
                      className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-stone-600 ${selected ? "bg-stone-600" : ""}`}>
                      <img src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.displayName)}`}
                        className="w-6 h-6 rounded-full object-cover" alt="" />
                      <span className="text-white">{friend.displayName}</span>
                      {selected && <span className="ml-auto text-orange-400 text-xs">✓</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <input type="text" value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addManual()}
            placeholder="Add by name..."
            className="flex-1 bg-stone-700 rounded-lg px-3 py-2 text-white text-sm" />
          <button onClick={addManual} className="bg-stone-600 hover:bg-stone-500 px-3 rounded-lg text-sm transition">+</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [saunas, setSaunas] = useState([]);
  const [userMap, setUserMap] = useState({}); // uid -> username
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [logTab, setLogTab] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
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

  useEffect(() => {
    if (!user) return;
    const loadFriends = async () => {
      const snap = await getDocs(collection(db, "users", user.uid, "friends"));
      const accepted = snap.docs.filter(d => d.data().status === "accepted");
      const pendingReceived = snap.docs.filter(d => d.data().status === "pending" && d.data().direction === "received");
      const list = await Promise.all(accepted.map(async (d) => {
        const profSnap = await getDoc(doc(db, "users", d.id));
        const prof = profSnap.exists() ? profSnap.data() : {};
        return { uid: d.id, displayName: prof.displayName || prof.username || d.id, avatarUrl: prof.avatarUrl || "" };
      }));
      setFriendsList(list);
      // Build userMap from friends: uid -> displayName
      const map = {};
      list.forEach(f => { map[f.uid] = f.displayName; });
      setUserMap(map);
      // Count notifications
      const notifSnap = await getDocs(collection(db, "users", user.uid, "notifications"));
      const pendingInvites = notifSnap.docs.filter(d => d.data().status === "pending").length;
      setNotifCount(pendingReceived.length + pendingInvites);
    };
    loadFriends();
  }, [user]);

  const locationSuggestions = [...new Set(saunas.filter(s => s.location).map(s => s.location))];

  const sendSessionInvites = async (sessionId, sessionData, companions) => {
    const uidCompanions = companions.filter(c => c.uid);
    if (uidCompanions.length === 0) return;
    const mySnap = await getDoc(doc(db, "users", user.uid));
    const myUsername = mySnap.data()?.displayName || mySnap.data()?.username || user.uid;
    for (const c of uidCompanions) {
      await addDoc(collection(db, "users", c.uid, "notifications"), {
        type: "session_invite",
        fromUid: user.uid,
        fromUsername: myUsername,
        sessionId,
        date: sessionData.date,
        location: sessionData.location || "",
        type_sauna: sessionData.type,
        steams: sessionData.steams,
        beers: sessionData.beers,
        waters: sessionData.waters,
        status: "pending",
        createdAt: serverTimestamp(),
      });
    }
  };

  const handleAdd = async () => {
    if (!form.date) return;
    const companions = form.companions || [];
    // Save only {uid} for friends, {text} for manual — no username stored
    const companionsToSave = companions.map(c => c.uid ? { uid: c.uid } : { text: c.text });
    const sessionData = {
      date: form.date,
      type: form.type,
      location: form.location,
      steams: Number(form.steams),
      beers: Number(form.beers),
      waters: Number(form.waters),
      companions: companionsToSave,
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, "users", user.uid, "saunas"), sessionData);
    await sendSessionInvites(docRef.id, sessionData, companions);
    setForm(emptyForm);
    setShowForm(false);
  };

  const openEdit = (s) => {
    setEditSession(s);
    const companions = (s.companions || []).map(c => {
      if (typeof c === "string") return { text: c };
      if (c.uid) return { uid: c.uid };
      if (c.text) return { text: c.text };
      return { text: String(c) };
    });
    setEditForm({
      date: s.date,
      type: s.type,
      location: s.location || "",
      steams: s.steams || 3,
      beers: getBeers(s),
      waters: getWaters(s),
      companions,
    });
  };

  const handleSaveEdit = async () => {
    if (!editSession) return;
    const companions = editForm.companions || [];
    const companionsToSave = companions.map(c => c.uid ? { uid: c.uid } : { text: c.text });

    // Leia uued sõbrad, kes polnud eelmises salvestuses
    const prevUids = (editSession.companions || [])
      .filter(c => c.uid)
      .map(c => c.uid);
    const newCompanions = companions.filter(c => c.uid && !prevUids.includes(c.uid));

    const sessionData = {
      date: editForm.date,
      type: editForm.type,
      location: editForm.location,
      steams: Number(editForm.steams),
      beers: Number(editForm.beers),
      waters: Number(editForm.waters),
    };

    await updateDoc(doc(db, "users", user.uid, "saunas", editSession.id), {
      ...sessionData,
      companions: companionsToSave,
    });

    // Saada teavitus ainult uutele sõpradele
    if (newCompanions.length > 0) {
      await sendSessionInvites(editSession.id, sessionData, newCompanions);
    }

    setEditSession(null);
    setEditForm(null);
  };

  const handleDelete = async () => {
    if (!editSession) return;
    if (!window.confirm("Delete this session?")) return;
    await deleteDoc(doc(db, "users", user.uid, "saunas", editSession.id));
    setEditSession(null);
    setEditForm(null);
  };

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
  thisYearSaunas.forEach((s) => getCompanionNames(s.companions, userMap).forEach((c) => { compCount[c] = (compCount[c] || 0) + 1; }));
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

      <div className="flex justify-between items-center mb-6">
        <img src="/saunastats-logo-white.svg" alt="SaunaStats" className="h-11" />
        <div className="flex items-center gap-3 text-sm text-stone-400">
          <Link to="/leaderboard" className="hover:text-white">Leaderboard</Link>
          <Link to="/friends" className="hover:text-white relative">
            Friends
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Link>
          <Link to="/settings" className="hover:text-white">Profile</Link>
          <button onClick={() => signOut(auth).then(() => navigate("/login"))} className="hover:text-white text-base">↪</button>
        </div>
      </div>

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
            <div className="flex-1 bg-black/30 rounded-full h-3">
              <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: thisYearSaunas.length ? `${(homeSaunas.length / thisYearSaunas.length) * 100}%` : "0%" }} />
            </div>
            <div className="w-6 text-right font-bold text-orange-400 text-sm">{homeSaunas.length}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 text-sm text-stone-300">Away</div>
            <div className="flex-1 bg-black/30 rounded-full h-3">
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
            <div className="flex-1 bg-black/30 rounded-full h-3">
              <div className="bg-orange-500 h-3 rounded-full transition-all"
                style={{ width: (totalBeers + totalWaters) > 0 ? `${(totalBeers / (totalBeers + totalWaters)) * 100}%` : "0%" }} />
            </div>
            <div className="w-6 text-right font-bold text-orange-400 text-sm">{totalBeers}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 text-sm text-stone-300">💧 Water</div>
            <div className="flex-1 bg-black/30 rounded-full h-3">
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

      <button onClick={() => setShowForm(!showForm)}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl mb-4 transition">
        + Add sauna session
      </button>

      {showForm && (
        <div className="bg-black/50 rounded-xl p-5 mb-4">
          <FormFields f={form} setF={setForm} locationSuggestions={locationSuggestions} friendsList={friendsList} />
          <button onClick={handleAdd}
            className="w-full bg-orange-500 hover:bg-orange-600 font-semibold py-3 rounded-xl transition mt-4">
            Save 🧖
          </button>
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
          {tabSaunas.map((s) => {
            const b = getBeers(s);
            const w = getWaters(s);
            const names = getCompanionNames(s.companions, userMap);
            return (
              <div key={s.id} onClick={() => openEdit(s)}
                className="bg-black/40 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-black/60 transition">
                <div>
                  <div className="font-semibold text-sm">{s.date} · {s.location || (s.type === "home" ? "Home" : "Away")}</div>
                  <div className="text-stone-400 text-xs mt-1">
                    🌊 {s.steams}
                    {b > 0 && ` · 🍺 ${b}`}
                    {w > 0 && ` · 💧 ${w}`}
                    {names.length > 0 && ` · 👥 ${names.join(", ")}`}
                  </div>
                </div>
                <div className="text-stone-500 text-sm ml-2">{s.type === "home" ? "🏠" : "✈️"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {editSession && editForm && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setEditSession(null); setEditForm(null); } }}>
          <div className="bg-stone-800 rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Edit session</h2>
              <button onClick={() => { setEditSession(null); setEditForm(null); }}
                className="text-stone-400 hover:text-white text-xl">✕</button>
            </div>
            <FormFields f={editForm} setF={setEditForm} locationSuggestions={locationSuggestions} friendsList={friendsList} />
            <div className="flex gap-3 mt-4">
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 font-semibold py-3 rounded-xl transition text-sm">
                🗑 Delete
              </button>
              <button onClick={handleSaveEdit}
                className="flex-grow bg-orange-500 hover:bg-orange-600 font-semibold py-3 rounded-xl transition">
                Save ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
