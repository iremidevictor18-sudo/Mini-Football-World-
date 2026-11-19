import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  Plus,
  Settings,
  ShoppingCart,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { COUNTRY_OPTIONS, CREST_CATALOG, TRANSLATIONS } from '../game/catalog';
import {
  formatShortCountdown,
  getFreePrizeRemainingMs,
  getMainMenuBadges,
  getPlayerLevelInfo,
  GOALS_PRIZE_TARGET,
  refreshVictoryPacks,
} from '../game/menuSystems';
import type { UserProgress, VictoryPackSlot } from '../game/types';
import { CustomClubLogoSvg } from './CustomClubLogoSvg';
import { ClubCrestSvg } from './EquipmentModal';

export type HubTab =
  | 'profile'
  | 'analytics'
  | 'settings'
  | 'shop'
  | 'shop_currency'
  | 'play'
  | 'squad'
  | 'equipment'
  | 'clubs'
  | 'rewards'
  | 'rewards_missions'
  | 'rewards_packs'
  | 'rewards_pass'
  | 'missions'
  | 'ai'
  | null;

interface TitleOverlayProps {
  progress: UserProgress;
  isOnline: boolean;
  isSignedIn: boolean;
  muted: boolean;
  onOpenHub: (tab: HubTab) => void;
  onPackSlotClick: (slot: VictoryPackSlot) => void;
  onToggleMute: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  progress,
  isOnline,
  isSignedIn,
  muted,
  onOpenHub,
  onPackSlotClick,
  onToggleMute,
}) => {
  const t = TRANSLATIONS[progress.language] ?? TRANSLATIONS.en;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const levelInfo = getPlayerLevelInfo(progress.xp);
  const crest = CREST_CATALOG.find((c) => c.id === progress.crestId) ?? CREST_CATALOG[0];
  const country = COUNTRY_OPTIONS.find((c) => c.code === progress.countryCode) ?? COUNTRY_OPTIONS[0];
  const badges = getMainMenuBadges(progress, nowMs);
  const packs = refreshVictoryPacks(progress.victoryPacks, nowMs);
  const freeRemainMs = getFreePrizeRemainingMs(progress.lastFreePrizeClaimAt, nowMs);
  const goalsCount = Math.min(GOALS_PRIZE_TARGET, progress.goalsPrizeProgress);
  const goalsPct = Math.min(100, Math.round((goalsCount / GOALS_PRIZE_TARGET) * 100));
  const dailyCompletedCount = progress.dailyMissions?.tasks.filter((task) => task.progress >= task.target).length ?? 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5">
      {/* TOP BAR: Region 1 (Profile & Settings) + Region 2 (Gems & Coins) */}
      <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-4">
        {/* Region 1: Profile + Settings + Audio/Sync */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenHub('profile')}
            aria-label="Open Player Profile"
            className="flex items-center gap-2.5 rounded-xl border border-white/20 px-2.5 py-1.5 text-left shadow-xl hover:border-amber-300/60 transition-colors"
            style={{ backgroundColor: 'rgba(11, 20, 42, 0.9)' }}
          >
            {progress.clubLogo ? (
              <CustomClubLogoSvg logo={progress.clubLogo} className="h-10 w-10 shrink-0" />
            ) : (
              <ClubCrestSvg
                primary={crest.primary}
                accent={crest.accent}
                shape={crest.shape}
                className="h-9 w-9 shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <span aria-hidden="true">{country.flag}</span>
                <span className="truncate max-w-[115px]">{progress.displayName}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <div className="h-2.5 w-20 sm:w-24 overflow-hidden rounded-full bg-slate-800 border border-white/10">
                  <div
                    className="h-full bg-sky-400"
                    style={{ width: `${Math.max(8, levelInfo.pct)}%` }}
                  />
                </div>
                <span className="font-mono-num text-[10px] font-bold text-slate-200 tabular-nums">
                  {levelInfo.currentXp}/{levelInfo.nextLevelXp}
                </span>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-amber-400 px-1 font-display text-xs font-extrabold text-slate-950">
                  {levelInfo.level}
                </span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHub('settings')}
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white shadow-lg hover:bg-slate-800"
            style={{ backgroundColor: 'rgba(11, 20, 42, 0.9)' }}
          >
            <Settings className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white shadow-lg hover:bg-slate-800"
            style={{ backgroundColor: 'rgba(11, 20, 42, 0.9)' }}
          >
            {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => onOpenHub('profile')}
            aria-label="Sync and Offline Status"
            className="hidden md:flex h-10 items-center gap-1.5 rounded-xl border border-white/20 px-3 text-xs font-semibold text-slate-200 shadow-lg hover:bg-slate-800 whitespace-nowrap"
            style={{ backgroundColor: 'rgba(11, 20, 42, 0.9)' }}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-amber-400" />}
            <span>{isSignedIn ? 'Cloud Synced' : isOnline ? 'Local Save' : 'Offline'}</span>
          </button>
        </div>

        {/* Region 2: Gems & Coins Balances with '+' Shop Shortcuts */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
          <div
            className="flex items-center gap-2 rounded-xl border border-white/20 pl-2.5 pr-1 py-1 shadow-xl"
            style={{ backgroundColor: 'rgba(11, 20, 42, 0.9)' }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
              <polygon points="12,2 21,9 12,22 3,9" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
              <polygon points="12,2 17,9 12,22 7,9" fill="#7DD3FC" opacity="0.65" />
            </svg>
            <span className="font-display text-xl font-extrabold text-white tabular-nums" data-testid="gems-balance">
              {progress.gems.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => onOpenHub('shop_currency')}
              aria-label="Add Gems"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
            </button>
          </div>

          <div
            className="flex items-center gap-2 rounded-xl border border-white/20 pl-2.5 pr-1 py-1 shadow-xl"
            style={{ backgroundColor: 'rgba(11, 20, 42, 0.9)' }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#FACC15" stroke="#B45309" strokeWidth="1.8" />
              <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="900" fill="#78350F">$</text>
            </svg>
            <span className="font-display text-xl font-extrabold text-white tabular-nums" data-testid="coins-balance">
              {progress.coins.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => onOpenHub('shop_currency')}
              aria-label="Add Coins"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: Region 3 (Left Column) + Open 3D Centerpiece + Region 4 (Right Events/Prizes) */}
      <div className="my-auto flex items-center justify-between gap-2">
        {/* Region 3: Leaderboard, Equipment, Team */}
        <div className="pointer-events-auto flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => onOpenHub('clubs')}
            className="relative flex w-24 sm:w-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-sky-400/50 py-2.5 px-2 text-white shadow-xl transition-transform hover:scale-[1.03] active:scale-[0.98]"
            style={{ backgroundColor: 'rgba(29, 78, 216, 0.9)' }}
          >
            <Trophy className="h-7 w-7 text-amber-300" />
            <span className="font-display text-xs sm:text-sm font-extrabold tracking-wider uppercase whitespace-nowrap">
              Leaderboard
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenHub('equipment')}
            className="relative flex w-24 sm:w-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-sky-400/50 py-2.5 px-2 text-white shadow-xl transition-transform hover:scale-[1.03] active:scale-[0.98]"
            style={{ backgroundColor: 'rgba(29, 78, 216, 0.9)' }}
          >
            {badges.equipmentAffordable > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-rose-500 px-1 font-mono-num text-[10px] font-extrabold text-white shadow">
                {badges.equipmentAffordable}
              </span>
            )}
            <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
              <path d="M7 4 L4 7 L6 10 L8 9 L8 20 L16 20 L16 9 L18 10 L20 7 L17 4 L14 6 L10 6 Z" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
            </svg>
            <span className="font-display text-xs sm:text-sm font-extrabold tracking-wider uppercase whitespace-nowrap">
              Equipment
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenHub('squad')}
            className="relative flex w-24 sm:w-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-sky-400/50 py-2.5 px-2 text-white shadow-xl transition-transform hover:scale-[1.03] active:scale-[0.98]"
            style={{ backgroundColor: 'rgba(29, 78, 216, 0.9)' }}
          >
            {badges.teamUpgradable > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-rose-500 px-1 font-mono-num text-[10px] font-extrabold text-white shadow">
                {badges.teamUpgradable}
              </span>
            )}
            <ClipboardList className="h-7 w-7 text-amber-200" />
            <span className="font-display text-xs sm:text-sm font-extrabold tracking-wider uppercase whitespace-nowrap">
              Team
            </span>
          </button>
        </div>

        {/* Center Negative Space: Unobstructed 3D Hero Footballer & Stadium */}
        <div className="hidden lg:block flex-1" />

        {/* Region 4: Starter Pack / Season Event, Free Prizes, Goals Prize, Daily Missions */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onOpenHub('rewards_pass')}
            className="flex w-[142px] sm:w-44 items-center justify-between gap-2 rounded-xl border-2 border-amber-400 px-2.5 sm:px-3 py-2 text-left shadow-xl transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            <div className="min-w-0">
              <div className="font-display text-xs sm:text-base font-extrabold leading-tight text-amber-300 uppercase whitespace-nowrap">
                Starter Pack
              </div>
              <div className="font-mono-num text-[10px] font-bold text-white">2D 23H</div>
            </div>
            <span className="font-display text-lg font-extrabold text-amber-400">★</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenHub('rewards')}
            className="flex w-[142px] sm:w-44 items-center justify-between gap-2 rounded-xl border border-white/25 px-2.5 sm:px-3 py-2 text-left shadow-xl transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
          >
            <div className="min-w-0">
              <div className="font-display text-xs sm:text-base font-extrabold leading-tight text-white uppercase whitespace-nowrap">
                Free Prizes
              </div>
              <div className={`font-mono-num text-[10px] font-bold ${freeRemainMs === 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {freeRemainMs === 0 ? 'CLAIM NOW' : formatShortCountdown(freeRemainMs)}
              </div>
            </div>
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
              <circle cx="10" cy="13" r="6" fill="#FACC15" stroke="#B45309" strokeWidth="1.5" />
              <circle cx="15" cy="9" r="5" fill="#FDE047" stroke="#B45309" strokeWidth="1.5" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onOpenHub('rewards')}
            className="flex w-[142px] sm:w-44 flex-col gap-1.5 rounded-xl border border-emerald-400/50 px-2.5 sm:px-3 py-2 text-left shadow-xl transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: 'rgba(6, 44, 34, 0.92)' }}
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="font-display text-xs sm:text-base font-extrabold leading-tight text-emerald-300 uppercase whitespace-nowrap">
                Goals Prize
              </div>
              <span className="font-mono-num text-[11px] font-extrabold text-white shrink-0">
                {goalsCount}/{GOALS_PRIZE_TARGET}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${goalsPct}%` }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHub('rewards_missions')}
            className="flex w-[142px] sm:w-44 items-center justify-between gap-2 rounded-xl border border-amber-400/35 px-2.5 sm:px-3 py-2 text-left shadow-xl transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
              <span className="font-display text-[11px] sm:text-sm font-bold text-amber-200 whitespace-nowrap uppercase">
                {t.dailyMissions}
              </span>
            </div>
            <span className="font-mono-num text-[11px] font-bold text-amber-300 shrink-0">
              {dailyCompletedCount}/3
            </span>
          </button>
        </div>
      </div>

      {/* BOTTOM DOCK: Shop (Left) + 4 Victory Pack Slots (Center) + Play (Right) */}
      <div className="flex flex-wrap sm:flex-nowrap items-end justify-between gap-2 sm:gap-3">
        {/* Bottom-Left: SHOP */}
        <button
          type="button"
          onClick={() => onOpenHub('shop')}
          className="pointer-events-auto order-2 sm:order-1 flex h-14 sm:h-16 items-center justify-center gap-2.5 rounded-xl border-2 border-amber-200 bg-amber-400 px-5 sm:px-7 font-display text-2xl sm:text-3xl font-extrabold tracking-wider text-slate-950 shadow-xl transition-transform hover:bg-amber-300 active:scale-[0.98]"
        >
          <span>SHOP</span>
          <ShoppingCart className="h-6 w-6 stroke-[2.5]" />
        </button>

        {/* Bottom-Center: 4 Victory Pack Slots */}
        <div className="pointer-events-auto order-1 sm:order-2 grid w-full sm:w-auto sm:flex-1 max-w-xl grid-cols-4 gap-1.5 sm:gap-2">
          {packs.map((slot) => {
            const remainMs =
              slot.status === 'unlocking' && slot.unlockEndsAt
                ? Math.max(0, Date.parse(slot.unlockEndsAt) - nowMs)
                : 0;
            const isReady = slot.status === 'ready';
            const isEmpty = slot.status === 'empty';
            const label = isEmpty
              ? 'EMPTY SLOT'
              : isReady
                ? 'OPEN NOW'
                : slot.status === 'unlocking'
                  ? formatShortCountdown(remainMs)
                  : slot.tier === 'Bronze'
                    ? '3H LOCKED'
                    : slot.tier === 'Silver'
                      ? '4H LOCKED'
                      : '6H LOCKED';

            return (
              <button
                key={slot.slotIndex}
                type="button"
                onClick={() => onPackSlotClick(slot)}
                aria-label={`Victory Pack Slot ${slot.slotIndex + 1}: ${slot.tier ?? 'Empty'} ${label}`}
                className={`flex flex-col items-center justify-between rounded-xl border-2 px-1.5 py-2 text-center shadow-lg transition-transform hover:scale-[1.03] ${
                  isReady
                    ? 'border-amber-200 bg-amber-400 text-slate-950'
                    : isEmpty
                      ? 'border-dashed border-slate-300/45 bg-slate-900/85 text-slate-100'
                      : 'border-sky-400/45 bg-slate-900/92 text-white'
                }`}
              >
                <span className="font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wide">
                  {isEmpty ? 'PACK SLOT' : `${slot.tier} PACK`}
                </span>
                <span
                  className={`mt-1 font-mono-num text-[9px] sm:text-[10px] font-bold ${
                    isReady ? 'text-slate-950' : isEmpty ? 'text-slate-200' : 'text-sky-300'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom-Right: PLAY */}
        <button
          type="button"
          onClick={() => onOpenHub('play')}
          className="pointer-events-auto order-3 flex h-14 sm:h-16 items-center justify-center gap-2.5 rounded-xl border-2 border-amber-200 bg-amber-400 px-6 sm:px-8 font-display text-2xl sm:text-3xl font-extrabold tracking-wider text-slate-950 shadow-xl transition-transform hover:bg-amber-300 active:scale-[0.98]"
        >
          <span>PLAY</span>
          <svg viewBox="0 0 28 24" className="h-6 w-7" aria-hidden="true">
            <line x1="2" y1="7" x2="10" y2="7" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="0" y1="12" x2="9" y2="12" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="3" y1="17" x2="10" y2="17" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="19" cy="12" r="7.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
            <polygon points="19,8 22,10.5 21,14 17,14 16,10.5" fill="#0F172A" />
          </svg>
        </button>
      </div>
    </div>
  );
};
