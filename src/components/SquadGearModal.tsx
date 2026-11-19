import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUp, Lock, Plus, Shield, Sparkles, Star, Users } from 'lucide-react';
import {
  FORMATION_CONFIGS,
  getCardEffectiveStats,
  getUpgradeCostCoins,
  KIT_CATALOG,
  PLAYER_CARDS,
  RARITY_COLORS,
} from '../game/catalog';
import {
  computeSquadAnalysis,
  computeTeamChemistry,
  getNormalizedLineupIds,
  getPlayerLevelInfo,
} from '../game/menuSystems';
import { upgradePlayerCard } from '../game/physics';
import type { FormationId, PlayerCard, RarityTier, UserProgress } from '../game/types';
import { PremiumPlayerCard } from './PremiumPlayerCard';

interface SquadGearModalProps {
  progress: UserProgress;
  onUpdateProgress: (next: UserProgress) => void;
  onOpenShopCurrency?: () => void;
  onClose: () => void;
}

interface FormationTileDef {
  id: string;
  formationId?: FormationId;
  requiredLevel: number;
  dots: Array<[number, number]>;
}

const FORMATION_TILES: FormationTileDef[] = [
  {
    id: '4-4-2',
    formationId: '4-4-2',
    requiredLevel: 1,
    dots: [
      [50, 86], [20, 68], [40, 70], [60, 70], [80, 68],
      [20, 48], [40, 50], [60, 50], [80, 48],
      [38, 28], [62, 28],
    ],
  },
  {
    id: '4-3-3',
    formationId: '4-3-3',
    requiredLevel: 1,
    dots: [
      [50, 86], [18, 66], [39, 69], [61, 69], [82, 66],
      [26, 48], [50, 50], [74, 48],
      [24, 28], [50, 24], [76, 28],
    ],
  },
  {
    id: '5-3-2',
    formationId: '5-3-2',
    requiredLevel: 1,
    dots: [
      [50, 86], [16, 63], [33, 70], [50, 71], [67, 70], [84, 63],
      [28, 48], [50, 50], [72, 48],
      [38, 28], [62, 28],
    ],
  },
  {
    id: '4-3-2-1',
    formationId: '4-3-2-1',
    requiredLevel: 1,
    dots: [
      [50, 86], [18, 67], [39, 70], [61, 70], [82, 67],
      [26, 51], [50, 52], [74, 51],
      [36, 37], [64, 37], [50, 24],
    ],
  },
  {
    id: '4-5-1',
    formationId: '4-5-1',
    requiredLevel: 1,
    dots: [
      [50, 86], [18, 67], [39, 70], [61, 70], [82, 67],
      [16, 46], [35, 52], [50, 46], [65, 52], [84, 46],
      [50, 26],
    ],
  },
  {
    id: '3-4-3',
    formationId: '3-4-3',
    requiredLevel: 5,
    dots: [
      [50, 86], [28, 69], [50, 71], [72, 69],
      [18, 49], [39, 51], [61, 51], [82, 49],
      [26, 28], [50, 25], [74, 28],
    ],
  },
  {
    id: '3-5-2',
    formationId: '3-5-2',
    requiredLevel: 7,
    dots: [
      [50, 86], [28, 69], [50, 71], [72, 69],
      [16, 46], [35, 52], [50, 46], [65, 52], [84, 46],
      [38, 28], [62, 28],
    ],
  },
  {
    id: '4-2-3-1',
    requiredLevel: 9,
    dots: [
      [50, 86], [18, 68], [39, 70], [61, 70], [82, 68],
      [36, 54], [64, 54],
      [24, 39], [50, 40], [76, 39],
      [50, 24],
    ],
  },
  {
    id: '3-4-1-2',
    requiredLevel: 12,
    dots: [
      [50, 86], [28, 69], [50, 71], [72, 69],
      [18, 52], [39, 53], [61, 53], [82, 52],
      [50, 38],
      [38, 24], [62, 24],
    ],
  },
];

