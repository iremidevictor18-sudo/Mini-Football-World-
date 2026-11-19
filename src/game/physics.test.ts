import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultProgress,
  getCardEffectiveStats,
  getLeagueTierForTrophies,
  KIT_CATALOG,
  OPPONENT_CLUBS,
  PLAYER_CARDS,
} from './catalog';
import {
  applyMatchOutcome,
  createSimulation,
  PITCH_HALF_L,
  stepSimulation,
  upgradePlayerCard,
} from './physics';

test('catalog includes over 100 kits and parody star cards', () => {
  assert.ok(KIT_CATALOG.length >= 100, `Expected >= 100 kits, got ${KIT_CATALOG.length}`);
  assert.ok(PLAYER_CARDS.some((c) => c.nickname === 'Black Belt' && c.rarity === 'Mythical'));
  assert.ok(PLAYER_CARDS.some((c) => c.nickname === 'Samba King' && c.rarity === 'Legendary'));
});

test('league tier scales accurately with trophies', () => {
  assert.equal(getLeagueTierForTrophies(0), 'Rookie');
  assert.equal(getLeagueTierForTrophies(300), 'Silver');
  assert.equal(getLeagueTierForTrophies(2600), 'Football Legend');
});

test('upgradePlayerCard deducts coins and increases card stats', () => {
  const progress = createDefaultProgress();
  const initialLevel = progress.cardLevels.card_fwd_spark ?? 1;
  const initialCoins = progress.coins;
  const upgraded = upgradePlayerCard(progress, 'card_fwd_spark');
  assert.ok(upgraded);
  assert.equal(upgraded.cardLevels.card_fwd_spark, initialLevel + 1);
  assert.ok(upgraded.coins < initialCoins);
  const card = PLAYER_CARDS.find((c) => c.id === 'card_fwd_spark')!;
  assert.ok(getCardEffectiveStats(card, initialLevel + 1).shooting > getCardEffectiveStats(card, initialLevel).shooting);
});

test('simulation moves active player, drains stamina on sprint, and triggers rarity flair shot', () => {
  const progress = createDefaultProgress();
  const sim = createSimulation(progress, 'Quick Match', OPPONENT_CLUBS[0]);
  const active = sim.players[sim.activeHomeIndex];
  const startZ = active.z;

  // Give ball to active player (e.g. Black Belt slot 5) with clear pitch ahead
  sim.activeHomeIndex = 5;
  const striker = sim.players[5];
  sim.ball.ownerId = striker.id;
  for (const p of sim.players) {
    if (p.team === 'away') p.z = 22;
  }

  // Sprint forward
  for (let i = 0; i < 10; i++) {
    stepSimulation(sim, 0.04, {
      moveX: 0,
      moveZ: 1,
      sprint: true,
      passJustPressed: false,
      shootOrTackleJustPressed: false,
    });
  }
  assert.ok(striker.z > startZ - 3);
  assert.ok(striker.stamina < 100, 'Stamina should deplete when sprinting');

  // Shoot with Mythical striker -> triggers rarity flair
  stepSimulation(sim, 0.03, {
    moveX: 0,
    moveZ: 1,
    sprint: false,
    passJustPressed: false,
    shootOrTackleJustPressed: true,
  });
  assert.equal(sim.ball.ownerId, null);
  assert.equal(sim.ball.flairActive, true);
  assert.ok(sim.ball.vz > 15);
  assert.equal(sim.shots, 1);
});

test('goal detection increments home score and awards coins & trophies', () => {
  const progress = createDefaultProgress();
  const sim = createSimulation(progress, 'League Cup', OPPONENT_CLUBS[0]);
  sim.ball.ownerId = null;
  sim.ball.x = 0;
  sim.ball.y = 0.6;
  sim.ball.z = PITCH_HALF_L - 0.1;
  sim.ball.vx = 0;
  sim.ball.vy = 0;
  sim.ball.vz = 25;

  stepSimulation(sim, 0.03, {
    moveX: 0,
    moveZ: 0,
    sprint: false,
    passJustPressed: false,
    shootOrTackleJustPressed: false,
  });

  assert.equal(sim.homeScore, 1);
  assert.equal(sim.goalScoredByTeam, 'home');

  const outcome = applyMatchOutcome(progress, sim);
  assert.equal(outcome.updated.wins, progress.wins + 1);
  assert.ok(outcome.coinsEarned > 0);
  assert.ok(outcome.trophiesDelta > 0);
});

test('createSimulation applies Team Chemistry boosts to home speed/dribbling and scales away AI with stadium difficulty', () => {
  const highChemProgress = {
    ...createDefaultProgress(),
    formation: '4-3-3' as const,
    activeLineup: [
      'card_gk_wall', // PT, Apex United
      'card_def_stone', // GB, Apex United
      'card_def_flash', // NG, Apex United
      'card_def_abdul', // PT, Apex United
      'card_def_eze', // NG, Paris Etoile
      'card_mid_handlebars', // GB, Apex United
      'card_mid_tempo', // PT, Royal Madrid
      'card_mid_sergio', // ES, Royal Madrid
      'card_fwd_spark', // GB, Apex United
      'card_fwd_turbo', // FR, Paris Etoile
      'card_fwd_blackbelt', // DE, Nordic Wolves
    ],
  };

  // Diverse lineup across 9 clubs & distinct nations (only 1-2 links max)
  const noChemProgress = {
    ...highChemProgress,
    activeLineup: [
      'card_gk_cat', // BR, Samba City
      'card_def_iron', // DE, Nordic Wolves
      'card_def_stone', // GB, London Blues
      'card_def_abdul', // PT, Lisbon Lions
      'card_def_wolfgang', // NL, Bavaria Stars
      'card_mid_engine', // FR, Paris Etoile
      'card_mid_sergio', // ES, Royal Madrid
      'card_fwd_francesco', // IT, Milan Rossoneri
      'card_fwd_spark', // GB, Apex United (slot 8 matches simHigh!)
      'card_fwd_turbo', // FR, Paris Etoile
      'card_fwd_blackbelt', // SE, Milan Rossoneri
    ],
  };

  const simHigh = createSimulation(highChemProgress, 'Quick Match', OPPONENT_CLUBS[0], 1);
  const simLow = createSimulation(noChemProgress, 'Quick Match', OPPONENT_CLUBS[0], 1);

  assert.ok(simHigh.chemistry.speedBoost > simLow.chemistry.speedBoost);
  assert.ok(simHigh.chemistry.dribblingBoost > simLow.chemistry.dribblingBoost);

  const highSpark = simHigh.players.find((p) => p.team === 'home' && p.card.id === 'card_fwd_spark')!;
  const lowSpark = simLow.players.find((p) => p.team === 'home' && p.card.id === 'card_fwd_spark')!;
  assert.ok(highSpark.paceStat > lowSpark.paceStat);
  assert.ok(highSpark.dribbleStat > lowSpark.dribbleStat);

  // Stadium difficulty raises opponent stats
  const simHard = createSimulation(highChemProgress, 'Quick Match', OPPONENT_CLUBS[0], 3);
  const awayBase = simHigh.players.find((p) => p.team === 'away')!;
  const awayHard = simHard.players.find((p) => p.team === 'away')!;
  assert.ok(awayHard.paceStat > awayBase.paceStat);
});

