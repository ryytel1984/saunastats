import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Friends from "./pages/Friends";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import InstallBanner from "./components/InstallBanner";
import SplashScreen from "./components/SplashScreen";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <InstallBanner />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/:username" element={<Profile />} />
      </Routes>
    </>
  );
}
