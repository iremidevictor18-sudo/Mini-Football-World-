import {
  FORMATION_CONFIGS,
  FORMATION_SLOTS,
  getCardEffectiveStats,
  getLeagueTierForTrophies,
  getUpgradeCostCoins,
  PLAYER_CARDS,
} from './catalog';
import { applyDailyMissionDelta } from './dailyMissions';
import { awardVictoryPack, computeTeamChemistry } from './menuSystems';
import type {
  CelebrationId,
  FormationId,
  MatchHudSnapshot,
  MatchMode,
  PlayerCard,
  RarityTier,
  TacticMode,
  TeamChemistryResult,
  UserProgress,
} from './types';

export const PITCH_HALF_W = 22;
export const PITCH_HALF_L = 34;
export const GOAL_HALF_W = 3.6;
export const GOAL_HEIGHT = 2.6;
export const GOAL_DEPTH = 2.1;
export const BALL_RADIUS = 0.42;
export const PLAYER_RADIUS = 0.72;
export const MATCH_DURATION_SEC = 90;

export interface SimPlayer {
  id: string;
  card: PlayerCard;
  team: 'home' | 'away';
  slotIndex: number;
  role: 'GK' | 'DEF' | 'MID' | 'FWD';
  x: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  anchorX: number;
  anchorZ: number;
  stamina: number;
  isSprinting: boolean;
  tackleTimer: number;
  tackleCooldown: number;
  kickAnimTimer: number;
  diveDir: number; // -1, 0, 1 for GK dive
  diveTimer: number;
  gaitPhase: number;
  hitFlashTimer: number;
  paceStat: number;
  shootStat: number;
  passStat: number;
  tackleStat: number;
  dribbleStat: number;
}

export interface SimBall {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinZ: number;
  ownerId: string | null;
  lastTouchTeam: 'home' | 'away' | null;
  pickupLockTimer: number;
  flairActive: boolean;
  flairColor: string;
}

export interface SimEvent {
  type: 'kick' | 'power_shot' | 'pass' | 'tackle' | 'save' | 'goal' | 'post' | 'whistle' | 'pickup';
  x: number;
  y: number;
  z: number;
  color?: string;
  heavy?: boolean;
  team?: 'home' | 'away';
  scorerName?: string;
}

export interface InputState {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  passJustPressed: boolean;
  shootOrTackleJustPressed: boolean;
}

export interface MatchSimulation {
  mode: MatchMode;
  opponentName: string;
  opponentPrimary: string;
  opponentSecondary: string;
  difficulty: number;
  formation: FormationId;
  tactic: TacticMode;
  celebrationId: CelebrationId;
  chemistry: TeamChemistryResult;
  players: SimPlayer[];
  ball: SimBall;
  activeHomeIndex: number;
  homeScore: number;
  awayScore: number;
  timeRemaining: number;
  goalFreezeTimer: number;
  goalScoredByTeam: 'home' | 'away' | null;
  goalBannerText: string;
  lastEventText: string;
  hitstopTimer: number;
  cameraTrauma: number;
  shots: number;
  shotsOnTarget: number;
  tackles: number;
  passesCompleted: number;
  sprintActivations: number;
  syncedMissions: {
    goals: number;
    sprints: number;
    passes: number;
    tackles: number;
    shots: number;
  };
  homePossessionTime: number;
  awayPossessionTime: number;
  matchEnded: boolean;
  pendingEvents: SimEvent[];
}