const SHIELD_STYLE_BY_RARITY: Record<RarityTier, { frame: string; inner: string; ribbon: string }> = {
  Common: { frame: '#64748B', inner: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)', ribbon: '#334155' },
  Rare: { frame: '#2563EB', inner: 'linear-gradient(180deg, #1D4ED8 0%, #0F2357 100%)', ribbon: '#1E40AF' },
  Epic: { frame: '#9333EA', inner: 'linear-gradient(180deg, #6B21A8 0%, #2E1065 100%)', ribbon: '#581C87' },
  Legendary: { frame: '#F59E0B', inner: 'linear-gradient(180deg, #B45309 0%, #451A03 100%)', ribbon: '#92400E' },
  Mythical: { frame: '#F43F5E', inner: 'linear-gradient(180deg, #BE123C 0%, #4C0519 100%)', ribbon: '#881337' },
};

const ChibiPortraitSvg: React.FC<{ card: PlayerCard; jerseyColor: string }> = ({ card, jerseyColor }) => (
  <svg viewBox="0 0 64 60" className="h-full w-full" aria-hidden="true">
    {/* Shoulders / Jersey */}
    <path d="M14 58 C16 44 48 44 50 58 Z" fill={jerseyColor} stroke="#0F172A" strokeWidth="1.5" />
    <path d="M26 46 L32 51 L38 46" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
    {/* Neck */}
    <rect x="27" y="38" width="10" height="8" rx="3" fill={card.skinTone} />
    {/* Head */}
    <ellipse cx="32" cy="26" rx="14" ry="15" fill={card.skinTone} stroke="#0F172A" strokeWidth="1.2" />
    {/* Hair */}
    {card.hairStyle === 'topknot' ? (
      <>
        <path d="M18 22 C18 11 46 11 46 22 C41 16 23 16 18 22 Z" fill={card.hairColor} />
        <circle cx="32" cy="8" r="5" fill={card.hairColor} />
      </>
    ) : card.hairStyle === 'mohawk' ? (
      <path d="M27 7 L37 7 L35 20 L29 20 Z" fill={card.hairColor} />
    ) : card.hairStyle === 'afro' ? (
      <circle cx="32" cy="18" r="16" fill={card.hairColor} />
    ) : card.hairStyle === 'flow' ? (
      <path d="M16 25 C15 9 49 9 48 25 C44 17 20 17 16 25 Z" fill={card.hairColor} />
    ) : (
      <path d="M18 21 C19 10 45 10 46 21 C40 16 24 16 18 21 Z" fill={card.hairColor} />
    )}
    {/* Eyes & Brows */}
    <rect x="22" y="21" width="6" height="2" rx="1" fill="#1E1B18" />
    <rect x="36" y="21" width="6" height="2" rx="1" fill="#1E1B18" />
    <circle cx="25.5" cy="25.5" r="2.1" fill="#0F172A" />
    <circle cx="38.5" cy="25.5" r="2.1" fill="#0F172A" />
    {/* Facial Hair */}
    {card.facialHair === 'mustache' && (
      <path d="M24 32 Q32 29 40 32 Q36 35 32 33 Q28 35 24 32 Z" fill={card.hairColor} />
    )}
    {card.facialHair === 'beard' && (
      <path d="M21 29 C21 40 43 40 43 29 C40 35 24 35 21 29 Z" fill={card.hairColor} opacity="0.92" />
    )}
    {card.facialHair === 'goatee' && (
      <ellipse cx="32" cy="36" rx="4.5" ry="3.5" fill={card.hairColor} />
    )}
  </svg>
);

