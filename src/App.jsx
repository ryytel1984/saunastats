import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Friends from "./pages/Friends";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/friends" element={<Friends />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/:username" element={<Profile />} />
    </Routes>
  );
}