export function createSimulation(
  progress: UserProgress,
  mode: MatchMode,
  opponent: { name: string; primary: string; secondary: string; difficulty: number },
  stadiumDifficulty = 1
): MatchSimulation {
  const slots = FORMATION_SLOTS[progress.formation] ?? FORMATION_SLOTS['4-4-2'];
  const simIndices = FORMATION_CONFIGS[progress.formation]?.simIndices ?? [0, 1, 2, 3, 4, 5];
  const chemistry = computeTeamChemistry(progress);
  const players: SimPlayer[] = [];

  for (let i = 0; i < 6; i++) {
    const lineupIdx = progress.activeLineup.length >= 11 ? simIndices[i] : i;
    const cardId = progress.activeLineup[lineupIdx] ?? progress.activeLineup[i] ?? PLAYER_CARDS[i].id;
    const card = PLAYER_CARDS.find((c) => c.id === cardId) ?? PLAYER_CARDS[i];
    const lvl = progress.cardLevels[card.id] ?? 1;
    const stats = getCardEffectiveStats(card, lvl);
    const slot = slots[i];
    const boostedPace = Math.min(110, stats.pace + chemistry.speedBoost);
    const baseDribble = Math.round(stats.pace * 0.45 + stats.passing * 0.55);
    const boostedDribble = Math.min(110, baseDribble + chemistry.dribblingBoost);
    players.push({
      id: `home_${i}`,
      card,
      team: 'home',
      slotIndex: i,
      role: slot.role,
      x: slot.x,
      z: slot.z * 0.72 - 2,
      vx: 0,
      vz: 0,
      facing: 0,
      anchorX: slot.x,
      anchorZ: slot.z,
      stamina: 100,
      isSprinting: false,
      tackleTimer: 0,
      tackleCooldown: 0,
      kickAnimTimer: 0,
      diveDir: 0,
      diveTimer: 0,
      gaitPhase: 0,
      hitFlashTimer: 0,
      paceStat: boostedPace,
      shootStat: stats.shooting,
      passStat: Math.min(110, stats.passing + chemistry.dribblingBoost),
      tackleStat: stats.tackling,
      dribbleStat: boostedDribble,
    });
  }

  // Away team mirrors formation with distinct opponent cards
  const awayCards = [
    PLAYER_CARDS[0],
    PLAYER_CARDS[2],
    PLAYER_CARDS[4],
    PLAYER_CARDS[8],
    PLAYER_CARDS[14],
    PLAYER_CARDS[16],
  ];
  const combinedScale = Number(((opponent.difficulty + stadiumDifficulty) / 2).toFixed(3));
  for (let i = 0; i < 6; i++) {
    const card = awayCards[i];
    const slot = slots[i];
    const baseDribble = Math.round(card.baseStats.pace * 0.45 + card.baseStats.passing * 0.55);
    players.push({
      id: `away_${i}`,
      card,
      team: 'away',
      slotIndex: i,
      role: slot.role,
      x: -slot.x,
      z: -slot.z * 0.72 + 2,
      vx: 0,
      vz: 0,
      facing: Math.PI,
      anchorX: -slot.x,
      anchorZ: -slot.z,
      stamina: 100,
      isSprinting: false,
      tackleTimer: 0,
      tackleCooldown: 0,
      kickAnimTimer: 0,
      diveDir: 0,
      diveTimer: 0,
      gaitPhase: 0,
      hitFlashTimer: 0,
      paceStat: Math.round(card.baseStats.pace * combinedScale),
      shootStat: Math.round(card.baseStats.shooting * combinedScale),
      passStat: Math.round(card.baseStats.passing * combinedScale),
      tackleStat: Math.round(card.baseStats.tackling * combinedScale),
      dribbleStat: Math.round(baseDribble * combinedScale),
    });
  }

  return {
    mode,
    opponentName: opponent.name,
    opponentPrimary: opponent.primary,
    opponentSecondary: opponent.secondary,
    difficulty: combinedScale,
    formation: progress.formation,
    tactic: 'Balanced',
    celebrationId: progress.celebrationId,
    chemistry,
    players,
    ball: {
      x: 0,
      y: BALL_RADIUS,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spinX: 0,
      spinZ: 0,
      ownerId: null,
      lastTouchTeam: null,
      pickupLockTimer: 0,
      flairActive: false,
      flairColor: '#F59E0B',
    },
    activeHomeIndex: 4, // Start controlling primary striker near kickoff
    homeScore: 0,
    awayScore: 0,
    timeRemaining: mode === 'Practice Drill' ? 120 : MATCH_DURATION_SEC,
    goalFreezeTimer: 0,
    goalScoredByTeam: null,
    goalBannerText: '',
    lastEventText: 'Kickoff! Move with WASD or Joystick.',
    hitstopTimer: 0,
    cameraTrauma: 0,
    shots: 0,
    shotsOnTarget: 0,
    tackles: 0,
    passesCompleted: 0,
    sprintActivations: 0,
    syncedMissions: { goals: 0, sprints: 0, passes: 0, tackles: 0, shots: 0 },
    homePossessionTime: 1,
    awayPossessionTime: 1,
    matchEnded: false,
    pendingEvents: [{ type: 'whistle', x: 0, y: 1, z: 0 }],
  };
}

export function resetPositionsForKickoff(sim: MatchSimulation): void {
  const slots = FORMATION_SLOTS[sim.formation];
  for (const p of sim.players) {
    const slot = slots[p.slotIndex];
    const dir = p.team === 'home' ? 1 : -1;
    p.x = slot.x * dir;
    p.z = slot.z * dir * 0.72 - 2 * dir;
    p.vx = 0;
    p.vz = 0;
    p.facing = p.team === 'home' ? 0 : Math.PI;
    p.tackleTimer = 0;
    p.diveTimer = 0;
    p.diveDir = 0;
  }
  sim.ball.x = 0;
  sim.ball.y = BALL_RADIUS;
  sim.ball.z = 0;
  sim.ball.vx = 0;
  sim.ball.vy = 0;
  sim.ball.vz = 0;
  sim.ball.ownerId = null;
  sim.ball.pickupLockTimer = 0.25;
  sim.ball.flairActive = false;
  sim.activeHomeIndex = 4;
}

export function getTacticZShift(tactic: TacticMode, role: 'GK' | 'DEF' | 'MID' | 'FWD'): number {
  if (role === 'GK') return 0;
  if (tactic === 'High Press') return role === 'DEF' ? 6 : 8;
  if (tactic === 'Park Bus') return role === 'FWD' ? -7 : -6;
  return 0;
}

