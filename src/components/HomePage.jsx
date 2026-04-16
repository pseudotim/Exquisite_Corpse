// ── HomePage ──────────────────────────────────────────────────────────────────
// Main menu screen. Handles game entry points.
export default function HomePage({ onPlay, onAdminPlay, onStitchTest, statusMsg }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-12 overflow-hidden bg-[#f5f0e8] px-4 relative">
      <img className="min-h-[0px] w-full grow shrink-0 basis-0 object-cover absolute inset-0 z-0 pointer-events-none" src="https://res.cloudinary.com/subframe/image/upload/v1740529337/uploads/39326/paper-texture-bg.jpg" />
      <img className="max-h-[448px] max-w-[448px] flex-none rotate-[48deg] absolute -top-24 right-0 z-10" src="https://res.cloudinary.com/subframe/image/upload/v1775664364/uploads/39326/ypnhuccv3xpjeihhfnoo.png" />
      <img className="max-h-[288px] flex-none rotate-[285deg] -scale-x-100 absolute top-0 left-[-48px] z-10" src="https://res.cloudinary.com/subframe/image/upload/v1775664198/uploads/39326/igo9axnntlhtpd8g01gm.png" />
      <img className="flex-none rotate-[-20deg] absolute bottom-0 left-[-240px] z-10" src="https://res.cloudinary.com/subframe/image/upload/v1775664764/uploads/39326/nxqwqibyeuxgtmdcz2bx.png" />
      <div className="flex items-center pb-3 translate-x-10 z-20">
        <span className="font-['Playfair_Display'] text-[150px] font-[800] leading-[80px] text-[#000000] text-center -tracking-[0.04em] italic -translate-x-[50px]">
          EXQUISITE
        </span>
      </div>
      <span className="font-['Spectral'] text-[120px] font-[700] leading-[80px] text-neutral-600 text-center tracking-[0.05em] z-20">
        CORPSE
      </span>
      <span className="font-['Inter'] text-[14px] font-[400] leading-[21px] tracking-[0.3em] text-neutral-500 text-center uppercase z-20">
        Fold. Draw. Reveal.
      </span>
      {statusMsg && <p className="text-orange-500 text-sm z-20">{statusMsg}</p>}
      <button
        onClick={onPlay}
        className="flex items-center gap-4 bg-[#fbbf24] px-12 py-4 z-20 transition-colors border-none cursor-pointer"
        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgb(245,158,11)'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgb(251,191,36)'}
      >
        <span className="font-['Inter'] text-[100px] font-[900] leading-[100px] text-white -tracking-[0.04em]">
          ▶ PLAY
        </span>
      </button>
      <button onClick={onAdminPlay} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors absolute bottom-4 z-20 border-none bg-transparent cursor-pointer">
        🔧 God Mode
      </button>
      <button onClick={onStitchTest} className="text-xs text-neutral-300 hover:text-neutral-400 transition-colors absolute bottom-4 right-4 z-20 border-none bg-transparent cursor-pointer">
        🧪
      </button>
    </div>
  );
}