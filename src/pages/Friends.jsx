import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function Friends() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [friends, setFriends] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
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
        const entry = { uid: d.id, ...data, displayName: prof.displayName || d.id, username: prof.username || "", avatarUrl: prof.avatarUrl || "" };
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);
    const q = query(collection(db, "users"), where("username", "==", searchQuery.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) {
      setSearchError("User not found");
    } else {
      const d = snap.docs[0];
      if (d.id === user.uid) setSearchError("That's you 🙂");
      else setSearchResult({ uid: d.id, ...d.data() });
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

  const getRelationship = (uid) => {
    if (friends.find((f) => f.uid === uid)) return "friends";
    if (pendingSent.find((f) => f.uid === uid)) return "sent";
    if (pendingReceived.find((f) => f.uid === uid)) return "received";
    return "none";
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-900 text-white p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">👥 Friends</h1>
        <Link to="/dashboard" className="text-stone-400 hover:text-white text-sm">← Dashboard</Link>
      </div>

      {/* Search */}
      <div className="bg-stone-800 rounded-xl p-4 mb-4">
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
                  <div className="font-semibold text-sm">{searchResult.displayName}</div>
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

      {/* Incoming requests */}
      {pendingReceived.length > 0 && (
        <div className="bg-stone-800 rounded-xl p-4 mb-4">
          <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">
            📬 Friend requests
            <span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingReceived.length}</span>
          </div>
          <div className="space-y-2">
            {pendingReceived.map((f) => (
              <div key={f.uid} className="flex items-center justify-between bg-stone-700 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <img src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.displayName)}`}
                    className="w-10 h-10 rounded-full object-cover" alt="" />
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

      {/* Outgoing requests */}
      {pendingSent.length > 0 && (
        <div className="bg-stone-800 rounded-xl p-4 mb-4">
          <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">📤 Sent requests</div>
          <div className="space-y-2">
            {pendingSent.map((f) => (
              <div key={f.uid} className="flex items-center justify-between bg-stone-700 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <img src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.displayName)}`}
                    className="w-10 h-10 rounded-full object-cover" alt="" />
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

      {/* Friends list */}
      <div className="bg-stone-800 rounded-xl p-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">✅ Friends ({friends.length})</div>
        {friends.length === 0 ? (
          <div className="text-stone-500 text-sm text-center py-6">
            No friends yet.<br />
            <span className="text-stone-600 text-xs">Search by username and send a request!</span>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f.uid} className="flex items-center justify-between bg-stone-700 rounded-xl p-3">
                <Link to={`/${f.username}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition">
                  <img src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.displayName)}`}
                    className="w-10 h-10 rounded-full object-cover" alt="" />
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
    </div>
  );
}
