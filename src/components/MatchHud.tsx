import React, { useRef, useState } from 'react';
import { RARITY_COLORS, TRANSLATIONS } from '../game/catalog';
import type { LanguageCode, MatchHudSnapshot, TacticMode } from '../game/types';

interface MatchHudProps {
  hud: MatchHudSnapshot;
  clubName: string;
  opponentName: string;
  language: LanguageCode;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onChangeTactic: (t: TacticMode) => void;
  onJoystickMove: (vx: number, vz: number) => void;
  onSprintChange: (held: boolean) => void;
  onPassPress: () => void;
  onShootOrTacklePress: () => void;
}

export const MatchHud: React.FC<MatchHudProps> = ({
  hud,
  clubName,
  opponentName,
  language,
  muted,
  onToggleMute,
  onPause,
  onChangeTactic,
  onJoystickMove,
  onSprintChange,
  onPassPress,
  onShootOrTacklePress,
}) => {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const joyRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const mins = Math.floor(hud.timeRemaining / 60);
  const secs = hud.timeRemaining % 60;
  const clockStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const handleJoyPointer = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobOffset({ x: dx, y: dy });
    // Screen X -> world Z (+Z is right/attacking toward +Z), Screen Y -> world -X
    const normX = dx / maxR;
    const normY = dy / maxR;
    onJoystickMove(-normY, normX);
  };

  const resetJoy = () => {
    draggingRef.current = false;
    setKnobOffset({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  const tactics: TacticMode[] = ['Balanced', 'High Press', 'Park Bus'];

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter Cluster: Broadcast Scoreboard & Utility Buttons */}
      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2 sm:gap-3">
        {/* Left: Active Player & Tactic Quick Switch */}
        <div
          className="order-2 sm:order-1 pointer-events-auto flex flex-col gap-1 rounded-xl border border-white/15 px-2.5 py-1.5 sm:px-3 sm:py-2"
          style={{ backgroundColor: 'rgba(11, 18, 32, 0.86)' }}
        >
          <div className="flex items-center gap-2 text-[11px] sm:text-xs">
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: RARITY_COLORS[hud.activePlayerRarity] }}
            />
            <span className="font-semibold text-white whitespace-nowrap">{hud.activePlayerName}</span>
            <span className="text-slate-400">·</span>
            <span className="font-mono-num text-sky-300">{hud.stamina}%</span>
          </div>
          <div className="flex gap-1">
            {tactics.map((tac) => (
              <button
                key={tac}
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onChangeTactic(tac);
                }}
                className={`rounded px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  hud.tactic === tac
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800/90 text-slate-300 hover:text-white'
                }`}
              >
                {tac === 'Balanced' ? t.balanced : tac === 'High Press' ? t.highPress : t.parkBus}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Compact Broadcast Scoreboard */}
        <div
          className="order-1 sm:order-2 flex items-center gap-2.5 sm:gap-3 rounded-xl border border-white/15 px-3 py-1.5 sm:px-4 sm:py-2 shadow-xl"
          style={{ backgroundColor: 'rgba(11, 18, 32, 0.9)' }}
        >
          <span className="hidden sm:inline text-xs font-bold tracking-wide text-emerald-400 uppercase max-w-[110px] truncate">
            {clubName}
          </span>
          <span className="font-display text-2xl sm:text-3xl font-extrabold text-white tabular-nums" data-testid="home-score">
            {hud.homeScore}
          </span>
          <div className="flex flex-col items-center px-1.5 sm:px-2">
            <span className="font-mono-num text-xs sm:text-sm font-bold text-amber-400" data-testid="match-clock">
              {clockStr}
            </span>
          </div>
          <span className="font-display text-2xl sm:text-3xl font-extrabold text-white tabular-nums" data-testid="away-score">
            {hud.awayScore}
          </span>
          <span className="hidden sm:inline text-xs font-bold tracking-wide text-rose-400 uppercase max-w-[110px] truncate">
            {opponentName}
          </span>
        </div>

        {/* Right: Mute [M] and Pause [P] Icon Buttons */}
        <div className="order-1 sm:order-3 pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Unmute [M]' : 'Mute [M]'}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-white/15 text-white hover:bg-slate-800"
            style={{ backgroundColor: 'rgba(11, 18, 32, 0.88)' }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={muted ? '#F43F5E' : '#10B981'} stroke="#0F172A" />
              {muted ? (
                <line x1="22" y1="9" x2="16" y2="15" stroke="#F43F5E" />
              ) : (
                <path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="#E2E8F0" />
              )}
            </svg>
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause [P]"
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-white/15 text-white hover:bg-slate-800"
            style={{ backgroundColor: 'rgba(11, 18, 32, 0.88)' }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5">
              <rect x="6" y="5" width="4" height="14" rx="1" fill="#F8FAFC" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="#F8FAFC" />
            </svg>
          </button>
        </div>
      </div>

      {/* Goal Banner (only visible during goal celebration) */}
      {hud.isGoalCelebration && hud.goalBannerText && (
        <div className="mx-auto my-auto text-center">
          <div
            className="rounded-2xl border-2 border-amber-400 px-8 py-4 shadow-2xl"
            style={{ backgroundColor: 'rgba(11, 18, 32, 0.92)' }}
          >
            <div className="font-display text-5xl font-extrabold tracking-wider text-amber-400">
              {hud.goalBannerText}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Perimeter Controls: Virtual Joystick (Left) + Arcade Action Buttons (Right) */}
      <div className="flex items-end justify-between gap-4">
        {/* Virtual Joystick */}
        <div
          ref={joyRef}
          onPointerDown={(e) => {
            draggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            handleJoyPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (draggingRef.current) handleJoyPointer(e.clientX, e.clientY);
          }}
          onPointerUp={resetJoy}
          onPointerCancel={resetJoy}
          className="pointer-events-auto relative flex h-28 w-28 touch-none items-center justify-center rounded-full border-2 border-white/25"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)' }}
          aria-label="Virtual Movement Joystick"
        >
          <div
            className="h-11 w-11 rounded-full border-2 border-amber-300 bg-emerald-500 shadow-lg"
            style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
          />
        </div>

        {/* Center Live Event Feed */}
        <div
          className="hidden md:block rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-medium text-slate-200"
          style={{ backgroundColor: 'rgba(11, 18, 32, 0.8)' }}
        >
          {hud.lastEventText}
        </div>

        {/* Action Buttons: Sprint, Pass, Shoot / Tackle */}
        <div className="pointer-events-auto flex items-end gap-2.5">
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={() => onSprintChange(true)}
            onPointerUp={() => onSprintChange(false)}
            onPointerLeave={() => onSprintChange(false)}
            className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-sky-400/70 text-[11px] font-bold text-white active:scale-95"
            style={{ backgroundColor: 'rgba(14, 116, 144, 0.85)' }}
          >
            <span>{t.sprint}</span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPassPress();
            }}
            className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 border-emerald-300 text-xs font-bold text-slate-950 active:scale-95"
            style={{ backgroundColor: '#10B981' }}
          >
            <span>{t.pass}</span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onShootOrTacklePress();
            }}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-amber-200 font-display text-lg font-extrabold tracking-wide text-slate-950 shadow-lg active:scale-95"
            style={{ backgroundColor: hud.hasBall ? '#F59E0B' : '#F43F5E', color: hud.hasBall ? '#0F172A' : '#FFFFFF' }}
          >
            <span>{hud.hasBall ? t.shoot : t.tackle}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
