import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, off } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB_ETks5r9MqBR2xW0qXji485EBTq9T3P0",
  authDomain: "exquisite-corpse-4de4f.firebaseapp.com",
  databaseURL: "https://exquisite-corpse-4de4f-default-rtdb.firebaseio.com",
  projectId: "exquisite-corpse-4de4f",
  storageBucket: "exquisite-corpse-4de4f.firebasestorage.app",
  messagingSenderId: "82068580056",
  appId: "1:82068580056:web:fb34776448b41fdc2759ad",
  measurementId: "G-ZY5F0VXEKJ"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const TEMPLATES = {
  head:  { width: 850, height: 402, borderHeight: 36, label: 'Head' },
  torso: { width: 850, height: 402, borderHeight: 36, label: 'Torso & Arms' },
  legs:  { width: 850, height: 366, borderHeight: 0,  label: 'Legs & Feet' },
};

const STITCH_W = 850;
const STITCH_SECTION = 366;
const BAND_COLOR = {
  head:  { r: 255, g: 0,   b: 0   },
  torso: { r: 0,   g: 180, b: 0   },
  legs:  { r: 255, g: 140, b: 0   },
};

// Border line centered on row 367 → paints rows 366-367
// Stitch crops rows 0→365 → line excluded ✅
// Overlap copy starts at row 369 → line excluded ✅
const BORDER_LINE_Y = 367;
const BORDER_LINE_WIDTH = 2;
const OVERLAP_START = 369;
const OVERLAP_HEIGHT = 33; // rows 369-401

function makeEmptyGame(gameId, role, playerId) {
  return {
    id: gameId, status: 'playing', currentTurn: role,
    players: { head: null, torso: null, legs: null, [role]: playerId },
    uploads: { head: null, torso: null, legs: null },
  };
}

function sanitizeGame(game, gameId, role, playerId) {
  if (!game) return makeEmptyGame(gameId, role, playerId);
  return {
    id: game.id || gameId,
    status: game.status || 'playing',
    currentTurn: game.currentTurn || role,
    players: game.players || { head: null, torso: null, legs: null, [role]: playerId },
    uploads: game.uploads || { head: null, torso: null, legs: null },
  };
}

