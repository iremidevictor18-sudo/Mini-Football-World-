export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type MatchMode = 'Quick Match' | 'League Cup' | 'Practice Drill' | 'Custom Tournament';

export type RarityTier = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythical';

export type FormationId = '4-4-2' | '4-3-3' | '5-3-2' | '4-3-2-1' | '4-5-1' | '3-4-3' | '3-5-2';

export type TacticMode = 'Balanced' | 'High Press' | 'Park Bus';

export type LanguageCode = 'en' | 'es' | 'fr' | 'pt' | 'de';

export type SubscriptionTier = 'Free' | 'Pro Pass' | 'Legend VIP';

export type CelebrationId = 'backflip' | 'samba' | 'statue' | 'airplane' | 'kneeslide';

export type PlayerRole = 'GK' | 'DEF' | 'MID' | 'FWD';

export type HairStyle = 'topknot' | 'mohawk' | 'fade' | 'afro' | 'flow' | 'buzz' | 'braids';

export type FacialHair = 'none' | 'mustache' | 'beard' | 'goatee';

export interface PlayerCard {
  id: string;
  name: string;
  nickname: string;
  parodyNote: string;
  nationCode: string;
  nationFlag: string;
  club: string;
  role: PlayerRole;
  rarity: RarityTier;
  number: number;
  skinTone: string;
  hairColor: string;
  hairStyle: HairStyle;
  facialHair: FacialHair;
  flairColor: string;
  baseStats: {
    pace: number;
    shooting: number;
    passing: number;
    tackling: number;
  };
  unlockCostCoins: number;
}

export interface ChemistryLinkGroup {
  type: 'nation' | 'club';
  key: string;
  label: string;
  count: number;
  speedBonus: number;
  dribblingBonus: number;
}

export interface TeamChemistryResult {
  chemistryScore: number;
  tierLabel: 'Low' | 'Building' | 'Strong' | 'Elite' | 'Max Chemistry';
  speedBoost: number;
  dribblingBoost: number;
  nationLinks: ChemistryLinkGroup[];
  clubLinks: ChemistryLinkGroup[];
}

export type KitPattern = 'solid' | 'stripes' | 'sash' | 'hoops' | 'chevron';

export interface KitDesign {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  shorts: string;
  socks: string;
  pattern: KitPattern;
  unlockCostCoins: number;
}

export interface ShortsDesign {
  id: string;
  name: string;
  primary: string;
  accent: string;
  unlockCostCoins: number;
}

export interface SocksDesign {
  id: string;
  name: string;
  primary: string;
  stripe: string;
  unlockCostCoins: number;
}

export interface BallDesign {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  unlockCostCoins: number;
}

export interface BootDesign {
  id: string;
  name: string;
  primary: string;
  sole: string;
  paceBonus: number;
  unlockCostCoins: number;
}

export interface CelebrationDef {
  id: CelebrationId;
  name: string;
  description: string;
  unlockCostCoins: number;
}

export interface MissionDef {
  id: string;
  title: string;
  target: number;
  progressKey: 'goalsScored' | 'matchesPlayed' | 'wins' | 'tacklesTotal';
  rewardCoins: number;
  rewardGems: number;
}

export interface MatchRecord {
  id: string;
  mode: MatchMode;
  opponentName: string;
  goalsFor: number;
  goalsAgainst: number;
  shots: number;
  shotsOnTarget: number;
  tackles: number;
  passesCompleted: number;
  possessionPct: number;
  trophiesDelta: number;
  coinsEarned: number;
  createdAt: string;
}

export type DailyMissionMetric = 'goals' | 'wins' | 'sprints' | 'passes' | 'tackles' | 'matches' | 'shots';

export interface DailyMissionTask {
  id: string;
  title: string;
  metric: DailyMissionMetric;
  target: number;
  progress: number;
  rewardCoins: number;
  claimed: boolean;
}

export interface DailyMissionsState {
  assignedAt: string;
  resetAt: string;
  tasks: DailyMissionTask[];
}

export type PackTier = 'Bronze' | 'Silver' | 'Gold' | 'Pro';

export interface VictoryPackSlot {
  slotIndex: number;
  tier: PackTier | null;
  status: 'empty' | 'locked' | 'unlocking' | 'ready';
  unlockEndsAt: string;
}

