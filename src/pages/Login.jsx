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
    <div className="min-h-screen bg-stone-900 text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-2">🧖 SaunaStats</h1>
      <p className="text-stone-400 mb-10">Track your sauna sessions. Compete with friends.</p>
      <button
        onClick={handleLogin}
        className="flex items-center gap-3 bg-white text-stone-900 font-semibold px-6 py-3 rounded-xl hover:bg-stone-100 transition"
      >
        <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
        Continue with Google
      </button>
    </div>
  );
}