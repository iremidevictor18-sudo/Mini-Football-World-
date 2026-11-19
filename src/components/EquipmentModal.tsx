import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Pencil, Search, Sparkles } from 'lucide-react';
import {
  BALL_CATALOG,
  BOOT_CATALOG,
  CELEBRATION_CATALOG,
  COUNTRY_OPTIONS,
  CREST_CATALOG,
  KIT_CATALOG,
  PLAYER_CARDS,
  SHORTS_CATALOG,
  SOCKS_CATALOG,
} from '../game/catalog';
import type { CelebrationId, UserProgress } from '../game/types';
import { ClubLogoCustomizerModal } from './ClubLogoCustomizerModal';
import { CustomClubLogoSvg } from './CustomClubLogoSvg';
import {
  BallCardItemSvg,
  BootCardItemSvg,
  EquipmentHeroPlayerSvg,
  KitCardItemSvg,
  ShortsCardItemSvg,
  SocksCardItemSvg,
} from './EquipmentHeroSvg';

interface EquipmentModalProps {
  progress: UserProgress;
  onUpdateProgress: (next: UserProgress) => void;
  onOpenShopCurrency?: () => void;
  onClose: () => void;
}

type EquipmentTab = 'balls' | 'jersey' | 'shorts' | 'socks' | 'boots';

export const ClubCrestSvg: React.FC<{
  primary: string;
  accent: string;
  shape: 'shield' | 'diamond' | 'crest' | 'crown';
  className?: string;
}> = ({ primary, accent, shape, className = 'h-9 w-9' }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    {shape === 'diamond' ? (
      <polygon points="24,4 44,24 24,44 4,24" fill={primary} stroke={accent} strokeWidth="3" />
    ) : shape === 'crown' ? (
      <path d="M8 14 L16 24 L24 10 L32 24 L40 14 L38 38 L10 38 Z" fill={primary} stroke={accent} strokeWidth="3" />
    ) : (
      <path d="M10 8 L24 4 L38 8 L36 30 C34 38 24 44 24 44 C24 44 14 38 12 30 Z" fill={primary} stroke={accent} strokeWidth="3" />
    )}
    <circle cx="24" cy="24" r="7" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
  </svg>
);

const TAB_CONFIG: Array<{ id: EquipmentTab; label: string }> = [
  { id: 'balls', label: 'BALLS' },
  { id: 'jersey', label: 'JERSEY' },
  { id: 'shorts', label: 'SHORTS' },
  { id: 'socks', label: 'SOCKS' },
  { id: 'boots', label: 'BOOTS' },
];

function renderEquipmentTabIcon(tab: EquipmentTab): React.ReactNode {
  if (tab === 'balls') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="#FFFFFF" stroke="#0B132B" strokeWidth="1.6" />
        <polygon points="12,7.5 16,10.5 14.5,15 9.5,15 8,10.5" fill="#0B132B" />
        <path d="M12 7.5 V3 M16 10.5 L20.5 9 M14.5 15 L17 19.5 M9.5 15 L7 19.5 M8 10.5 L3.5 9" stroke="#0B132B" strokeWidth="1.4" />
      </svg>
    );
  }
  if (tab === 'jersey') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M7 4 L9.5 3 Q12 5.5 14.5 3 L17 4 L21 7.5 L19 11.5 L16.5 10 V20.5 H7.5 V10 L5 11.5 L3 7.5 Z"
          fill="currentColor"
          stroke="#0B132B"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tab === 'shorts') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M5 5 H19 L21 19 H13.5 L12 13.5 L10.5 19 H3 Z"
          fill="currentColor"
          stroke="#0B132B"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tab === 'socks') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M6 4 H10.5 V15.5 L14 18 C15 19 14.5 21 12.5 21 H6.5 Z"
          fill="currentColor"
          stroke="#0B132B"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M12.5 4 H17 V14 L20 16.2 C21 17 20.5 19 18.5 19 H13 Z"
          fill="currentColor"
          stroke="#0B132B"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 9 L8.5 8.5 L11.5 12 C14.5 13.5 19 14 21 16 C21.5 17.5 20 19 16.5 19 H4 Z"
        fill="currentColor"
        stroke="#0B132B"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="6.5" cy="20.5" r="1.1" fill="currentColor" />
      <circle cx="11.5" cy="20.5" r="1.1" fill="currentColor" />
      <circle cx="17" cy="20.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

