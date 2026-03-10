import { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, Link } from "react-router-dom";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    avatarUrl: "",
    isPublic: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const navigate = useNavigate();

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
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Fail on liiga suur (max 5MB)"); return; }
    setUploading(true);
    setError("");
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm((f) => ({ ...f, avatarUrl: url }));
    } catch (err) {
      setError("Pildi üleslaadimine ebaõnnestus: " + err.message);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) { setError("Kuvanimi ei saa olla tühi"); return; }
    if (!form.username.trim()) { setError("Kasutajatag ei saa olla tühi"); return; }
    if (!/^[a-z0-9_]+$/.test(form.username)) { setError("Kasutajatag võib sisaldada ainult väiketähti, numbreid ja _"); return; }

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
      setError("Salvestamine ebaõnnestus: " + err.message);
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-stone-900 text-white flex items-center justify-center">
      <div className="text-stone-400">Laen...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-900 text-white p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="text-stone-400 hover:text-white text-xl">←</Link>
        <h1 className="text-xl font-bold">Profiili seaded</h1>
      </div>

      {/* Avatar */}
      <div className="bg-stone-800 rounded-xl p-5 mb-4">
        <div className="text-stone-400 text-xs mb-3 uppercase tracking-wide">Profiilipilt</div>
        <div className="flex items-center gap-4">
          <img
            src={form.avatarUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(form.displayName)}
            className="w-20 h-20 rounded-full object-cover bg-stone-700"
            alt="avatar"
          />
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="bg-stone-700 hover:bg-stone-600 text-white text-sm px-4 py-2 rounded-lg transition disabled:opacity-50">
              {uploading ? "Laen üles..." : "Muuda pilti"}
            </button>
            <div className="text-stone-500 text-xs mt-1">JPG, PNG, max 5MB</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* Name & username */}
      <div className="bg-stone-800 rounded-xl p-5 mb-4 space-y-4">
        <div className="text-stone-400 text-xs uppercase tracking-wide">Kasutajainfo</div>
        <div>
          <label className="text-stone-400 text-xs">Kuvanimi</label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="nt. Saunameister"
            className="w-full bg-stone-700 rounded-lg px-3 py-2 mt-1 text-white"
          />
        </div>
        <div>
          <label className="text-stone-400 text-xs">Kasutajatag</label>
          <div className="flex items-center bg-stone-700 rounded-lg mt-1 px-3">
            <span className="text-stone-500">@</span>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
              placeholder="saunameister"
              className="flex-1 bg-transparent py-2 text-white outline-none"
            />
          </div>
          <div className="text-stone-500 text-xs mt-1">saunastats.eu/@{form.username || "kasutajatag"}</div>
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-stone-800 rounded-xl p-5 mb-4">
        <div className="text-stone-400 text-xs uppercase tracking-wide mb-3">Nähtavus</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Avalik profiil</div>
            <div className="text-stone-500 text-xs mt-0.5">
              {form.isPublic ? "Igaüks näeb sinu statistikat" : "Ainult sina näed oma statistikat"}
            </div>
          </div>
          <button
            onClick={() => setForm({ ...form, isPublic: !form.isPublic })}
            className={`w-12 h-6 rounded-full transition-colors ${form.isPublic ? "bg-orange-500" : "bg-stone-600"}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.isPublic ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || uploading}
        className="w-full bg-orange-500 hover:bg-orange-600 font-semibold py-3 rounded-xl transition disabled:opacity-50">
        {saving ? "Salvestan..." : saved ? "✓ Salvestatud!" : "Salvesta"}
      </button>
    </div>
  );
}
