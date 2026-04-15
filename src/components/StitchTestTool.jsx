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
  const [statusTypes, setStatusTypes] = useState({​​​​​​​​​​​​​​​​
