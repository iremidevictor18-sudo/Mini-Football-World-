import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultProgress, OPPONENT_CLUBS } from './catalog';
import {
  applyDailyMissionDelta,
  claimDailyMissionReward,
  DAILY_RESET_MS,
  ensureFreshDailyMissions,
  formatCountdownToReset,
  generateDailyMissions,
} from './dailyMissions';
import {
  applyMatchOutcome,
  createSimulation,
  flushSimulationMissionDelta,
  stepSimulation,
} from './physics';

test('generateDailyMissions returns 3 distinct tasks and 24-hour reset window', () => {
  const now = Date.UTC(2026, 10, 16, 12, 0, 0);
  const state = generateDailyMissions(now);
  assert.equal(state.tasks.length, 3);

  const ids = new Set(state.tasks.map((t) => t.id));
  const metrics = new Set(state.tasks.map((t) => t.metric));
  assert.equal(ids.size, 3);
  assert.equal(metrics.size, 3);

  for (const task of state.tasks) {
    assert.equal(task.progress, 0);
    assert.equal(task.claimed, false);
    assert.ok(task.target > 0);
    assert.ok(task.rewardCoins > 0);
  }

  const resetDelta = Date.parse(state.resetAt) - Date.parse(state.assignedAt);
  assert.equal(resetDelta, DAILY_RESET_MS);
});

test('ensureFreshDailyMissions preserves missions within 24h and resets after 24h', () => {
  const t0 = Date.UTC(2026, 10, 16, 10, 0, 0);
  const base = createDefaultProgress();
  const seeded = {
    ...base,
    dailyMissions: generateDailyMissions(t0),
  };

  // At +23h 59m -> keep same tasks
  const beforeReset = ensureFreshDailyMissions(seeded, t0 + DAILY_RESET_MS - 60_000);
  assert.deepEqual(beforeReset.dailyMissions, seeded.dailyMissions);

  // At +24h -> reset tasks and assignedAt
  const afterReset = ensureFreshDailyMissions(seeded, t0 + DAILY_RESET_MS);
  assert.notEqual(afterReset.dailyMissions?.assignedAt, seeded.dailyMissions.assignedAt);
  assert.equal(afterReset.dailyMissions?.tasks.length, 3);
  assert.ok(afterReset.dailyMissions?.tasks.every((t) => t.progress === 0 && !t.claimed));
});

test('applyDailyMissionDelta increments progress, clamps to target, and claim awards bonus coins once', () => {
  const now = Date.UTC(2026, 10, 16, 10, 0, 0);
  const base = createDefaultProgress();
  const custom = {
    ...base,
    coins: 500,
    dailyMissions: {
      assignedAt: new Date(now).toISOString(),
      resetAt: new Date(now + DAILY_RESET_MS).toISOString(),
      tasks: [
        { id: 'dm_goals_3', title: 'Score 3 goals', metric: 'goals' as const, target: 3, progress: 0, rewardCoins: 260, claimed: false },
        { id: 'dm_win_1', title: 'Win 1 match', metric: 'wins' as const, target: 1, progress: 0, rewardCoins: 240, claimed: false },
        { id: 'dm_sprint_10', title: 'Use sprint 10 times', metric: 'sprints' as const, target: 10, progress: 0, rewardCoins: 180, claimed: false },
      ],
    },
  };

  const progressed = applyDailyMissionDelta(
    custom,
    { goals: 4, wins: 1, sprints: 10, passes: 0, tackles: 0, shots: 0, matches: 1 },
    now + 1000
  );

  assert.equal(progressed.dailyMissions!.tasks[0].progress, 3); // Clamped to target
  assert.equal(progressed.dailyMissions!.tasks[1].progress, 1);
  assert.equal(progressed.dailyMissions!.tasks[2].progress, 10);

  const claimed = claimDailyMissionReward(progressed, 'dm_goals_3', now + 2000);
  assert.ok(claimed);
  assert.equal(claimed.coinsAwarded, 260);
  assert.equal(claimed.updated.coins, 760);
  assert.equal(claimed.updated.dailyMissions!.tasks[0].claimed, true);

  // Double claim rejected
  const doubleClaim = claimDailyMissionReward(claimed.updated, 'dm_goals_3', now + 3000);
  assert.equal(doubleClaim, null);
});

test('simulation tracks sprint activations and flushes without double-counting into applyMatchOutcome', () => {
  const now = Date.now();
  const base = createDefaultProgress();
  const withSprintTask = {
    ...base,
    dailyMissions: {
      assignedAt: new Date(now).toISOString(),
      resetAt: new Date(now + DAILY_RESET_MS).toISOString(),
      tasks: [
        { id: 'dm_sprint_10', title: 'Use sprint 10 times', metric: 'sprints' as const, target: 10, progress: 0, rewardCoins: 180, claimed: false },
        { id: 'dm_win_1', title: 'Win 1 match', metric: 'wins' as const, target: 1, progress: 0, rewardCoins: 240, claimed: false },
        { id: 'dm_goals_3', title: 'Score 3 goals', metric: 'goals' as const, target: 3, progress: 0, rewardCoins: 260, claimed: false },
      ],
    },
  };

  const sim = createSimulation(withSprintTask, 'Quick Match', OPPONENT_CLUBS[0]);
  sim.activeHomeIndex = 5;

  // Pulse sprint on -> off -> on twice
  for (let burst = 0; burst < 2; burst++) {
    for (let i = 0; i < 6; i++) {
      stepSimulation(sim, 0.04, { moveX: 0, moveZ: 1, sprint: true, passJustPressed: false, shootOrTackleJustPressed: false });
    }
    for (let i = 0; i < 3; i++) {
      stepSimulation(sim, 0.04, { moveX: 0, moveZ: 0, sprint: false, passJustPressed: false, shootOrTackleJustPressed: false });
    }
  }
  assert.equal(sim.sprintActivations, 2);

  // Partial flush mid-match
  const midFlushed = flushSimulationMissionDelta(withSprintTask, sim, false);
  assert.equal(midFlushed.dailyMissions!.tasks[0].progress, 2);

  // Final full-time flush does not double count earlier 2 sprints
  sim.homeScore = 2;
  sim.awayScore = 0;
  const finalOutcome = applyMatchOutcome(midFlushed, sim);
  assert.equal(finalOutcome.updated.dailyMissions!.tasks[0].progress, 2);
  assert.equal(finalOutcome.updated.dailyMissions!.tasks[1].progress, 1);
  assert.equal(finalOutcome.updated.dailyMissions!.tasks[2].progress, 2);
});

test('formatCountdownToReset renders hours and minutes', () => {
  const now = Date.UTC(2026, 10, 16, 10, 0, 0);
  const reset = new Date(now + 5 * 3600_000 + 9 * 60_000).toISOString();
  assert.equal(formatCountdownToReset(reset, now), '5h 09m');
});
