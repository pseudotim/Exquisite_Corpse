import { useState, useEffect, useRef } from "react";
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
  head:  { width: 850, height: 366, borderHeight: 36, label: 'Head' },
  torso: { width: 850, height: 402, borderHeight: 36, label: 'Torso & Arms' },
  legs:  { width: 850, height: 402, borderHeight: 0,  label: 'Legs & Feet' },
};

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
      let foundGameId = null;
      let role = null;
      for (let id in games) {
        const g = games[id];
        if (g.status !== 'playing') continue;
        if (g.uploads?.head && !g.players?.torso) { foundGameId = id; role = 'torso'; break; }
        if (g.uploads?.torso && !g.players?.legs) { foundGameId = id; role = 'legs'; break; }
      }
      if (foundGameId) {
        const gameRef = ref(db, `games/${foundGameId}`);
        const snap = await get(gameRef);
        const game = snap.val();
        game.players[role] = playerId;
        game.currentTurn = role;
        await set(gameRef, game);
        setCurrentGameId(foundGameId);
        setMyRole(role);
        setGameState('designing');
      } else {
        const gameId = `game_${Date.now()}`;
        role = 'head';
        const newGame = {
          id: gameId, status: 'playing', currentTurn: 'head',
          players: { head: playerId, torso: null, legs: null },
          uploads:  { head: null, torso: null, legs: null },
        };
        await set(ref(db, `games/${gameId}`), newGame);
        setCurrentGameId(gameId);
        setMyRole(role);
        setGameState('designing');
      }
      setStatusMsg('');
    } catch (err) {
      setStatusMsg('Error connecting to Firebase. Check your database rules.');
      console.error(err);
    }
  };

  const joinAdminGame = async () => {
    const gameId = `admin_${Date.now()}`;
    const game = {
      id: gameId, status: 'playing', currentTurn: 'head',
      players: { head: playerId, torso: playerId, legs: playerId },
      uploads:  { head: null, torso: null, legs: null },
    };
    await set(ref(db, `games/${gameId}`), game);
    setCurrentGameId(gameId);
    setMyRole('head');
    setAdminCurrentRole('head');
    setAdminMode(true);
    setGameState('designing');
  };

  const downloadTemplate = async () => {
    const currentRole = adminMode ? adminCurrentRole : myRole;
    const template = TEMPLATES[currentRole];
    const canvas = document.createElement('canvas');
    canvas.width = template.width;
    canvas.height = template.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const loadImg = (src) => new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src;
    });
    try {
      const snap = await get(ref(db, `games/${currentGameId}`));
      const game = snap.val();
      if (game) {
        if (currentRole === 'torso' && game.uploads?.head) {
          const img = await loadImg(game.uploads.head);
          ctx.drawImage(img, 0, 330, 850, 36, 0, 0, 850, 36);
        } else if (currentRole === 'legs' && game.uploads?.torso) {
          const img = await loadImg(game.uploads.torso);
          ctx.drawImage(img, 0, 366, 850, 36, 0, 0, 850, 36);
        }
      }
    } catch (e) { console.warn('Could not load overlap image', e); }
    if (template.borderHeight > 0) {
      const lineY = canvas.height - template.borderHeight;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(canvas.width, lineY);
      ctx.stroke();
    }
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `corpse-${currentRole}-template.png`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/png')) { alert('Please upload a PNG file'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const submitDesign = async () => {
    if (!uploadedImage) return;
    const role = adminMode ? adminCurrentRole : myRole;
    setStatusMsg('Submitting...');
    try {
      const snap = await get(ref(db, `games/${currentGameId}`));
      const game = { ...snap.val() };
      game.uploads[role] = uploadedImage;
      if (role === 'head') {
        game.currentTurn = 'torso';
        if (adminMode) setAdminCurrentRole('torso');
      } else if (role === 'torso') {
        game.currentTurn = 'legs';
        if (adminMode) setAdminCurrentRole('legs');
      } else {
        game.status = 'completed';
        game.currentTurn = null;
      }
      await set(ref(db, `games/${currentGameId}`), game);
      setUploadedImage(null);
      setStatusMsg('');
      if (game.status === 'completed') {
        setFinalCreature({ head: game.uploads.head, torso: game.uploads.torso, legs: game.uploads.legs });
        setGameState('reveal');
      } else if (adminMode) {
        setGameState('designing');
      } else {
        setGameState('waiting');
      }
    } catch (err) {
      setStatusMsg('Error submitting. Try again.');
      console.error(err);
    }
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
    const HEAD_CONTENT = 330, TORSO_CONTENT = 330, LEGS_CONTENT = 366;
    canvas.width = 850;
    canvas.height = HEAD_CONTENT + TORSO_CONTENT + LEGS_CONTENT;
    const ctx = canvas.getContext('2d');
    const load = (src) => new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src;
    });
    (async () => {
      const head  = await load(finalCreature.head);
      const torso = await load(finalCreature.torso);
      const legs  = await load(finalCreature.legs);
      ctx.drawImage(head,  0,  0, 850, HEAD_CONTENT,  0, 0, 850, HEAD_CONTENT);
      ctx.drawImage(torso, 0, 36, 850, TORSO_CONTENT, 0, HEAD_CONTENT, 850, TORSO_CONTENT);
      ctx.drawImage(legs,  0, 36, 850, LEGS_CONTENT,  0, HEAD_CONTENT + TORSO_CONTENT, 850, LEGS_CONTENT);
    })();
  };

  const downloadCreature = () => {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = 'exquisite-corpse-creature.png';
    a.click();
  };

  if (gameState === 'menu') return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        <h1 className="text-4xl font-bold text-purple-900 mb-2">Exquisite Corpse</h1>
        <p className="text-gray-500 mb-6 text-sm">A collaborative creature-building game for three players.</p>
        <div className="bg-purple-50 rounded-xl p-5 mb-6 text-sm text-gray-700 space-y-1">
          <p>① Join a game → get assigned Head, Torso, or Legs</p>
          <p>② Download your template → design in any image editor</p>
          <p>③ Upload your PNG → wait for other players</p>
          <p>④ The creature is revealed when all three submit!</p>
        </div>
        {statusMsg && <p className="text-orange-500 text-sm mb-3 text-center">{statusMsg}</p>}
        <button onClick={joinGame} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl mb-3 transition">
          Join Game
        </button>
        <button onClick={joinAdminGame} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition">
          🔧 Admin Mode — Play All Roles
        </button>
      </div>
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
