// ── Game Service ──────────────────────────────────────────────────────────────
// All Firebase reads and writes live here.
// Logic components import these functions — they never touch Firebase directly.

import { ref, set, get, onValue, off } from "firebase/database";
import { db } from "./firebase.js";
import { SECTION_STATES } from "../config.js";

// ── Section Factory ───────────────────────────────────────────────────────────

export function makeEmptySection(state = SECTION_STATES.WAITING) {
  return {
    state,
    playerId:     null,
    inviteCode:   null,
    inviteEmail:  null,
    claimedAt:    null,
    invitedAt:    null,
    downloadedAt: null,
    upload:       null,
  };
}

// ── Game Factory ──────────────────────────────────────────────────────────────

export function makeEmptyGame(gameId) {
  return {
    id:        gameId,
    status:    'in-progress',
    createdAt: Date.now(),
    sections: {
      head:  makeEmptySection(SECTION_STATES.OPEN),
      torso: makeEmptySection(SECTION_STATES.WAITING),
      legs:  makeEmptySection(SECTION_STATES.WAITING),
    },
  };
}

// ── Sanitizer ─────────────────────────────────────────────────────────────────

export function sanitizeGame(game, gameId) {
  if (!game) return makeEmptyGame(gameId);
  return {
    id:        game.id        || gameId,
    status:    game.status    || 'in-progress',
    createdAt: game.createdAt || Date.now(),
    sections: {
      head:  sanitizeSection(game.sections?.head,  SECTION_STATES.OPEN),
      torso: sanitizeSection(game.sections?.torso, SECTION_STATES.WAITING),
      legs:  sanitizeSection(game.sections?.legs,  SECTION_STATES.WAITING),
    },
  };
}

function sanitizeSection(section, defaultState) {
  if (!section) return makeEmptySection(defaultState);
  return {
    state:        section.state        || defaultState,
    playerId:     section.playerId     || null,
    inviteCode:   section.inviteCode   || null,
    inviteEmail:  section.inviteEmail  || null,
    claimedAt:    section.claimedAt    || null,
    invitedAt:    section.invitedAt    || null,
    downloadedAt: section.downloadedAt || null,
    upload:       section.upload       || null,
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
