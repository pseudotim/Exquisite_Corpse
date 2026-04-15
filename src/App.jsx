// ── App.jsx ───────────────────────────────────────────────────────────────────
// Root component. Handles state and routing between views.
// No Firebase calls, no canvas logic — just wires components to logic.

import { useState, useEffect, useRef } from "react";
import { TEMPLATES } from "./config.js";
import { subscribeToGame, unsubscribeFromGame } from "./services/gameService.js";
import {
  joinGame,
  joinAdminGame,
  downloadTemplate,
  submitDesign,
  openNextSection,
  inviteNextPlayer,
  applyGameState,
} from "./logic/gameLogic.js";
import HomePage from "./components/HomePage.jsx";
import WaitingView from "./components/WaitingView.jsx";
import DesignView from "./components/DesignView.jsx";
import RevealView from "./components/RevealView.jsx";
import SubmittedView from "./components/SubmittedView.jsx";
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
      applyGameState(game, myRole, playerId, {
        onCompleted: (creature) => {
          setFinalCreature(creature);
          setGameState('reveal');
        },
        onSubmitted: () => setGameState('submitted'),
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
    const role = adminMode ? adminCurrentRole : myRole;
    const template = TEMPLATES[role];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
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

  const handleSubmit = async () => {
    if (!uploadedImage) return;
    const role = adminMode ? adminCurrentRole : myRole;
    setStatusMsg('Submitting...');
    try {
      const game = await submitDesign(currentGameId, role, playerId, uploadedImage);
      setUploadedImage(null);
      setStatusMsg('');
      if (game.status === 'completed') {
        setFinalCreature({
          head:  game.sections.head.upload,
          torso: game.sections.torso.upload,
          legs:  game.sections.legs.upload,
        });
        setGameState('reveal');
      } else if (adminMode) {
        const nextRole = role === 'head' ? 'torso' : 'legs';
        setAdminCurrentRole(nextRole);
        // In admin mode, auto-open next section and continue
        await openNextSection(currentGameId, role);
        setGameState('designing');
      } else {
        setGameState('submitted');
      }
    } catch (err) {
      setStatusMsg('Error: ' + err.message);
    }
  };

  const handleOpenNext = async () => {
    const role = adminMode ? adminCurrentRole : myRole;
    try {
      await openNextSection(currentGameId, role);
      setGameState('waiting');
    } catch (err) {
      setStatusMsg('Error: ' + err.message);
    }
  };

  const handleInviteNext = async (email) => {
    const role = adminMode ? adminCurrentRole : myRole;
    const inviteCode = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    try {
      await inviteNextPlayer(currentGameId, role, email, inviteCode);
      setGameState('waiting');
    } catch (err) {
      setStatusMsg('Error: ' + err.message);
    }
  };

  const handleReset = () => {
    unsubscribeFromGame(gameRefRef.current);
    gameRefRef.current = null;
    setCurrentGameId(null);
    setMyRole(null);
    setUploadedImage(null);
    setFinalCreature(null);
    setAdminMode(false);
    setAdminCurrentRole('head');
    setStatusMsg('');
    setGameState('menu');
  };

  // ── Routing ────────────────────────────────────────────────────────────────

  if (gameState === 'stitch-test')
    return <StitchTestTool onClose={() => setGameState('menu')} />;

  if (gameState === 'menu')
    return (
      <HomePage
        onPlay={handlePlay}
        onAdminPlay={handleAdminPlay}
        onStitchTest={() => setGameState('stitch-test')}
        statusMsg={statusMsg}
      />
    );

  if (gameState === 'waiting')
    return <WaitingView myRole={myRole} onLeave={handleReset} />;

  if (gameState === 'designing')
    return (
      <DesignView
        role={adminMode ? adminCurrentRole : myRole}
        adminMode={adminMode}
        uploadedImage={uploadedImage}
        statusMsg={statusMsg}
        onDownloadTemplate={handleDownloadTemplate}
        onFileUpload={handleFileUpload}
        onSubmit={handleSubmit}
      />
    );

  if (gameState === 'submitted')
    return (
      <SubmittedView
        role={adminMode ? adminCurrentRole : myRole}
        statusMsg={statusMsg}
        onOpenNext={handleOpenNext}
        onInviteNext={handleInviteNext}
      />
    );

  if (gameState === 'reveal')
    return <RevealView finalCreature={finalCreature} onPlayAgain={handleReset} />;

  return null;
}
