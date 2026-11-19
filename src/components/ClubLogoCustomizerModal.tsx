import React, { useState } from 'react';
import { ArrowLeft, Check, Pencil, Plus, Shield } from 'lucide-react';
import {
  CLUB_CREATE_COST_GEMS,
  DEFAULT_CLUB_LOGO,
  LOGO_COLOR_PALETTE,
  LOGO_EMBLEM_OPTIONS,
  LOGO_ORNAMENT_OPTIONS,
  LOGO_PATTERN_OPTIONS,
  LOGO_SHIELD_OPTIONS,
} from '../game/catalog';
import type {
  CustomClubLogo,
  LogoEmblemStyle,
  LogoOrnamentStyle,
  LogoPatternStyle,
  LogoShieldShape,
  UserProgress,
} from '../game/types';
import { CustomClubLogoSvg, LogoLayerOptionIcon } from './CustomClubLogoSvg';

export type LogoLayerTab = 'shield' | 'pattern' | 'emblem' | 'ornament';

interface ClubLogoCustomizerModalProps {
  progress: UserProgress;
  title?: string;
  onUpdateProgress: (next: UserProgress) => void;
  onCreateClubWithLogo?: (details: {
    name: string;
    motto: string;
    isOpen: boolean;
    logo: CustomClubLogo;
  }) => void;
  onOpenShopCurrency?: () => void;
  onClose: () => void;
}

const LAYER_LABELS: Record<LogoLayerTab, string> = {
  shield: 'SHIELD SHAPE',
  pattern: 'PATTERN',
  emblem: 'EMBLEM',
  ornament: 'ORNAMENT',
};

