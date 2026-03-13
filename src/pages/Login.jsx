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

        <div className="text-stone-400 text-xs text-center mb-6 px-4 italic leading-relaxed">
          "{fact}"
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
      </div>
    </div>
  );
}
