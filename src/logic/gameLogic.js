// ── Game Logic ────────────────────────────────────────────────────────────────
// Core game functions: joining, submitting, stitching, state transitions.
// Imports from services — never touches Firebase or React directly.

import {
  TEMPLATES, STITCH_W, STITCH_SECTION,
  OVERLAP_START, OVERLAP_HEIGHT,
  BORDER_LINE_Y, BORDER_LINE_WIDTH,
  SECTION_STATES,
  CLAIMED_TIMEOUT_HOURS,
  INVITE_TIMEOUT_HOURS,
  SUBMISSION_TIMEOUT_HOURS,
} from "../config.js";

import {
  makeEmptyGame,
  sanitizeGame,
  fetchAllGames,
  fetchGame,
  saveGame,
} from "../services/gameService.js";

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

function hoursAgo(timestamp) {
  return (Date.now() - timestamp) / (1000 * 60 * 60);
}

// ── Timeout Checks ────────────────────────────────────────────────────────────

export function isSectionTimedOut(section) {
  if (!section) return false;

  if (section.state === SECTION_STATES.CLAIMED && section.claimedAt) {
    return hoursAgo(section.claimedAt) > CLAIMED_TIMEOUT_HOURS;
  }
  if (section.state === SECTION_STATES.ASSIGNED && section.invitedAt) {
    return hoursAgo(section.invitedAt) > INVITE_TIMEOUT_HOURS;
  }
  if (section.state === SECTION_STATES.IN_PROGRESS && section.downloadedAt) {
    return hoursAgo(section.downloadedAt) > SUBMISSION_TIMEOUT_HOURS;
  }
  return false;
}

export function revertTimedOutSections(game) {
  const roles = ['head', 'torso', 'legs'];
  let changed = false;
  roles.forEach(role => {
    const section = game.sections[role];
    if (isSectionTimedOut(section)) {
      game.sections[role] = {
        ...section,
        state:        SECTION_STATES.OPEN,
        playerId:     null,
        inviteCode:   null,
        inviteEmail:  null,
        claimedAt:    null,
        invitedAt:    null,
        downloadedAt: null,
      };
      changed = true;
    }
  });
  return changed;
}

// ── Game Actions ──────────────────────────────────────────────────────────────

export async function joinGame(playerId) {
  const games = await fetchAllGames();
  let foundGameId = null;
  let foundRole = null;

  for (let id in games) {
    const g = sanitizeGame(games[id], id);

    // Check for timed out sections first
    revertTimedOutSections(g);

    const roles = ['head', 'torso', 'legs'];
    for (let role of roles) {
      const section = g.sections[role];
      if (section.state === SECTION_STATES.OPEN) {
        foundGameId = id;
        foundRole = role;
        break;
      }
    }
    if (foundGameId) break;
  }

  if (foundGameId) {
    const game = sanitizeGame(await fetchGame(foundGameId), foundGameId);
    revertTimedOutSections(game);
    game.sections[foundRole] = {
      ...game.sections[foundRole],
      state:     SECTION_STATES.CLAIMED,
      playerId,
      claimedAt: Date.now(),
    };
    await saveGame(foundGameId, game);
    return { gameId: foundGameId, role: foundRole };
  } else {
    const gameId = `game_${Date.now()}`;
    const newGame = makeEmptyGame(gameId);
    newGame.sections.head = {
      ...newGame.sections.head,
      state:     SECTION_STATES.CLAIMED,
      playerId,
      claimedAt: Date.now(),
    };
    await saveGame(gameId, newGame);
    return { gameId, role: 'head' };
  }
}

export async function joinAdminGame(playerId) {
  const gameId = `admin_${Date.now()}`;
  const game = makeEmptyGame(gameId);
  const now = Date.now();
  game.sections.head  = { ...game.sections.head,  state: SECTION_STATES.CLAIMED, playerId, claimedAt: now };
  game.sections.torso = { ...game.sections.torso, state: SECTION_STATES.CLAIMED, playerId, claimedAt: now };
  game.sections.legs  = { ...game.sections.legs,  state: SECTION_STATES.CLAIMED, playerId, claimedAt: now };
  await saveGame(gameId, game);
  return { gameId, role: 'head' };
}

