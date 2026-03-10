import { signInWithPopup } from "firebase/auth";
import { auth, provider, db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

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
      }

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="min-h-screen text-white flex flex-col items-center justify-center px-4 relative"
      style={{
        backgroundImage: "url('/sauna-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
        <h1
          className="text-6xl font-bold tracking-tight mb-4"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "-0.02em" }}
        >
          SaunaStats
        </h1>
        <p className="text-stone-300 text-lg mb-10 leading-relaxed">
          Track your sauna sessions.<br />Compete with friends.
        </p>
        <button
          onClick={handleLogin}
          className="flex items-center justify-center gap-3 bg-white text-stone-900 font-semibold px-8 py-3 rounded-xl hover:bg-stone-100 transition w-full max-w-xs"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
          Continue with Google
        </button>
      </div>
    </div>
  );
}
