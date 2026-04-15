// ── RevealView ────────────────────────────────────────────────────────────────
// Shown when all three sections are submitted and the creature is revealed.

import { useRef, useEffect } from "react";
import { stitchCreature, downloadCanvasAsPng } from "../logic/gameLogic.js";

export default function RevealView({ finalCreature, onPlayAgain }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (finalCreature && canvasRef.current) {
      stitchCreature(canvasRef.current, finalCreature);
    }
  }, [finalCreature]);

  const handleDownload = () => {
    if (canvasRef.current) {
      downloadCanvasAsPng(canvasRef.current, 'exquisite-corpse-creature.png');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <h2 className="text-4xl font-bold text-purple-900 text-center mb-6">
          ✨ The Grand Reveal!
        </h2>
        <div className="bg-purple-50 rounded-xl p-4 mb-6 flex justify-center">
          <canvas
            ref={canvasRef}
            className="max-w-full rounded-lg shadow-lg border-4 border-purple-200"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition"
          >
            ⬇ Download Creature
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
