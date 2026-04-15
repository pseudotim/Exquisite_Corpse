// ── Game Service ──────────────────────────────────────────────────────────────
// All Firebase reads and writes live here.
// Logic components import these functions — they never touch Firebase directly.

import { ref, set, get, onValue, off } from "firebase/database";
import { db } from "./firebase.js";

// ── Game Factories ────────────────────────────────────────────────────────────

export function makeEmptyGame(gameId, role, playerId) {
  return {
    id: gameId,
    status: 'playing',
    currentTurn: role,
    players: { head: null, torso: null, legs: null, [role]: playerId },
    uploads: { head: null, torso: null, legs: null },
  };
}

export function sanitizeGame(game, gameId, role, playerId) {
  if (!game) return makeEmptyGame(gameId, role, playerId);
  return {
    id: game.id || gameId,
    status: game.status || 'playing',
    currentTurn: game.currentTurn || role,
    players: game.players || { head: null, torso: null, legs: null, [role]: playerId },
    uploads: game.uploads || { head: null, torso: null, legs: null },
  };
}

// ── Firebase Reads ────────────────────────────────────────────────────────────

export async function fetchGame(gameId) {
  const snapshot = await get(ref(db, `games/${gameId}`));
  return snapshot.val();
}

export async function fetchAllGames() {
  const snapshot = await get(ref(db, 'games'));
  return snapshot.val() || {};
}

export function subscribeToGame(gameId, callback) {
  const gameRef = ref(db, `games/${gameId}`);
  onValue(gameRef, (snapshot) => callback(snapshot.val()));
  return gameRef;
}

export function unsubscribeFromGame(gameRef) {
  if (gameRef) off(gameRef);
}

// ── Firebase Writes ───────────────────────────────────────────────────────────

export async function saveGame(gameId, game) {
  await set(ref(db, `games/${gameId}`), game);
}
