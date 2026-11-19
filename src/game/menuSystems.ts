import {
  BALL_CATALOG,
  BOOT_CATALOG,
  CELEBRATION_CATALOG,
  CREST_CATALOG,
  createDefaultVictoryPacks,
  DEFAULT_CLUB_LOGO,
  DEFAULT_GAME_SETTINGS,
  DEFAULT_STARTING_XI,
  getCardEffectiveStats,
  getUpgradeCostCoins,
  PLAYER_CARDS,
} from './catalog';
import { ensureFreshDailyMissions } from './dailyMissions';
import type {
  ChemistryLinkGroup,
  PackTier,
  PlayerCard,
  StadiumDef,
  TeamChemistryResult,
  UserProgress,
  VictoryPackSlot,
} from './types';

export const PACK_UNLOCK_MS: Record<PackTier, number> = {
  Bronze: 3 * 60 * 60 * 1000,
  Silver: 4 * 60 * 60 * 1000,
  Gold: 6 * 60 * 60 * 1000,
  Pro: 8 * 60 * 60 * 1000,
};

export const PACK_SPEEDUP_GEMS: Record<PackTier, number> = {
  Bronze: 10,
  Silver: 15,
  Gold: 22,
  Pro: 30,
};

export const FREE_PRIZE_COOLDOWN_MS = 4 * 60 * 60 * 1000;
export const GOALS_PRIZE_TARGET = 20;

export function getPlayerLevelInfo(xp: number): { level: number; currentXp: number; nextLevelXp: number; pct: number } {
  const safeXp = Math.max(0, Math.floor(xp));
  const xpPerLevel = 60;
  const level = Math.floor(safeXp / xpPerLevel) + 1;
  const currentXp = safeXp % xpPerLevel;
  return {
    level,
    currentXp,
    nextLevelXp: xpPerLevel,
    pct: Math.round((currentXp / xpPerLevel) * 100),
  };
}

export function getNormalizedLineupIds(rawLineup: string[] | undefined): string[] {
  const validPool = PLAYER_CARDS.map((c) => c.id);
  const picked: string[] = [];
  for (const id of rawLineup ?? []) {
    if (validPool.includes(id) && !picked.includes(id)) {
      picked.push(id);
    }
    if (picked.length === 11) return picked;
  }
  for (const fallbackId of DEFAULT_STARTING_XI) {
    if (!picked.includes(fallbackId)) picked.push(fallbackId);
    if (picked.length === 11) return picked;
  }
  for (const id of validPool) {
    if (!picked.includes(id)) picked.push(id);
    if (picked.length === 11) return picked;
  }
  return picked;
}

export function normalizeUserProgress(raw: UserProgress): UserProgress {
  const normalizedLineup = getNormalizedLineupIds(raw.activeLineup);
  const mergedUnlocked = Array.from(
    new Set([
      ...(Array.isArray(raw.unlockedIds) ? raw.unlockedIds : []),
      'crest_emerald',
      'kit_rhinos',
      'shorts_noir',
      'shorts_white',
      'socks_crimson',
      'socks_white',
      ...normalizedLineup,
    ])
  );
  const nextCardLevels = { ...(raw.cardLevels || {}) };
  for (const id of normalizedLineup) {
    if (!nextCardLevels[id]) nextCardLevels[id] = 1;
  }

  const base: UserProgress = {
    ...raw,
    clubMotto: raw.clubMotto || 'PLAY TO WIN',
    clubOpen: typeof raw.clubOpen === 'boolean' ? raw.clubOpen : true,
    countryCode: raw.countryCode || 'PT',
    crestId: raw.crestId || 'crest_emerald',
    clubLogo: raw.clubLogo ? { ...DEFAULT_CLUB_LOGO, ...raw.clubLogo } : { ...DEFAULT_CLUB_LOGO },
    shortsId: raw.shortsId || 'shorts_noir',
    socksId: raw.socksId || 'socks_crimson',
    linkedProviders: Array.isArray(raw.linkedProviders) ? raw.linkedProviders : [],
    lastFreePrizeClaimAt: raw.lastFreePrizeClaimAt || '',
    goalsPrizeProgress: typeof raw.goalsPrizeProgress === 'number' ? Math.max(0, raw.goalsPrizeProgress) : 0,
    unlockedIds: mergedUnlocked,
    cardLevels: nextCardLevels,
    activeLineup: normalizedLineup,
    victoryPacks:
      Array.isArray(raw.victoryPacks) && raw.victoryPacks.length === 4
        ? raw.victoryPacks
        : createDefaultVictoryPacks(),
    settings: {
      ...DEFAULT_GAME_SETTINGS,
      ...(raw.settings || {}),
    },
  };
  return ensureFreshDailyMissions(base);
}

