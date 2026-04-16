// ── DesignView ────────────────────────────────────────────────────────────────
// Shown when it's the player's turn to draw and submit their section.

import { TEMPLATES } from "../config.js";

export default function DesignView({
  role,
  adminMode,
  uploadedImage,
  statusMsg,
  onDownloadTemplate,
  onFileUpload,
  onSubmit,
}) {
  const template = TEMPLATES[role];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">

        {adminMode && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-5 text-sm">
            <span className="font-semibold text-orange-700">🔧 Admin Mode</span>
            <span className="text-orange-600"> — drawing as: {role}</span>
          </div>
        )}

        <h1 className="text-3xl font-bold text-purple-700 mb-2">
          Your Section: {template.label}
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          Download the template, draw your section in any image editor, then upload your PNG to submit.
        </p>

        {/* Step 1 */}
        <div className="mb-5">
          <p className="font-semibold text-gray-700 mb-2">Step 1 — Download your template</p>
          <button
            onClick={onDownloadTemplate}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition"
          >
            ⬇️ Download Template ({template.width}×{template.height}px)
          </button>
        </div>

        {/* Step 2 */}
        <div className="mb-5">
          <p className="font-semibold text-gray-700 mb-2">Step 2 — Upload your drawing</p>
          <label className="block w-full cursor-pointer border-2 border-dashed border-purple-300 rounded-xl p-4 text-center text-purple-500 hover:bg-purple-50 transition">
            {uploadedImage ? '✅ Image ready to submit' : '📁 Click to choose your PNG file'}
            <input
              type="file"
              accept="image/png"
              className="hidden"
              onChange={onFileUpload}
            />
          </label>
        </div>

        {/* Preview */}
        {uploadedImage && (
          <div className="mb-5">
            <p className="font-semibold text-gray-700 mb-2">Preview</p>
            <img
              src={uploadedImage}
              alt="Your drawing"
              className="w-full rounded-xl border border-gray-200"
            />
          </div>
        )}

        {/* Step 3 */}
        <div className="mb-4">
          <p className="font-semibold text-gray-700 mb-2">Step 3 — Submit</p>
          <button
            onClick={onSubmit}
            disabled={!uploadedImage}
            className="w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition"
          >
            🚀 Submit My Drawing
          </button>
        </div>

        {statusMsg && (
          <p className="text-center text-sm text-gray-500 mt-3">{statusMsg}</p>
        )}

      </div>
    </div>
  );
}