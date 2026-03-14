import { useState, useEffect } from "react";
import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth, provider, db } from "../firebase";
import { doc, setDoc, getDoc, collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

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

function StatCard({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-orange-400">
        {value === null ? "—" : value.toLocaleString()}
      </div>
      <div className="text-stone-300 text-xs mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

const isInAppBrowser = () => /FBAN|FBAV|Instagram|Messenger|WeChat|Line\/|Musical/i.test(navigator.userAgent);

async function saveNewUser(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    const username = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    await setDoc(userRef, {
      username,
      displayName: user.displayName,
      avatarUrl: user.photoURL,
      createdAt: new Date().toISOString(),
    });
    // Teavita admini uuest kasutajast
    await addDoc(collection(db, "users", "1tRQDUGWP6MU5BLBgL1Xo0E50zP2", "notifications"), {
      type: "session_invite",
      fromUid: user.uid,
      fromUsername: user.displayName || username,
      date: new Date().toISOString().split("T")[0],
      body: `${user.displayName || username} joined SaunaStats!`,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  }
}

const SAUNA_FACTS = [
  'The word "sauna" is one of the few Finnish words used around the world without translation.',
  "Finland has more saunas than cars.",
  "There are over 3 million saunas in Finland for just 5.5 million people.",
  "The ideal sauna temperature is usually between 70 and 100°C.",
  'Throwing water on hot stones creates steam called "löyly", the heart of the sauna experience.',
  "A typical sauna session lasts about 10–20 minutes before cooling down.",
  "Many sauna lovers cool off by jumping into cold water, rolling in snow, or taking an ice shower.",
  "Regular sauna bathing has been linked to improved heart health.",
  "Sauna sessions can help reduce stress and improve overall mood.",
  "Evening sauna bathing often helps people fall asleep faster.",
  "Traditional saunas are heated using wood-burning stoves.",
  "Modern saunas commonly use electric heaters for easy temperature control.",
  "Sauna heat can make your heart rate rise to levels similar to light exercise.",
  "A single sauna session can produce up to half a liter of sweat.",
  "Sauna bathing has been practiced in Northern Europe for over 2,000 years.",
  "The oldest form of sauna is the smoke sauna, which has no chimney.",
  "Sauna rooms are usually built from softwoods like cedar, spruce, or aspen.",
  "Athletes often use saunas to relax muscles and speed up recovery.",
  "Alternating between hot sauna and cold water stimulates blood circulation.",
  "In Finland, many important life events were historically connected to the sauna.",
  "In the past, saunas were often the cleanest place in the house and even used for childbirth.",
  "Sauna heat can temporarily increase metabolism.",
  "Many people experience clearer skin after regular sauna sessions.",
  'In Nordic sauna culture, birch branches called "vihta" or "vasta" are used to gently stimulate the skin.',
  "Sauna bathing is often as much about relaxation and conversation as it is about heat.",
];

export default function Login() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [fact] = useState(() => SAUNA_FACTS[Math.floor(Math.random() * SAUNA_FACTS.length)]);
  const [loading, setLoading] = useState(false);
  const [checkingRedirect, setCheckingRedirect] = useState(true);

  useEffect(() => {
    // Check if we're returning from a redirect login
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await saveNewUser(result.user);
          navigate("/dashboard");
        }
      })
      .catch(console.error)
      .finally(() => setCheckingRedirect(false));

    // Load stats
    const load = async () => {
      const usersSnap = await getDocs(collection(db, "users"));
      const userCount = usersSnap.docs.filter(d => d.data().username).length;
      let sessions = 0, steams = 0, beers = 0, waters = 0;
      await Promise.all(usersSnap.docs.map(async (d) => {
        const saunaSnap = await getDocs(collection(db, "users", d.id, "saunas"));
        saunaSnap.docs.forEach(s => {
          const data = s.data();
          sessions++;
          steams += data.steams || 0;
          beers += getBeers(data);
          waters += getWaters(data);
        });
      }));
      setStats({ sessions, steams, beers, waters, userCount });
    };
    load();
  }, []);

  const handleLogin = async () => {
    if (isInAppBrowser()) return;
    setLoading(true);
    try {
      // Try popup first
      const result = await signInWithPopup(auth, provider);
      await saveNewUser(result.user);
      navigate("/dashboard");
    } catch (err) {
      // Popup blocked or failed — fall back to redirect
      if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        try {
          await signInWithRedirect(auth, provider);
        } catch (e) {
          console.error(e);
          setLoading(false);
        }
      } else {
        console.error(err);
        setLoading(false);
      }
    }
  };

  if (checkingRedirect) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundImage: "url('/sauna-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative text-stone-400">Loading...</div>
    </div>
  );

  return (
    <div
      className="min-h-screen text-white flex flex-col items-center justify-center px-4 relative"
      style={{ backgroundImage: "url('/sauna-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
        <img src="/saunastats-logo-white.svg" alt="SaunaStats" className="w-full max-w-xs mx-auto mb-8" />

        <div className="text-stone-400 text-xs text-center mb-4 px-4 italic leading-relaxed">
          "{fact}"
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-6 py-5 mb-8 w-full border border-white/10">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <StatCard value={stats?.sessions ?? null} label="Saunas logged" />
            <StatCard value={stats?.steams ?? null} label="Steams" />
            <StatCard value={stats?.beers ?? null} label="Beers" />
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            <StatCard value={stats?.waters ?? null} label="Waters" />
            <StatCard value={stats?.userCount ?? null} label="Enthusiasts" />
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || isInAppBrowser()}
          className="flex items-center justify-center gap-3 bg-white text-stone-900 font-semibold px-8 py-3 rounded-xl hover:bg-stone-100 transition w-full max-w-xs disabled:opacity-60"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
          {loading ? "Signing in..." : "Continue with Google"}
        </button>

        {isInAppBrowser() && (
          <div className="mt-4 bg-black/50 border border-orange-500/40 rounded-xl px-4 py-3 text-sm text-center max-w-xs">
            <div className="text-orange-400 font-semibold mb-1">Open in browser</div>
            <div className="text-stone-300 text-xs">Google login doesn't work inside Messenger or Facebook. Open this link in Safari or Chrome.</div>
          </div>
        )}

        <div className="flex items-center gap-5 mt-6">
          <a href="https://www.facebook.com/saunastats" target="_blank" rel="noopener noreferrer"
            className="text-stone-500 hover:text-stone-300 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.271h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
          </a>
          <a href="https://www.instagram.com/sauna_stats" target="_blank" rel="noopener noreferrer"
            className="text-stone-500 hover:text-stone-300 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </a>
          <a href="mailto:sauna@saunastats.eu"
            className="text-stone-500 hover:text-stone-300 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
