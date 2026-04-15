// ── Game Logic ────────────────────────────────────────────────────────────────
// Core game functions: joining, submitting, stitching.
// Imports from services — never touches Firebase or React directly.

import { TEMPLATES, STITCH_W, STITCH_SECTION, OVERLAP_START, OVERLAP_HEIGHT, BORDER_LINE_Y, BORDER_LINE_WIDTH } from "../config.js";
import { makeEmptyGame, sanitizeGame, fetchAllGames, fetchGame, saveGame } from "../services/gameService.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

export function downloadCanvasAsPng(canvas, filename) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function generateTemplateCanvas(role, overlapImageEl) {
  const template = TEMPLATES[role];
  const canvas = document.createElement('canvas');
  canvas.width = template.width;
  canvas.height = template.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (overlapImageEl) {
    ctx.drawImage(overlapImageEl, 0, OVERLAP_START, 850, OVERLAP_HEIGHT, 0, 0, 850, OVERLAP_HEIGHT);
  }
  if (template.borderHeight > 0) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = BORDER_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(0, BORDER_LINE_Y);
    ctx.lineTo(canvas.width, BORDER_LINE_Y);
    ctx.stroke();
  }
  return canvas;
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// ── Game Actions ──────────────────────────────────────────────────────────────

export async function joinGame(playerId) {
  const games = await fetchAllGames();
  let foundGameId = null, role = null;

  for (let id in games) {
    const g = games[id];
    if (g.status !== 'playing') continue;
    if (g.uploads?.head && !g.players?.torso) { foundGameId = id; role = 'torso'; break; }
    if (g.uploads?.torso && !g.players?.legs) { foundGameId = id; role = 'legs'; break; }
  }

  if (foundGameId) {
    const game = sanitizeGame(await fetchGame(foundGameId), foundGameId, role, playerId);
    game.players[role] = playerId;
    game.currentTurn = role;
    await saveGame(foundGameId, game);
    return { gameId: foundGameId, role };
  } else {
    const gameId = `game_${Date.now()}`;
    role = 'head';
    const newGame = makeEmptyGame(gameId, role, playerId);
    await saveGame(gameId, newGame);
    return { gameId, role };
  }
}

export async function joinAdminGame(playerId) {
  const gameId = `admin_${Date.now()}`;
  const game = makeEmptyGame(gameId, 'head', playerId);
  game.players = { head: playerId, torso: playerId, legs: playerId };
  await saveGame(gameId, game);
  return { gameId, role: 'head' };
}

export async function downloadTemplate(gameId, role, playerId) {
  let overlapEl = null;
  try {
    const game = sanitizeGame(await fetchGame(gameId), gameId, role, playerId);
    if (role === 'torso' && game.uploads?.head) {
      overlapEl = await loadImage(game.uploads.head);
    } else if (role === 'legs' && game.uploads?.torso) {
      overlapEl = await loadImage(game.uploads.torso);
    }
  } catch (e) {
    console.warn('Could not load overlap image', e);
  }
  const canvas = generateTemplateCanvas(role, overlapEl);
  downloadCanvasAsPng(canvas, `corpse-${role}-template.png`);
}

export async function submitDesign(gameId, role, playerId, uploadedImage, adminMode) {
  const game = sanitizeGame(await fetchGame(gameId), gameId, role, playerId);
  game.uploads[role] = uploadedImage;

  if (role === 'head')       { game.currentTurn = 'torso'; }
  else if (role === 'torso') { game.currentTurn = 'legs'; }
  else                       { game.status = 'completed'; game.currentTurn = null; }

  await saveGame(gameId, game);
  return game;
}

export async function stitchCreature(canvasEl, finalCreature) {
  if (!canvasEl || !finalCreature) return;
  canvasEl.width = 850;
  canvasEl.height = 1098;
  const ctx = canvasEl.getContext('2d');
  const head  = await loadImage(finalCreature.head);
  const torso = await loadImage(finalCreature.torso);
  const legs  = await loadImage(finalCreature.legs);
  ctx.drawImage(head,  0, 0, 850, STITCH_SECTION, 0,   0, 850, STITCH_SECTION);
  ctx.drawImage(torso, 0, 0, 850, STITCH_SECTION, 0, 366, 850, STITCH_SECTION);
  ctx.drawImage(legs,  0, 0, 850, STITCH_SECTION, 0, 732, 850, STITCH_SECTION);
}

export function applyGameState(game, role, callbacks) {
  const { onCompleted, onDesigning, onWaiting } = callbacks;
  if (game.status === 'completed') {
    onCompleted({ head: game.uploads.head, torso: game.uploads.torso, legs: game.uploads.legs });
  } else if (game.currentTurn === role && !game.uploads[role]) {
    onDesigning();
  } else {
    onWaiting();
  }
}
