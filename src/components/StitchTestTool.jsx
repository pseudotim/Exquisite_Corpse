// ── StitchTestTool ────────────────────────────────────────────────────────────
// Developer tool for testing stitching logic with generated or real designs.

import { useState, useEffect, useRef, useCallback } from "react";
import { TEMPLATES, STITCH_W, STITCH_SECTION, BAND_COLOR, OVERLAP_HEIGHT, BORDER_LINE_Y, BORDER_LINE_WIDTH } from "../config.js";
import { generateTemplateCanvas, downloadCanvasAsPng } from "../logic/gameLogic.js";

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

export default function StitchTestTool({ onClose }) {
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

  const handleDownloadTemplate = (role) => {
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
                <button onClick={() => handleDownloadTemplate(role)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">⬇ Template</button>
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