export function refreshVictoryPacks(packs: VictoryPackSlot[], nowMs = Date.now()): VictoryPackSlot[] {
  let changed = false;
  const next = packs.map((slot) => {
    if (slot.status === 'unlocking' && slot.unlockEndsAt) {
      const endsAt = Date.parse(slot.unlockEndsAt);
      if (Number.isFinite(endsAt) && nowMs >= endsAt) {
        changed = true;
        return { ...slot, status: 'ready' as const, unlockEndsAt: '' };
      }
    }
    return slot;
  });
  return changed ? next : packs;
}

export function startUnlockVictoryPack(
  progress: UserProgress,
  slotIndex: number,
  nowMs = Date.now()
): UserProgress | null {
  const refreshed = refreshVictoryPacks(progress.victoryPacks, nowMs);
  const slot = refreshed[slotIndex];
  if (!slot || slot.status !== 'locked' || !slot.tier) return null;
  // Allow only 1 active timer at a time like arcade card games
  if (refreshed.some((s) => s.status === 'unlocking')) return null;

  const unlockEndsAt = new Date(nowMs + PACK_UNLOCK_MS[slot.tier]).toISOString();
  const nextPacks = refreshed.map((s) =>
    s.slotIndex === slotIndex ? { ...s, status: 'unlocking' as const, unlockEndsAt } : s
  );
  return { ...progress, victoryPacks: nextPacks };
}

export function instantUnlockVictoryPackWithGems(progress: UserProgress, slotIndex: number): UserProgress | null {
  const slot = progress.victoryPacks[slotIndex];
  if (!slot || !slot.tier || (slot.status !== 'locked' && slot.status !== 'unlocking')) return null;
  const gemCost = PACK_SPEEDUP_GEMS[slot.tier];
  if (progress.gems < gemCost) return null;
  const nextPacks = progress.victoryPacks.map((s) =>
    s.slotIndex === slotIndex ? { ...s, status: 'ready' as const, unlockEndsAt: '' } : s
  );
  return {
    ...progress,
    gems: progress.gems - gemCost,
    victoryPacks: nextPacks,
  };
}

export interface PackRewardOutcome {
  updated: UserProgress;
  coinsAwarded: number;
  gemsAwarded: number;
  xpAwarded: number;
  cardReward: PlayerCard | null;
  isDuplicateBonus: boolean;
}

function rollPackReward(
  progress: UserProgress,
  tier: PackTier,
  randFn: () => number
): { coinsAwarded: number; gemsAwarded: number; xpAwarded: number; cardReward: PlayerCard | null; isDuplicateBonus: boolean; nextUnlocked: string[]; nextLevels: Record<string, number> } {
  const coinRange =
    tier === 'Pro'
      ? [450, 750]
      : tier === 'Gold'
        ? [280, 460]
        : tier === 'Silver'
          ? [160, 260]
          : [90, 150];
  const gemBonus = tier === 'Pro' ? 18 : tier === 'Gold' ? 10 : tier === 'Silver' ? 5 : 2;
  const xpAwarded = tier === 'Pro' ? 45 : tier === 'Gold' ? 30 : tier === 'Silver' ? 20 : 12;
  const coinsAwarded = Math.round(coinRange[0] + randFn() * (coinRange[1] - coinRange[0]));

  const lockedCards = PLAYER_CARDS.filter((c) => !progress.unlockedIds.includes(c.id));
  let cardReward: PlayerCard | null = null;
  let isDuplicateBonus = false;
  const nextUnlocked = [...progress.unlockedIds];
  const nextLevels = { ...progress.cardLevels };

  if (lockedCards.length > 0 && (tier !== 'Bronze' || randFn() < 0.55)) {
    const idx = Math.min(lockedCards.length - 1, Math.floor(randFn() * lockedCards.length));
    cardReward = lockedCards[idx];
    nextUnlocked.push(cardReward.id);
    nextLevels[cardReward.id] = 1;
  } else {
    const ownedCards = PLAYER_CARDS.filter((c) => nextUnlocked.includes(c.id));
    if (ownedCards.length > 0) {
      const idx = Math.min(ownedCards.length - 1, Math.floor(randFn() * ownedCards.length));
      cardReward = ownedCards[idx];
      isDuplicateBonus = true;
    }
  }

  return {
    coinsAwarded: coinsAwarded + (isDuplicateBonus ? 120 : 0),
    gemsAwarded: gemBonus,
    xpAwarded,
    cardReward,
    isDuplicateBonus,
    nextUnlocked,
    nextLevels,
  };
}