export function selectBestPassTarget(
  passer: SimPlayer,
  teammates: SimPlayer[],
  aimX: number,
  aimZ: number
): SimPlayer | null {
  let best: SimPlayer | null = null;
  let bestScore = -Infinity;
  const hasAim = Math.hypot(aimX, aimZ) > 0.15;
  const dirX = hasAim ? aimX / Math.hypot(aimX, aimZ) : Math.sin(passer.facing);
  const dirZ = hasAim ? aimZ / Math.hypot(aimX, aimZ) : Math.cos(passer.facing);

  for (const mate of teammates) {
    if (mate.id === passer.id) continue;
    const dx = mate.x - passer.x;
    const dz = mate.z - passer.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.2 || dist > 45) continue;
    const dot = (dx / dist) * dirX + (dz / dist) * dirZ;
    const forwardBonus = passer.team === 'home' ? dz * 0.04 : -dz * 0.04;
    const score = dot * 3.0 - dist * 0.05 + forwardBonus + (mate.role === 'GK' ? -1.2 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = mate;
    }
  }
  return best;
}

export function stepSimulation(sim: MatchSimulation, rawDt: number, input: InputState): void {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  if (dt <= 0 || sim.matchEnded) return;

  // Camera trauma & hitstop tick in real dt
  sim.cameraTrauma = Math.max(0, sim.cameraTrauma - dt * 1.9);
  if (sim.hitstopTimer > 0) {
    sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
    return;
  }

  // Goal celebration pause
  if (sim.goalFreezeTimer > 0) {
    sim.goalFreezeTimer -= dt;
    // Let ball settle in net
    sim.ball.x += sim.ball.vx * dt;
    sim.ball.y = Math.max(BALL_RADIUS, sim.ball.y + sim.ball.vy * dt);
    sim.ball.z += sim.ball.vz * dt;
    sim.ball.vx *= 0.92;
    sim.ball.vz *= 0.92;
    sim.ball.vy -= 22 * dt;
    if (sim.goalFreezeTimer <= 0) {
      sim.goalScoredByTeam = null;
      sim.goalBannerText = '';
      resetPositionsForKickoff(sim);
      sim.pendingEvents.push({ type: 'whistle', x: 0, y: 1, z: 0 });
    }
    return;
  }

  // Advance match timer
  sim.timeRemaining = Math.max(0, sim.timeRemaining - dt);
  if (sim.timeRemaining <= 0) {
    sim.matchEnded = true;
    sim.pendingEvents.push({ type: 'whistle', x: 0, y: 1, z: 0, heavy: true });
    return;
  }

  // Auto-switch active controlled home player when defending if another outfielder is much closer to the ball
  const currentActive = sim.players[sim.activeHomeIndex];
  const ballOwner = sim.ball.ownerId ? sim.players.find((p) => p.id === sim.ball.ownerId) ?? null : null;
  if (ballOwner && ballOwner.team === 'home') {
    sim.activeHomeIndex = ballOwner.slotIndex;
  } else if (!ballOwner || ballOwner.team === 'away') {
    let bestIdx = sim.activeHomeIndex;
    let bestDist = Math.hypot(currentActive.x - sim.ball.x, currentActive.z - sim.ball.z);
    for (let i = 1; i < 6; i++) {
      const cand = sim.players[i];
      const d = Math.hypot(cand.x - sim.ball.x, cand.z - sim.ball.z);
      if (d + 2.2 < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    sim.activeHomeIndex = bestIdx;
  }

  const activePlayer = sim.players[sim.activeHomeIndex];

  // Track possession
  if (ballOwner) {
    if (ballOwner.team === 'home') sim.homePossessionTime += dt;
    else sim.awayPossessionTime += dt;
  }

  // Tick ball pickup lock
  if (sim.ball.pickupLockTimer > 0) {
    sim.ball.pickupLockTimer = Math.max(0, sim.ball.pickupLockTimer - dt);
  }

  // === Update all players ===
  const homeTeam = sim.players.filter((p) => p.team === 'home');
  const awayTeam = sim.players.filter((p) => p.team === 'away');

  for (const p of sim.players) {
    p.tackleCooldown = Math.max(0, p.tackleCooldown - dt);
    p.kickAnimTimer = Math.max(0, p.kickAnimTimer - dt);
    p.diveTimer = Math.max(0, p.diveTimer - dt);
    p.hitFlashTimer = Math.max(0, p.hitFlashTimer - dt);

    if (p.tackleTimer > 0) {
      p.tackleTimer = Math.max(0, p.tackleTimer - dt);
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.vx *= Math.pow(0.08, dt);
      p.vz *= Math.pow(0.08, dt);
      // Check slide tackle steal
      if (ballOwner && ballOwner.team !== p.team) {
        const d = Math.hypot(p.x - sim.ball.x, p.z - sim.ball.z);
        if (d < 1.55) {
          sim.ball.ownerId = p.id;
          sim.ball.lastTouchTeam = p.team;
          sim.ball.pickupLockTimer = 0.25;
          sim.hitstopTimer = 0.04;
          sim.cameraTrauma = Math.min(1, sim.cameraTrauma + 0.35);
          ballOwner.hitFlashTimer = 0.08;
          if (p.team === 'home') {
            sim.tackles += 1;
            sim.lastEventText = `${p.card.nickname} wins the ball!`;
          }
          sim.pendingEvents.push({ type: 'tackle', x: p.x, y: 0.2, z: p.z, heavy: true });
        }
      }
      clampPlayerToPitch(p);
      continue;
    }

    const baseMaxSpeed = 7.4 + (p.paceStat / 100) * 3.8;
    let desiredVx = 0;
    let desiredVz = 0;
    let wantsSprint = false;

    if (p === activePlayer) {
      const mag = Math.hypot(input.moveX, input.moveZ);
      if (mag > 0.05) {
        const nx = input.moveX / Math.max(1, mag);
        const nz = input.moveZ / Math.max(1, mag);
        wantsSprint = input.sprint && p.stamina > 4;
        const speed = baseMaxSpeed * (wantsSprint ? 1.38 : 1.0);
        desiredVx = nx * speed;
        desiredVz = nz * speed;
      }

      // Action buttons for active player
      if (ballOwner === p) {
        if (input.passJustPressed) {
          const target = selectBestPassTarget(p, homeTeam, input.moveX, input.moveZ);
          if (target) {
            const dx = target.x + target.vx * 0.22 - sim.ball.x;
            const dz = target.z + target.vz * 0.22 - sim.ball.z;
            const d = Math.max(0.1, Math.hypot(dx, dz));
            const passSpeed = Math.min(26, Math.max(14, d * 1.35 + (p.passStat / 100) * 5));
            sim.ball.ownerId = null;
            sim.ball.pickupLockTimer = 0.22;
            sim.ball.vx = (dx / d) * passSpeed;
            sim.ball.vz = (dz / d) * passSpeed;
            sim.ball.vy = Math.min(4.5, d * 0.12);
            sim.ball.flairActive = false;
            p.kickAnimTimer = 0.25;
            p.facing = Math.atan2(dx, dz);
            sim.passesCompleted += 1;
            sim.lastEventText = `${p.card.nickname} passes to ${target.card.nickname}`;
            sim.pendingEvents.push({ type: 'pass', x: sim.ball.x, y: 0.4, z: sim.ball.z });
          }
        } else if (input.shootOrTackleJustPressed) {
          // Shoot toward opponent goal (+Z = PITCH_HALF_L)
          const goalTargetX = THREE_LIKE_CLAMP(input.moveX * 2.8, -GOAL_HALF_W + 0.5, GOAL_HALF_W - 0.5);
          const dx = goalTargetX - sim.ball.x;
          const dz = PITCH_HALF_L + 0.5 - sim.ball.z;
          const d = Math.max(0.1, Math.hypot(dx, dz));
          const shotPower = 23 + (p.shootStat / 100) * 11;
          const isFlair = p.card.rarity === 'Epic' || p.card.rarity === 'Legendary' || p.card.rarity === 'Mythical';
          sim.ball.ownerId = null;
          sim.ball.pickupLockTimer = 0.25;
          sim.ball.vx = (dx / d) * shotPower;
          sim.ball.vz = (dz / d) * shotPower;
          sim.ball.vy = 3.2 + (p.shootStat / 100) * 2.6;
          sim.ball.flairActive = isFlair;
          sim.ball.flairColor = p.card.flairColor;
          p.kickAnimTimer = 0.32;
          p.facing = Math.atan2(dx, dz);
          sim.shots += 1;
          if (Math.abs(goalTargetX) < GOAL_HALF_W) sim.shotsOnTarget += 1;
          sim.hitstopTimer = isFlair ? 0.045 : 0.025;
          sim.cameraTrauma = Math.min(1, sim.cameraTrauma + (isFlair ? 0.45 : 0.25));
          sim.lastEventText = isFlair ? `${p.card.nickname} unleashes a ${p.card.rarity} strike!` : `${p.card.nickname} shoots!`;
          sim.pendingEvents.push({
            type: isFlair ? 'power_shot' : 'kick',
            x: sim.ball.x,
            y: 0.5,
            z: sim.ball.z,
            color: p.card.flairColor,
            heavy: isFlair,
          });
        }
      } else if (input.shootOrTackleJustPressed && p.tackleCooldown <= 0) {
        // Slide tackle lunge!
        const lungeX = Math.hypot(input.moveX, input.moveZ) > 0.1 ? input.moveX : Math.sin(p.facing);
        const lungeZ = Math.hypot(input.moveX, input.moveZ) > 0.1 ? input.moveZ : Math.cos(p.facing);
        const mag = Math.max(0.01, Math.hypot(lungeX, lungeZ));
        p.vx = (lungeX / mag) * 16.5;
        p.vz = (lungeZ / mag) * 16.5;
        p.facing = Math.atan2(p.vx, p.vz);
        p.tackleTimer = 0.32;
        p.tackleCooldown = 0.85;
        sim.pendingEvents.push({ type: 'tackle', x: p.x, y: 0.15, z: p.z });
      }
    } else {
      // === AI Player Policies ===
      const dir = p.team === 'home' ? 1 : -1;
      if (p.role === 'GK') {
        const goalZ = -dir * (PITCH_HALF_L - 1.6);
        const targetX = THREE_LIKE_CLAMP(sim.ball.x * 0.48, -GOAL_HALF_W + 0.6, GOAL_HALF_W - 0.6);
        const dx = targetX - p.x;
        const dz = goalZ - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.2) {
          const sp = baseMaxSpeed * 0.92;
          desiredVx = (dx / dist) * sp;
          desiredVz = (dz / dist) * sp;
        }
        // GK dive if fast incoming shot
        const incomingToThisGoal = (p.team === 'home' && sim.ball.vz < -10 && sim.ball.z < -16) ||
          (p.team === 'away' && sim.ball.vz > 10 && sim.ball.z > 16);
        if (incomingToThisGoal && !ballOwner && p.diveTimer <= 0 && Math.abs(sim.ball.x - p.x) > 0.9) {
          p.diveDir = sim.ball.x > p.x ? 1 : -1;
          p.diveTimer = 0.45;
          p.vx = p.diveDir * 9.5;
        }
        // GK immediate clearance if holding ball
        if (ballOwner === p) {
          const mates = p.team === 'home' ? homeTeam : awayTeam;
          const target = selectBestPassTarget(p, mates, 0, dir);
          if (target) {
            const pdx = target.x - sim.ball.x;
            const pdz = target.z - sim.ball.z;
            const pd = Math.max(0.1, Math.hypot(pdx, pdz));
            sim.ball.ownerId = null;
            sim.ball.pickupLockTimer = 0.25;
            sim.ball.vx = (pdx / pd) * 19;
            sim.ball.vz = (pdz / pd) * 19;
            sim.ball.vy = 3.6;
            p.kickAnimTimer = 0.25;
            sim.pendingEvents.push({ type: 'pass', x: sim.ball.x, y: 0.4, z: sim.ball.z });
          }
        }
      } else if (ballOwner === p) {
        // AI with ball: dribble toward opponent goal, pass or shoot!
        const targetGoalZ = dir * PITCH_HALF_L;
        const dx = -p.x * 0.35;
        const dz = targetGoalZ - p.z;
        const d = Math.max(0.1, Math.hypot(dx, dz));
        wantsSprint = p.stamina > 30;
        const sp = baseMaxSpeed * (wantsSprint ? 1.2 : 0.95);
        desiredVx = (dx / d) * sp;
        desiredVz = (dz / d) * sp;

        const distToGoal = Math.hypot(p.x, targetGoalZ - p.z);
        if (distToGoal < 17.5) {
          // AI Shoots!
          const aimX = ((p.slotIndex % 2 === 0 ? 1 : -1) * 1.8);
          const sdx = aimX - sim.ball.x;
          const sdz = targetGoalZ - sim.ball.z;
          const sd = Math.max(0.1, Math.hypot(sdx, sdz));
          const power = 21 + (p.shootStat / 100) * 9;
          sim.ball.ownerId = null;
          sim.ball.pickupLockTimer = 0.25;
          sim.ball.vx = (sdx / sd) * power;
          sim.ball.vz = (sdz / sd) * power;
          sim.ball.vy = 3.2;
          sim.ball.flairActive = p.card.rarity === 'Legendary' || p.card.rarity === 'Mythical';
          sim.ball.flairColor = p.card.flairColor;
          p.kickAnimTimer = 0.3;
          sim.pendingEvents.push({ type: 'kick', x: sim.ball.x, y: 0.5, z: sim.ball.z });
        } else if (sim.mode !== 'Practice Drill' && Math.random() < dt * 0.9) {
          // Occasional smart AI pass
          const mates = p.team === 'home' ? homeTeam : awayTeam;
          const ahead = mates.find((m) => m.id !== p.id && (m.z - p.z) * dir > 4);
          if (ahead) {
            const pdx = ahead.x - sim.ball.x;
            const pdz = ahead.z - sim.ball.z;
            const pd = Math.max(0.1, Math.hypot(pdx, pdz));
            sim.ball.ownerId = null;
            sim.ball.pickupLockTimer = 0.22;
            sim.ball.vx = (pdx / pd) * 17;
            sim.ball.vz = (pdz / pd) * 17;
            sim.ball.vy = 2.0;
            p.kickAnimTimer = 0.25;
            sim.pendingEvents.push({ type: 'pass', x: sim.ball.x, y: 0.4, z: sim.ball.z });
          }
        }
      } else {
        // Off-ball AI positioning or pressing
        const isClosestAway =
          p.team === 'away' &&
          sim.mode !== 'Practice Drill' &&
          awayTeam
            .filter((m) => m.role !== 'GK')
            .sort((a, b) => Math.hypot(a.x - sim.ball.x, a.z - sim.ball.z) - Math.hypot(b.x - sim.ball.x, b.z - sim.ball.z))[0] === p;

        if (isClosestAway) {
          const dx = sim.ball.x - p.x;
          const dz = sim.ball.z - p.z;
          const d = Math.max(0.1, Math.hypot(dx, dz));
          const sp = baseMaxSpeed * (0.9 + (sim.difficulty - 0.85) * 0.4);
          desiredVx = (dx / d) * sp;
          desiredVz = (dz / d) * sp;
          if (ballOwner && ballOwner.team === 'home' && d < 2.2 && p.tackleCooldown <= 0 && Math.random() < dt * 2.2) {
            p.vx = (dx / d) * 14.5;
            p.vz = (dz / d) * 14.5;
            p.tackleTimer = 0.28;
            p.tackleCooldown = 1.4;
          }
        } else {
          // Formation + ball follow shift + tactical offset
          const tacticShift = p.team === 'home' ? getTacticZShift(sim.tactic, p.role) : 0;
          const ballFollowZ = sim.ball.z * (p.role === 'DEF' ? 0.35 : p.role === 'MID' ? 0.55 : 0.65);
          const ballFollowX = sim.ball.x * 0.3;
          const tx = THREE_LIKE_CLAMP(p.anchorX + ballFollowX, -PITCH_HALF_W + 2, PITCH_HALF_W - 2);
          const tz = THREE_LIKE_CLAMP(p.anchorZ * 0.6 + ballFollowZ + tacticShift, -PITCH_HALF_L + 3, PITCH_HALF_L - 3);
          const dx = tx - p.x;
          const dz = tz - p.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.6) {
            const sp = baseMaxSpeed * 0.85;
            desiredVx = (dx / d) * sp;
            desiredVz = (dz / d) * sp;
          }
        }
      }
    }

    // Smooth velocity & stamina update (higher dribbleStat improves agility & turn response)
    const accelRate = 10 + (p.dribbleStat / 100) * 4.5;
    const accel = 1 - Math.exp(-accelRate * dt);
    p.vx += (desiredVx - p.vx) * accel;
    p.vz += (desiredVz - p.vz) * accel;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    clampPlayerToPitch(p);

    const actualSpeed = Math.hypot(p.vx, p.vz);
    const wasSprinting = p.isSprinting;
    p.isSprinting = wantsSprint && actualSpeed > 2;
    if (p === activePlayer && !wasSprinting && p.isSprinting) {
      sim.sprintActivations += 1;
    }
    if (p.isSprinting) {
      p.stamina = Math.max(0, p.stamina - dt * 28);
    } else {
      p.stamina = Math.min(100, p.stamina + dt * 16);
    }

    if (actualSpeed > 0.35) {
      const targetAngle = Math.atan2(p.vx, p.vz);
      const diff = normalizeAngle(targetAngle - p.facing);
      const turnRate = 12 + (p.dribbleStat / 100) * 5;
      p.facing += diff * (1 - Math.exp(-turnRate * dt));
      p.gaitPhase += actualSpeed * dt * 1.85;
    }
  }

  // Player-to-player soft separation
  for (let i = 0; i < sim.players.length; i++) {
    for (let j = i + 1; j < sim.players.length; j++) {
      const a = sim.players[i];
      const b = sim.players[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dist = Math.hypot(dx, dz);
      const minDist = PLAYER_RADIUS * 1.9;
      if (dist > 0.001 && dist < minDist) {
        const push = (minDist - dist) * 0.5;
        const nx = dx / dist;
        const nz = dz / dist;
        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
      }
    }
  }

  // === Ball Physics & Pickup ===
  if (sim.ball.ownerId) {
    const owner = sim.players.find((p) => p.id === sim.ball.ownerId);
    if (owner) {
      const dribbleDist = 1.05;
      sim.ball.x = owner.x + Math.sin(owner.facing) * dribbleDist;
      sim.ball.z = owner.z + Math.cos(owner.facing) * dribbleDist;
      sim.ball.y = BALL_RADIUS;
      sim.ball.vx = owner.vx;
      sim.ball.vz = owner.vz;
      sim.ball.vy = 0;
    } else {
      sim.ball.ownerId = null;
    }
  } else {
    sim.ball.x += sim.ball.vx * dt;
    sim.ball.y += sim.ball.vy * dt;
    sim.ball.z += sim.ball.vz * dt;
    sim.ball.vy -= 22 * dt;

    if (sim.ball.y <= BALL_RADIUS) {
      sim.ball.y = BALL_RADIUS;
      if (Math.abs(sim.ball.vy) > 2.2) {
        sim.ball.vy = -sim.ball.vy * 0.52;
      } else {
        sim.ball.vy = 0;
      }
      const groundFriction = Math.pow(0.28, dt);
      sim.ball.vx *= groundFriction;
      sim.ball.vz *= groundFriction;
      if (Math.hypot(sim.ball.vx, sim.ball.vz) < 4) {
        sim.ball.flairActive = false;
      }
    } else {
      const airDrag = Math.pow(0.75, dt);
      sim.ball.vx *= airDrag;
      sim.ball.vz *= airDrag;
    }

    // Touchlines bounce cleanly (arcade continuous flow)
    if (sim.ball.x < -PITCH_HALF_W + BALL_RADIUS) {
      sim.ball.x = -PITCH_HALF_W + BALL_RADIUS;
      sim.ball.vx = Math.abs(sim.ball.vx) * 0.72;
    } else if (sim.ball.x > PITCH_HALF_W - BALL_RADIUS) {
      sim.ball.x = PITCH_HALF_W - BALL_RADIUS;
      sim.ball.vx = -Math.abs(sim.ball.vx) * 0.72;
    }

    // Goalposts & Goal Detection at +Z (Away Goal) and -Z (Home Goal)
    const inGoalMouthX = Math.abs(sim.ball.x) < GOAL_HALF_W - BALL_RADIUS * 0.4;
    const underCrossbar = sim.ball.y < GOAL_HEIGHT;

    if (sim.ball.z > PITCH_HALF_L) {
      if (inGoalMouthX && underCrossbar) {
        // HOME SCORES!
        sim.homeScore += 1;
        sim.goalFreezeTimer = 2.6;
        sim.goalScoredByTeam = 'home';
        sim.goalBannerText = `GOAL! ${activePlayer.card.nickname.toUpperCase()}!`;
        sim.lastEventText = sim.goalBannerText;
        sim.hitstopTimer = 0.06;
        sim.cameraTrauma = 0.85;
        sim.pendingEvents.push({
          type: 'goal',
          x: sim.ball.x,
          y: sim.ball.y,
          z: sim.ball.z,
          team: 'home',
          heavy: true,
          scorerName: activePlayer.card.nickname,
        });
        return;
      } else {
        // Bounce off back wall / goalpost
        if (Math.abs(Math.abs(sim.ball.x) - GOAL_HALF_W) < 0.6 && sim.ball.y < GOAL_HEIGHT + 0.3) {
          sim.pendingEvents.push({ type: 'post', x: sim.ball.x, y: sim.ball.y, z: PITCH_HALF_L });
        }
        sim.ball.z = PITCH_HALF_L - BALL_RADIUS;
        sim.ball.vz = -Math.abs(sim.ball.vz) * 0.65;
      }
    } else if (sim.ball.z < -PITCH_HALF_L) {
      if (inGoalMouthX && underCrossbar) {
        // AWAY SCORES!
        sim.awayScore += 1;
        sim.goalFreezeTimer = 2.6;
        sim.goalScoredByTeam = 'away';
        sim.goalBannerText = `${sim.opponentName} Scores!`;
        sim.lastEventText = sim.goalBannerText;
        sim.hitstopTimer = 0.05;
        sim.cameraTrauma = 0.7;
        sim.pendingEvents.push({
          type: 'goal',
          x: sim.ball.x,
          y: sim.ball.y,
          z: sim.ball.z,
          team: 'away',
          heavy: true,
        });
        return;
      } else {
        if (Math.abs(Math.abs(sim.ball.x) - GOAL_HALF_W) < 0.6 && sim.ball.y < GOAL_HEIGHT + 0.3) {
          sim.pendingEvents.push({ type: 'post', x: sim.ball.x, y: sim.ball.y, z: -PITCH_HALF_L });
        }
        sim.ball.z = -PITCH_HALF_L + BALL_RADIUS;
        sim.ball.vz = Math.abs(sim.ball.vz) * 0.65;
      }
    }

    // Pickup / GK Save check
    if (sim.ball.pickupLockTimer <= 0 && sim.ball.y < 2.0) {
      for (const p of sim.players) {
        const d = Math.hypot(p.x - sim.ball.x, p.z - sim.ball.z);
        const reach = p.role === 'GK' ? 1.5 : 1.1;
        if (d < reach) {
          const ballSpeed = Math.hypot(sim.ball.vx, sim.ball.vz);
          if (p.role === 'GK' && ballSpeed > 12) {
            sim.pendingEvents.push({ type: 'save', x: p.x, y: 1.0, z: p.z, heavy: true });
            sim.lastEventText = `${p.card.nickname} makes a diving save!`;
          } else {
            sim.pendingEvents.push({ type: 'pickup', x: p.x, y: 0.3, z: p.z });
          }
          sim.ball.ownerId = p.id;
          sim.ball.lastTouchTeam = p.team;
          sim.ball.flairActive = false;
          if (p.team === 'home') {
            sim.activeHomeIndex = p.slotIndex;
          }
          break;
        }
      }
    }
  }
}

export function getHudSnapshot(sim: MatchSimulation): MatchHudSnapshot {
  const active = sim.players[sim.activeHomeIndex];
  const totalPoss = Math.max(0.1, sim.homePossessionTime + sim.awayPossessionTime);
  const owner = sim.ball.ownerId ? sim.players.find((p) => p.id === sim.ball.ownerId) : null;
  return {
    homeScore: sim.homeScore,
    awayScore: sim.awayScore,
    timeRemaining: Math.ceil(sim.timeRemaining),
    stamina: Math.round(active.stamina),
    hasBall: owner?.team === 'home',
    activePlayerName: active.card.nickname,
    activePlayerRarity: active.card.rarity as RarityTier,
    tactic: sim.tactic,
    shots: sim.shots,
    shotsOnTarget: sim.shotsOnTarget,
    tackles: sim.tackles,
    passesCompleted: sim.passesCompleted,
    possessionPct: Math.round((sim.homePossessionTime / totalPoss) * 100),
    lastEventText: sim.lastEventText,
    goalBannerText: sim.goalBannerText,
    isGoalCelebration: sim.goalFreezeTimer > 0,
  };
}

export function upgradePlayerCard(progress: UserProgress, cardId: string): UserProgress | null {
  const card = PLAYER_CARDS.find((c) => c.id === cardId);
  if (!card) return null;
  const isUnlocked = progress.unlockedIds.includes(cardId);
  if (!isUnlocked) {
    if (progress.coins < card.unlockCostCoins) return null;
    return {
      ...progress,
      coins: progress.coins - card.unlockCostCoins,
      unlockedIds: [...progress.unlockedIds, cardId],
      cardLevels: { ...progress.cardLevels, [cardId]: 1 },
    };
  }
  const currentLvl = progress.cardLevels[cardId] ?? 1;
  if (currentLvl >= 10) return null;
  const cost = getUpgradeCostCoins(currentLvl, card.rarity);
  if (progress.coins < cost) return null;
  return {
    ...progress,
    coins: progress.coins - cost,
    xp: progress.xp + 40,
    cardLevels: { ...progress.cardLevels, [cardId]: currentLvl + 1 },
  };
}

export function flushSimulationMissionDelta(progress: UserProgress, sim: MatchSimulation, isMatchFinished: boolean): UserProgress {
  const dGoals = Math.max(0, sim.homeScore - sim.syncedMissions.goals);
  const dSprints = Math.max(0, sim.sprintActivations - sim.syncedMissions.sprints);
  const dPasses = Math.max(0, sim.passesCompleted - sim.syncedMissions.passes);
  const dTackles = Math.max(0, sim.tackles - sim.syncedMissions.tackles);
  const dShots = Math.max(0, sim.shots - sim.syncedMissions.shots);

  sim.syncedMissions = {
    goals: sim.homeScore,
    sprints: sim.sprintActivations,
    passes: sim.passesCompleted,
    tackles: sim.tackles,
    shots: sim.shots,
  };

  const won = isMatchFinished && sim.homeScore > sim.awayScore ? 1 : 0;
  const matches = isMatchFinished ? 1 : 0;

  return applyDailyMissionDelta(progress, {
    goals: dGoals,
    wins: won,
    sprints: dSprints,
    passes: dPasses,
    tackles: dTackles,
    shots: dShots,
    matches,
  });
}

export function applyMatchOutcome(progress: UserProgress, sim: MatchSimulation): { updated: UserProgress; trophiesDelta: number; coinsEarned: number } {
  const won = sim.homeScore > sim.awayScore;
  const draw = sim.homeScore === sim.awayScore;
  const modeMult = sim.mode === 'League Cup' ? 1.5 : sim.mode === 'Custom Tournament' ? 1.75 : sim.mode === 'Practice Drill' ? 0.5 : 1;
  const subMult = progress.subscriptionTier === 'Legend VIP' ? 1.5 : progress.subscriptionTier === 'Pro Pass' ? 1.25 : 1;
  const baseCoins = won ? 180 : draw ? 100 : 60;
  const coinsEarned = Math.round((baseCoins + sim.homeScore * 30 + sim.tackles * 8) * modeMult * subMult);
  const trophiesDelta = sim.mode === 'Practice Drill' ? 0 : won ? 32 : draw ? 8 : -14;
  const nextTrophies = Math.max(0, progress.trophies + trophiesDelta);
  const totalPoss = Math.max(0.1, sim.homePossessionTime + sim.awayPossessionTime);

  const record = {
    id: `m_${Date.now()}`,
    mode: sim.mode,
    opponentName: sim.opponentName,
    goalsFor: sim.homeScore,
    goalsAgainst: sim.awayScore,
    shots: sim.shots,
    shotsOnTarget: sim.shotsOnTarget,
    tackles: sim.tackles,
    passesCompleted: sim.passesCompleted,
    possessionPct: Math.round((sim.homePossessionTime / totalPoss) * 100),
    trophiesDelta,
    coinsEarned,
    createdAt: new Date().toISOString(),
  };

  const baseUpdated: UserProgress = {
    ...progress,
    coins: progress.coins + coinsEarned,
    xp: progress.xp + (won ? 120 : 50),
    trophies: nextTrophies,
    leagueTier: getLeagueTierForTrophies(nextTrophies),
    goalsPrizeProgress: (progress.goalsPrizeProgress ?? 0) + sim.homeScore,
    victoryPacks: won
      ? awardVictoryPack(
          progress.victoryPacks ?? [],
          sim.mode === 'League Cup' ? 'Gold' : 'Silver'
        )
      : progress.victoryPacks,
    matchesPlayed: progress.matchesPlayed + 1,
    wins: progress.wins + (won ? 1 : 0),
    goalsScored: progress.goalsScored + sim.homeScore,
    tacklesTotal: progress.tacklesTotal + sim.tackles,
    matchHistory: [record, ...progress.matchHistory].slice(0, 25),
  };

  const updated = flushSimulationMissionDelta(baseUpdated, sim, true);
  return { updated, trophiesDelta, coinsEarned };
}

function clampPlayerToPitch(p: SimPlayer): void {
  p.x = THREE_LIKE_CLAMP(p.x, -PITCH_HALF_W + PLAYER_RADIUS, PITCH_HALF_W - PLAYER_RADIUS);
  p.z = THREE_LIKE_CLAMP(p.z, -PITCH_HALF_L + PLAYER_RADIUS, PITCH_HALF_L - PLAYER_RADIUS);
}

function THREE_LIKE_CLAMP(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function normalizeAngle(a: number): number {
  let res = a;
  while (res > Math.PI) res -= Math.PI * 2;
  while (res < -Math.PI) res += Math.PI * 2;
  return res;
}