export interface CrestDesign {
  id: string;
  name: string;
  primary: string;
  accent: string;
  shape: 'shield' | 'diamond' | 'crest' | 'crown';
  unlockCostCoins: number;
}

export type LogoShieldShape = 'heater' | 'crowned' | 'modern' | 'hexagon' | 'classic' | 'spiked';
export type LogoPatternStyle = 'hoops' | 'stripes' | 'halves' | 'sash' | 'chevron' | 'quarters';
export type LogoEmblemStyle = 'skull' | 'ball' | 'crown' | 'wolf' | 'bolt' | 'star';
export type LogoOrnamentStyle =
  | 'wings_crown'
  | 'falcon'
  | 'winged_ribbon'
  | 'blades'
  | 'phoenix'
  | 'pillars';

export interface CustomClubLogo {
  shieldShape: LogoShieldShape;
  shieldColor: string;
  patternStyle: LogoPatternStyle;
  patternColor: string;
  emblemStyle: LogoEmblemStyle;
  emblemColor: string;
  ornamentStyle: LogoOrnamentStyle;
  ornamentColor: string;
}

export interface StadiumDef {
  id: string;
  name: string;
  subtitle: string;
  atmosphereLabel: string;
  requiredLevel: number;
  entryFeeCoins: number;
  prizeCoins: number;
  prizeTrophies: number;
  packTier: PackTier;
  difficulty: number;
  pitchTint: string;
  accentHex: string;
}

export interface GameSettings {
  sfxEnabled: boolean;
  crowdEnabled: boolean;
  controlScheme: 'standard' | 'pro' | 'lefty';
  joystickSensitivity: number;
  tutorialCompleted: boolean;
}

export interface UserProgress {
  uid: string;
  displayName: string;
  clubName: string;
  clubMotto?: string;
  clubOpen?: boolean;
  countryCode: string;
  crestId: string;
  clubLogo?: CustomClubLogo;
  linkedProviders: Array<'google' | 'facebook' | 'apple'>;
  coins: number;
  gems: number;
  xp: number;
  trophies: number;
  leagueTier: string;
  formation: FormationId;
  kitId: string;
  shortsId?: string;
  socksId?: string;
  ballId: string;
  bootId: string;
  celebrationId: CelebrationId;
  subscriptionTier: SubscriptionTier;
  language: LanguageCode;
  dailyRewardStreak: number;
  lastDailyClaimAt: string;
  lastFreePrizeClaimAt: string;
  goalsPrizeProgress: number;
  matchesPlayed: number;
  wins: number;
  goalsScored: number;
  tacklesTotal: number;
  unlockedIds: string[];
  cardLevels: Record<string, number>;
  activeLineup: string[]; // 11 card IDs: Starting XI for formation & chemistry
  claimedMissions: string[];
  dailyMissions?: DailyMissionsState;
  victoryPacks: VictoryPackSlot[];
  settings: GameSettings;
  matchHistory: MatchRecord[];
}

export interface ClubInfo {
  clubId: string;
  name: string;
  tag: string;
  ownerId: string;
  leagueTier: string;
  memberCount: number;
  totalTrophies: number;
  crestColor: string;
  motto?: string;
  isOpen?: boolean;
  clubLogo?: CustomClubLogo;
}

export interface TournamentInfo {
  tournamentId: string;
  title: string;
  ownerId: string;
  status: 'open' | 'in_progress' | 'completed';
  maxTeams: number;
  entryFeeCoins: number;
  prizeCoins: number;
  winnerName?: string;
}

export interface LeaderboardRow {
  userId: string;
  displayName: string;
  clubName: string;
  trophies: number;
  leagueTier: string;
  wins: number;
}

export interface MatchHudSnapshot {
  homeScore: number;
  awayScore: number;
  timeRemaining: number;
  stamina: number;
  hasBall: boolean;
  activePlayerName: string;
  activePlayerRarity: RarityTier;
  tactic: TacticMode;
  shots: number;
  shotsOnTarget: number;
  tackles: number;
  passesCompleted: number;
  possessionPct: number;
  lastEventText: string;
  goalBannerText: string;
  isGoalCelebration: boolean;
}
