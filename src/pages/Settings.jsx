import { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, getDocs, updateDoc, collection, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, Link } from "react-router-dom";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ displayName: "", username: "", avatarUrl: "", isPublic: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const navigate = useNavigate();

  // Link past sessions state
  const [friends, setFriends] = useState([]);
  const [linkName, setLinkName] = useState("");
  const [linkTarget, setLinkTarget] = useState(null); // selected friend
  const [linkMatches, setLinkMatches] = useState(null); // sessions found
  const [linking, setLinking] = useState(false);
  const [linkDone, setLinkDone] = useState(null); // {count, username}

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { navigate("/login"); return; }
      setUser(u);
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        const d = snap.data();
        setForm({
          displayName: d.displayName || u.displayName || "",
          username: d.username || "",
          avatarUrl: d.avatarUrl || u.photoURL || "",
          isPublic: d.isPublic !== false,
        });
      }
      // Load friends list
      const friendsSnap = await getDocs(collection(db, "users", u.uid, "friends"));
      const accepted = friendsSnap.docs.filter(d => d.data().status === "accepted");
      const list = await Promise.all(accepted.map(async (d) => {
        const profSnap = await getDoc(doc(db, "users", d.id));
        const prof = profSnap.exists() ? profSnap.data() : {};
        return { uid: d.id, username: prof.username || d.id, displayName: prof.displayName || prof.username || d.id, avatarUrl: prof.avatarUrl || "" };
      }));
      setFriends(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("File too large (max 5MB)"); return; }
    setUploading(true);
    setError("");
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm((f) => ({ ...f, avatarUrl: url }));
    } catch (err) {
      setError("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) { setError("Display name cannot be empty"); return; }
    if (!form.username.trim()) { setError("Username cannot be empty"); return; }
    if (!/^[a-z0-9_]+$/.test(form.username)) { setError("Username can only contain lowercase letters, numbers and _"); return; }
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: form.displayName.trim(),
        username: form.username.trim().toLowerCase(),
        avatarUrl: form.avatarUrl,
        isPublic: form.isPublic,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Save failed: " + err.message);
    }
    setSaving(false);
  };

  // Find sessions where companions contains linkName as text
  const handleFindSessions = async () => {
    if (!linkName.trim() || !linkTarget) return;
    const snap = await getDocs(collection(db, "users", user.uid, "saunas"));
    const name = linkName.trim().toLowerCase();
    const matches = snap.docs.filter(d => {
      const companions = d.data().companions || [];
      return companions.some(c => {
        if (typeof c === "string") return c.toLowerCase() === name;
        if (c.text) return c.text.toLowerCase() === name;
        return false;
      });
    });
    setLinkMatches(matches.map(d => ({ id: d.id, ...d.data() })));
  };

  // Replace text companion with UID companion in all matched sessions + send notifications
  const handleLinkSessions = async () => {
    if (!linkMatches || !linkTarget) return;
    setLinking(true);
    const name = linkName.trim().toLowerCase();
    const batch = writeBatch(db);

    for (const session of linkMatches) {
      const companions = (session.companions || []).map(c => {
        const isMatch = (typeof c === "string" && c.toLowerCase() === name) ||
                        (c.text && c.text.toLowerCase() === name);
        if (isMatch) return { uid: linkTarget.uid, username: linkTarget.username };
        return c;
      });
      batch.update(doc(db, "users", user.uid, "saunas", session.id), { companions });
    }
    await batch.commit();

    // Send notifications to the linked user for each session
    const mySnap = await getDoc(doc(db, "users", user.uid));
    const myUsername = mySnap.data()?.displayName || mySnap.data()?.username || user.uid;
    const { addDoc, serverTimestamp } = await import("firebase/firestore");
    for (const session of linkMatches) {
      await addDoc(collection(db, "users", linkTarget.uid, "notifications"), {
        type: "session_invite",
        fromUid: user.uid,
        fromUsername: myUsername,
        sessionId: session.id,
        date: session.date,
        location: session.location || "",
        type_sauna: session.type,
        steams: session.steams,
        beers: session.beers || 0,
        waters: session.waters || 0,
        status: "pending",
        createdAt: serverTimestamp(),
      });
    }

    setLinkDone({ count: linkMatches.length, username: linkTarget.username });
    setLinkMatches(null);
    setLinkName("");
    setLinkTarget(null);
    setLinking(false);
  };

  const [showAdvanced, setShowAdvanced] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #3d1a00 0%, #1a0a00 40%, #0d0d0d 100%)" }}>
      <div className="text-stone-400">Loading...</div>
    </div>
  );

  const installSection = (() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isSafari = isIOS && /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    const isChromeIOS = isIOS && /crios/i.test(navigator.userAgent);
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches;
    if (isInstalled || (!isIOS && !isAndroid)) return null;
    return (
      <div className="bg-black/40 rounded-xl p-4">
        <div className="text-stone-400 text-xs uppercase tracking-wide mb-3">📱 Install App</div>
        {isSafari && (
          <div className="text-stone-300 text-sm space-y-2">
            <div>Add SaunaStats to your home screen for quick access:</div>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span className="bg-stone-700 text-white px-2 py-1 rounded">⬆ Share</span>
              <span>→</span>
              <span className="bg-stone-700 text-white px-2 py-1 rounded">Add to Home Screen</span>
            </div>
          </div>
        )}
        {isChromeIOS && (
          <div className="text-stone-300 text-sm">
            Chrome doesn't support install on iOS. Open <span className="text-orange-400">saunastats.eu</span> in Safari → Share → Add to Home Screen.
          </div>
        )}
        {isAndroid && (
          <div className="text-stone-300 text-sm">
            Chrome menu (⋮) → <span className="text-white font-medium">Add to Home Screen</span>
          </div>
        )}
      </div>
    );
  })();

  return (
    <div className="min-h-screen text-white pb-28"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #3d1a00 0%, #1a0a00 40%, #0d0d0d 100%)" }}>
      <div className="max-w-2xl mx-auto p-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-stone-400 hover:text-white text-xl">←</Link>
            <h1 className="text-lg font-bold">Profile</h1>
          </div>
          {saved && <span className="text-green-400 text-sm font-medium">✓ Saved</span>}
        </div>

        {/* Profiil: avatar + nimi + username */}
        <div className="bg-black/50 rounded-xl p-5 mb-4">
          <div className="text-stone-400 text-xs uppercase tracking-wide mb-4">Profile</div>
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-stone-800">
            <img
              src={form.avatarUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(form.displayName)}
              className="w-16 h-16 rounded-full object-cover bg-stone-700 shrink-0"
              alt="avatar"
            />
            <div>
              <div className="font-semibold">{form.displayName || "—"}</div>
              <div className="text-stone-500 text-sm">@{form.username || "—"}</div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="mt-2 text-xs text-orange-400 hover:text-orange-300 transition disabled:opacity-50">
                {uploading ? "Uploading..." : "Change photo"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-stone-400 text-xs">Display name</label>
              <input type="text" value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="e.g. Sauna King"
                className="w-full bg-stone-700 rounded-lg px-3 py-2.5 mt-1 text-white" />
            </div>
            <div>
              <label className="text-stone-400 text-xs">Username</label>
              <div className="flex items-center bg-stone-700 rounded-lg mt-1 px-3">
                <span className="text-stone-500">@</span>
                <input type="text" value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                  placeholder="saunaking"
                  className="flex-1 bg-transparent py-2.5 text-white outline-none" />
              </div>
              <div className="text-stone-600 text-xs mt-1">saunastats.eu/@{form.username || "username"}</div>
            </div>
          </div>
        </div>

        {/* Privaatsus */}
        <div className="bg-black/50 rounded-xl p-5 mb-4">
          <div className="text-stone-400 text-xs uppercase tracking-wide mb-4">Privacy</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Public profile</div>
              <div className="text-stone-500 text-xs mt-0.5">
                {form.isPublic ? "Anyone can view your stats" : "Only you can see your stats"}
              </div>
            </div>
            <button onClick={() => setForm({ ...form, isPublic: !form.isPublic })}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${form.isPublic ? "bg-orange-500" : "bg-stone-600"}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform absolute top-0.5 ${form.isPublic ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {"Notification" in window && (
          <div className="bg-black/50 rounded-xl p-5 mb-4">
            <div className="text-stone-400 text-xs uppercase tracking-wide mb-4">🔔 Notifications</div>
            {notifStatus === "granted" ? (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full shrink-0" />
                <div className="text-sm text-stone-300">Push notifications are enabled</div>
              </div>
            ) : notifStatus === "denied" ? (
              <div className="text-stone-400 text-sm">Notifications are blocked. Enable them in your phone settings.</div>
            ) : (
              <div>
                <div className="text-stone-400 text-sm mb-3">Get notified when friends add you to a sauna session.</div>
                <button onClick={enableNotifications}
                  className="w-full bg-orange-500 hover:bg-orange-600 font-semibold py-3 rounded-xl transition text-sm">
                  🔔 Enable notifications
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        <button onClick={handleSave} disabled={saving || uploading}
          className="w-full bg-orange-500 hover:bg-orange-600 font-semibold py-3 rounded-xl transition disabled:opacity-50 mb-6">
          {saving ? "Saving..." : "Save changes"}
        </button>

        {installSection && <div className="mb-4">{installSection}</div>}

        {/* Advanced — collapsible */}
        <div className="bg-black/30 rounded-xl overflow-hidden mb-4">
          <button onClick={() => setShowAdvanced(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-stone-400 hover:text-white transition">
            <span className="text-xs uppercase tracking-wide font-semibold">🔗 Advanced — Link past sessions</span>
            <span className="text-lg">{showAdvanced ? "−" : "+"}</span>
          </button>
          {showAdvanced && (
            <div className="px-5 pb-5 border-t border-stone-800">
              <div className="text-stone-500 text-xs mt-4 mb-4">
                If you logged a friend by name before they had an account, link those sessions to their profile now.
              </div>
              {linkDone && (
                <div className="bg-green-900/40 border border-green-700 text-green-300 text-sm rounded-lg p-3 mb-4">
                  ✓ Linked {linkDone.count} session{linkDone.count !== 1 ? "s" : ""} to @{linkDone.username}.
                </div>
              )}
              {friends.length === 0 ? (
                <div className="text-stone-500 text-sm">Add friends first to link sessions.</div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-stone-400 text-xs">Name you wrote in the session</label>
                    <input type="text" value={linkName}
                      onChange={(e) => { setLinkName(e.target.value); setLinkMatches(null); setLinkDone(null); }}
                      placeholder='e.g. "Ott"'
                      className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-stone-400 text-xs">Link to friend</label>
                    <div className="mt-1 space-y-1">
                      {friends.map(f => (
                        <div key={f.uid} onClick={() => { setLinkTarget(f); setLinkMatches(null); setLinkDone(null); }}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition ${linkTarget?.uid === f.uid ? "bg-orange-500/20 border border-orange-500/50" : "bg-stone-700 hover:bg-stone-600"}`}>
                          <img src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.displayName)}`}
                            className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                          <span className="text-sm">{f.displayName}</span>
                          {linkTarget?.uid === f.uid && <span className="ml-auto text-orange-400 text-xs">✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleFindSessions}
                    disabled={!linkName.trim() || !linkTarget}
                    className="w-full bg-stone-700 hover:bg-stone-600 disabled:opacity-40 text-sm font-medium py-2 rounded-lg transition">
                    Search my sessions for "{linkName || "..."}"
                  </button>
                  {linkMatches !== null && (
                    <div>
                      {linkMatches.length === 0 ? (
                        <div className="text-stone-500 text-sm text-center py-2">No sessions found with that name.</div>
                      ) : (
                        <>
                          <div className="text-stone-400 text-xs mb-2">Found {linkMatches.length} session{linkMatches.length !== 1 ? "s" : ""}:</div>
                          <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                            {linkMatches.map(s => (
                              <div key={s.id} className="bg-stone-700 rounded-lg px-3 py-2 text-xs text-stone-300">
                                {s.date} · {s.location || (s.type === "home" ? "Home" : "Away")} · 🌊 {s.steams}
                              </div>
                            ))}
                          </div>
                          <button onClick={handleLinkSessions} disabled={linking}
                            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 font-semibold py-2 rounded-lg text-sm transition">
                            {linking ? "Linking..." : `Link all ${linkMatches.length} session${linkMatches.length !== 1 ? "s" : ""} to @${linkTarget.username}`}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur border-t border-white/5 flex items-center justify-around px-2"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <Link to="/dashboard" className="flex flex-col items-center gap-0.5 py-2 px-4 text-stone-400 hover:text-white transition">
          <span className="text-xl">🧖</span>
          <span className="text-xs">Home</span>
        </Link>
        <Link to="/leaderboard" className="flex flex-col items-center gap-0.5 py-2 px-4 text-stone-400 hover:text-white transition">
          <span className="text-xl">🏆</span>
          <span className="text-xs">Leaderboard</span>
        </Link>
        <Link to="/friends" className="flex flex-col items-center gap-0.5 py-2 px-4 text-stone-400 hover:text-white transition">
          <span className="text-xl">👥</span>
          <span className="text-xs">Friends</span>
        </Link>
        <span className="flex flex-col items-center gap-0.5 py-2 px-4 text-orange-400">
          <span className="text-xl">👤</span>
          <span className="text-xs font-medium">Profile</span>
        </span>
      </div>
    </div>
  );
}
