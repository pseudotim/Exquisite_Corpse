// ── WaitingView ───────────────────────────────────────────────────────────────
// Shown when a player has joined but it's not their turn yet.

import { TEMPLATES } from "../config.js";

export default function WaitingView({ myRole, onLeave }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg text-center">
        <div className="w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-purple-900 mb-2">Waiting for Your Turn</h2>
        <p className="text-gray-500 mb-1">You're the <span className="font-semibold text-purple-600">{TEMPLATES[myRole]?.label}</span> designer</p>
        <p className="text-gray-400 text-sm mb-6">Other players are working on their parts…</p>
        <p className="text-xs text-green-500 mb-4">🔥 Connected to Firebase — updates are live</p>
        <button onClick={onLeave} className="text-purple-500 hover:text-purple-700 text-sm font-medium">
          Leave Game
        </button>
      </div>
    </div>
  );
}