export function openVictoryPackSlot(
  progress: UserProgress,
  slotIndex: number,
  randFn: () => number = Math.random,
  nowMs = Date.now()
): PackRewardOutcome | null {
  const refreshed = refreshVictoryPacks(progress.victoryPacks, nowMs);
  const slot = refreshed[slotIndex];
  if (!slot || slot.status !== 'ready' || !slot.tier) return null;

  const reward = rollPackReward(progress, slot.tier, randFn);
  const nextPacks = refreshed.map((s) =>
    s.slotIndex === slotIndex ? { slotIndex, tier: null, status: 'empty' as const, unlockEndsAt: '' } : s
  );

  return {
    updated: {
      ...progress,
      coins: progress.coins + reward.coinsAwarded,
      gems: progress.gems + reward.gemsAwarded,
      xp: progress.xp + reward.xpAwarded,
      unlockedIds: reward.nextUnlocked,
      cardLevels: reward.nextLevels,
      victoryPacks: nextPacks,
    },
    coinsAwarded: reward.coinsAwarded,
    gemsAwarded: reward.gemsAwarded,
    xpAwarded: reward.xpAwarded,
    cardReward: reward.cardReward,
    isDuplicateBonus: reward.isDuplicateBonus,
  };
}

export function awardVictoryPack(packs: VictoryPackSlot[], tier: PackTier): VictoryPackSlot[] {
  const emptyIdx = packs.findIndex((s) => s.status === 'empty');
  if (emptyIdx === -1) return packs;
  return packs.map((s, idx) =>
    idx === emptyIdx ? { slotIndex: s.slotIndex, tier, status: 'locked' as const, unlockEndsAt: '' } : s
  );
}

export function getFreePrizeRemainingMs(lastClaimAt: string, nowMs = Date.now()): number {
  if (!lastClaimAt) return 0;
  const lastMs = Date.parse(lastClaimAt);
  if (!Number.isFinite(lastMs)) return 0;
  return Math.max(0, lastMs + FREE_PRIZE_COOLDOWN_MS - nowMs);
}

export function claimFreePrize(
  progress: UserProgress,
  nowMs = Date.now()
): { updated: UserProgress; coins: number; gems: number } | null {
  if (getFreePrizeRemainingMs(progress.lastFreePrizeClaimAt, nowMs) > 0) return null;
  const coins = 160;
  const gems = 6;
  return {
    updated: {
      ...progress,
      coins: progress.coins + coins,
      gems: progress.gems + gems,
      xp: progress.xp + 15,
      lastFreePrizeClaimAt: new Date(nowMs).toISOString(),
    },
    coins,
    gems,
  };
}

export function claimGoalsPrize(
  progress: UserProgress,
  randFn: () => number = Math.random
): PackRewardOutcome | null {
  if (progress.goalsPrizeProgress < GOALS_PRIZE_TARGET) return null;
  const reward = rollPackReward(progress, 'Gold', randFn);
  return {
    updated: {
      ...progress,
      coins: progress.coins + reward.coinsAwarded,
      gems: progress.gems + reward.gemsAwarded,
      xp: progress.xp + reward.xpAwarded,
      goalsPrizeProgress: progress.goalsPrizeProgress - GOALS_PRIZE_TARGET,
      unlockedIds: reward.nextUnlocked,
      cardLevels: reward.nextLevels,
    },
    coinsAwarded: reward.coinsAwarded,
    gemsAwarded: reward.gemsAwarded,
    xpAwarded: reward.xpAwarded,
    cardReward: reward.cardReward,
    isDuplicateBonus: reward.isDuplicateBonus,
  };
}

export function enterStadiumMatch(
  progress: UserProgress,
  stadium: StadiumDef
): { ok: true; updated: UserProgress } | { ok: false; reason: string } {
  const { level } = getPlayerLevelInfo(progress.xp);
  if (level < stadium.requiredLevel) {
    return { ok: false, reason: `Requires Level ${stadium.requiredLevel}` };
  }
  if (progress.coins < stadium.entryFeeCoins) {
    return { ok: false, reason: `Needs ${stadium.entryFeeCoins} Coins entry fee` };
  }
  return {
    ok: true,
    updated: {
      ...progress,
      coins: progress.coins - stadium.entryFeeCoins,
    },
  };
}