function downloadCanvasAsPng(canvas, filename) {
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

function generateTemplateCanvas(role, overlapImageEl) {
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

function drawTestImage(canvasEl, role) {
  const t = TEMPLATES[role];
  canvasEl.width = STITCH_W;
  canvasEl.height = t.height;
  const ctx = canvasEl.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, STITCH_W, t.height);
  const colors = { head: '#3b82f6', torso: '#10b981', legs: '#f59e0b' };
  ctx.strokeStyle = colors[role];
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const midX = STITCH_W / 2;
  if (role === 'head') {
    ctx.beginPath(); ctx.arc(midX, 160, 100, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(midX - 35, 140, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(midX + 35, 140, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(midX - 20, 260); ctx.lineTo(midX - 20, t.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(midX + 20, 260); ctx.lineTo(midX + 20, t.height); ctx.stroke();
  } else if (role === 'torso') {
    ctx.beginPath(); ctx.moveTo(midX - 20, 0); ctx.lineTo(midX - 20, 120); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(midX + 20, 0); ctx.lineTo(midX + 20, 120); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(midX - 100, 120, 200, 200, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(midX - 100, 180); ctx.lineTo(midX - 240, 220); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(midX + 100, 180); ctx.lineTo(midX + 240, 220); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(midX - 50, 320); ctx.lineTo(midX - 50, t.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(midX + 50, 320); ctx.lineTo(midX + 50, t.height); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(midX - 50, 0); ctx.lineTo(midX - 50, 200); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(midX + 50, 0); ctx.lineTo(midX + 50, 200); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(midX - 80, 230, 80, 30, -0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(midX + 80, 230, 80, 30, 0.3, 0, Math.PI * 2); ctx.stroke();
  }
  if (t.borderHeight > 0) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = BORDER_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(0, BORDER_LINE_Y);
    ctx.lineTo(STITCH_W, BORDER_LINE_Y);
    ctx.stroke();
  }
}

function drawAnnotatedOverlay(canvasEl, cleanSrc, role) {
  const t = TEMPLATES[role];
  canvasEl.width = STITCH_W;
  canvasEl.height = t.height;
  const ctx = canvasEl.getContext('2d');
  ctx.drawImage(cleanSrc, 0, 0);
  if (role !== 'head') {
    ctx.fillStyle = 'rgba(254,249,195,0.5)';
    ctx.fillRect(0, 0, STITCH_W, OVERLAP_HEIGHT);
    ctx.fillStyle = '#92400e'; ctx.font = '11px Arial';
    ctx.fillText(`overlap (rows 0-${OVERLAP_HEIGHT - 1})`, 4, 13);
  }
  if (t.borderHeight > 0) {
    const cropStart = STITCH_SECTION;
    ctx.fillStyle = 'rgba(254,226,226,0.4)';
    ctx.fillRect(0, cropStart, STITCH_W, t.height - cropStart);
    ctx.fillStyle = '#991b1b'; ctx.font = '11px Arial';
    ctx.fillText(`excluded zone rows ${cropStart}-${t.height - 1}`, 4, cropStart + 13);
    ctx.fillStyle = '#000'; ctx.font = '10px Arial';
    ctx.fillText(`border line → row ${BORDER_LINE_Y}`, 4, BORDER_LINE_Y - 4);
  }
  const stitchRow = STITCH_SECTION;
  ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(0, stitchRow); ctx.lineTo(STITCH_W, stitchRow); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#7c3aed'; ctx.font = 'bold 10px Arial';
  ctx.fillText(`✂ row ${stitchRow}`, STITCH_W - 60, stitchRow - 4);
  ctx.strokeStyle = 'rgba(156,163,175,0.4)'; ctx.lineWidth = 1;
  ctx.fillStyle = '#9ca3af'; ctx.font = '10px Arial';
  for (let y = 50; y <= t.height; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(18, y); ctx.stroke();
    ctx.fillText(y, 2, y - 2);
  }
}

function StitchTestTool({ onClose }) {
  const headCleanRef = useRef(null);
  const torsoCleanRef = useRef(null);
  const legsCleanRef = useRef(null);
  const headAnnotatedRef = useRef(null);
  const torsoAnnotatedRef = useRef(null);
  const legsAnnotatedRef = useRef(null);
  const resultRef = useRef(null);

  const cleanRefs = { head: headCleanRef, torso: torsoCleanRef, legs: legsCleanRef };
  const annotatedRefs = { head: headAnnotatedRef, torso: torsoAnnotatedRef, legs: legsAnnotatedRef };

  const [isReal, setIsReal] = useState({ head: false, torso: false, legs: false });
  const [statuses, setStatuses] = useState({ head: 'Using test image', torso: 'Using test image', legs: 'Using test image' });
  const [statusTypes, setStatusTypes] = useState({ head: 'info', torso: 'info', legs: 'info' });
  const [checks, setChecks] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const initSection = useCallback((role) => {
    const clean = cleanRefs[role].current;
    const ann = annotatedRefs[role].current;
    if (!clean || !ann) return false;
    drawTestImage(clean, role);
    drawAnnotatedOverlay(ann, clean, role);
    return true;
  }, []);

  useEffect(() => {
    if (initialized) return;
    const attempt = () => {
      const allReady = ['head', 'torso', 'legs'].every(role =>
        cleanRefs[role].current && annotatedRefs[role].current
      );
      if (allReady) {
        ['head', 'torso', 'legs'].forEach(role => initSection(role));
        setInitialized(true);
      } else {
        setTimeout(attempt, 50);
      }
    };
    attempt();
  }, [initialized, initSection]);

  const resetSection = useCallback((role) => {
    const clean = cleanRefs[role].current;
    const ann = annotatedRefs[role].current;
    if (!clean || !ann) return;
    drawTestImage(clean, role);
    drawAnnotatedOverlay(ann, clean, role);
    setIsReal(prev => ({ ...prev, [role]: false }));
    setStatuses(prev => ({ ...prev, [role]: 'Using test image' }));
    setStatusTypes(prev => ({ ...prev, [role]: 'info' }));
  }, []);

  const downloadTemplate = (role) => {
    const prevRole = role === 'torso' ? 'head' : role === 'legs' ? 'torso' : null;
    const overlapEl = prevRole ? cleanRefs[prevRole].current : null;
    const canvas = generateTemplateCanvas(role, overlapEl);
    downloadCanvasAsPng(canvas, `corpse-${role}-template.png`);
  };

  const uploadDesign = (role, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const t = TEMPLATES[role];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const clean = cleanRefs[role].current;
        clean.width = img.width; clean.height = img.height;
        clean.getContext('2d').drawImage(img, 0, 0);
        drawAnnotatedOverlay(annotatedRefs[role].current, clean, role);
        setIsReal(prev => ({ ...prev, [role]: true }));
        const ok = img.width === STITCH_W && img.height === t.height;
        setStatuses(prev => ({ ...prev, [role]: ok ? `✓ Real design (${img.width}×${img.height})` : `⚠ Size mismatch: got ${img.width}×${img.height}, expected ${STITCH_W}×${t.height}` }));
        setStatusTypes(prev => ({ ...prev, [role]: ok ? 'ok' : 'err' }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isColorRow = (data, r, g, b) => {
    let match = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i]-r) < 30 && Math.abs(data[i+1]-g) < 30 && Math.abs(data[i+2]-b) < 30) match++;
    }
    return match > STITCH_W * 0.3;
  };

  const isBlackRow = (data) => {
    let black = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 50 && data[i+1] < 50 && data[i+2] < 50) black++;
    }
    return black > STITCH_W * 0.5;
  };

  const runTest = () => {
    const hc = cleanRefs.head.current;
    const tc = cleanRefs.torso.current;
    const lc = cleanRefs.legs.current;

    const makeValid = (clean, role) => {
      const vc = document.createElement('canvas');
      vc.width = STITCH_W; vc.height = TEMPLATES[role].height;
      const ctx = vc.getContext('2d');
      ctx.drawImage(clean, 0, 0);
      const c = BAND_COLOR[role];
      ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
      ctx.fillRect(0, 0, STITCH_W, 2);
      ctx.fillRect(0, 364, STITCH_W, 2);
      return vc;
    };
    const hv = makeValid(hc, 'head');
    const tv = makeValid(tc, 'torso');
    const lv = makeValid(lc, 'legs');

    const result = resultRef.current;
    result.width = STITCH_W; result.height = 1098;
    const ctx = result.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, STITCH_W, 1098);
    ctx.drawImage(hc, 0, 0, STITCH_W, STITCH_SECTION, 0,   0, STITCH_W, STITCH_SECTION);
    ctx.drawImage(tc, 0, 0, STITCH_W, STITCH_SECTION, 0, 366, STITCH_W, STITCH_SECTION);
    ctx.drawImage(lc, 0, 0, STITCH_W, STITCH_SECTION, 0, 732, STITCH_W, STITCH_SECTION);

    const vCanvas = document.createElement('canvas');
    vCanvas.width = STITCH_W; vCanvas.height = 1098;
    const vCtx = vCanvas.getContext('2d');
    vCtx.fillStyle = '#ffffff'; vCtx.fillRect(0, 0, STITCH_W, 1098);
    vCtx.drawImage(hv, 0, 0, STITCH_W, STITCH_SECTION, 0,   0, STITCH_W, STITCH_SECTION);
    vCtx.drawImage(tv, 0, 0, STITCH_W, STITCH_SECTION, 0, 366, STITCH_W, STITCH_SECTION);
    vCtx.drawImage(lv, 0, 0, STITCH_W, STITCH_SECTION, 0, 732, STITCH_W, STITCH_SECTION);

    const hb = BAND_COLOR.head, tb = BAND_COLOR.torso, lb = BAND_COLOR.legs;
    const gr = (y) => vCtx.getImageData(0, y, STITCH_W, 1).data;

    const newChecks = [
      { group: 'Canvas Dimensions', label: 'Total canvas is 850×1098px', pass: result.width === 850 && result.height === 1098 },
      ...(!isReal.head ? [
        { group: 'Head (rows 0–365)', label: 'Top band at row 0', pass: isColorRow(gr(0), hb.r, hb.g, hb.b) },
        { group: 'Head (rows 0–365)', label: 'Bottom band at row 364', pass: isColorRow(gr(364), hb.r, hb.g, hb.b) },
        { group: 'Head (rows 0–365)', label: 'Bottom band at row 365', pass: isColorRow(gr(365), hb.r, hb.g, hb.b) },
        { group: 'Head (rows 0–365)', label: 'Does NOT bleed into row 366', pass: !isColorRow(gr(366), hb.r, hb.g, hb.b) },
      ] : []),
      ...(!isReal.torso ? [
        { group: 'Torso (rows 366–731)', label: 'Top band at row 366', pass: isColorRow(gr(366), tb.r, tb.g, tb.b) },
        { group: 'Torso (rows 366–731)', label: 'Bottom band at row 730', pass: isColorRow(gr(730), tb.r, tb.g, tb.b) },
        { group: 'Torso (rows 366–731)', label: 'Bottom band at row 731', pass: isColorRow(gr(731), tb.r, tb.g, tb.b) },
        { group: 'Torso (rows 366–731)', label: 'Does NOT bleed into row 732', pass: !isColorRow(gr(732), tb.r, tb.g, tb.b) },
      ] : []),
      ...(!isReal.legs ? [
        { group: 'Legs (rows 732–1097)', label: 'Top band at row 732', pass: isColorRow(gr(732), lb.r, lb.g, lb.b) },
        { group: 'Legs (rows 732–1097)', label: 'Bottom band at row 1096', pass: isColorRow(gr(1096), lb.r, lb.g, lb.b) },
        { group: 'Legs (rows 732–1097)', label: 'Bottom band at row 1097', pass: isColorRow(gr(1097), lb.r, lb.g, lb.b) },
      ] : []),
      { group: 'Border Line Bleed', label: 'Row 365: no border line', pass: !isBlackRow(vCtx.getImageData(0, 365, STITCH_W, 1).data) },
      { group: 'Border Line Bleed', label: 'Row 366: no border line', pass: !isBlackRow(vCtx.getImageData(0, 366, STITCH_W, 1).data) },
      { group: 'Border Line Bleed', label: 'Row 731: no border line', pass: !isBlackRow(vCtx.getImageData(0, 731, STITCH_W, 1).data) },
      { group: 'Border Line Bleed', label: 'Row 732: no border line', pass: !isBlackRow(vCtx.getImageData(0, 732, STITCH_W, 1).data) },
    ];
    setChecks(newChecks);
  };

  const statusColor = { ok: 'text-emerald-600', err: 'text-red-500', info: 'text-gray-400' };
  const roles = ['head', 'torso', 'legs'];
  const groups = checks ? [...new Set(checks.map(c => c.group))] : [];
  const allPass = checks ? checks.every(c => c.pass) : null;

  return (
    <div className="min-h-screen bg-purple-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-purple-900">🧪 Stitch Test Tool</h1>
            <p className="text-sm text-gray-500 mt-1">Test stitching logic with generated or real designs</p>
          </div>
          <button onClick={onClose} className="text-sm text-purple-500 hover:text-purple-700 font-medium">← Back to Game</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {roles.map(role => (
            <div key={role} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                  {role} ({STITCH_W}×{TEMPLATES[role].height})
                </h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isReal[role] ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {isReal[role] ? 'REAL' : 'TEST'}
                </span>
              </div>
              <canvas ref={cleanRefs[role]} style={{ display: 'none' }} />
              <canvas ref={annotatedRefs[role]} className="w-full rounded border border-gray-200 block" />
              <div className="flex gap-2 mt-2 flex-wrap">
                <button onClick={() => downloadTemplate(role)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">⬇ Template</button>
                <label className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer">
                  ⬆ Upload
                  <input type="file" accept="image/png" className="hidden" onChange={(e) => uploadDesign(role, e)} />
                </label>
                <button onClick={() => resetSection(role)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">↺</button>
              </div>
              <p className={`text-xs mt-1.5 ${statusColor[statusTypes[role]]}`}>{statuses[role]}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-4">
          <button onClick={runTest} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition">▶ Run Stitch Test</button>
          <button onClick={() => { ['head','torso','legs'].forEach(r => resetSection(r)); setChecks(null); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-xl text-sm transition">↺ Reset All</button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-purple-900 mb-4">✨ Stitched Result</h2>
          <canvas ref={resultRef} className="max-w-full rounded-lg border-4 border-purple-200 block mx-auto" />
          {checks && (
            <div className="mt-4">
              <div className={`font-bold text-sm mb-4 ${allPass ? 'text-emerald-600' : 'text-red-500'}`}>
                {allPass ? '✅ All checks passed — stitching logic is correct!' : '❌ Some checks failed'}
              </div>
              {groups.map(group => {
                const gc = checks.filter(c => c.group === group);
                const gp = gc.every(c => c.pass);
                return (
                  <div key={group} className="mb-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">{group} {gp ? '✅' : '❌'}</div>
                    {gc.map((c, i) => (
                      <div key={i} className="flex justify-between py-1.5 border-b border-gray-100 text-xs">
                        <span className="text-gray-700">{c.label}</span>
                        <span className={c.pass ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{c.pass ? '✓ PASS' : '✗ FAIL'}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExquisiteCorpse() {
  const [gameState, setGameState] = useState('menu');
  const [currentGameId, setCurrentGameId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [finalCreature, setFinalCreature] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminCurrentRole, setAdminCurrentRole] = useState('head');
  const [statusMsg, setStatusMsg] = useState('');
  const [playerId] = useState(() => `p_${Date.now()}_${Math.random().toString(36).substr(2,6)}`);
  const canvasRef = useRef(null);
  const gameRefRef = useRef(null);

  useEffect(() => {
    if (!currentGameId || adminMode) return;
    const gameRef = ref(db, `games/${currentGameId}`);
    gameRefRef.current = gameRef;
    onValue(gameRef, (snapshot) => {
      const game = snapshot.val();
      if (!game) return;
      applyGameState(game, myRole);
    });
    return () => off(gameRef);
  }, [currentGameId, myRole, adminMode]);

  useEffect(() => {
    if (gameState === 'reveal' && finalCreature) {
      setTimeout(() => stitchCreature(), 100);
    }
  }, [gameState, finalCreature]);

  const applyGameState = (game, role) => {
    if (game.status === 'completed') {
      setFinalCreature({ head: game.uploads.head, torso: game.uploads.torso, legs: game.uploads.legs });
      setGameState('reveal');
    } else if (game.currentTurn === role && !game.uploads[role]) {
      setGameState('designing');
    } else {
      setGameState('waiting');
    }
  };

  const joinGame = async () => {
    setStatusMsg('Finding a game...');
    try {
      const gamesRef = ref(db, 'games');
      const snapshot = await get(gamesRef);
      const games = snapshot.val() || {};
      let foundGameId = null, role = null;
      for (let id in games) {
        const g = games[id];
        if (g.status !== 'playing') continue;
        if (g.uploads?.head && !g.players?.torso) { foundGameId = id; role = 'torso'; break; }
        if (g.uploads?.torso && !g.players?.legs) { foundGameId = id; role = 'legs'; break; }
      }
      if (foundGameId) {
        const gameRef = ref(db, `games/${foundGameId}`);
        const snap = await get(gameRef);
        const game = sanitizeGame(snap.val(), foundGameId, role, playerId);
        game.players[role] = playerId; game.currentTurn = role;
        await set(gameRef, game);
        setCurrentGameId(foundGameId); setMyRole(role); setGameState('designing');
      } else {
        const gameId = `game_${Date.now()}`; role = 'head';
        const newGame = makeEmptyGame(gameId, role, playerId);
        await set(ref(db, `games/${gameId}`), newGame);
        setCurrentGameId(gameId); setMyRole(role); setGameState('designing');
      }
      setStatusMsg('');
    } catch (err) { setStatusMsg('Error: ' + err.message); }
  };

  const joinAdminGame = async () => {
    const gameId = `admin_${Date.now()}`;
    const game = makeEmptyGame(gameId, 'head', playerId);
    game.players = { head: playerId, torso: playerId, legs: playerId };
    await set(ref(db, `games/${gameId}`), game);
    setCurrentGameId(gameId); setMyRole('head');
    setAdminCurrentRole('head'); setAdminMode(true); setGameState('designing');
  };

  const downloadTemplate = async () => {
    const currentRole = adminMode ? adminCurrentRole : myRole;
    const loadImg = (src) => new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src;
    });
    let overlapEl = null;
    try {
      const snap = await get(ref(db, `games/${currentGameId}`));
      const game = sanitizeGame(snap.val(), currentGameId, currentRole, playerId);
      if (currentRole === 'torso' && game.uploads?.head) {
        overlapEl = await loadImg(game.uploads.head);
      } else if (currentRole === 'legs' && game.uploads?.torso) {
        overlapEl = await loadImg(game.uploads.torso);
      }
    } catch (e) { console.warn('Could not load overlap image', e); }
    const canvas = generateTemplateCanvas(currentRole, overlapEl);
    downloadCanvasAsPng(canvas, `corpse-${currentRole}-template.png`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/png')) { alert('Please upload a PNG file'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const currentRole = adminMode ? adminCurrentRole : myRole;
        const template = TEMPLATES[currentRole];
        if (img.width !== template.width || img.height !== template.height) {
          alert(`Wrong image size! Expected ${template.width}×${template.height}px but got ${img.width}×${img.height}px.`);
          return;
        }
        setUploadedImage(ev.target.result);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const submitDesign = async () => {
    if (!uploadedImage) return;
    const role = adminMode ? adminCurrentRole : myRole;
    setStatusMsg('Submitting...');
    try {
      const gameRef = ref(db, `games/${currentGameId}`);
      const snap = await get(gameRef);
      const game = sanitizeGame(snap.val(), currentGameId, role, playerId);
      game.uploads[role] = uploadedImage;
      if (role === 'head') { game.currentTurn = 'torso'; if (adminMode) setAdminCurrentRole('torso'); }
      else if (role === 'torso') { game.currentTurn = 'legs'; if (adminMode) setAdminCurrentRole('legs'); }
      else { game.status = 'completed'; game.currentTurn = null; }
      await set(gameRef, game);
      setUploadedImage(null); setStatusMsg('');
      if (game.status === 'completed') {
        setFinalCreature({ head: game.uploads.head, torso: game.uploads.torso, legs: game.uploads.legs });
        setGameState('reveal');
      } else if (adminMode) { setGameState('designing'); }
      else { setGameState('waiting'); }
    } catch (err) { setStatusMsg('Error: ' + err.message); }
  };

  const resetGame = () => {
    if (gameRefRef.current) { off(gameRefRef.current); gameRefRef.current = null; }
    setCurrentGameId(null); setMyRole(null); setUploadedImage(null);
    setFinalCreature(null); setAdminMode(false); setAdminCurrentRole('head');
    setStatusMsg(''); setGameState('menu');
  };

  const stitchCreature = () => {
    if (!canvasRef.current || !finalCreature) return;
    const canvas = canvasRef.current;
    canvas.width = 850; canvas.height = 1098;
    const ctx = canvas.getContext('2d');
    const load = (src) => new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src;
    });
    (async () => {
      const head  = await load(finalCreature.head);
      const torso = await load(finalCreature.torso);
      const legs  = await load(finalCreature.legs);
      ctx.drawImage(head,  0, 0, 850, STITCH_SECTION, 0,   0, 850, STITCH_SECTION);
      ctx.drawImage(torso, 0, 0, 850, STITCH_SECTION, 0, 366, 850, STITCH_SECTION);
      ctx.drawImage(legs,  0, 0, 850, STITCH_SECTION, 0, 732, 850, STITCH_SECTION);
    })();
  };

  const downloadCreature = () => {
    if (!canvasRef.current) return;
    downloadCanvasAsPng(canvasRef.current, 'exquisite-corpse-creature.png');
  };

  if (gameState === 'stitch-test') return <StitchTestTool onClose={() => setGameState('menu')} />;

    if (gameState === 'menu') return (
    <div
      className="flex h-screen w-full flex-col items-center justify-center gap-12 px-4 relative bg-cover bg-center"
      style={{ backgroundColor: '#f5f0e8', backgroundImage: "url('https://res.cloudinary.com/subframe/image/upload/v1740529337/uploads/39326/paper-texture-bg.jpg')" }}
    >
      {/* Decorative images */}
      <img
        className="max-h-[448px] max-w-[448px] flex-none rotate-[48deg] absolute -top-24 right-0 z-10"
        src="https://res.cloudinary.com/subframe/image/upload/v1775664364/uploads/39326/ypnhuccv3xpjeihhfnoo.png"
      />
      <img
        className="max-h-[288px] flex-none rotate-[285deg] -scale-x-100 absolute top-0 left-[-48px]"
        src="https://res.cloudinary.com/subframe/image/upload/v1775664198/uploads/39326/igo9axnntlhtpd8g01gm.png"
      />
      <img
        className="flex-none rotate-[-20deg] absolute bottom-0 left-[-240px]"
        src="https://res.cloudinary.com/subframe/image/upload/v1775664764/uploads/39326/nxqwqibyeuxgtmdcz2bx.png"
      />

      {/* Title */}
      <div className="flex items-center pb-3 translate-x-10">
        <span className="font-['Playfair_Display'] text-[150px] font-extrabold leading-[80px] text-black text-center -tracking-[0.04em] italic -translate-x-[50px]">
          EXQUISITE
        </span>
      </div>

      <span className="font-['Spectral'] text-[120px] font-bold leading-[80px] text-neutral-600 text-center tracking-[0.05em]">
        CORPSES
      </span>

      <span className="text-sm text-neutral-500 text-center tracking-[0.3em] uppercase">
        Fold. Draw. Reveal.
      </span>

      {statusMsg && <p className="text-orange-500 text-sm">{statusMsg}</p>}

      {/* Play button */}
      <button
        onClick={joinGame}
        className="font-['Inter'] text-[100px] font-black leading-[100px] -tracking-[0.04em] text-white px-12 py-4 flex items-center gap-4 transition-colors"
        style={{ backgroundColor: 'rgb(251,191,36)', border: 'none' }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgb(245,158,11)'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgb(251,191,36)'}
      >
        ▶ PLAY
      </button>

      {/* God Mode - hidden away */}
      <button
        onClick={joinAdminGame}
        className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors absolute bottom-4"
      >
        🔧 God Mode
      </button>

      {/* Stitch Test Tool - developer only */}
      <button
        onClick={() => setGameState('stitch-test')}
        className="text-xs text-neutral-300 hover:text-neutral-400 transition-colors absolute bottom-4 right-4"
      >
        🧪
      </button>

    </div>
  );


  if (gameState === 'waiting') return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg text-center">
        <div className="w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-purple-900 mb-2">Waiting for Your Turn</h2>
        <p className="text-gray-500 mb-1">You're the <span className="font-semibold text-purple-600">{TEMPLATES[myRole]?.label}</span> designer</p>
        <p className="text-gray-400 text-sm mb-6">Other players are working on their parts…</p>
        <p className="text-xs text-green-500 mb-4">🔥 Connected to Firebase — updates are live</p>
        <button onClick={resetGame} className="text-purple-500 hover:text-purple-700 text-sm font-medium">Leave Game</button>
      </div>
    </div>
  );

  if (gameState === 'designing') {
    const currentRole = adminMode ? adminCurrentRole : myRole;
    const template = TEMPLATES[currentRole];
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
          {adminMode && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-5 text-sm">
              <span className="font-semibold text-orange-700">🔧 Admin Mode</span>
              <span className="text-orange-500 ml-2">Playing as: Head → Torso → Legs</span>
            </div>
          )}
          <h2 className="text-3xl font-bold text-purple-900 mb-1">Your Turn!</h2>
          <p className="text-purple-500 font-medium mb-6">Design the <strong>{template.label}</strong></p>
          <div className="bg-blue-50 rounded-xl p-4 mb-5 text-sm text-blue-800">
            <p className="font-semibold mb-1">Instructions</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Download the template</li>
              <li>Design your part in any image editor</li>
              <li>Save as PNG and upload below</li>
            </ol>
          </div>
          <button onClick={downloadTemplate} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl mb-4 transition">
            ⬇ Download {template.label} Template
          </button>
          <label className="block border-2 border-dashed border-gray-300 hover:border-purple-400 rounded-xl p-8 text-center cursor-pointer transition mb-4">
            <input type="file" accept="image/png" onChange={handleFileUpload} className="hidden" />
            <p className="text-4xl mb-2">⬆</p>
            <p className="text-gray-500 font-medium">Click to upload your design</p>
            <p className="text-gray-400 text-xs mt-1">PNG only</p>
            {uploadedImage && <p className="text-emerald-600 font-semibold mt-2">✓ Design ready!</p>}
          </label>
          {uploadedImage && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-1">Preview</p>
              <img src={uploadedImage} alt="preview" className="w-full rounded-lg border" />
            </div>
          )}
          {statusMsg && <p className="text-orange-500 text-sm mb-3 text-center">{statusMsg}</p>}
          <button onClick={submitDesign} disabled={!uploadedImage}
            className={`w-full py-3 rounded-xl font-semibold transition ${uploadedImage ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            Submit Design
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'reveal') return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <h2 className="text-4xl font-bold text-purple-900 text-center mb-6">✨ The Grand Reveal!</h2>
        <div className="bg-purple-50 rounded-xl p-4 mb-6 flex justify-center">
          <canvas ref={canvasRef} className="max-w-full rounded-lg shadow-lg border-4 border-purple-200" />
        </div>
        <div className="flex gap-3">
          <button onClick={downloadCreature} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition">
            ⬇ Download Creature
          </button>
          <button onClick={resetGame} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition">
            Play Again
          </button>
        </div>
      </div>
    </div>
  );

  return null;
}
