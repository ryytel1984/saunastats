import { Link, useLocation } from "react-router-dom";

export default function BottomNav({ onAdd }) {
  const { pathname } = useLocation();

  const tabs = [
    { to: "/dashboard", icon: "🧖", label: "Home" },
    { to: "/leaderboard", icon: "🏆", label: "Leaderboard" },
    ...(onAdd ? [{ add: true, icon: "+", label: "Add" }] : []),
    { to: "/friends", icon: "👥", label: "Friends" },
    { to: "/settings", icon: "👤", label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur border-t border-white/5 flex items-center justify-around px-2"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      {tabs.map((tab) => {
        if (tab.add) {
          return (
            <button key="add" onClick={onAdd} className="flex flex-col items-center gap-0.5 py-1 px-4">
              <span className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-2xl font-light -mt-5"
                style={{ boxShadow: "0 4px 20px rgba(249,115,22,0.5)" }}>+</span>
              <span className="text-xs text-stone-400 mt-0.5">Add</span>
            </button>
          );
        }
        const active = pathname === tab.to || (tab.to !== "/dashboard" && pathname.startsWith(tab.to));
        return (
          <Link key={tab.to} to={tab.to}
            className={`flex flex-col items-center gap-0.5 py-2 px-4 transition relative ${active ? "text-orange-400" : "text-stone-500 hover:text-white"}`}>
            <span className="text-xl">{tab.icon}</span>
            <span className={`text-xs ${active ? "font-semibold" : ""}`}>{tab.label}</span>
            {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-orange-400 rounded-full" />}
          </Link>
        );
      })}
    </div>
  );
}
