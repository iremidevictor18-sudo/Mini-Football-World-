import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete: () => void;
}

const STEPS = [
  {
    title: '1. Dribble & Sprint',
    body: 'Use WASD, Arrow Keys, or the bottom-left Virtual Joystick to steer your chibi star. Hold Shift (or Sprint) to burst past defenders—watch the cyan stamina arc beneath your boots!',
  },
  {
    title: '2. Sharp Passing & Flair Shots',
    body: 'Press E (or Pass) to thread crisp passes to open teammates. Press Space (or Shoot) inside the box—Epic, Legendary, and Mythical stars trigger glowing rarity power-shots!',
  },
  {
    title: '3. Win Victory Packs & Upgrade Squad',
    body: 'Score goals toward your 20-Goal Prize Chest, win matches to fill your 4 Victory Pack slots, sign stars in the Shop, and swap bench players in Team Management.',
  },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 10, 20, 0.88)' }}>
      <div className="w-full max-w-md rounded-2xl border border-amber-400/40 bg-[#11192B] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Kickoff Tutorial · Step {step + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            onClick={onComplete}
            aria-label="Skip Tutorial"
            className="rounded-lg border border-white/15 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="mt-3 font-display text-3xl font-extrabold text-white">{current.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{current.body}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={`h-2 w-6 rounded-full ${i <= step ? 'bg-emerald-400' : 'bg-slate-700'}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (isLast ? onComplete() : setStep((s) => s + 1))}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
          >
            {isLast ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            <span>{isLast ? 'Got It!' : 'Next Tip'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
