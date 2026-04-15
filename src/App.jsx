// ── App.jsx ───────────────────────────────────────────────────────────────────
// Root component. Handles state and routing between views.
// No Firebase calls, no canvas logic — just wires components to logic.

import { useState, useEffect, useRef } from "react";
import { subscribeToGame, unsubscribeFromGame } from "./services/gameService.js";
import { joinGame, joinAdminGame, downloadTemplate, submitDesign, applyGameState } from "./logic/gameLogic.js";
import HomePage from "./components/HomePage.jsx";
import WaitingView from "./components/WaitingView.jsx";
import DesignView from "./components/DesignView.jsx";
import RevealView from "./components/RevealView.jsx";
import StitchTestTool from "./components/StitchTestTool.jsx";

export default function ExquisiteCorpse() {
  const [gameState, setGameState] = useState('menu');
  const [currentGameId, setCurrentGameId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [finalCreature, setFinalCreature] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminCurrentRole, setAdminCurrentRole] = useState('head');
  const [statusMsg, setStatusMsg] = useState('');

  const [playerId] = useState(
    () => `p_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  );
  const gameRefRef = useRef(null);

  // ── Firebase subscription ──────────────────────────────────────────────────

  useEffect(() => {
    if (!currentGameId || adminMode) return;
    const gameRef = subscribeToGame(currentGameId, (game) => {
      if (!game) return;
      applyGameState(game, myRole, {
        onCompleted: (creature) => {
          setFinalCreature(creature);
          setGameState('reveal');
        },
        onDesigning: () => setGameState('designing'),
        onWaiting:   () => setGameState('waiting'),
      });
    });
    gameRefRef.current = gameRef;
    return () => unsubscribeFromGame(gameRef);
  }, [currentGameId, myRole, adminMode]);

  // ── Game actions ───────────────────────────────────────────────────────────

  const handlePlay = async () => {
    setStatusMsg('Finding a game...');
    try {
      const { gameId, role } = await joinGame(playerId);
      setCurrentGameId(gameId);
      setMyRole(role);
      setGameState('designing');
      setStatusMsg('');
    } catch (err) {
      setStatusMsg('Error: ' + err.message);
    }
  };

  const handleAdminPlay = async () => {
    const { gameId } = await joinAdminGame(playerId);
    setCurrentGameId(gameId);
    setMyRole('head');
    setAdminCurrentRole('head');
    setAdminMode(true);
    setGameState('designing');
  };

  const handleDownloadTemplate = async () => {
    const role = adminMode ? adminCurrentRole : myRole;
    await downloadTemplate(currentGameId, role, playerId);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/png')) { alert('Please upload a PNG file'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const { TEMPLATES } = require('./config.js');
        const role = adminMode ? adminCurrentRole : myRole;
        const template = TEMPLATES[role];
        if (img​​​​​​​​​​​​​​​​
