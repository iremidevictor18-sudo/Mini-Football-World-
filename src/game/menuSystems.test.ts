import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultProgress, STADIUM_CATALOG } from './catalog';
import {
  awardVictoryPack,
  buyShopPack,
  claimFreePrize,
  claimGoalsPrize,
  computeSquadAnalysis,
  computeTeamChemistry,
  enterStadiumMatch,
  getMainMenuBadges,
  getPlayerLevelInfo,
  GOALS_PRIZE_TARGET,
  normalizeUserProgress,
  openVictoryPackSlot,
  PACK_UNLOCK_MS,
  refreshVictoryPacks,
  startUnlockVictoryPack,
} from './menuSystems';

test('getPlayerLevelInfo computes shield level and progress cleanly', () => {
  const lvl1 = getPlayerLevelInfo(1);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.currentXp, 1);
  assert.equal(lvl1.nextLevelXp, 60);

  const lvl2 = getPlayerLevelInfo(65);
  assert.equal(lvl2.level, 2);
  assert.equal(lvl2.currentXp, 5);
});

test('victory pack countdown transitions from locked to unlocking to ready and opens rewards', () => {
  const p = createDefaultProgress();
  const startMs = Date.UTC(2026, 10, 16, 10, 0, 0);
  const unlocking = startUnlockVictoryPack(p, 0, startMs);
  assert.ok(unlocking);
  assert.equal(unlocking.victoryPacks[0].status, 'unlocking');

  // Cannot start a second concurrent pack timer
  assert.equal(startUnlockVictoryPack(unlocking, 1, startMs + 1000), null);

  // Before timer ends stays unlocking
  const mid = refreshVictoryPacks(unlocking.victoryPacks, startMs + PACK_UNLOCK_MS.Bronze - 1000);
  assert.equal(mid[0].status, 'unlocking');

  // At timer end becomes ready
  const ready = refreshVictoryPacks(unlocking.victoryPacks, startMs + PACK_UNLOCK_MS.Bronze);
  assert.equal(ready[0].status, 'ready');

  const opened = openVictoryPackSlot({ ...unlocking, victoryPacks: ready }, 0, () => 0.2, startMs + PACK_UNLOCK_MS.Bronze);
  assert.ok(opened);
  assert.ok(opened.coinsAwarded > 0);
  assert.ok(opened.gemsAwarded > 0);
  assert.equal(opened.updated.victoryPacks[0].status, 'empty');

  // Awarding a pack fills the empty slot
  const awarded = awardVictoryPack(opened.updated.victoryPacks, 'Gold');
  assert.equal(awarded[0].status, 'locked');
  assert.equal(awarded[0].tier, 'Gold');
});

test('claimFreePrize respects 4h cooldown and claimGoalsPrize awards Gold pack at 20 goals', () => {
  const p = createDefaultProgress();
  const now = Date.UTC(2026, 10, 16, 12, 0, 0);
  const first = claimFreePrize(p, now);
  assert.ok(first);
  assert.equal(first.updated.coins, p.coins + first.coins);
  // Immediate second claim is blocked
  assert.equal(claimFreePrize(first.updated, now + 60_000), null);

  // Goals prize requires 20 goals
  assert.equal(claimGoalsPrize(p), null);
  const readyGoals = { ...p, goalsPrizeProgress: GOALS_PRIZE_TARGET + 3 };
  const claimed = claimGoalsPrize(readyGoals, () => 0.5);
  assert.ok(claimed);
  assert.equal(claimed.updated.goalsPrizeProgress, 3);
  assert.ok(claimed.updated.coins > readyGoals.coins);
});

test('enterStadiumMatch enforces level gate and entry fee deduction', () => {
  const p = { ...createDefaultProgress(), xp: 0, coins: 50 }; // Level 1
  const freePark = STADIUM_CATALOG[0];
  const metro = STADIUM_CATALOG[1];

  const deniedLevel = enterStadiumMatch(p, metro);
  assert.equal(deniedLevel.ok, false);

  const okPark = enterStadiumMatch(p, freePark);
  assert.equal(okPark.ok, true);

  const lvl2Rich = { ...p, xp: 65, coins: 200 };
  const okMetro = enterStadiumMatch(lvl2Rich, metro);
  assert.equal(okMetro.ok, true);
  if (okMetro.ok) {
    assert.equal(okMetro.updated.coins, 80);
  }
});

