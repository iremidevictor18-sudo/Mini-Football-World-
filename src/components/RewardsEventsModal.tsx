import React, { useEffect, useState } from 'react';
import { Clock, Crown, Gift, PackageOpen, Sparkles, Target, X } from 'lucide-react';
import { DAILY_REWARDS, RARITY_COLORS } from '../game/catalog';
import {
  claimDailyMissionReward,
  ensureFreshDailyMissions,
  formatCountdownToReset,
} from '../game/dailyMissions';
import {
  claimFreePrize,
  claimGoalsPrize,
  formatShortCountdown,
  getFreePrizeRemainingMs,
  GOALS_PRIZE_TARGET,
  instantUnlockVictoryPackWithGems,
  openVictoryPackSlot,
  PACK_SPEEDUP_GEMS,
  refreshVictoryPacks,
  startUnlockVictoryPack,
} from '../game/menuSystems';
import type { SubscriptionTier, UserProgress } from '../game/types';

interface RewardsEventsModalProps {
  progress: UserProgress;
  initialTab?: 'rewards' | 'missions' | 'packs' | 'pass';
  onUpdateProgress: (next: UserProgress) => void;
  onClose: () => void;
}

export const RewardsEventsModal: React.FC<RewardsEventsModalProps> = ({
  progress,
  initialTab = 'rewards',
  onUpdateProgress,
  onClose,
}) => {
  const [tab, setTab] = useState<'rewards' | 'missions' | 'packs' | 'pass'>(initialTab);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const fresh = ensureFreshDailyMissions(progress, nowMs);
    const nextPacks = refreshVictoryPacks(fresh.victoryPacks, nowMs);
    if (fresh !== progress || nextPacks !== fresh.victoryPacks) {
      onUpdateProgress({ ...fresh, victoryPacks: nextPacks });
    }
  }, [nowMs, progress, onUpdateProgress]);

  const daily = progress.dailyMissions ?? ensureFreshDailyMissions(progress, nowMs).dailyMissions!;
  const todayStr = new Date(nowMs).toISOString().slice(0, 10);
  const dailyClaimedToday = progress.lastDailyClaimAt.slice(0, 10) === todayStr;
  const freeRemainMs = getFreePrizeRemainingMs(progress.lastFreePrizeClaimAt, nowMs);
  const goalsProgress = Math.min(GOALS_PRIZE_TARGET, progress.goalsPrizeProgress);
  const goalsReady = progress.goalsPrizeProgress >= GOALS_PRIZE_TARGET;

  const handleClaimDailyLogin = () => {
    if (dailyClaimedToday) return;
    const reward = DAILY_REWARDS[progress.dailyRewardStreak % DAILY_REWARDS.length];
    onUpdateProgress({
      ...progress,
      coins: progress.coins + reward.coins,
      gems: progress.gems + reward.gems,
      dailyRewardStreak: progress.dailyRewardStreak + 1,
      lastDailyClaimAt: new Date(nowMs).toISOString(),
    });
    setStatusMsg(`Daily Login Claimed: +${reward.coins} Coins & +${reward.gems} Gems!`);
  };

  const handleClaimFreePrize = () => {
    const res = claimFreePrize(progress, nowMs);
    if (!res) return;
    onUpdateProgress(res.updated);
    setStatusMsg(`Free Prize Claimed: +${res.coins} Coins & +${res.gems} Gems!`);
  };

  const handleClaimGoalsPrize = () => {
    const res = claimGoalsPrize(progress);
    if (!res) return;
    onUpdateProgress(res.updated);
    setStatusMsg(
      `Goals Prize Opened: +${res.coinsAwarded} Coins, +${res.gemsAwarded} Gems${res.cardReward ? `, & ${res.cardReward.nickname}!` : '!'}`
    );
  };

  const handleClaimMission = (taskId: string) => {
    const res = claimDailyMissionReward(progress, taskId);
    if (!res) return;
    onUpdateProgress(res.updated);
    setStatusMsg(`Daily Mission Complete: +${res.coinsAwarded} Coins added!`);
  };

  const handleStartPack = (slotIndex: number) => {
    const next = startUnlockVictoryPack(progress, slotIndex, nowMs);
    if (!next) {
      setStatusMsg('Only one Victory Pack timer can run at once (or speed up with Gems).');
      return;
    }
    onUpdateProgress(next);
    setStatusMsg('Victory Pack unlock timer started!');
  };

  const handleSpeedUpPack = (slotIndex: number) => {
    const next = instantUnlockVictoryPackWithGems(progress, slotIndex);
    if (!next) {
      setStatusMsg('Not enough Gems to speed up this pack.');
      return;
    }
    onUpdateProgress(next);
    setStatusMsg('Pack unlocked immediately and ready to open!');
  };

  const handleOpenPack = (slotIndex: number) => {
    const res = openVictoryPackSlot(progress, slotIndex, Math.random, nowMs);
    if (!res) return;
    onUpdateProgress(res.updated);
    setStatusMsg(
      `Victory Pack Opened: +${res.coinsAwarded} Coins, +${res.gemsAwarded} Gems${res.cardReward ? `, & ${res.cardReward.nickname}!` : '!'}`
    );
  };

  const handleSelectTier = (tier: SubscriptionTier) => {
    onUpdateProgress({ ...progress, subscriptionTier: tier });
    setStatusMsg(`Season Pass updated to ${tier}.`);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 10, 20, 0.85)' }}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-white/15 bg-[#11192B] shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-wide text-white">
              Rewards, Victory Packs & Seasonal Events
            </h2>
            <div className="text-xs text-slate-300 tabular-nums">
              {progress.coins.toLocaleString()} Coins · {progress.gems} Gems · {progress.subscriptionTier}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Rewards and Events"
            className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 flex gap-2 border-b border-white/10 px-6 py-3 overflow-x-auto">
          {[
            { id: 'rewards', label: 'Free & Goals Prizes' },
            { id: 'packs', label: 'Victory Packs (4)' },
            { id: 'missions', label: 'Daily Missions (24h)' },
            { id: 'pass', label: 'Season Pass & Events' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === item.id ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-6 space-y-5">
          {statusMsg && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-200">
              {statusMsg}
            </div>
          )}

          {tab === 'rewards' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Free Timed Prize */}
                <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-900 p-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                        <Gift className="h-5 w-5 text-amber-400" />
                        Free Timed Prize
                      </h3>
                      <span className="text-xs font-semibold text-sky-300 tabular-nums">
                        {freeRemainMs === 0 ? 'Ready!' : `Next in ${formatShortCountdown(freeRemainMs)}`}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-300">
                      Collect +160 Coins, +6 Gems & +15 XP every 4 hours.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={freeRemainMs > 0}
                    onClick={handleClaimFreePrize}
                    className={`mt-4 w-full rounded-xl py-2.5 text-xs font-extrabold ${
                      freeRemainMs === 0
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {freeRemainMs === 0 ? 'Claim Free Prize (+160c +6g)' : `Ready in ${formatShortCountdown(freeRemainMs)}`}
                  </button>
                </div>

                {/* Goals Prize Tracker */}
                <div className="flex flex-col justify-between rounded-xl border border-emerald-500/25 bg-slate-900 p-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                        <PackageOpen className="h-5 w-5 text-emerald-400" />
                        Goals Prize Chest
                      </h3>
                      <span className="font-mono-num text-xs font-bold text-emerald-300">
                        {goalsProgress} / {GOALS_PRIZE_TARGET}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-300">
                      Score 20 goals across matches to unlock a Gold Star Pack!
                    </p>
                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all"
                        style={{ width: `${Math.min(100, Math.round((goalsProgress / GOALS_PRIZE_TARGET) * 100))}%` }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!goalsReady}
                    onClick={handleClaimGoalsPrize}
                    className={`mt-4 w-full rounded-xl py-2.5 text-xs font-extrabold ${
                      goalsReady
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {goalsReady ? 'Open Gold Goals Prize!' : `Score ${GOALS_PRIZE_TARGET - goalsProgress} More Goals`}
                  </button>
                </div>
              </div>

              {/* 7-Day Streak */}
              <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-white">7-Day Login Streak Rewards</h3>
                  <button
                    type="button"
                    disabled={dailyClaimedToday}
                    onClick={handleClaimDailyLogin}
                    className={`rounded-lg px-4 py-1.5 text-xs font-bold ${
                      dailyClaimedToday
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    }`}
                  >
                    {dailyClaimedToday ? 'Claimed Today' : `Claim Day ${(progress.dailyRewardStreak % 7) + 1}`}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[11px]">
                  {DAILY_REWARDS.map((r, i) => (
                    <div
                      key={r.day}
                      className={`rounded-lg border p-2 ${
                        i < progress.dailyRewardStreak % 7
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-white/10 bg-slate-800/70 text-slate-300'
                      }`}
                    >
                      <div className="font-bold">D{r.day}</div>
                      <div className="font-mono-num text-[10px]">{r.coins}c</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'packs' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {progress.victoryPacks.map((slot) => {
                const remainMs =
                  slot.status === 'unlocking' && slot.unlockEndsAt
                    ? Math.max(0, Date.parse(slot.unlockEndsAt) - nowMs)
                    : 0;
                const gemCost = slot.tier ? PACK_SPEEDUP_GEMS[slot.tier] : 10;
                return (
                  <div
                    key={slot.slotIndex}
                    className={`flex flex-col justify-between rounded-xl border p-4 ${
                      slot.status === 'ready'
                        ? 'border-amber-400 bg-amber-400/15'
                        : 'border-white/10 bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Slot #{slot.slotIndex + 1}
                      </div>
                      <div className="mt-1 font-display text-2xl font-extrabold text-white">
                        {slot.tier ? `${slot.tier} Pack` : 'Empty Slot'}
                      </div>
                      <div className="mt-1 text-xs text-slate-300">
                        {slot.status === 'empty'
                          ? 'Win a match to earn a Victory Pack!'
                          : slot.status === 'ready'
                            ? 'Ready to open now!'
                            : slot.status === 'unlocking'
                              ? `Unlocks in ${formatShortCountdown(remainMs)}`
                              : 'Tap below to begin 3H unlock timer'}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {slot.status === 'ready' && (
                        <button
                          type="button"
                          onClick={() => handleOpenPack(slot.slotIndex)}
                          className="w-full rounded-lg bg-amber-400 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
                        >
                          Open Now!
                        </button>
                      )}
                      {slot.status === 'locked' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartPack(slot.slotIndex)}
                            className="w-full rounded-lg bg-sky-400 py-2 text-xs font-bold text-slate-950 hover:bg-sky-300"
                          >
                            Start Timer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSpeedUpPack(slot.slotIndex)}
                            className="w-full rounded-lg border border-white/15 bg-slate-800 py-1.5 text-[11px] font-semibold text-sky-300 hover:bg-slate-700"
                          >
                            Unlock Now ({gemCost} Gems)
                          </button>
                        </>
                      )}
                      {slot.status === 'unlocking' && (
                        <button
                          type="button"
                          onClick={() => handleSpeedUpPack(slot.slotIndex)}
                          className="w-full rounded-lg bg-sky-500 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
                        >
                          Finish Now ({gemCost} Gems)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'missions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 text-sky-300 font-semibold">
                  <Clock className="h-3.5 w-3.5" />
                  Resets in {formatCountdownToReset(daily.resetAt, nowMs)}
                </span>
                <span className="font-semibold text-amber-300">
                  <Target className="inline h-3.5 w-3.5 mr-1" />
                  {daily.tasks.filter((t) => t.progress >= t.target).length} / 3 Completed
                </span>
              </div>
              {daily.tasks.map((task) => {
                const complete = task.progress >= task.target;
                const pct = Math.min(100, Math.round((task.progress / Math.max(1, task.target)) * 100));
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border border-white/10 bg-slate-900 p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white">{task.title}</div>
                      <div className="mt-0.5 text-xs text-slate-400 tabular-nums">
                        Progress: {task.progress} / {task.target} · +{task.rewardCoins} Coins
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full ${complete ? 'bg-emerald-400' : 'bg-sky-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!complete || task.claimed}
                      onClick={() => handleClaimMission(task.id)}
                      className={`shrink-0 rounded-lg px-4 py-2 text-xs font-extrabold ${
                        task.claimed
                          ? 'bg-slate-800 text-slate-500'
                          : complete
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                            : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {task.claimed ? 'Claimed' : complete ? `Claim +${task.rewardCoins}` : `${pct}%`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'pass' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-display text-2xl font-extrabold text-amber-300">
                    <Sparkles className="h-5 w-5" />
                    <span>Seasonal Starter Event · 2D 23H Left</span>
                  </div>
                  <p className="text-xs text-slate-200 mt-0.5">
                    Unlock +25% to +50% coin bonuses, ad-free play, and seasonal VIP tournaments!
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  {
                    tier: 'Free' as SubscriptionTier,
                    price: 'Free Forever',
                    perks: ['Full 6v6 Arcade Matches', 'Offline Practice Mode', 'Daily Rewards & Missions'],
                  },
                  {
                    tier: 'Pro Pass' as SubscriptionTier,
                    price: '+25% Match Coins',
                    perks: ['Ad-Free Stadium Experience', '+25% Coin Bonus Every Match', 'Priority Cup Access'],
                  },
                  {
                    tier: 'Legend VIP' as SubscriptionTier,
                    price: '+50% Coins & Exclusives',
                    perks: ['Ad-Free + VIP Tournaments', '+50% Match Coin Multiplier', 'Exclusive Legend Badge'],
                  },
                ].map((plan) => {
                  const active = progress.subscriptionTier === plan.tier;
                  return (
                    <div
                      key={plan.tier}
                      className={`flex flex-col justify-between rounded-xl border p-5 ${
                        active ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 font-display text-2xl font-extrabold text-white">
                          <Crown className="h-5 w-5 text-amber-400" />
                          <span>{plan.tier}</span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-emerald-400">{plan.price}</div>
                        <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                          {plan.perks.map((perk) => (
                            <li key={perk}>· {perk}</li>
                          ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectTier(plan.tier)}
                        className={`mt-5 w-full rounded-lg py-2 text-xs font-bold ${
                          active ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700'
                        }`}
                      >
                        {active ? 'Current Tier' : `Activate ${plan.tier}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
