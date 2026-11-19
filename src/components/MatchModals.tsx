import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { TRANSLATIONS } from '../game/catalog';
import type { DailyMissionsState, LanguageCode, MatchHudSnapshot } from '../game/types';
import type { HubTab } from './TitleOverlay';

interface PauseModalProps {
  language: LanguageCode;
  onResume: () => void;
  onRestart: () => void;
  onOpenHub: (tab: HubTab) => void;
  onQuitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  language,
  onResume,
  onRestart,
  onOpenHub,
  onQuitToTitle,
}) => {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 10, 20, 0.78)' }}>
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#11192B] p-6 shadow-2xl">
        <h2 className="font-display text-3xl font-extrabold tracking-wide text-white text-center">
          {t.paused}
        </h2>
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full rounded-xl bg-emerald-500 py-3 font-display text-xl font-bold text-slate-950 hover:bg-emerald-400"
          >
            {t.resume}
          </button>
          <button
            type="button"
            onClick={() => onOpenHub('squad')}
            className="w-full rounded-xl border border-white/15 bg-slate-800 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700"
          >
            {t.squadGear}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full rounded-xl border border-white/15 bg-slate-800 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700"
          >
            Restart Match
          </button>
          <button
            type="button"
            onClick={onQuitToTitle}
            className="w-full rounded-xl border border-white/10 bg-transparent py-2.5 text-sm font-medium text-slate-400 hover:text-white"
          >
            Exit to Stadium Title
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  hud: MatchHudSnapshot;
  clubName: string;
  opponentName: string;
  coinsEarned: number;
  trophiesDelta: number;
  dailyMissions?: DailyMissionsState;
  language: LanguageCode;
  onClaimDailyMission: (taskId: string) => void;
  onPlayAgain: () => void;
  onBackToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  hud,
  clubName,
  opponentName,
  coinsEarned,
  trophiesDelta,
  dailyMissions,
  language,
  onClaimDailyMission,
  onPlayAgain,
  onBackToTitle,
}) => {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const [copied, setCopied] = useState(false);
  const won = hud.homeScore > hud.awayScore;
  const draw = hud.homeScore === hud.awayScore;

  const handleShare = () => {
    const summary = `Mini Football World: ${clubName} ${hud.homeScore} - ${hud.awayScore} ${opponentName} | Possession ${hud.possessionPct}% · Shots ${hud.shots} · Tackles ${hud.tackles}`;
    navigator.clipboard?.writeText(summary).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 10, 20, 0.82)' }}>
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#11192B] p-6 shadow-2xl">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {t.fullTime}
          </div>
          <h2 className={`mt-1 font-display text-4xl font-extrabold tracking-wide ${won ? 'text-emerald-400' : draw ? 'text-amber-400' : 'text-rose-400'}`}>
            {won ? 'Victory!' : draw ? 'Draw Match' : 'Tough Defeat'}
          </h2>
          <div className="mt-3 flex items-center justify-center gap-4 rounded-xl bg-slate-900/90 py-3 px-4 border border-white/10">
            <span className="text-sm font-semibold text-emerald-400 truncate max-w-[110px]">{clubName}</span>
            <span className="font-display text-4xl font-extrabold text-white tabular-nums">
              {hud.homeScore} - {hud.awayScore}
            </span>
            <span className="text-sm font-semibold text-rose-400 truncate max-w-[110px]">{opponentName}</span>
          </div>
        </div>

        {/* Tabular-Nums Match Analytics Grid */}
        <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-lg bg-slate-900/80 p-2.5 border border-white/10">
            <div className="text-[11px] text-slate-400">Possession</div>
            <div className="mt-0.5 font-mono-num text-lg font-bold text-white">{hud.possessionPct}%</div>
          </div>
          <div className="rounded-lg bg-slate-900/80 p-2.5 border border-white/10">
            <div className="text-[11px] text-slate-400">Shots (On)</div>
            <div className="mt-0.5 font-mono-num text-lg font-bold text-white">
              {hud.shots} ({hud.shotsOnTarget})
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/80 p-2.5 border border-white/10">
            <div className="text-[11px] text-slate-400">Tackles</div>
            <div className="mt-0.5 font-mono-num text-lg font-bold text-white">{hud.tackles}</div>
          </div>
        </div>

        {/* Rewards */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-sm">
          <span className="font-semibold text-emerald-300 tabular-nums">+{coinsEarned} Coins</span>
          <span className={`font-semibold tabular-nums ${trophiesDelta >= 0 ? 'text-amber-300' : 'text-rose-300'}`}>
            {trophiesDelta >= 0 ? `+${trophiesDelta}` : trophiesDelta} Trophies
          </span>
        </div>

        {/* Daily Missions Post-Match Progress */}
        {dailyMissions && (
          <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/90 p-3 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              {t.dailyMissions}
            </div>
            {dailyMissions.tasks.map((task) => {
              const ready = task.progress >= task.target && !task.claimed;
              return (
                <div key={task.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-200 truncate">{task.title}</span>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums">
                    <span className="text-slate-400">
                      {task.progress}/{task.target}
                    </span>
                    {ready ? (
                      <button
                        type="button"
                        onClick={() => onClaimDailyMission(task.id)}
                        className="rounded bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-950 hover:bg-amber-300"
                      >
                        Claim +{task.rewardCoins}c
                      </button>
                    ) : task.claimed ? (
                      <span className="text-[11px] font-semibold text-emerald-400">Claimed</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="w-full rounded-xl bg-emerald-500 py-3 font-display text-2xl font-extrabold text-slate-950 hover:bg-emerald-400"
          >
            {t.playAgain}
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-slate-800 py-2.5 text-xs font-semibold text-slate-100 hover:bg-slate-700"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4 text-sky-400" />}
              <span>{copied ? 'Highlight Copied' : 'Share Highlight'}</span>
            </button>
            <button
              type="button"
              onClick={onBackToTitle}
              className="rounded-xl border border-white/15 bg-slate-800 py-2.5 text-xs font-semibold text-slate-100 hover:bg-slate-700"
            >
              Club Hub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
