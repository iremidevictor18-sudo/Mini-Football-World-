import type { DailyMissionMetric, DailyMissionTask, DailyMissionsState, UserProgress } from './types';

export const DAILY_RESET_MS = 24 * 60 * 60 * 1000;

interface DailyMissionTemplate {
  id: string;
  title: string;
  metric: DailyMissionMetric;
  target: number;
  rewardCoins: number;
}

export const DAILY_MISSION_POOL: readonly DailyMissionTemplate[] = [
  { id: 'dm_goals_3', title: 'Score 3 goals', metric: 'goals', target: 3, rewardCoins: 260 },
  { id: 'dm_goals_5', title: 'Score 5 goals', metric: 'goals', target: 5, rewardCoins: 400 },
  { id: 'dm_win_1', title: 'Win 1 match', metric: 'wins', target: 1, rewardCoins: 240 },
  { id: 'dm_win_2', title: 'Win 2 matches', metric: 'wins', target: 2, rewardCoins: 420 },
  { id: 'dm_sprint_10', title: 'Use sprint 10 times', metric: 'sprints', target: 10, rewardCoins: 180 },
  { id: 'dm_pass_8', title: 'Complete 8 passes', metric: 'passes', target: 8, rewardCoins: 200 },
  { id: 'dm_tackle_4', title: 'Land 4 clean tackles', metric: 'tackles', target: 4, rewardCoins: 220 },
  { id: 'dm_shots_6', title: 'Take 6 shots on goal', metric: 'shots', target: 6, rewardCoins: 210 },
  { id: 'dm_play_2', title: 'Play 2 matches', metric: 'matches', target: 2, rewardCoins: 250 },
];

export interface MatchMissionDelta {
  goals: number;
  wins: number;
  sprints: number;
  passes: number;
  tackles: number;
  shots: number;
  matches: number;
}

export function generateDailyMissions(
  nowMs: number = Date.now(),
  rng: () => number = Math.random
): DailyMissionsState {
  // Shuffle pool via Fisher-Yates, then select 3 tasks with distinct metrics for variety
  const shuffled = [...DAILY_MISSION_POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  const picked: DailyMissionTask[] = [];
  const usedMetrics = new Set<DailyMissionMetric>();

  for (const tpl of shuffled) {
    if (picked.length >= 3) break;
    if (usedMetrics.has(tpl.metric)) continue;
    usedMetrics.add(tpl.metric);
    picked.push({
      id: tpl.id,
      title: tpl.title,
      metric: tpl.metric,
      target: tpl.target,
      progress: 0,
      rewardCoins: tpl.rewardCoins,
      claimed: false,
    });
  }

  return {
    assignedAt: new Date(nowMs).toISOString(),
    resetAt: new Date(nowMs + DAILY_RESET_MS).toISOString(),
    tasks: picked,
  };
}

export function isDailyMissionsExpired(state: DailyMissionsState | undefined, nowMs: number = Date.now()): boolean {
  if (!state || !Array.isArray(state.tasks) || state.tasks.length !== 3) return true;
  const resetMs = Date.parse(state.resetAt);
  if (!Number.isFinite(resetMs)) return true;
  return nowMs >= resetMs;
}

export function ensureFreshDailyMissions(
  progress: UserProgress,
  nowMs: number = Date.now(),
  rng: () => number = Math.random
): UserProgress {
  if (!isDailyMissionsExpired(progress.dailyMissions, nowMs)) {
    return progress;
  }
  return {
    ...progress,
    dailyMissions: generateDailyMissions(nowMs, rng),
  };
}

export function applyDailyMissionDelta(
  progress: UserProgress,
  delta: MatchMissionDelta,
  nowMs: number = Date.now(),
  rng: () => number = Math.random
): UserProgress {
  const fresh = ensureFreshDailyMissions(progress, nowMs, rng);
  const current = fresh.dailyMissions!;

  const metricMap: Record<DailyMissionMetric, number> = {
    goals: Math.max(0, Math.round(delta.goals)),
    wins: Math.max(0, Math.round(delta.wins)),
    sprints: Math.max(0, Math.round(delta.sprints)),
    passes: Math.max(0, Math.round(delta.passes)),
    tackles: Math.max(0, Math.round(delta.tackles)),
    shots: Math.max(0, Math.round(delta.shots)),
    matches: Math.max(0, Math.round(delta.matches)),
  };

  const nextTasks = current.tasks.map((task) => {
    const inc = metricMap[task.metric] ?? 0;
    if (inc <= 0 || task.claimed) return task;
    return {
      ...task,
      progress: Math.min(task.target, task.progress + inc),
    };
  });

  return {
    ...fresh,
    dailyMissions: {
      ...current,
      tasks: nextTasks,
    },
  };
}

export function claimDailyMissionReward(
  progress: UserProgress,
  taskId: string,
  nowMs: number = Date.now()
): { updated: UserProgress; coinsAwarded: number } | null {
  const fresh = ensureFreshDailyMissions(progress, nowMs);
  const current = fresh.dailyMissions!;
  const targetTask = current.tasks.find((t) => t.id === taskId);
  if (!targetTask || targetTask.claimed || targetTask.progress < targetTask.target) {
    return null;
  }

  const nextTasks = current.tasks.map((t) => (t.id === taskId ? { ...t, claimed: true } : t));
  return {
    coinsAwarded: targetTask.rewardCoins,
    updated: {
      ...fresh,
      coins: fresh.coins + targetTask.rewardCoins,
      xp: fresh.xp + 35,
      dailyMissions: {
        ...current,
        tasks: nextTasks,
      },
    },
  };
}

export function formatCountdownToReset(resetAtIso: string, nowMs: number = Date.now()): string {
  const resetMs = Date.parse(resetAtIso);
  if (!Number.isFinite(resetMs)) return '24h 00m';
  const remaining = Math.max(0, resetMs - nowMs);
  const totalMins = Math.floor(remaining / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hours}h ${mins < 10 ? '0' : ''}${mins}m`;
}
