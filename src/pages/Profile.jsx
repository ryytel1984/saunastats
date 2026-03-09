import { useParams } from "react-router-dom";

export default function Profile() {
  const { username } = useParams();
  return (
    <div className="min-h-screen bg-stone-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">@{username}</h1>
      <p className="text-stone-400">Public profile coming soon...</p>
    </div>
  );
}