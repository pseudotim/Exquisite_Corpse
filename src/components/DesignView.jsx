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
            <span​​​​​​​​​​​​​​​​