export async function downloadTemplate(gameId, role, playerId) {
  let overlapEl = null;
  try {
    const game = sanitizeGame(await fetchGame(gameId), gameId);
    if (role === 'torso' && game.sections.head.upload) {
      overlapEl = await loadImage(game.sections.head.upload);
    } else if (role === 'legs' && game.sections.torso.upload) {
      overlapEl = await loadImage(game.sections.torso.upload);
    }
    // Mark section as in-progress
    game.sections[role] = {
      ...game.sections[role],
      state:        SECTION_STATES.IN_PROGRESS,
      downloadedAt: Date.now(),
    };
    await saveGame(gameId, game);
  } catch (e) {
    console.warn('Could not load overlap image', e);
  }
  const canvas = generateTemplateCanvas(role, overlapEl);
  downloadCanvasAsPng(canvas, `corpse-${role}-template.png`);
}

export async function submitDesign(gameId, role, playerId, uploadedImage) {
  const game = sanitizeGame(await fetchGame(gameId), gameId);

  // Mark this section as submitted with the upload
  game.sections[role] = {
    ...game.sections[role],
    state:  SECTION_STATES.SUBMITTED,
    upload: uploadedImage,
  };

  // Check if all sections are completed
  const allDone = ['head', 'torso', 'legs'].every(r =>
    r === role ||
    game.sections[r].state === SECTION_STATES.COMPLETED ||
    game.sections[r].state === SECTION_STATES.SUBMITTED
  );

  if (allDone) {
    ['head', 'torso', 'legs'].forEach(r => {
      game.sections[r].state = SECTION_STATES.COMPLETED;
    });
    game.status = 'completed';
  }

  await saveGame(gameId, game);
  return game;
}

export async function openNextSection(gameId, role) {
  const game = sanitizeGame(await fetchGame(gameId), gameId);
  const nextRole = role === 'head' ? 'torso' : role === 'torso' ? 'legs' : null;
  if (!nextRole) return game;
  game.sections[role].state = SECTION_STATES.COMPLETED;
  game.sections[nextRole] = {
    ...game.sections[nextRole],
    state: SECTION_STATES.OPEN,
  };
  await saveGame(gameId, game);
  return game;
}

export async function inviteNextPlayer(gameId, role, email, inviteCode) {
  const game = sanitizeGame(await fetchGame(gameId), gameId);
  const nextRole = role === 'head' ? 'torso' : role === 'torso' ? 'legs' : null;
  if (!nextRole) return game;
  game.sections[role].state = SECTION_STATES.COMPLETED;
  game.sections[nextRole] = {
    ...game.sections[nextRole],
    state:       SECTION_STATES.ASSIGNED,
    inviteCode,
    inviteEmail: email,
    invitedAt:   Date.now(),
  };
  await saveGame(gameId, game);
  return game;
}

// ── State Application ─────────────────────────────────────────────────────────

export function applyGameState(game, role, playerId, callbacks) {
  const { onCompleted, onSubmitted, onDesigning, onWaiting } = callbacks;
  if (!game) return;

  const sanitized = sanitizeGame(game, game.id);
  revertTimedOutSections(sanitized);

  if (sanitized.status === 'completed') {
    onCompleted({
      head:  sanitized.sections.head.upload,
      torso: sanitized.sections.torso.upload,
      legs:  sanitized.sections.legs.upload,
    });
    return;
  }

  const section = sanitized.sections[role];
  if (!section) return;

  if (section.state === SECTION_STATES.SUBMITTED) {
    onSubmitted();
    return;
  }

  if (
    section.playerId === playerId && (
      section.state === SECTION_STATES.CLAIMED ||
      section.state === SECTION_STATES.IN_PROGRESS
    )
  ) {
    onDesigning();
    return;
  }

  onWaiting();
}

// ── Stitching ─────────────────────────────────────────────────────────────────

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
