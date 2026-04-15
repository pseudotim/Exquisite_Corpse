// ── Global Constants ──────────────────────────────────────────────────────────

export const TEMPLATES = {
  head:  { width: 850, height: 402, borderHeight: 36, label: 'Head' },
  torso: { width: 850, height: 402, borderHeight: 36, label: 'Torso & Arms' },
  legs:  { width: 850, height: 366, borderHeight: 0,  label: 'Legs & Feet' },
};

export const STITCH_W = 850;
export const STITCH_SECTION = 366;

export const BAND_COLOR = {
  head:  { r: 255, g: 0,   b: 0   },
  torso: { r: 0,   g: 180, b: 0   },
  legs:  { r: 255, g: 140, b: 0   },
};

export const BORDER_LINE_Y     = 367;
export const BORDER_LINE_WIDTH = 2;
export const OVERLAP_START     = 369;
export const OVERLAP_HEIGHT    = 33;

// ── Timer Config ──────────────────────────────────────────────────────────────
// Adjust these to experiment with game pacing

export const CLAIMED_TIMEOUT_HOURS    = 1;   // must download after claiming from open pool
export const INVITE_TIMEOUT_HOURS     = 24;  // must claim after receiving email invite
export const SUBMISSION_TIMEOUT_HOURS = 24;  // must submit after downloading template

// ── Section States ────────────────────────────────────────────────────────────

export const SECTION_STATES = {
  WAITING:     'waiting',     // previous section not yet submitted
  OPEN:        'open',        // available for anyone to claim
  CLAIMED:     'claimed',     // claimed from open pool, not yet downloaded
  ASSIGNED:    'assigned',    // reserved for specific person via email invite
  IN_PROGRESS: 'in-progress', // template downloaded, drawing in progress
  SUBMITTED:   'submitted',   // drawing uploaded, choosing who draws next
  COMPLETED:   'completed',   // locked in as part of finished creature
};