export const SquadGearModal: React.FC<SquadGearModalProps> = ({
  progress,
  onUpdateProgress,
  onOpenShopCurrency,
  onClose,
}) => {
  const [drawerTab, setDrawerTab] = useState<'formations' | 'players'>('formations');
  const [selectedSlot, setSelectedSlot] = useState<number>(9);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL');

  const lineupIds = useMemo(() => getNormalizedLineupIds(progress.activeLineup), [progress.activeLineup]);
  const chemistry = useMemo(() => computeTeamChemistry({ activeLineup: lineupIds }), [lineupIds]);
  const analysis = useMemo(() => computeSquadAnalysis({ ...progress, activeLineup: lineupIds }), [progress, lineupIds]);
  const { level } = getPlayerLevelInfo(progress.xp);
  const activeKit = KIT_CATALOG.find((k) => k.id === progress.kitId) ?? KIT_CATALOG[0];

  const formationConfig = FORMATION_CONFIGS[progress.formation] ?? FORMATION_CONFIGS['4-3-3'];
  const filledStars = Math.min(5, Math.max(1, Math.round((analysis.overallRating - 55) / 8)));

  const handleSelectFormation = (tile: FormationTileDef) => {
    if (!tile.formationId) return;
    if (level < tile.requiredLevel) return;
    onUpdateProgress({ ...progress, formation: tile.formationId });
  };

  const handleEquipCardToSlot = (cardId: string) => {
    if (!progress.unlockedIds.includes(cardId)) return;
    const nextLineup = [...lineupIds];
    const existingIdx = nextLineup.indexOf(cardId);
    if (existingIdx !== -1) {
      const temp = nextLineup[selectedSlot];
      nextLineup[selectedSlot] = cardId;
      nextLineup[existingIdx] = temp;
    } else {
      nextLineup[selectedSlot] = cardId;
    }
    onUpdateProgress({ ...progress, activeLineup: nextLineup });
  };

  const handleCardUpgradeOrUnlock = (cardId: string) => {
    const next = upgradePlayerCard(progress, cardId);
    if (next) onUpdateProgress(next);
  };

  const filteredRosterCards = PLAYER_CARDS.filter((c) => roleFilter === 'ALL' || c.role === roleFilter);
  const activeSlotCardId = lineupIds[selectedSlot] ?? lineupIds[0];
  const activeSlotCard = PLAYER_CARDS.find((c) => c.id === activeSlotCardId) ?? PLAYER_CARDS[0];
  const activeSlotRole = formationConfig.lineup11[selectedSlot]?.role ?? 'MID';

  const activeDots = FORMATION_TILES.find((t) => t.formationId === progress.formation)?.dots ?? FORMATION_TILES[1].dots;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col overflow-hidden text-white select-none"
      style={{
        background: 'linear-gradient(180deg, #1E47B8 0%, #173694 55%, #0F2366 100%)',
      }}
      data-testid="team-formation-modal"
    >
      {/* Top Bar: Coral Back Arrow (Left) + Gems & Coins (Right) */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2.5 sm:px-5 border-b border-white/10 bg-slate-950/25">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Team Management"
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 border-white/85 bg-[#F43F5E] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 stroke-[3]" />
          </button>
          <div>
            <div className="font-display text-lg sm:text-xl font-extrabold tracking-wider uppercase leading-none">
              {progress.clubName}
            </div>
            <div className="text-[11px] font-semibold text-sky-200/90 tabular-nums">
              Squad Rating {analysis.overallRating} OVR · Chemistry {chemistry.chemistryScore}% (+{chemistry.speedBoost} SPD / +{chemistry.dribblingBoost} DRI)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-[#0A1432]/90 pl-2.5 pr-1 py-1 shadow">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden="true">
              <polygon points="12,2 21,9 12,22 3,9" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
            </svg>
            <span className="font-display text-lg sm:text-xl font-extrabold tabular-nums">
              {progress.gems.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onOpenShopCurrency}
              aria-label="Buy Gems"
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-[#0A1432]/90 pl-2.5 pr-1 py-1 shadow">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#FACC15" stroke="#B45309" strokeWidth="1.8" />
              <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="900" fill="#78350F">$</text>
            </svg>
            <span className="font-display text-lg sm:text-xl font-extrabold tabular-nums">
              {progress.coins.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onOpenShopCurrency}
              aria-label="Buy Coins"
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Body */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* LEFT COLUMN: MY TEAM + TACTIC PREVIEW + FORMATIONS / PLAYERS TABS */}
        <aside className="shrink-0 w-full lg:w-[205px] xl:w-[225px] bg-[#0B1738]/92 border-b lg:border-b-0 lg:border-r border-white/15 px-3.5 py-3 flex flex-row lg:flex-col items-center lg:items-stretch justify-between gap-3">
          {/* MY TEAM Rating & Chemistry Pill */}
          <div className="text-center space-y-1">
            <div className="font-display text-xs font-extrabold tracking-widest text-sky-200 uppercase">
              MY TEAM
            </div>
            <div className="font-display text-4xl sm:text-5xl font-black leading-none text-white drop-shadow tabular-nums">
              {analysis.totalTeamPower}
            </div>
            <div className="flex items-center justify-center gap-0.5 pt-0.5" aria-label={`Team star rating ${filledStars} out of 5`}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${s <= filledStars ? 'fill-amber-400 text-amber-300' : 'fill-slate-700 text-slate-600'}`}
                />
              ))}
            </div>
            <div
              className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-emerald-400/50 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 tabular-nums"
              data-testid="chemistry-summary-pill"
            >
              <Sparkles className="h-3 w-3 shrink-0" />
              <span>CHEM {chemistry.chemistryScore}% · +{chemistry.speedBoost} SPD +{chemistry.dribblingBoost} DRI</span>
            </div>
          </div>

          {/* TACTIC Mini Tactical Pitch Card */}
          <div className="hidden sm:flex flex-col items-center">
            <div className="font-display text-xs font-extrabold tracking-widest text-sky-200 uppercase">
              TACTIC
            </div>
            <div className="font-display text-2xl font-extrabold text-white tracking-wide">
              {progress.formation}
            </div>
            <div className="mt-1.5 w-[108px] lg:w-[136px] aspect-[3/4] rounded-md border-2 border-white/55 bg-[#1B8A44] p-1 shadow-inner relative overflow-hidden">
              <svg viewBox="0 0 100 130" className="h-full w-full">
                {/* Alternating mowed stripes */}
                {[0, 26, 52, 78, 104].map((y, idx) => (
                  <rect key={idx} x="0" y={y} width="100" height="13" fill="#23AA55" opacity="0.45" />
                ))}
                <rect x="4" y="4" width="92" height="122" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
                <line x1="4" y1="65" x2="96" y2="65" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
                <circle cx="50" cy="65" r="14" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
                <rect x="28" y="4" width="44" height="16" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.2" />
                <rect x="28" y="110" width="44" height="16" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.2" />
                {/* Opponent red dots top half */}
                {[
                  [50, 11], [24, 24], [50, 25], [76, 24],
                  [26, 39], [50, 41], [74, 39], [36, 53], [64, 53],
                ].map(([rx, ry], idx) => (
                  <circle key={`opp_${idx}`} cx={rx} cy={ry} r="3.4" fill="#EF4444" stroke="#7F1D1D" strokeWidth="1" />
                ))}
                {/* Home white dots reflecting active formation */}
                {activeDots.map(([dx, dy], idx) => (
                  <circle
                    key={`home_${idx}`}
                    cx={dx}
                    cy={30 + dy * 0.92}
                    r="3.8"
                    fill="#FFFFFF"
                    stroke="#0F172A"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* FORMATIONS & PLAYERS Stacked Toggle Tabs */}
          <div className="flex flex-row lg:flex-col gap-2 w-auto lg:w-full mt-auto">
            <button
              type="button"
              onClick={() => setDrawerTab('formations')}
              className={`rounded-xl border-2 px-3.5 py-2.5 font-display text-base sm:text-lg font-extrabold tracking-wider uppercase shadow-md transition-all ${
                drawerTab === 'formations'
                  ? 'border-white bg-slate-100 text-[#0B1738] scale-[1.02]'
                  : 'border-sky-400/45 bg-[#0F2456] text-white hover:bg-[#173377]'
              }`}
            >
              FORMATIONS
            </button>
            <button
              type="button"
              onClick={() => setDrawerTab('players')}
              className={`rounded-xl border-2 px-3.5 py-2.5 font-display text-base sm:text-lg font-extrabold tracking-wider uppercase shadow-md transition-all ${
                drawerTab === 'players'
                  ? 'border-white bg-slate-100 text-[#0B1738] scale-[1.02]'
                  : 'border-sky-400/45 bg-[#0F2456] text-white hover:bg-[#173377]'
              }`}
            >
              PLAYERS
            </button>
          </div>
        </aside>

        {/* CENTER COLUMN: 11-STARTER SHIELD FORMATION PITCH */}
        <main className="flex-1 min-h-[470px] lg:min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div
            className="relative w-full max-w-[540px] h-full min-h-[455px] max-h-[690px] rounded-xl border-[3px] border-white/75 shadow-2xl overflow-hidden"
            style={{
              background:
                'repeating-linear-gradient(180deg, #1E9C4B 0px, #1E9C4B 44px, #25AD56 44px, #25AD56 88px)',
            }}
            data-testid="starting-xi-pitch"
          >
            {/* Pitch Markings SVG */}
            <svg viewBox="0 0 400 560" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              <rect x="14" y="14" width="372" height="532" fill="none" stroke="rgba(255,255,255,0.68)" strokeWidth="3" />
              <line x1="14" y1="280" x2="386" y2="280" stroke="rgba(255,255,255,0.68)" strokeWidth="2.5" />
              <circle cx="200" cy="280" r="52" fill="none" stroke="rgba(255,255,255,0.68)" strokeWidth="2.5" />
              <circle cx="200" cy="280" r="5" fill="#FFFFFF" />
              {/* Top Penalty & 6-yd Box */}
              <rect x="108" y="14" width="184" height="72" fill="none" stroke="rgba(255,255,255,0.68)" strokeWidth="2.5" />
              <rect x="150" y="14" width="100" height="28" fill="none" stroke="rgba(255,255,255,0.68)" strokeWidth="2.5" />
              {/* Bottom Penalty & 6-yd Box */}
              <rect x="108" y="474" width="184" height="72" fill="none" stroke="rgba(255,255,255,0.68)" strokeWidth="2.5" />
              <rect x="150" y="518" width="100" height="28" fill="none" stroke="rgba(255,255,255,0.68)" strokeWidth="2.5" />
            </svg>

            {/* 11 Starter Shield Cards positioned dynamically by Formation */}
            {formationConfig.lineup11.map((slot, idx) => {
              const cardId = lineupIds[idx] ?? PLAYER_CARDS[idx % PLAYER_CARDS.length].id;
              const card = PLAYER_CARDS.find((c) => c.id === cardId) ?? PLAYER_CARDS[idx % PLAYER_CARDS.length];
              const cardLvl = progress.cardLevels[card.id] ?? 1;
              const stats = getCardEffectiveStats(card, cardLvl);
              const upCost = getUpgradeCostCoins(cardLvl, card.rarity);
              const canUpgrade = cardLvl < 10 && progress.coins >= upCost;
              const isSelected = selectedSlot === idx;
              const palette = SHIELD_STYLE_BY_RARITY[card.rarity];
              const cardPower = Math.max(10, stats.ovr - 56);
              const jerseyCol = slot.role === 'GK' ? '#F59E0B' : activeKit.primary;

              return (
                <button
                  key={`${idx}_${slot.role}`}
                  type="button"
                  onClick={() => {
                    setSelectedSlot(idx);
                    if (drawerTab === 'formations') {
                      // Keep quick inspect intuitive, double-tap or switch via PLAYERS
                    }
                  }}
                  aria-label={`Slot ${idx + 1} ${slot.role}: ${card.nickname} (${card.nationCode})`}
                  style={{
                    left: `${slot.xPct}%`,
                    top: `${slot.yPct}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`group absolute z-10 w-[64px] sm:w-[76px] md:w-[82px] transition-transform focus:outline-none ${
                    isSelected ? 'scale-110 z-20' : 'hover:scale-105'
                  }`}
                >
                  {/* Shield Shell */}
                  <div
                    className={`relative rounded-t-xl rounded-b-[22px] border-2 p-1 shadow-xl ${
                      isSelected ? 'ring-2 ring-amber-300 border-amber-300' : ''
                    }`}
                    style={{
                      background: palette.inner,
                      borderColor: isSelected ? '#FDE047' : palette.frame,
                    }}
                  >
                    {/* Top Row: Power Number & Nation/Club Crest + Bust */}
                    <div className="flex items-start justify-between gap-0.5">
                      <div className="flex flex-col items-center leading-none pl-0.5">
                        <span className="text-[8px] font-black text-emerald-400">▲</span>
                        <span className="font-display text-sm sm:text-base font-black text-white tabular-nums leading-none">
                          {cardPower}
                        </span>
                        <span className="mt-0.5 text-[10px]" title={`${card.nationCode} · ${card.club}`}>
                          {card.nationFlag}
                        </span>
                        <span className="mt-0.5 rounded bg-slate-950/75 px-1 py-[1px] text-[7px] font-extrabold text-amber-300 uppercase">
                          {slot.role === 'DEF' ? 'DF' : slot.role === 'MID' ? 'MF' : slot.role === 'FWD' ? 'FW' : 'GK'}
                        </span>
                      </div>
                      <div className="h-[34px] w-[36px] sm:h-[40px] sm:w-[44px] shrink-0 overflow-hidden">
                        <ChibiPortraitSvg card={card} jerseyColor={jerseyCol} />
                      </div>
                    </div>

                    {/* Level Circle + Progress Bar + Upgradable Green Arrow */}
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/60 bg-sky-600 font-mono-num text-[9px] font-black text-white">
                        {cardLvl}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-950/85 border border-white/20 flex items-center justify-center">
                        <div
                          className="h-full bg-emerald-400 transition-all"
                          style={{ width: `${Math.min(100, cardLvl * 10)}%` }}
                        />
                      </div>
                      {canUpgrade && (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow">
                          <ArrowUp className="h-2.5 w-2.5 stroke-[3.5]" />
                        </span>
                      )}
                    </div>

                    {/* Bottom Nickname Plate */}
                    <div
                      className="mt-1 truncate rounded-b-[14px] px-1 py-[2px] text-center font-display text-[9px] sm:text-[10px] font-extrabold tracking-wide text-white uppercase shadow-inner"
                      style={{ backgroundColor: palette.ribbon }}
                    >
                      {card.nickname}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        {/* RIGHT DRAWER: FORMATIONS GRID OR PLAYERS SWAPPER & TEAM CHEMISTRY */}
        <section className="shrink-0 w-full lg:w-[345px] xl:w-[390px] bg-[#0B1736]/94 border-t lg:border-t-0 lg:border-l border-white/15 flex flex-col min-h-0">
          {/* Header Banner */}
          <div className="shrink-0 flex items-center justify-between border-b border-white/15 px-4 py-3 bg-[#09122B]">
            <div className="flex items-center gap-2">
              {drawerTab === 'formations' ? (
                <Shield className="h-5 w-5 text-amber-400" />
              ) : (
                <Users className="h-5 w-5 text-emerald-400" />
              )}
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-wider uppercase text-white">
                {drawerTab === 'formations' ? 'FORMATIONS' : 'PLAYERS & CHEMISTRY'}
              </h2>
            </div>
            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono-num text-[11px] font-bold text-sky-300">
              LV.{level}
            </span>
          </div>

          {/* Drawer Body */}
          <div className="custom-scroll flex-1 overflow-y-auto p-3.5 sm:p-4">
            {drawerTab === 'formations' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {FORMATION_TILES.map((tile) => {
                    const unlocked = level >= tile.requiredLevel && Boolean(tile.formationId);
                    const equipped = tile.formationId === progress.formation;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => handleSelectFormation(tile)}
                        data-testid={`formation-tile-${tile.id}`}
                        className={`relative flex flex-col items-center rounded-xl border-2 px-2 pt-2.5 pb-2 transition-transform ${
                          equipped
                            ? 'border-amber-400 bg-[#142D6B] shadow-lg scale-[1.03]'
                            : unlocked
                              ? 'border-sky-400/45 bg-[#102252] hover:border-white/75 hover:scale-[1.02]'
                              : 'border-white/15 bg-[#0C1736] opacity-75 cursor-not-allowed'
                        }`}
                      >
                        {equipped && (
                          <span className="absolute -top-2.5 left-1.5 rounded bg-amber-400 px-1.5 py-[1px] font-display text-[10px] font-black tracking-wider text-slate-950 shadow">
                            EQUIPPED
                          </span>
                        )}

                        {/* Mini Green Tactical Field inside Tile */}
                        <div
                          className={`relative w-full aspect-[4/5] rounded-md border border-white/45 overflow-hidden ${
                            unlocked ? 'bg-[#1F9E4E]' : 'bg-[#175B35] grayscale-[45%]'
                          }`}
                        >
                          <svg viewBox="0 0 100 120" className="h-full w-full">
                            <line x1="0" y1="60" x2="100" y2="60" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
                            <circle cx="50" cy="60" r="14" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
                            <rect x="26" y="2" width="48" height="14" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
                            <rect x="26" y="104" width="48" height="14" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
                            {/* Red opponent front dots */}
                            {[[30, 12], [50, 12], [70, 12]].map(([rx, ry], idx) => (
                              <circle key={idx} cx={rx} cy={ry} r="3.4" fill="#EF4444" stroke="#7F1D1D" strokeWidth="1" />
                            ))}
                            {/* White home dots */}
                            {tile.dots.map(([dx, dy], idx) => (
                              <circle
                                key={idx}
                                cx={dx}
                                cy={14 + dy * 0.96}
                                r="3.8"
                                fill="#FFFFFF"
                                stroke="#0F172A"
                                strokeWidth="1"
                              />
                            ))}
                          </svg>

                          {!unlocked && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60">
                              <Lock className="h-5 w-5 text-white mb-0.5" />
                              <span className="font-display text-xs font-extrabold tracking-wider text-white">
                                LEVEL {tile.requiredLevel}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-1.5 font-display text-sm sm:text-base font-extrabold tracking-wide text-white">
                          {tile.id}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Selected Slot Inspect Strip */}
                <div className="rounded-xl border border-white/15 bg-[#0F204A] p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      Selected Slot #{selectedSlot + 1} · {activeSlotRole}
                    </div>
                    <div className="font-display text-base font-extrabold text-white truncate">
                      {activeSlotCard.nationFlag} {activeSlotCard.nickname} · {activeSlotCard.club}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('players')}
                    className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 font-display text-xs font-extrabold uppercase text-slate-950 hover:bg-emerald-400"
                  >
                    Swap / Upgrade
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Team Chemistry Passive Boost Summary Card */}
                <div
                  className="rounded-xl border border-emerald-400/45 bg-emerald-950/35 p-3 space-y-2"
                  data-testid="team-chemistry-panel"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                        Team Chemistry Bonus
                      </div>
                      <div className="font-display text-xl font-extrabold text-white">
                        {chemistry.chemistryScore}% · {chemistry.tierLabel}
                      </div>
                    </div>
                    <div className="text-right font-mono-num text-xs font-extrabold">
                      <div className="text-emerald-400">+{chemistry.speedBoost} SPEED</div>
                      <div className="text-sky-300">+{chemistry.dribblingBoost} DRIBBLING</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Starting XI teammates sharing the same Nation or Club boost match Speed &amp; Dribbling.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {chemistry.clubLinks.map((lnk) => (
                      <span
                        key={`club_${lnk.key}`}
                        className="rounded border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-200"
                      >
                        {lnk.label} ×{lnk.count} (+{lnk.speedBonus} SPD, +{lnk.dribblingBonus} DRI)
                      </span>
                    ))}
                    {chemistry.nationLinks.map((lnk) => (
                      <span
                        key={`nat_${lnk.key}`}
                        className="rounded border border-sky-400/40 bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold text-sky-200"
                      >
                        {lnk.label} ×{lnk.count} (+{lnk.speedBonus} SPD, +{lnk.dribblingBonus} DRI)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Role Filter Pills */}
                <div className="flex items-center justify-between gap-1.5">
                  {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((rf) => (
                    <button
                      key={rf}
                      type="button"
                      onClick={() => setRoleFilter(rf)}
                      className={`flex-1 rounded-lg py-1.5 text-[11px] font-extrabold transition-colors ${
                        roleFilter === rf ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      {rf}
                    </button>
                  ))}
                </div>

                {/* Full Squad Cards List (with Premium hover tilt + Swap + Upgrade) */}
                <div className="space-y-2.5">
                  {filteredRosterCards.map((card) => {
                    const unlocked = progress.unlockedIds.includes(card.id);
                    const cardLvl = progress.cardLevels[card.id] ?? 1;
                    const stats = getCardEffectiveStats(card, cardLvl);
                    const cost = unlocked ? getUpgradeCostCoins(cardLvl, card.rarity) : card.unlockCostCoins;
                    const inXIIdx = lineupIds.indexOf(card.id);
                    const canAfford = progress.coins >= cost;

                    return (
                      <PremiumPlayerCard key={card.id} rarity={card.rarity}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div
                              className="text-[10px] font-extrabold uppercase tracking-wider"
                              style={{ color: RARITY_COLORS[card.rarity] }}
                            >
                              {card.rarity} · {card.role} #{card.number}
                            </div>
                            <div className="font-display text-lg font-extrabold text-white truncate">
                              {card.nationFlag} {card.nickname}
                            </div>
                            <div className="text-[11px] font-semibold text-sky-300 truncate">
                              {card.club} · {card.nationCode}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-display text-2xl font-black text-amber-400 tabular-nums leading-none">
                              {stats.ovr}
                            </div>
                            <div className="text-[10px] text-slate-400 tabular-nums">
                              Lv.{unlocked ? cardLvl : 0}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px] font-mono-num tabular-nums">
                          <div className="rounded bg-slate-800 py-0.5">
                            <span className="text-slate-400">PAC </span>
                            <span className="font-bold text-white">{stats.pace}</span>
                          </div>
                          <div className="rounded bg-slate-800 py-0.5">
                            <span className="text-slate-400">SHO </span>
                            <span className="font-bold text-white">{stats.shooting}</span>
                          </div>
                          <div className="rounded bg-slate-800 py-0.5">
                            <span className="text-slate-400">PAS </span>
                            <span className="font-bold text-white">{stats.passing}</span>
                          </div>
                          <div className="rounded bg-slate-800 py-0.5">
                            <span className="text-slate-400">TAC </span>
                            <span className="font-bold text-white">{stats.tackling}</span>
                          </div>
                        </div>

                        <div className="mt-2.5 flex gap-2">
                          <button
                            type="button"
                            disabled={!canAfford || (unlocked && cardLvl >= 10)}
                            onClick={() => handleCardUpgradeOrUnlock(card.id)}
                            className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors ${
                              !canAfford || (unlocked && cardLvl >= 10)
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            }`}
                          >
                            {!unlocked
                              ? `Sign (${cost}c)`
                              : cardLvl >= 10
                                ? 'Max Lv'
                                : `Upgrade (${cost}c)`}
                          </button>
                          {unlocked && (
                            <button
                              type="button"
                              onClick={() => handleEquipCardToSlot(card.id)}
                              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                                inXIIdx === selectedSlot
                                  ? 'border border-amber-400 bg-amber-400/20 text-amber-200'
                                  : inXIIdx !== -1
                                    ? 'border border-sky-400/40 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25'
                                    : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                              }`}
                            >
                              {inXIIdx === selectedSlot
                                ? `In Slot #${selectedSlot + 1}`
                                : inXIIdx !== -1
                                  ? `Swap w/ #${selectedSlot + 1}`
                                  : `Put in #${selectedSlot + 1}`}
                            </button>
                          )}
                        </div>
                      </PremiumPlayerCard>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