test('buyShopPack deducts currency and getMainMenuBadges counts ready items', () => {
  const p = createDefaultProgress();
  const bought = buyShopPack(p, 'Silver', 'gems', 25, () => 0.1);
  assert.ok(bought);
  assert.equal(bought.updated.gems, p.gems - 25 + bought.gemsAwarded);

  const badges = getMainMenuBadges(p);
  assert.equal(badges.readyPacks, 1);
  assert.ok(badges.teamUpgradable > 0);
});

test('computeSquadAnalysis aggregates Speed, Shooting, Defense, and Dribbling for starting eleven', () => {
  const base = createDefaultProgress();
  const analysis = computeSquadAnalysis(base);

  assert.equal(analysis.axes.length, 4);
  assert.deepEqual(
    analysis.axes.map((a) => a.stat),
    ['Speed', 'Shooting', 'Defense', 'Dribbling']
  );
  analysis.axes.forEach((a) => {
    assert.ok(a.squad >= 40 && a.squad <= 99);
    assert.equal(a.fullMark, 99);
  });
  assert.equal(analysis.starters.length, 11);
  assert.ok(analysis.chemistry.speedBoost > 0);
  assert.ok(analysis.chemistry.dribblingBoost > 0);

  // Upgrading starters strictly raises aggregate OVR, Speed, Shooting, Defense, and Dribbling
  const boosted = {
    ...base,
    cardLevels: {
      ...base.cardLevels,
      card_def_flash: 5,
      card_mid_tempo: 5,
      card_fwd_spark: 5,
      card_fwd_blackbelt: 6,
    },
  };
  const boostedAnalysis = computeSquadAnalysis(boosted);
  assert.ok(boostedAnalysis.overallRating > analysis.overallRating);
  assert.ok(boostedAnalysis.axes[0].squad > analysis.axes[0].squad); // Speed
  assert.ok(boostedAnalysis.axes[1].squad > analysis.axes[1].squad); // Shooting
  assert.ok(boostedAnalysis.axes[2].squad > analysis.axes[2].squad); // Defense
  assert.ok(boostedAnalysis.axes[3].squad > analysis.axes[3].squad); // Dribbling
});

test('computeTeamChemistry calculates nation & club passive speed/dribbling boosts and caps at 15', () => {
  const highChem = computeTeamChemistry({
    activeLineup: [
      'card_gk_wall', // PT, Apex United
      'card_def_stone', // GB, Apex United
      'card_def_flash', // NG, Apex United
      'card_def_abdul', // PT, Apex United
      'card_mid_handlebars', // GB, Apex United
      'card_fwd_spark', // GB, Apex United
      'card_mid_tempo', // PT, Royal Madrid
      'card_mid_sergio', // ES, Royal Madrid
      'card_mid_maestro', // ES, Royal Madrid
      'card_fwd_francesco', // IT, Royal Madrid
      'card_def_iron', // DE, Nordic Wolves
    ],
  });
  assert.ok(highChem.nationLinks.length >= 3);
  assert.ok(highChem.clubLinks.some((c) => c.key === 'Apex United' && c.count === 4));
  assert.ok(highChem.clubLinks.some((c) => c.key === 'Royal Madrid' && c.count === 3));
  assert.equal(highChem.speedBoost, 15);
  assert.equal(highChem.dribblingBoost, 15);
  assert.ok(highChem.chemistryScore >= 90);
});

test('normalizeUserProgress upgrades legacy 6-player lineup saves to 11 unique starters', () => {
  const legacy = {
    ...createDefaultProgress(),
    activeLineup: [
      'card_gk_wall',
      'card_def_stone',
      'card_def_flash',
      'card_mid_tempo',
      'card_fwd_spark',
      'card_fwd_turbo',
    ],
  };
  const normalized = normalizeUserProgress(legacy);
  assert.equal(normalized.activeLineup.length, 11);
  assert.equal(new Set(normalized.activeLineup).size, 11);
  assert.equal(normalized.activeLineup[0], 'card_gk_wall');
});


