import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, serverTimestamp
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

function DrinkRow({ emoji, label, value, onChange, color }) {
  return (
    <div>
      <label className="text-stone-400 text-xs">{emoji} {label}</label>
      <div className="flex gap-2 mt-1 flex-wrap">
        {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
          <button key={n} onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-lg font-semibold text-xs transition ${value === n ? color : "bg-stone-700 text-stone-300 hover:bg-stone-600"}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Friends() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [friends, setFriends] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [sessionInvites, setSessionInvites] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [confirmInvite, setConfirmInvite] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { navigate("/login"); return; }
      setUser(u);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "users", user.uid, "friends"), async (snap) => {
      const accepted = [], sent = [], received = [];
      for (const d of snap.docs) {
        const data = d.data();
        const profSnap = await getDoc(doc(db, "users", d.id));
        const prof = profSnap.exists() ? profSnap.data() : {};
        const entry = {
          uid: d.id, ...data,
          displayName: prof.displayName || prof.username || d.id,
          username: prof.username || "",
          avatarUrl: prof.avatarUrl || ""
        };
        if (data.status === "accepted") accepted.push(entry);
        else if (data.status === "pending" && data.direction === "sent") sent.push(entry);
        else if (data.status === "pending" && data.direction === "received") received.push(entry);
      }
      setFriends(accepted);
      setPendingSent(sent);
      setPendingReceived(received);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "users", user.uid, "notifications"), (snap) => {
      const invites = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.type === "session_invite" && d.status === "pending")
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSessionInvites(invites);
    });
    return unsub;
  }, [user]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);
    const snap = await getDocs(collection(db, "users"));
    const match = snap.docs.find(d => d.data().username === searchQuery.trim().toLowerCase());
    if (!match) {
      setSearchError("User not found");
    } else {
      if (match.id === user.uid) setSearchError("That's you 🙂");
      else setSearchResult({ uid: match.id, ...match.data() });
    }
    setSearchLoading(false);
  };

  const sendRequest = async (targetUid) => {
    setActionLoading((p) => ({ ...p, [targetUid]: true }));
    await setDoc(doc(db, "users", user.uid, "friends", targetUid), { status: "pending", direction: "sent", addedAt: serverTimestamp() });
    await setDoc(doc(db, "users", targetUid, "friends", user.uid), { status: "pending", direction: "received", addedAt: serverTimestamp() });
    setSearchResult(null);
    setSearchQuery("");
    setActionLoading((p) => ({ ...p, [targetUid]: false }));
  };

  const acceptRequest = async (fromUid) => {
    setActionLoading((p) => ({ ...p, [fromUid]: true }));
    await updateDoc(doc(db, "users", user.uid, "friends", fromUid), { status: "accepted" });
    await updateDoc(doc(db, "users", fromUid, "friends", user.uid), { status: "accepted" });
    setActionLoading((p) => ({ ...p, [fromUid]: false }));
  };

  const removeRelation = async (targetUid) => {
    setActionLoading((p) => ({ ...p, [targetUid]: true }));
    await deleteDoc(doc(db, "users", user.uid, "friends", targetUid));
    await deleteDoc(doc(db, "users", targetUid, "friends", user.uid));
    setActionLoading((p) => ({ ...p, [targetUid]: false }));
  };

  const acceptSessionInvite = async (invite, editedValues) => {
    setActionLoading((p) => ({ ...p, [invite.id]: true }));
    // If sender's sauna was "home", receiver sees it as away with sender's name as location
    const isHome = invite.type_sauna === "home";
    const resolvedType = isHome ? "away" : (invite.type_sauna || "away");
    const resolvedLocation = isHome
      ? `${invite.fromUsername}'s Sauna`
      : (invite.location || "");

    await addDoc(collection(db, "users", user.uid, "saunas"), {
      date: invite.date,
      type: resolvedType,
      location: resolvedLocation,
      steams: editedValues.steams,
      beers: editedValues.beers,
      waters: editedValues.waters,
      companions: [{ uid: invite.fromUid }], // only uid, no username
      confirmedFrom: invite.fromUid,
      createdAt: new Date().toISOString(),
    });
    await updateDoc(doc(db, "users", user.uid, "notifications", invite.id), { status: "accepted" });
    setConfirmInvite(null);
    setActionLoading((p) => ({ ...p, [invite.id]: false }));
  };

  const declineSessionInvite = async (inviteId) => {
    await updateDoc(doc(db, "users", user.uid, "notifications", inviteId), { status: "declined" });
    setConfirmInvite(null);
  };

  const getRelationship = (uid) => {
    if (friends.find((f) => f.uid === uid)) return "friends";
    if (pendingSent.find((f) => f.uid === uid)) return "sent";
    if (pendingReceived.find((f) => f.uid === uid)) return "received";
    return "none";
  };

  const totalNotifs = pendingReceived.length + sessionInvites.length;

  if (!user) return null;

  return (
    <div className="min-h-screen text-white pb-24" style={{ background: "radial-gradient(ellipse at 50% 0%, #3d1a00 0%, #1a0a00 40%, #0d0d0d 100%)" }}>
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          👥 Friends
          {totalNotifs > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full align-middle">{totalNotifs}</span>
          )}
        </h1>
        
      </div>

      {sessionInvites.length > 0 && (
        <div className="bg-black/50 rounded-xl p-4 mb-4">
          <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">
            🧖 Session invites
            <span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{sessionInvites.length}</span>
          </div>
          <div className="space-y-2">
            {sessionInvites.map((invite) => (
              <div key={invite.id} className="bg-black/40 rounded-xl p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold">
                      <span className="text-orange-400">@{invite.fromUsername}</span> added you to a session
                    </div>
                    <div className="text-stone-400 text-xs mt-1">
                      {invite.date} · {invite.location || (invite.type_sauna === "home" ? "Home" : "Away")} · 🌊 {invite.steams}
                      {invite.beers > 0 && ` · 🍺 ${invite.beers}`}
                      {invite.waters > 0 && ` · 💧 ${invite.waters}`}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-3 shrink-0">
                    <button
                      onClick={() => setConfirmInvite({ ...invite, editSteams: invite.steams, editBeers: invite.beers, editWaters: invite.waters })}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                      Review
                    </button>
                    <button onClick={() => declineSessionInvite(invite.id)}
                      className="bg-stone-600 hover:bg-stone-500 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-black/50 rounded-xl p-4 mb-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">🔍 Add a friend</div>
        <div className="flex gap-2">
          <div className="flex items-center flex-1 bg-stone-700 rounded-lg px-3">
            <span className="text-stone-500 text-sm">@</span>
            <input type="text" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="username"
              className="flex-1 bg-transparent py-2 text-white outline-none text-sm" />
          </div>
          <button onClick={handleSearch} disabled={searchLoading || !searchQuery.trim()}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition">
            {searchLoading ? "..." : "Search"}
          </button>
        </div>
        {searchError && <div className="text-red-400 text-sm mt-2">{searchError}</div>}
        {searchResult && (() => {
          const rel = getRelationship(searchResult.uid);
          return (
            <div className="mt-3 flex items-center justify-between bg-stone-700 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <img src={searchResult.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(searchResult.displayName || "?")}`}
                  className="w-10 h-10 rounded-full object-cover" alt="" />
                <div>
                  <div className="font-semibold text-sm">{searchResult.displayName || searchResult.username}</div>
                  <div className="text-stone-400 text-xs">@{searchResult.username}</div>
                </div>
              </div>
              <div>
                {rel === "none" && (
                  <button onClick={() => sendRequest(searchResult.uid)} disabled={actionLoading[searchResult.uid]}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                    + Add friend
                  </button>
                )}
                {rel === "sent" && <span className="text-stone-400 text-xs">Request sent</span>}
                {rel === "received" && (
                  <button onClick={() => acceptRequest(searchResult.uid)}
                    className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                    Accept
                  </button>
                )}
                {rel === "friends" && <span className="text-orange-400 text-xs">✓ Friends</span>}
              </div>
            </div>
          );
        })()}
      </div>

      {pendingReceived.length > 0 && (
        <div className="bg-black/50 rounded-xl p-4 mb-4">
          <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">
            📬 Friend requests
            <span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingReceived.length}</span>
          </div>
          <div className="space-y-2">
            {pendingReceived.map((f) => (
              <div key={f.uid} className="flex items-center justify-between bg-black/40 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <img src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.displayName)}`}
                    className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                  <div>
                    <div className="font-semibold text-sm">{f.displayName}</div>
                    <div className="text-stone-400 text-xs">@{f.username}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptRequest(f.uid)} disabled={actionLoading[f.uid]}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                    ✓ Accept
                  </button>
                  <button onClick={() => removeRelation(f.uid)} disabled={actionLoading[f.uid]}
                    className="bg-stone-600 hover:bg-stone-500 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingSent.length > 0 && (
        <div className="bg-black/50 rounded-xl p-4 mb-4">
          <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📤 Sent requests</div>
          <div className="space-y-2">
            {pendingSent.map((f) => (
              <div key={f.uid} className="flex items-center justify-between bg-black/40 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <img src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.displayName)}`}
                    className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                  <div>
                    <div className="font-semibold text-sm">{f.displayName}</div>
                    <div className="text-stone-400 text-xs">@{f.username}</div>
                  </div>
                </div>
                <button onClick={() => removeRelation(f.uid)} disabled={actionLoading[f.uid]}
                  className="bg-stone-600 hover:bg-stone-500 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-black/50 rounded-xl p-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">✅ Friends ({friends.length})</div>
        {friends.length === 0 ? (
          <div className="text-stone-500 text-sm text-center py-6">
            No friends yet.<br />
            <span className="text-stone-600 text-xs">Search by username and send a request!</span>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f.uid} className="flex items-center justify-between bg-black/40 rounded-xl p-3">
                <Link to={`/${f.username}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition">
                  <img src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.displayName)}`}
                    className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                  <div>
                    <div className="font-semibold text-sm">{f.displayName}</div>
                    <div className="text-stone-400 text-xs">@{f.username}</div>
                  </div>
                </Link>
                <button onClick={() => removeRelation(f.uid)} disabled={actionLoading[f.uid]}
                  className="text-stone-500 hover:text-red-400 disabled:opacity-50 text-xs transition ml-2">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmInvite && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmInvite(null); }}>
          <div className="bg-stone-800 rounded-2xl p-5 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Confirm session</h2>
              <button onClick={() => setConfirmInvite(null)} className="text-stone-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="text-stone-400 text-sm mb-4">
              <span className="text-orange-400 font-semibold">@{confirmInvite.fromUsername}</span> added you to a session on <span className="text-white">{confirmInvite.date}</span>
              {confirmInvite.location && <> at <span className="text-white">{confirmInvite.location}</span></>}.
              <br />Adjust your own numbers below:
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-stone-400 text-xs">Steams 🌊</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <button key={n} onClick={() => setConfirmInvite({ ...confirmInvite, editSteams: n })}
                      className={`w-8 h-8 rounded-lg font-semibold text-xs transition ${confirmInvite.editSteams === n ? "bg-orange-500 text-white" : "bg-stone-700 text-stone-300 hover:bg-stone-600"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <DrinkRow emoji="🍺" label="Beers" value={confirmInvite.editBeers}
                onChange={(n) => setConfirmInvite({ ...confirmInvite, editBeers: n })} color="bg-orange-500 text-white" />
              <DrinkRow emoji="💧" label="Waters" value={confirmInvite.editWaters}
                onChange={(n) => setConfirmInvite({ ...confirmInvite, editWaters: n })} color="bg-sky-500 text-white" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => declineSessionInvite(confirmInvite.id)}
                className="flex-1 bg-stone-700 hover:bg-stone-600 font-semibold py-3 rounded-xl transition text-sm">
                Decline
              </button>
              <button
                onClick={() => acceptSessionInvite(confirmInvite, { steams: confirmInvite.editSteams, beers: confirmInvite.editBeers, waters: confirmInvite.editWaters })}
                disabled={actionLoading[confirmInvite.id]}
                className="flex-grow bg-green-600 hover:bg-green-700 disabled:opacity-50 font-semibold py-3 rounded-xl transition">
                ✓ Add to my log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      <BottomNav />
    </div>
  );
}