export function buyShopPack(
  progress: UserProgress,
  tier: PackTier,
  costCurrency: 'coins' | 'gems',
  costAmount: number,
  randFn: () => number = Math.random
): PackRewardOutcome | null {
  if (costCurrency === 'coins' && progress.coins < costAmount) return null;
  if (costCurrency === 'gems' && progress.gems < costAmount) return null;

  const afterPay: UserProgress = {
    ...progress,
    coins: costCurrency === 'coins' ? progress.coins - costAmount : progress.coins,
    gems: costCurrency === 'gems' ? progress.gems - costAmount : progress.gems,
  };
  const reward = rollPackReward(afterPay, tier, randFn);
  return {
    updated: {
      ...afterPay,
      coins: afterPay.coins + reward.coinsAwarded,
      gems: afterPay.gems + reward.gemsAwarded,
      xp: afterPay.xp + reward.xpAwarded,
      unlockedIds: reward.nextUnlocked,
      cardLevels: reward.nextLevels,
    },
    coinsAwarded: reward.coinsAwarded,
    gemsAwarded: reward.gemsAwarded,
    xpAwarded: reward.xpAwarded,
    cardReward: reward.cardReward,
    isDuplicateBonus: reward.isDuplicateBonus,
  };
}

export function getMainMenuBadges(progress: UserProgress, nowMs = Date.now()): {
  teamUpgradable: number;
  equipmentAffordable: number;
  readyPacks: number;
  rewardsAvailable: number;
} {
  const teamUpgradable = PLAYER_CARDS.filter((c) => {
    const owned = progress.unlockedIds.includes(c.id);
    if (!owned) return progress.coins >= c.unlockCostCoins;
    const lvl = progress.cardLevels[c.id] ?? 1;
    return lvl < 10 && progress.coins >= getUpgradeCostCoins(lvl, c.rarity);
  }).length;

  const equipmentItems = [...CREST_CATALOG, ...BALL_CATALOG, ...BOOT_CATALOG, ...CELEBRATION_CATALOG];
  const equipmentAffordable = equipmentItems.filter(
    (item) => !progress.unlockedIds.includes(item.id) && progress.coins >= item.unlockCostCoins
  ).length;

  const refreshed = refreshVictoryPacks(progress.victoryPacks, nowMs);
  const readyPacks = refreshed.filter((s) => s.status === 'ready').length;

  let rewardsAvailable = 0;
  if (getFreePrizeRemainingMs(progress.lastFreePrizeClaimAt, nowMs) === 0) rewardsAvailable++;
  if (progress.goalsPrizeProgress >= GOALS_PRIZE_TARGET) rewardsAvailable++;
  if (progress.dailyMissions) {
    rewardsAvailable += progress.dailyMissions.tasks.filter((t) => t.progress >= t.target && !t.claimed).length;
  }

  return {
    teamUpgradable,
    equipmentAffordable,
    readyPacks,
    rewardsAvailable,
  };
}