function renderTabGlyph(tab: LogoLayerTab): React.ReactNode {
  if (tab === 'shield') {
    return <Shield className="h-5 w-5 fill-current stroke-[2]" />;
  }
  if (tab === 'pattern') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <line x1="4" y1="14" x2="14" y2="4" stroke="currentColor" strokeWidth="2.2" />
        <line x1="6" y1="20" x2="20" y2="6" stroke="currentColor" strokeWidth="2.2" />
        <line x1="12" y1="20" x2="20" y2="12" stroke="currentColor" strokeWidth="2.2" />
      </svg>
    );
  }
  if (tab === 'emblem') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.8" />
        <polygon points="12,7.5 16,10.5 14.5,15 9.5,15 8,10.5" fill="#0F172A" />
        <path
          d="M12 7.5 V3.5 M16 10.5 L20 9 M14.5 15 L17 19 M9.5 15 L7 19 M8 10.5 L4 9"
          stroke="#0F172A"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M6 19 C3.5 15.5 3.5 9.5 7 5.5 C7.5 8 8 10.5 7 13 C5.5 11.5 5 9.5 5 8 C4.5 11.5 5.5 15 8.5 17.5 Z"
        fill="currentColor"
      />
      <path
        d="M18 19 C20.5 15.5 20.5 9.5 17 5.5 C16.5 8 16 10.5 17 13 C18.5 11.5 19 9.5 19 8 C19.5 11.5 18.5 15 15.5 17.5 Z"
        fill="currentColor"
      />
      <circle cx="12" cy="11" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export const ClubLogoCustomizerModal: React.FC<ClubLogoCustomizerModalProps> = ({
  progress,
  title = 'CLUBS',
  onUpdateProgress,
  onCreateClubWithLogo,
  onOpenShopCurrency,
  onClose,
}) => {
  const [activeLayer, setActiveLayer] = useState<LogoLayerTab>('ornament');
  const [draftLogo, setDraftLogo] = useState<CustomClubLogo>(
    () => progress.clubLogo ?? { ...DEFAULT_CLUB_LOGO }
  );
  const [draftName, setDraftName] = useState<string>(progress.clubName || 'CLUB NAME');
  const [draftMotto, setDraftMotto] = useState<string>(progress.clubMotto || 'PLAY TO WIN');
  const [draftOpen, setDraftOpen] = useState<boolean>(progress.clubOpen ?? true);
  const [isEditingInfo, setIsEditingInfo] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const activeColor =
    activeLayer === 'shield'
      ? draftLogo.shieldColor
      : activeLayer === 'pattern'
        ? draftLogo.patternColor
        : activeLayer === 'emblem'
          ? draftLogo.emblemColor
          : draftLogo.ornamentColor;

  const activeOptionId =
    activeLayer === 'shield'
      ? draftLogo.shieldShape
      : activeLayer === 'pattern'
        ? draftLogo.patternStyle
        : activeLayer === 'emblem'
          ? draftLogo.emblemStyle
          : draftLogo.ornamentStyle;

  const layerOptions =
    activeLayer === 'shield'
      ? LOGO_SHIELD_OPTIONS
      : activeLayer === 'pattern'
        ? LOGO_PATTERN_OPTIONS
        : activeLayer === 'emblem'
          ? LOGO_EMBLEM_OPTIONS
          : LOGO_ORNAMENT_OPTIONS;

  const handleSelectOption = (optionId: string) => {
    setFeedbackMsg('');
    if (activeLayer === 'shield') {
      setDraftLogo((prev) => ({ ...prev, shieldShape: optionId as LogoShieldShape }));
    } else if (activeLayer === 'pattern') {
      setDraftLogo((prev) => ({ ...prev, patternStyle: optionId as LogoPatternStyle }));
    } else if (activeLayer === 'emblem') {
      setDraftLogo((prev) => ({ ...prev, emblemStyle: optionId as LogoEmblemStyle }));
    } else {
      setDraftLogo((prev) => ({ ...prev, ornamentStyle: optionId as LogoOrnamentStyle }));
    }
  };

  const handleSelectColor = (color: string) => {
    setFeedbackMsg('');
    if (activeLayer === 'shield') {
      setDraftLogo((prev) => ({ ...prev, shieldColor: color }));
    } else if (activeLayer === 'pattern') {
      setDraftLogo((prev) => ({ ...prev, patternColor: color }));
    } else if (activeLayer === 'emblem') {
      setDraftLogo((prev) => ({ ...prev, emblemColor: color }));
    } else {
      setDraftLogo((prev) => ({ ...prev, ornamentColor: color }));
    }
  };

  const handleSaveLogo = () => {
    const cleanName = draftName.trim().slice(0, 32) || progress.clubName || 'Apex Strikers FC';
    const cleanMotto = draftMotto.trim().slice(0, 48) || 'PLAY TO WIN';
    onUpdateProgress({
      ...progress,
      clubName: cleanName,
      clubMotto: cleanMotto,
      clubOpen: draftOpen,
      clubLogo: draftLogo,
    });
    setIsEditingInfo(false);
    setFeedbackMsg('Club logo equipped across your squad and profile!');
  };

  const handleCreateClub = () => {
    const cleanName = draftName.trim().slice(0, 32) || 'Apex Strikers FC';
    const cleanMotto = draftMotto.trim().slice(0, 48) || 'PLAY TO WIN';
    if (progress.gems < CLUB_CREATE_COST_GEMS) {
      setFeedbackMsg(
        `Needs ${CLUB_CREATE_COST_GEMS} Gems to found a new club (you have ${progress.gems}). Tap Save Logo to equip for free!`
      );
      return;
    }
    const nextProgress: UserProgress = {
      ...progress,
      gems: progress.gems - CLUB_CREATE_COST_GEMS,
      clubName: cleanName,
      clubMotto: cleanMotto,
      clubOpen: draftOpen,
      clubLogo: draftLogo,
    };
    onUpdateProgress(nextProgress);
    if (onCreateClubWithLogo) {
      onCreateClubWithLogo({
        name: cleanName,
        motto: cleanMotto,
        isOpen: draftOpen,
        logo: draftLogo,
      });
    }
    setIsEditingInfo(false);
    setFeedbackMsg(`Club "${cleanName}" created with your custom crest!`);
  };

  return (
    <div
      data-testid="club-logo-customizer"
      className="fixed inset-0 z-50 flex flex-col overflow-hidden select-none"
      style={{
        background:
          'repeating-linear-gradient(180deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 18px, transparent 18px, transparent 38px), linear-gradient(180deg, #1E6BE2 0%, #1655BF 55%, #113D99 100%)',
      }}
    >
      {/* Top Header Bar: Coral Back + Centered CLUBS Title + Gems/Coins Counters */}
      <header className="relative z-10 flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="flex h-10 w-12 sm:h-11 sm:w-14 items-center justify-center rounded-xl border-2 border-white/85 bg-[#EF5A5A] text-white shadow-[0_3px_0_rgba(15,23,42,0.5)] transition-transform hover:brightness-105 active:translate-y-0.5"
        >
          <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 stroke-[3]" />
        </button>

        <h2 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white drop-shadow-[0_2px_0_rgba(10,20,51,0.9)]">
          {title}
        </h2>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Gems Pill */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-[#0A173B]/90 pl-2 pr-1 py-1 shadow-lg">
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
              <polygon points="12,2 21,9 12,22 3,9" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
              <polygon points="12,2 17,9 12,22 7,9" fill="#7DD3FC" opacity="0.65" />
            </svg>
            <span className="font-display text-base sm:text-xl font-extrabold text-white tabular-nums">
              {progress.gems.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onOpenShopCurrency}
              aria-label="Get More Gems"
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-[#22C55E] text-slate-950 shadow hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
            </button>
          </div>

          {/* Coins Pill */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-[#0A173B]/90 pl-2 pr-1 py-1 shadow-lg">
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#FACC15" stroke="#B45309" strokeWidth="1.8" />
              <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="900" fill="#78350F">
                $
              </text>
            </svg>
            <span className="font-display text-base sm:text-xl font-extrabold text-white tabular-nums">
              {progress.coins.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onOpenShopCurrency}
              aria-label="Get More Coins"
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-[#22C55E] text-slate-950 shadow hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Workspace */}
      <main className="custom-scroll flex-1 overflow-y-auto px-3 pb-4 pt-1 sm:px-6">
        <div className="mx-auto grid h-full max-w-6xl grid-cols-1 items-center gap-5 md:grid-cols-12">
          {/* LEFT SHOWCASE: Large Layered Crest + Pencil Button + Info Card + Action Buttons */}
          <section className="md:col-span-6 flex flex-col items-center justify-center gap-3">
            {/* Crest Preview + Floating Blue Pencil Edit Button */}
            <div className="relative flex items-center justify-center">
              <CustomClubLogoSvg
                logo={draftLogo}
                className="h-44 w-48 sm:h-52 sm:w-56 drop-shadow-[0_14px_22px_rgba(6,12,30,0.55)]"
              />
              <button
                type="button"
                onClick={() => setIsEditingInfo((v) => !v)}
                aria-label="Edit club name and motto"
                className="absolute -right-4 bottom-4 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#0B1C4A] bg-[#2D6CDF] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#3B7DF0]"
              >
                <Pencil className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Translucent Navy Club Info Card */}
            <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0A2259]/75 px-5 py-3 text-center shadow-xl">
              {isEditingInfo ? (
                <div className="space-y-2.5 text-left">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-sky-200">
                      Club Name
                    </label>
                    <input
                      type="text"
                      value={draftName}
                      maxLength={32}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="CLUB NAME"
                      className="mt-1 w-full rounded-lg border border-white/25 bg-[#08153A] px-3 py-1.5 font-display text-lg font-extrabold uppercase text-[#FACC15] focus:border-[#4ADE80] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-sky-200">
                      Club Motto
                    </label>
                    <input
                      type="text"
                      value={draftMotto}
                      maxLength={48}
                      onChange={(e) => setDraftMotto(e.target.value)}
                      placeholder="CLUB MOTTO"
                      className="mt-1 w-full rounded-lg border border-white/25 bg-[#08153A] px-3 py-1.5 text-xs font-bold uppercase text-white focus:border-[#4ADE80] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setDraftOpen((v) => !v)}
                      className="rounded-lg border border-sky-400/50 bg-sky-500/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-sky-200"
                    >
                      Privacy: {draftOpen ? 'OPEN' : 'INVITE ONLY'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingInfo(false)}
                      className="rounded-lg bg-[#22C55E] px-4 py-1 text-xs font-extrabold uppercase text-slate-950"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(true)}
                    className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-[#FACC15] drop-shadow-[0_2px_0_rgba(10,18,45,0.85)] hover:brightness-110"
                  >
                    {draftName || 'CLUB NAME'}
                  </button>
                  <div className="mt-0.5 text-xs font-extrabold uppercase tracking-widest text-white/95">
                    {draftMotto || 'CLUB MOTTO'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraftOpen((v) => !v)}
                    className="mt-1 text-xs font-extrabold uppercase tracking-widest text-[#38BDF8] hover:underline"
                  >
                    {draftOpen ? 'OPEN' : 'INVITE ONLY'}
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons: Save Logo (Free) & Create Club (250 Gems) */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleSaveLogo}
                data-testid="save-club-logo-btn"
                className="flex flex-col items-center justify-center rounded-xl border-2 border-[#A7F3D0] bg-gradient-to-b from-[#22C55E] to-[#15803D] px-6 py-2 font-display text-white shadow-[0_4px_0_#052E16] transition-transform hover:brightness-105 active:translate-y-0.5"
              >
                <span className="text-base sm:text-lg font-extrabold uppercase tracking-wider leading-tight">
                  SAVE LOGO
                </span>
                <span className="text-[11px] font-bold uppercase text-emerald-100">FREE EQUIP</span>
              </button>

              <button
                type="button"
                onClick={handleCreateClub}
                data-testid="create-club-logo-btn"
                className="flex flex-col items-center justify-center rounded-xl border-2 border-white/60 bg-gradient-to-b from-[#5E9BA4] to-[#417882] px-6 py-2 font-display text-white shadow-[0_4px_0_#1E3A4C] transition-transform hover:brightness-105 active:translate-y-0.5"
              >
                <span className="text-base sm:text-lg font-extrabold uppercase tracking-wider leading-tight">
                  CREATE CLUB
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-xs font-extrabold tabular-nums">
                  {CLUB_CREATE_COST_GEMS}
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                    <polygon points="12,2 21,9 12,22 3,9" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
                  </svg>
                </span>
              </button>
            </div>

            <div className="text-center">
              {feedbackMsg ? (
                <div className="rounded-lg border border-emerald-400/50 bg-[#0A173B]/90 px-3.5 py-1.5 text-xs font-bold text-emerald-300 shadow">
                  {feedbackMsg}
                </div>
              ) : (
                <p className="font-display text-xs font-bold uppercase tracking-wider text-white/95 drop-shadow">
                  CUSTOMIZE YOUR CLUB TO CREATE
                </p>
              )}
            </div>
          </section>

          {/* RIGHT PANEL: Dark Navy Layer Drawer + Vertical 4-Tab Strip */}
          <section className="md:col-span-6 flex items-stretch justify-center">
            <div className="flex w-full max-w-xl items-stretch">
              {/* Navy Drawer Body */}
              <div className="flex-1 rounded-2xl border-2 border-[#27488F] bg-[#0A1434]/95 p-3.5 sm:p-4 shadow-2xl">
                {/* Active Layer Banner */}
                <div className="flex items-center gap-2 rounded-lg bg-[#0E1E4A] px-3 py-2 text-white border border-white/10">
                  <span className="text-white">{renderTabGlyph(activeLayer)}</span>
                  <h3 className="font-display text-lg sm:text-xl font-extrabold uppercase tracking-wider">
                    {LAYER_LABELS[activeLayer]}
                  </h3>
                </div>

                {/* 3x2 Options Grid */}
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {layerOptions.map((opt) => {
                    const isSelected = activeOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(opt.id)}
                        aria-label={`${LAYER_LABELS[activeLayer]} ${opt.label}`}
                        data-selected={isSelected ? 'true' : 'false'}
                        className={`relative flex aspect-[4/3] items-center justify-center rounded-xl border-2 bg-[#0F1E49] p-2 transition-all hover:bg-[#16295E] ${
                          isSelected
                            ? 'border-[#4ADE80] shadow-[0_0_0_1px_rgba(74,222,128,0.4)]'
                            : 'border-[#1E3572] hover:border-sky-400/50'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#4ADE80] text-[#052E16] shadow">
                            <Check className="h-3 w-3 stroke-[3.5]" />
                          </span>
                        )}
                        <LogoLayerOptionIcon
                          layer={activeLayer}
                          optionId={opt.id}
                          className="h-14 w-14 sm:h-16 sm:w-16"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* 16-Color 2x8 Swatch Palette */}
                <div className="mt-4 border-t border-white/10 pt-3">
                  <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                    {LOGO_COLOR_PALETTE.map((hex) => {
                      const isColorSelected = activeColor.toUpperCase() === hex.toUpperCase();
                      return (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => handleSelectColor(hex)}
                          aria-label={`Color ${hex}`}
                          data-selected={isColorSelected ? 'true' : 'false'}
                          className={`relative aspect-square w-full rounded-full border-2 transition-transform hover:scale-105 ${
                            isColorSelected
                              ? 'border-[#4ADE80] scale-105 ring-2 ring-[#4ADE80]/60'
                              : 'border-white/90'
                          }`}
                          style={{ backgroundColor: hex }}
                        >
                          {isColorSelected && (
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#4ADE80] text-[#052E16] shadow">
                              <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right-Edge Vertical 4 Layer Tabs */}
              <div className="flex flex-col justify-start gap-2 pt-5 -ml-[2px]">
                {(['shield', 'pattern', 'emblem', 'ornament'] as LogoLayerTab[]).map((tab) => {
                  const isActive = activeLayer === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveLayer(tab)}
                      aria-label={LAYER_LABELS[tab]}
                      data-active={isActive ? 'true' : 'false'}
                      className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-r-xl border-2 transition-colors ${
                        isActive
                          ? 'border-[#27488F] border-l-[#0A1434] bg-[#0A1434] text-white shadow-lg'
                          : 'border-[#27488F] bg-[#16367A]/90 text-sky-100 hover:bg-[#1E4699]'
                      }`}
                    >
                      {renderTabGlyph(tab)}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