function getShortKitLabel(name: string): string {
  const parts = name.split(' · ');
  return parts[0].toUpperCase();
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  progress,
  onUpdateProgress,
  onOpenShopCurrency,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<EquipmentTab>('jersey');
  const [showLogoStudio, setShowLogoStudio] = useState(false);
  const [showCelebrations, setShowCelebrations] = useState(false);
  const [kitSearch, setKitSearch] = useState('');
  const [notice, setNotice] = useState('');

  const activeKit = useMemo(
    () => KIT_CATALOG.find((k) => k.id === progress.kitId) ?? KIT_CATALOG[0],
    [progress.kitId]
  );
  const activeShorts = useMemo(
    () =>
      SHORTS_CATALOG.find((s) => s.id === progress.shortsId) ?? {
        id: 'shorts_kit',
        name: 'Kit Shorts',
        primary: activeKit.shorts,
        accent: activeKit.secondary,
        unlockCostCoins: 0,
      },
    [progress.shortsId, activeKit]
  );
  const activeSocks = useMemo(
    () =>
      SOCKS_CATALOG.find((s) => s.id === progress.socksId) ?? {
        id: 'socks_kit',
        name: 'Kit Socks',
        primary: activeKit.socks,
        stripe: activeKit.secondary,
        unlockCostCoins: 0,
      },
    [progress.socksId, activeKit]
  );
  const activeBoot = useMemo(
    () => BOOT_CATALOG.find((b) => b.id === progress.bootId) ?? BOOT_CATALOG[0],
    [progress.bootId]
  );
  const activeBall = useMemo(
    () => BALL_CATALOG.find((b) => b.id === progress.ballId) ?? BALL_CATALOG[0],
    [progress.ballId]
  );
  const activeCrest = useMemo(
    () => CREST_CATALOG.find((c) => c.id === progress.crestId) ?? CREST_CATALOG[0],
    [progress.crestId]
  );
  const activeCountry = useMemo(
    () => COUNTRY_OPTIONS.find((c) => c.code === progress.countryCode) ?? COUNTRY_OPTIONS[0],
    [progress.countryCode]
  );
  const captainCard = useMemo(() => {
    const captainId = progress.activeLineup[9] ?? progress.activeLineup[0];
    return PLAYER_CARDS.find((c) => c.id === captainId) ?? PLAYER_CARDS[0];
  }, [progress.activeLineup]);

  const clubTag = useMemo(() => {
    const clean = progress.clubName.replace(/[^a-zA-Z]/g, '').toUpperCase();
    return (clean.slice(0, 3) || 'APX').padEnd(3, 'X');
  }, [progress.clubName]);

  if (showLogoStudio) {
    return (
      <ClubLogoCustomizerModal
        progress={progress}
        title="CLUB LOGO"
        onUpdateProgress={onUpdateProgress}
        onOpenShopCurrency={onOpenShopCurrency}
        onClose={() => setShowLogoStudio(false)}
      />
    );
  }

  const handleUnlockOrEquip = (
    id: string,
    cost: number,
    field: 'kitId' | 'shortsId' | 'socksId' | 'ballId' | 'bootId' | 'celebrationId'
  ) => {
    setNotice('');
    const unlocked = cost === 0 || progress.unlockedIds.includes(id);
    if (unlocked) {
      if (field === 'kitId') {
        const pickedKit = KIT_CATALOG.find((k) => k.id === id);
        onUpdateProgress({
          ...progress,
          kitId: id,
          ...(pickedKit ? {} : {}),
        });
      } else {
        onUpdateProgress({ ...progress, [field]: id });
      }
      return;
    }
    if (progress.coins < cost) {
      setNotice(`Needs ${cost} Coins (you have ${progress.coins.toLocaleString()}).`);
      return;
    }
    onUpdateProgress({
      ...progress,
      coins: progress.coins - cost,
      unlockedIds: [...progress.unlockedIds, id],
      [field]: id,
    });
  };

  const filteredKits = KIT_CATALOG.filter((k) =>
    k.name.toLowerCase().includes(kitSearch.trim().toLowerCase())
  );
  const activeCelebration =
    CELEBRATION_CATALOG.find((c) => c.id === progress.celebrationId) ?? CELEBRATION_CATALOG[0];

  return (
    <div
      data-testid="equipment-modal"
      className="fixed inset-0 z-40 flex flex-col overflow-hidden text-white select-none"
      style={{
        background:
          'linear-gradient(125deg, #1E3EC7 0%, #172FB0 46%, #101F88 100%)',
      }}
    >
      {/* Subtle geometric diagonal stadium graphic rays matching reference */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(125deg, transparent 0%, transparent 18%, rgba(250, 204, 21, 0.35) 18.2%, transparent 18.5%, transparent 31%, rgba(56, 189, 248, 0.3) 31%, rgba(56, 189, 248, 0.3) 35%, transparent 35.2%), radial-gradient(rgba(96, 165, 250, 0.45) 1.5px, transparent 1.5px)',
          backgroundSize: '100% 100%, 16px 16px',
        }}
      />

      {/* Main Split Workspace */}
      <div className="relative z-10 flex h-full w-full flex-col md:flex-row">
        {/* LEFT SHOWCASE STAGE */}
        <section className="relative flex flex-col justify-between px-3 py-2 sm:px-6 sm:py-4 md:w-[50%] lg:w-[52%] shrink-0">
          {/* Top-Left Coral Back Button + Bold White EQUIPMENT Title */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Equipment"
                className="flex h-9 w-11 sm:h-11 sm:w-14 items-center justify-center rounded-xl border-2 border-white/90 bg-[#EF5A5A] text-white shadow-[0_3px_0_rgba(10,18,52,0.55)] transition-transform hover:brightness-105 active:translate-y-0.5"
              >
                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 stroke-[3]" />
              </button>
              <h2 className="font-display text-xl sm:text-3xl font-extrabold uppercase tracking-wider text-white drop-shadow-[0_2px_0_rgba(7,14,45,0.85)]">
                EQUIPMENT
              </h2>
            </div>

            {/* Quick Coins chip on left mobile/desktop */}
            <button
              type="button"
              onClick={onOpenShopCurrency}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-[#0A1744]/85 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-extrabold tabular-nums shadow hover:border-amber-300/60"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FACC15] text-[10px] font-black text-amber-950">
                $
              </span>
              <span>{progress.coins.toLocaleString()}</span>
            </button>
          </div>

          {/* Center-Left Club Emblem + Name + Info Card + Standing 3D-Shaded Striker */}
          <div className="my-auto grid grid-cols-12 items-center gap-2 py-1 sm:py-2">
            {/* Club Crest & Identity Column */}
            <div className="col-span-6 flex flex-col items-center text-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLogoStudio(true)}
                  aria-label="Logos & Crests"
                  className="group rounded-2xl p-0.5 sm:p-1 transition-transform hover:scale-105"
                >
                  {progress.clubLogo ? (
                    <CustomClubLogoSvg
                      logo={progress.clubLogo}
                      className="h-16 w-16 sm:h-36 sm:w-36 drop-shadow-[0_10px_18px_rgba(6,10,36,0.55)]"
                    />
                  ) : (
                    <ClubCrestSvg
                      primary={activeCrest.primary}
                      accent={activeCrest.accent}
                      shape={activeCrest.shape}
                      className="h-16 w-16 sm:h-36 sm:w-36"
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoStudio(true)}
                  aria-label="Edit Club Logo"
                  className="absolute -right-1 bottom-0.5 sm:bottom-2 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg border-2 border-[#0A1845] bg-[#2D6CDF] text-white shadow hover:bg-[#3E7DF0]"
                >
                  <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                </button>
              </div>

              <div className="mt-0.5 sm:mt-1 font-display text-sm sm:text-3xl font-extrabold uppercase tracking-wider text-white drop-shadow-[0_2px_0_rgba(7,14,45,0.85)] truncate max-w-full">
                {progress.clubName}
              </div>

              {/* Translucent Club Identity Box */}
              <div className="mt-1 sm:mt-2 w-full max-w-[260px] rounded-xl border border-white/15 bg-[#091C5A]/65 px-2 py-1.5 sm:px-4 sm:py-2.5 shadow-xl">
                <div className="font-display text-[10px] sm:text-sm font-extrabold uppercase tracking-widest text-white/95">
                  {clubTag}
                </div>
                <div className="mt-0.5 font-display text-xs sm:text-2xl font-extrabold uppercase tracking-wide text-[#FACC15] drop-shadow truncate">
                  {progress.clubName}
                </div>
                <div className="mt-0.5 sm:mt-1 flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-white">
                  <span className="text-sm sm:text-base leading-none">{activeCountry.flag}</span>
                  <span>{activeCountry.name.toUpperCase()}</span>
                </div>
              </div>

              {/* Celebrations Quick Selector Pill */}
              <button
                type="button"
                onClick={() => setShowCelebrations((v) => !v)}
                className="mt-1.5 sm:mt-2.5 inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border border-white/20 bg-[#0B1C54]/80 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-sky-200 hover:border-amber-300/60 hover:text-white max-w-full truncate"
              >
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-amber-400" />
                <span className="truncate">{activeCelebration.name}</span>
              </button>

              {showCelebrations && (
                <div className="mt-2 w-full max-w-[270px] rounded-xl border border-white/20 bg-[#0A1438]/95 p-2 text-left shadow-2xl">
                  <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-300">
                    Goal Celebrations
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto custom-scroll">
                    {CELEBRATION_CATALOG.map((cel) => {
                      const owned = cel.unlockCostCoins === 0 || progress.unlockedIds.includes(cel.id);
                      const equipped = progress.celebrationId === cel.id;
                      return (
                        <button
                          key={cel.id}
                          type="button"
                          onClick={() =>
                            handleUnlockOrEquip(cel.id as CelebrationId, cel.unlockCostCoins, 'celebrationId')
                          }
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                            equipped
                              ? 'bg-[#22C55E] text-slate-950 font-bold'
                              : 'bg-[#112255] text-white hover:bg-[#193072]'
                          }`}
                        >
                          <span className="truncate">{cel.name}</span>
                          <span className="tabular-nums shrink-0 ml-2">
                            {equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `${cel.unlockCostCoins} 💰`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Live Hero Striker Column */}
            <div className="col-span-6 flex flex-col items-center justify-center">
              <motion.div
                key={`${activeKit.id}_${activeShorts.id}_${activeSocks.id}_${activeBoot.id}_${activeBall.id}`}
                initial={{ scale: 0.96, y: 4 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              >
                <EquipmentHeroPlayerSvg
                  kit={activeKit}
                  shorts={activeShorts}
                  socks={activeSocks}
                  boot={activeBoot}
                  ball={activeBall}
                  captainCard={captainCard}
                  jerseyNumber={captainCard?.number ?? 3}
                  className="h-44 w-32 sm:h-72 sm:w-56 lg:h-80 lg:w-64 drop-shadow-[0_14px_24px_rgba(4,9,32,0.5)]"
                />
              </motion.div>
              <div className="mt-0.5 sm:mt-1 rounded-full bg-[#091746]/80 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-sky-200 border border-white/15 text-center truncate max-w-full">
                {getShortKitLabel(activeKit.name)} · +{activeBoot.paceBonus} SPD
              </div>
            </div>
          </div>

          {notice && (
            <div className="self-center rounded-xl border border-amber-400/50 bg-[#091438]/95 px-4 py-1.5 text-xs font-bold text-amber-300 shadow-lg">
              {notice}
            </div>
          )}
        </section>

        {/* RIGHT FULL-HEIGHT NAVY DRAWER + 5 VERTICAL RIGHT-EDGE TABS */}
        <section className="flex flex-1 min-h-0 md:w-[50%] lg:w-[48%] pr-12 sm:pr-14 md:pr-16 relative">
          <div className="flex flex-1 min-h-0 flex-col border-t-2 md:border-t-0 md:border-l-2 border-[#25468D] bg-[#091335]/95 shadow-2xl">
            {/* Drawer Category Header */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 bg-[#0E1E4A] px-4 py-2.5 border-b border-[#203B7E]">
              <div className="flex items-center gap-2 text-white">
                {renderEquipmentTabIcon(activeTab)}
                <h3 className="font-display text-lg sm:text-xl font-extrabold uppercase tracking-wider">
                  {TAB_CONFIG.find((t) => t.id === activeTab)?.label}
                </h3>
              </div>

              {activeTab === 'jersey' && (
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-sky-300/80" />
                  <input
                    type="text"
                    value={kitSearch}
                    onChange={(e) => setKitSearch(e.target.value)}
                    placeholder="Search jersey..."
                    aria-label="Search jersey"
                    className="w-36 sm:w-44 rounded-lg border border-[#2A4994] bg-[#081230] pl-8 pr-2.5 py-1 text-xs font-semibold text-white placeholder-slate-400 focus:border-[#4ADE80] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* 3-Column Scrollable Grid */}
            <div className="custom-scroll flex-1 overflow-y-auto p-3 sm:p-4">
              {activeTab === 'jersey' && (
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {filteredKits.map((kit) => {
                    const unlocked = kit.unlockCostCoins === 0 || progress.unlockedIds.includes(kit.id);
                    const equipped = progress.kitId === kit.id;
                    const shortLabel = getShortKitLabel(kit.name);
                    return (
                      <button
                        key={kit.id}
                        type="button"
                        onClick={() => handleUnlockOrEquip(kit.id, kit.unlockCostCoins, 'kitId')}
                        data-selected={equipped ? 'true' : 'false'}
                        className={`group relative flex flex-col overflow-hidden rounded-xl border-2 bg-[#0E1D47] transition-all hover:brightness-110 ${
                          equipped
                            ? 'border-[#4ADE80] ring-2 ring-[#4ADE80]/40 shadow-[0_0_16px_rgba(74,222,128,0.28)]'
                            : 'border-[#1E3675] hover:border-sky-400/70'
                        }`}
                      >
                        {equipped && (
                          <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#4ADE80] text-[#052E16] shadow">
                            <Check className="h-3 w-3 stroke-[3.5]" />
                          </span>
                        )}
                        {!unlocked && (
                          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-[#08122E]/90 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300 tabular-nums border border-amber-400/35">
                            {kit.unlockCostCoins} 💰
                          </span>
                        )}
                        {/* Diagonal Sporty Ray Preview Well */}
                        <div
                          className="flex aspect-[4/3.3] w-full items-center justify-center p-2"
                          style={{
                            background: equipped
                              ? 'repeating-linear-gradient(-32deg, rgba(34,197,94,0.16) 0px, rgba(34,197,94,0.16) 8px, rgba(16,185,129,0.06) 8px, rgba(16,185,129,0.06) 16px), #0B2545'
                              : 'repeating-linear-gradient(-32deg, rgba(250,204,21,0.12) 0px, rgba(250,204,21,0.12) 8px, rgba(15,23,42,0.22) 8px, rgba(15,23,42,0.22) 16px), #0B1638',
                          }}
                        >
                          <KitCardItemSvg
                            kit={kit}
                            className="h-14 w-14 sm:h-16 sm:w-16 drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)] transition-transform group-hover:scale-105"
                          />
                        </div>
                        {/* White Nameplate Bar */}
                        <div className="w-full bg-white px-1.5 py-1 text-center font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-[#0A1330] truncate">
                          {shortLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'balls' && (
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {BALL_CATALOG.map((ball) => {
                    const unlocked = ball.unlockCostCoins === 0 || progress.unlockedIds.includes(ball.id);
                    const equipped = progress.ballId === ball.id;
                    return (
                      <button
                        key={ball.id}
                        type="button"
                        onClick={() => handleUnlockOrEquip(ball.id, ball.unlockCostCoins, 'ballId')}
                        data-selected={equipped ? 'true' : 'false'}
                        className={`group relative flex flex-col overflow-hidden rounded-xl border-2 bg-[#0E1D47] transition-all hover:brightness-110 ${
                          equipped
                            ? 'border-[#4ADE80] ring-2 ring-[#4ADE80]/40'
                            : 'border-[#1E3675] hover:border-sky-400/70'
                        }`}
                      >
                        {equipped && (
                          <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#4ADE80] text-[#052E16] shadow">
                            <Check className="h-3 w-3 stroke-[3.5]" />
                          </span>
                        )}
                        {!unlocked && (
                          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-[#08122E]/90 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300 tabular-nums border border-amber-400/35">
                            {ball.unlockCostCoins} 💰
                          </span>
                        )}
                        <div
                          className="flex aspect-[4/3.3] w-full items-center justify-center p-2"
                          style={{
                            background:
                              'repeating-linear-gradient(-32deg, rgba(56,189,248,0.14) 0px, rgba(56,189,248,0.14) 8px, rgba(15,23,42,0.22) 8px, rgba(15,23,42,0.22) 16px), #0B1638',
                          }}
                        >
                          <BallCardItemSvg ball={ball} className="h-14 w-14 sm:h-16 sm:w-16" />
                        </div>
                        <div className="w-full bg-white px-1.5 py-1 text-center font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-[#0A1330] truncate">
                          {ball.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'shorts' && (
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {SHORTS_CATALOG.map((shorts) => {
                    const unlocked = shorts.unlockCostCoins === 0 || progress.unlockedIds.includes(shorts.id);
                    const equipped = activeShorts.id === shorts.id;
                    return (
                      <button
                        key={shorts.id}
                        type="button"
                        onClick={() => handleUnlockOrEquip(shorts.id, shorts.unlockCostCoins, 'shortsId')}
                        data-selected={equipped ? 'true' : 'false'}
                        className={`group relative flex flex-col overflow-hidden rounded-xl border-2 bg-[#0E1D47] transition-all hover:brightness-110 ${
                          equipped
                            ? 'border-[#4ADE80] ring-2 ring-[#4ADE80]/40'
                            : 'border-[#1E3675] hover:border-sky-400/70'
                        }`}
                      >
                        {equipped && (
                          <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#4ADE80] text-[#052E16] shadow">
                            <Check className="h-3 w-3 stroke-[3.5]" />
                          </span>
                        )}
                        {!unlocked && (
                          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-[#08122E]/90 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300 tabular-nums border border-amber-400/35">
                            {shorts.unlockCostCoins} 💰
                          </span>
                        )}
                        <div
                          className="flex aspect-[4/3.3] w-full items-center justify-center p-2"
                          style={{
                            background:
                              'repeating-linear-gradient(-32deg, rgba(250,204,21,0.12) 0px, rgba(250,204,21,0.12) 8px, rgba(15,23,42,0.22) 8px, rgba(15,23,42,0.22) 16px), #0B1638',
                          }}
                        >
                          <ShortsCardItemSvg shorts={shorts} className="h-14 w-14 sm:h-16 sm:w-16" />
                        </div>
                        <div className="w-full bg-white px-1.5 py-1 text-center font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-[#0A1330] truncate">
                          {shorts.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'socks' && (
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {SOCKS_CATALOG.map((socks) => {
                    const unlocked = socks.unlockCostCoins === 0 || progress.unlockedIds.includes(socks.id);
                    const equipped = activeSocks.id === socks.id;
                    return (
                      <button
                        key={socks.id}
                        type="button"
                        onClick={() => handleUnlockOrEquip(socks.id, socks.unlockCostCoins, 'socksId')}
                        data-selected={equipped ? 'true' : 'false'}
                        className={`group relative flex flex-col overflow-hidden rounded-xl border-2 bg-[#0E1D47] transition-all hover:brightness-110 ${
                          equipped
                            ? 'border-[#4ADE80] ring-2 ring-[#4ADE80]/40'
                            : 'border-[#1E3675] hover:border-sky-400/70'
                        }`}
                      >
                        {equipped && (
                          <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#4ADE80] text-[#052E16] shadow">
                            <Check className="h-3 w-3 stroke-[3.5]" />
                          </span>
                        )}
                        {!unlocked && (
                          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-[#08122E]/90 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300 tabular-nums border border-amber-400/35">
                            {socks.unlockCostCoins} 💰
                          </span>
                        )}
                        <div
                          className="flex aspect-[4/3.3] w-full items-center justify-center p-2"
                          style={{
                            background:
                              'repeating-linear-gradient(-32deg, rgba(250,204,21,0.12) 0px, rgba(250,204,21,0.12) 8px, rgba(15,23,42,0.22) 8px, rgba(15,23,42,0.22) 16px), #0B1638',
                          }}
                        >
                          <SocksCardItemSvg socks={socks} className="h-14 w-14 sm:h-16 sm:w-16" />
                        </div>
                        <div className="w-full bg-white px-1.5 py-1 text-center font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-[#0A1330] truncate">
                          {socks.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'boots' && (
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {BOOT_CATALOG.map((boot) => {
                    const unlocked = boot.unlockCostCoins === 0 || progress.unlockedIds.includes(boot.id);
                    const equipped = progress.bootId === boot.id;
                    return (
                      <button
                        key={boot.id}
                        type="button"
                        onClick={() => handleUnlockOrEquip(boot.id, boot.unlockCostCoins, 'bootId')}
                        data-selected={equipped ? 'true' : 'false'}
                        className={`group relative flex flex-col overflow-hidden rounded-xl border-2 bg-[#0E1D47] transition-all hover:brightness-110 ${
                          equipped
                            ? 'border-[#4ADE80] ring-2 ring-[#4ADE80]/40'
                            : 'border-[#1E3675] hover:border-sky-400/70'
                        }`}
                      >
                        {equipped && (
                          <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#4ADE80] text-[#052E16] shadow">
                            <Check className="h-3 w-3 stroke-[3.5]" />
                          </span>
                        )}
                        <span className="absolute left-1.5 top-1.5 z-10 rounded bg-[#08122E]/90 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300 tabular-nums border border-emerald-400/35">
                          +{boot.paceBonus} SPD
                        </span>
                        {!unlocked && (
                          <span className="absolute right-1.5 bottom-7 z-10 rounded bg-[#08122E]/90 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300 tabular-nums border border-amber-400/35">
                            {boot.unlockCostCoins} 💰
                          </span>
                        )}
                        <div
                          className="flex aspect-[4/3.3] w-full items-center justify-center p-2"
                          style={{
                            background:
                              'repeating-linear-gradient(-32deg, rgba(16,185,129,0.14) 0px, rgba(16,185,129,0.14) 8px, rgba(15,23,42,0.22) 8px, rgba(15,23,42,0.22) 16px), #0B1638',
                          }}
                        >
                          <BootCardItemSvg boot={boot} className="h-14 w-14 sm:h-16 sm:w-16" />
                        </div>
                        <div className="w-full bg-white px-1.5 py-1 text-center font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-[#0A1330] truncate">
                          {boot.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 5 Vertical Right-Edge Tabs (Balls, Jersey, Shorts, Socks, Boots) */}
          <div className="absolute right-0 top-3 sm:top-20 flex flex-col gap-1.5 sm:gap-2">
            {TAB_CONFIG.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  aria-label={t.label}
                  data-active={isActive ? 'true' : 'false'}
                  className={`flex h-9 w-11 sm:h-13 sm:w-14 items-center justify-center rounded-r-xl border-2 transition-colors ${
                    isActive
                      ? 'border-[#25468D] border-l-[#091335] bg-[#091335] text-white shadow-lg'
                      : 'border-[#25468D] bg-[#16367A]/95 text-sky-100 hover:bg-[#1E4699]'
                  }`}
                >
                  {renderEquipmentTabIcon(t.id)}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
