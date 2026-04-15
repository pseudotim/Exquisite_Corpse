// ── SubmittedView ─────────────────────────────────────────────────────────────
// Shown after a player submits their section.
// They choose to open the next section to anyone or invite someone specific.

import { useState } from "react";
import { TEMPLATES } from "../config.js";

export default function SubmittedView({ role, statusMsg, onOpenNext, onInviteNext }) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const nextRole = role === 'head' ? 'torso' : role === 'torso' ? 'legs' : null;
  const nextLabel = nextRole ? TEMPLATES[nextRole].label : null;

  const handleInviteSubmit = () => {
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    onInviteNext(email);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg text-center">

        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-purple-900 mb-2">Section Submitted!</h2>
        <p className="text-gray-500 mb-8">
          Your <span className="font-semibold text-purple-600">{TEMPLATES[role]?.label}</span> is locked in.
          {nextLabel && <> Now choose who draws the <span className="font-semibold text-purple-600">{nextLabel}</span>.</>}
        </p>

        {!showInviteForm ? (
          <div className="flex flex-col gap-4">

            {nextLabel && (
              <>
                <button
                  onClick={onOpenNext}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-xl transition"
                >
                  🌐 Open to Anyone
                  <p className="text-xs font-normal text-purple-200 mt-1">
                    Anyone can claim the {nextLabel} section
                  </p>
                </button>

                <button
                  onClick={() => setShowInviteForm(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-xl transition"
                >
                  ✉️ Invite Someone
                  <p className="text-xs font-normal text-emerald-200 mt-1">
                    Send a personal invite to draw the {nextLabel}
                  </p>
                </button>
              </>
            )}

            {!nextLabel && (
              <p className="text-gray-400 text-sm">
                Waiting for the other sections to be completed…
              </p>
            )}

          </div>
        ) : (
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Enter the email address of the person you want to draw the {nextLabel}:
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm mb-2 focus:outline-none focus:border-purple-400"
            />
            {emailError && (
              <p className="text-red-500 text-xs mb-3">{emailError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowInviteForm(false); setEmail(''); setEmailError(''); }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition"
              >
                ← Back
              </button>
              <button
                onClick={handleInviteSubmit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition"
              >
                Send Invite ✉️
              </button>
            </div>
          </div>
        )}

        {statusMsg && (
          <p className="text-orange-500 text-sm mt-4">{statusMsg}</p>
        )}

      </div>
    </div>
  );
}
