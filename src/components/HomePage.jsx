// ── HomePage ──────────────────────────────────────────────────────────────────
// Main menu screen. Handles game entry points.

export default function HomePage({ onPlay, onAdminPlay, onStitchTest, statusMsg }) {
  return (
    <div
      className="flex h-screen w-full flex-col items-center justify-center gap-12 px-4 relative bg-cover bg-center"
      style={{ backgroundColor: '#f5f0e8', backgroundImage: "url('https://res.cloudinary.com/subframe/image/upload/v1740529337/uploads/39326/paper-texture-bg.jpg')" }}
    >
      {/* Decorative images */}
      <img
        className="max-h-[448px] max-w-[448px] flex-none rotate-[48deg] absolute -top-24 right-0 z-10"
        src="https://res.cloudinary.com/subframe/image/upload/v1775664364/uploads/39326/ypnhuccv3xpjeihhfnoo.png"
      />
      <img
        className="max-h-[288px] flex-none rotate-[285deg] -scale-x-100 absolute top-0 left-[-48px]"
        src="https://res.cloudinary.com/subframe/image/upload/v1775664198/uploads/39326/igo9axnntlhtpd8g01gm.png"
      />
      <img
        className="flex-none rotate-[-20deg] absolute bottom-0 left-[-240px]"
        src="https://res.cloudinary.com/subframe/image/upload/v1775664764/uploads/39326/nxqwqibyeuxgtmdcz2bx.png"
      />

      {/* Title */}
      <div className="flex items-center pb-3 translate-x-10">
        <span className="font-['Playfair_Display'] text-[150px] font-extrabold leading-[80px] text-black text-center -tracking-[0.04em] italic -translate-x-[50px]">
          EXQUISITE
        </span>
      </div>

      <span className="font-['Spectral'] text-[120px] font-bold leading-[80px] text-neutral-600 text-center tracking-[0.05em]">
        CORPSES
      </span>

      <span className="text-sm text-neutral-500 text-center tracking-[0.3em] uppercase">
        Fold. Draw. Reveal.
      </span>

      {statusMsg && <p className="text-orange-500 text-sm">{statusMsg}</p>}

      {/* Play button */}
      <button
        onClick={onPlay}
        className="font-['Inter'] text-[100px] font-black leading-[100px] -tracking-[0.04em] text-white px-12 py-4 flex items-center gap-4 transition-colors"
        style={{ backgroundColor: 'rgb(251,191,36)', border: 'none' }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgb(245,158,11)'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgb(251,191,36)'}
      >
        ▶ PLAY
      </button>

      {/* God Mode - hidden away */}
      <button
        onClick={onAdminPlay}
        className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors absolute bottom-4"
      >
        🔧 God Mode
      </button>

      {/* Stitch Test Tool - developer only */}
      <button
        onClick={onStitchTest}
        className="text-xs text-neutral-300 hover:text-neutral-400 transition-colors absolute bottom-4 right-4"
      >
        🧪
      </button>
    </div>
  );
}