export function formatShortCountdown(remainingMs: number): string {
  const clamped = Math.max(0, remainingMs);
  const totalMins = Math.floor(clamped / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `${hours}H ${mins}M`;
  return `${Math.max(1, mins)}M`;
}

export function computeTeamChemistry(progress: Pick<UserProgress, 'activeLineup'>): TeamChemistryResult {
  const lineupIds = getNormalizedLineupIds(progress.activeLineup);
  const starterCards = lineupIds.map(
    (cardId, idx) => PLAYER_CARDS.find((c) => c.id === cardId) ?? PLAYER_CARDS[idx % PLAYER_CARDS.length]
  );

  const byNation = new Map<string, { flag: string; count: number }>();
  const byClub = new Map<string, number>();

  for (const card of starterCards) {
    const curN = byNation.get(card.nationCode) ?? { flag: card.nationFlag, count: 0 };
    byNation.set(card.nationCode, { flag: card.nationFlag, count: curN.count + 1 });
    byClub.set(card.club, (byClub.get(card.club) ?? 0) + 1);
  }

  const nationLinks: ChemistryLinkGroup[] = [];
  const clubLinks: ChemistryLinkGroup[] = [];
  let rawSpeed = 0;
  let rawDribbling = 0;
  let rawChem = 0;

  for (const [code, info] of byNation.entries()) {
    if (info.count >= 2) {
      const extra = info.count - 1;
      const speedBonus = extra * 1;
      const dribblingBonus = extra * 2;
      rawSpeed += speedBonus;
      rawDribbling += dribblingBonus;
      rawChem += extra * 8;
      nationLinks.push({
        type: 'nation',
        key: code,
        label: `${info.flag} ${code}`,
        count: info.count,
        speedBonus,
        dribblingBonus,
      });
    }
  }

  for (const [clubName, count] of byClub.entries()) {
    if (count >= 2) {
      const extra = count - 1;
      const speedBonus = extra * 2;
      const dribblingBonus = extra * 2;
      rawSpeed += speedBonus;
      rawDribbling += dribblingBonus;
      rawChem += extra * 11;
      clubLinks.push({
        type: 'club',
        key: clubName,
        label: clubName,
        count,
        speedBonus,
        dribblingBonus,
      });
    }
  }

  nationLinks.sort((a, b) => b.count - a.count);
  clubLinks.sort((a, b) => b.count - a.count);

  const speedBoost = Math.min(15, rawSpeed);
  const dribblingBoost = Math.min(15, rawDribbling);
  const chemistryScore = Math.min(100, rawChem);
  const tierLabel: TeamChemistryResult['tierLabel'] =
    chemistryScore >= 85
      ? 'Max Chemistry'
      : chemistryScore >= 60
        ? 'Elite'
        : chemistryScore >= 35
          ? 'Strong'
          : chemistryScore >= 15
            ? 'Building'
            : 'Low';

  return {
    chemistryScore,
    tierLabel,
    speedBoost,
    dribblingBoost,
    nationLinks,
    clubLinks,
  };
}

export interface SquadRadarAxis {
  stat: 'Speed' | 'Shooting' | 'Defense' | 'Dribbling';
  squad: number;
  leagueTarget: number;
  fullMark: number;
}

export interface SquadStarterBreakdown {
  id: string;
  nickname: string;
  role: PlayerCard['role'];
  rarity: PlayerCard['rarity'];
  nationCode: string;
  nationFlag: string;
  club: string;
  level: number;
  speed: number;
  shooting: number;
  defense: number;
  dribbling: number;
  ovr: number;
}

export interface SquadAnalysisResult {
  axes: SquadRadarAxis[];
  overallRating: number;
  totalTeamPower: number;
  strongestAxis: SquadRadarAxis;
  focusAxis: SquadRadarAxis;
  chemistry: TeamChemistryResult;
  starters: SquadStarterBreakdown[];
}

export function computeSquadAnalysis(progress: UserProgress): SquadAnalysisResult {
  const lineupIds = getNormalizedLineupIds(progress.activeLineup);
  const chemistry = computeTeamChemistry({ activeLineup: lineupIds });

  const starters: SquadStarterBreakdown[] = lineupIds.map((cardId, idx) => {
    const card = PLAYER_CARDS.find((c) => c.id === cardId) ?? PLAYER_CARDS[idx % PLAYER_CARDS.length];
    const level = progress.cardLevels[card.id] ?? 1;
    const eff = getCardEffectiveStats(card, level);
    const speed = Math.min(99, eff.pace + chemistry.speedBoost);
    const dribbling = Math.min(99, Math.round(eff.pace * 0.45 + eff.passing * 0.55) + chemistry.dribblingBoost);
    return {
      id: card.id,
      nickname: card.nickname,
      role: card.role,
      rarity: card.rarity,
      nationCode: card.nationCode,
      nationFlag: card.nationFlag,
      club: card.club,
      level,
      speed,
      shooting: eff.shooting,
      defense: eff.tackling,
      dribbling,
      ovr: eff.ovr,
    };
  });

  const count = Math.max(1, starters.length);
  const avg = (pick: (s: SquadStarterBreakdown) => number) =>
    Math.round(starters.reduce((sum, s) => sum + pick(s), 0) / count);

  // Scale competitive league benchmark sensibly based on current trophies
  const benchmarkBase = Math.min(92, Math.max(72, Math.round(72 + progress.trophies / 120)));

  const axes: SquadRadarAxis[] = [
    { stat: 'Speed', squad: avg((s) => s.speed), leagueTarget: benchmarkBase + 2, fullMark: 99 },
    { stat: 'Shooting', squad: avg((s) => s.shooting), leagueTarget: benchmarkBase, fullMark: 99 },
    { stat: 'Defense', squad: avg((s) => s.defense), leagueTarget: benchmarkBase - 1, fullMark: 99 },
    { stat: 'Dribbling', squad: avg((s) => s.dribbling), leagueTarget: benchmarkBase + 1, fullMark: 99 },
  ];

  const sorted = [...axes].sort((a, b) => b.squad - a.squad);
  const overallRating = avg((s) => s.ovr);
  const totalTeamPower = starters.reduce((sum, s) => sum + Math.max(10, s.ovr - 56), 0);

  return {
    axes,
    overallRating,
    totalTeamPower,
    strongestAxis: sorted[0],
    focusAxis: sorted[sorted.length - 1],
    chemistry,
    starters,
  };
}

