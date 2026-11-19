import React from 'react';
import { Lock, Play, Shield, Trophy, X } from 'lucide-react';
import { OPPONENT_CLUBS, STADIUM_CATALOG, TRANSLATIONS } from '../game/catalog';
import { getPlayerLevelInfo } from '../game/menuSystems';
import type { MatchMode, StadiumDef, UserProgress } from '../game/types';

interface PlayMatchmakingModalProps {
  progress: UserProgress;
  selectedStadiumId: string;
  selectedMode: MatchMode;
  selectedOpponentIdx: number;
  errorMsg: string;
  onSelectStadium: (stadium: StadiumDef) => void;
  onSelectMode: (mode: MatchMode) => void;
  onSelectOpponent: (idx: number) => void;
  onKickOff: () => void;
  onClose: () => void;
}

export const PlayMatchmakingModal: React.FC<PlayMatchmakingModalProps> = ({
  progress,
  selectedStadiumId,
  selectedMode,
  selectedOpponentIdx,
  errorMsg,
  onSelectStadium,
  onSelectMode,
  onSelectOpponent,
  onKickOff,
  onClose,
}) => {
  const t = TRANSLATIONS[progress.language] ?? TRANSLATIONS.en;
  const { level } = getPlayerLevelInfo(progress.xp);
  const modes: MatchMode[] = ['Quick Match', 'League Cup', 'Practice Drill'];
  const selectedStadium = STADIUM_CATALOG.find((s) => s.id === selectedStadiumId) ?? STADIUM_CATALOG[0];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 10, 20, 0.85)' }}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-white/15 bg-[#11192B] shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-wide text-white">
              Play Matchmaking & Stadium Select
            </h2>
            <div className="text-xs text-slate-300 tabular-nums">
              Manager Level {level} · {progress.coins.toLocaleString()} Coins · Choose your arena & entry fee
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Matchmaking"
            className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2.5 text-xs font-semibold text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Stadium Cards */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-white">Select Stadium (Distinct 3D Arenas)</h3>
              <span className="text-[11px] font-semibold text-sky-300">
                {selectedMode === 'Practice Drill'
                  ? 'Practice Drill: All 5 stadiums open to preview & play'
                  : 'Switch to Practice Drill below to scrimmage in any stadium immediately'}
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {STADIUM_CATALOG.map((stadium) => {
                const levelUnlocked = level >= stadium.requiredLevel;
                const practiceOpen = selectedMode === 'Practice Drill';
                const canSelect = levelUnlocked || practiceOpen;
                const canAfford = practiceOpen || progress.coins >= stadium.entryFeeCoins;
                const active = selectedStadium.id === stadium.id;
                return (
                  <button
                    key={stadium.id}
                    type="button"
                    disabled={!canSelect}
                    onClick={() => onSelectStadium(stadium)}
                    className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-colors ${
                      !canSelect
                        ? 'border-white/5 bg-slate-900/50 opacity-60 cursor-not-allowed'
                        : active
                          ? 'border-amber-400 bg-amber-400/15 shadow-lg'
                          : 'border-white/10 bg-slate-900 hover:border-white/25'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-xl font-bold text-white flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 shrink-0 rounded-full ring-2 ring-white/25"
                            style={{ backgroundColor: stadium.accentHex }}
                          />
                          {stadium.name}
                        </span>
                        {!levelUnlocked ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                            {practiceOpen ? (
                              <>Practice Free</>
                            ) : (
                              <>
                                <Lock className="h-3.5 w-3.5" /> Lv.{stadium.requiredLevel}
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-400">Lv.{stadium.requiredLevel}+</span>
                        )}
                      </div>
                      <div
                        className="mt-1 inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-950"
                        style={{ backgroundColor: stadium.accentHex }}
                      >
                        {stadium.atmosphereLabel}
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400">{stadium.subtitle}</p>
                    </div>

                    <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-xs tabular-nums">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Entry Fee</span>
                        <span className={`font-bold ${canAfford ? 'text-amber-300' : 'text-rose-400'}`}>
                          {practiceOpen || stadium.entryFeeCoins === 0 ? 'Free' : `${stadium.entryFeeCoins} Coins`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Win Prize</span>
                        <span className="font-bold text-emerald-400">
                          {practiceOpen
                            ? 'Free Practice XP'
                            : `+${stadium.prizeCoins} Coins · +${stadium.prizeTrophies} 🏆`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Victory Pack</span>
                        <span className="font-semibold text-sky-300">{stadium.packTier} Pack</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Match Mode & Rival Club */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                Match Format
              </h3>
              <div className="mt-2.5 flex gap-2">
                {modes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onSelectMode(m)}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                      selectedMode === m
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                {selectedMode === 'Practice Drill'
                  ? 'Free offline scrimmage with no entry fee and no trophy risk.'
                  : selectedMode === 'League Cup'
                    ? 'High-stakes cup match with 1.5x coins & extra trophy points.'
                    : 'Fast-paced 90-second 6v6 arcade match for coins and victory packs.'}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-sky-400" />
                Opponent Club
              </h3>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {OPPONENT_CLUBS.map((opp, idx) => (
                  <button
                    key={opp.name}
                    type="button"
                    onClick={() => onSelectOpponent(idx)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors truncate ${
                      selectedOpponentIdx === idx
                        ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                        : 'border-white/10 bg-slate-800 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {opp.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4 bg-slate-950/60 rounded-b-2xl">
          <div className="text-xs text-slate-300 tabular-nums">
            Arena: <span className="font-bold text-white">{selectedStadium.name}</span> · Entry:{' '}
            <span className="font-bold text-amber-300">
              {selectedMode === 'Practice Drill' || selectedStadium.entryFeeCoins === 0
                ? 'Free'
                : `${selectedStadium.entryFeeCoins} Coins`}
            </span>
          </div>
          <button
            type="button"
            data-start="true"
            onClick={onKickOff}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 font-display text-2xl font-extrabold tracking-wider text-slate-950 shadow-lg hover:bg-emerald-400"
          >
            <Play className="h-5 w-5 fill-slate-950" />
            <span>{t.kickOff}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
