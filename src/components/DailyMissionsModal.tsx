import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Coins, Target, X } from 'lucide-react';
import {
  claimDailyMissionReward,
  ensureFreshDailyMissions,
  formatCountdownToReset,
} from '../game/dailyMissions';
import { TRANSLATIONS } from '../game/catalog';
import type { UserProgress } from '../game/types';

interface DailyMissionsModalProps {
  progress: UserProgress;
  onUpdateProgress: (next: UserProgress) => void;
  onClose: () => void;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  progress,
  onUpdateProgress,
  onClose,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [claimBanner, setClaimBanner] = useState<string>('');
  const t = TRANSLATIONS[progress.language] ?? TRANSLATIONS.en;

  const freshProgress = ensureFreshDailyMissions(progress, nowMs);
  const missions = freshProgress.dailyMissions!;

  useEffect(() => {
    if (freshProgress !== progress) {
      onUpdateProgress(freshProgress);
    }
  }, [freshProgress, progress, onUpdateProgress]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const handleClaim = (taskId: string) => {
    const res = claimDailyMissionReward(freshProgress, taskId, Date.now());
    if (!res) return;
    onUpdateProgress(res.updated);
    setClaimBanner(`Bonus awarded: +${res.coinsAwarded} Coins!`);
  };

  const completedCount = missions.tasks.filter((task) => task.progress >= task.target).length;
  const countdown = formatCountdownToReset(missions.resetAt, nowMs);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 10, 20, 0.84)' }}
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-white/15 bg-[#11192B] shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-wide text-white flex items-center gap-2">
              <Target className="h-6 w-6 text-amber-400" />
              <span>{t.dailyMissions}</span>
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-300 tabular-nums">
              <span className="flex items-center gap-1 text-sky-300 font-semibold">
                <Clock className="h-3.5 w-3.5" />
                Resets in {countdown}
              </span>
              <span aria-hidden="true">·</span>
              <span>{completedCount} / 3 Completed</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-semibold">{freshProgress.coins.toLocaleString()} Coins</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Daily Missions"
            className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-6 space-y-4">
          {claimBanner && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-300">
              {claimBanner}
            </div>
          )}

          <p className="text-xs text-slate-400">
            Complete your 3 randomized daily matchday objectives before the 24-hour timer resets to claim bonus coins.
          </p>

          <div className="space-y-3">
            {missions.tasks.map((task) => {
              const pct = Math.min(100, Math.round((task.progress / Math.max(1, task.target)) * 100));
              const ready = task.progress >= task.target && !task.claimed;
              return (
                <div
                  key={task.id}
                  data-testid={`daily-mission-${task.id}`}
                  className={`rounded-xl border p-4 transition-colors ${
                    task.claimed
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : ready
                        ? 'border-amber-400/60 bg-amber-400/10'
                        : 'border-white/10 bg-slate-900'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-white">{task.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400 tabular-nums">
                        <span>
                          Progress: {task.progress} / {task.target}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1 font-semibold text-amber-300">
                          <Coins className="h-3.5 w-3.5" />
                          +{task.rewardCoins} Coins
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => handleClaim(task.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap ${
                        task.claimed
                          ? 'bg-slate-800 text-emerald-400 cursor-default'
                          : ready
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                            : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {task.claimed && <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>
                        {task.claimed
                          ? 'Claimed'
                          : ready
                            ? `Claim +${task.rewardCoins}`
                            : `${pct}%`}
                      </span>
                    </button>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        task.claimed || ready ? 'bg-emerald-400' : 'bg-sky-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
