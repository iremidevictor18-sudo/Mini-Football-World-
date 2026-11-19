import React, { useState } from 'react';
import { Coins, Gem, PackageOpen, Sparkles, X } from 'lucide-react';
import { getCardEffectiveStats, PLAYER_CARDS, RARITY_COLORS } from '../game/catalog';
import { buyShopPack, type PackRewardOutcome } from '../game/menuSystems';
import type { PackTier, UserProgress } from '../game/types';
import { PremiumPlayerCard } from './PremiumPlayerCard';

interface ShopModalProps {
  progress: UserProgress;
  initialTab?: 'packs' | 'currency' | 'cards';
  onUpdateProgress: (next: UserProgress) => void;
  onClose: () => void;
}

const PACK_OFFERS: Array<{
  tier: PackTier;
  title: string;
  desc: string;
  currency: 'coins' | 'gems';
  cost: number;
  accent: string;
}> = [
  {
    tier: 'Bronze',
    title: 'Bronze Kit & Coin Pack',
    desc: '90–150 Coins, +2 Gems & Common/Rare card chance',
    currency: 'coins',
    cost: 220,
    accent: '#CD7F32',
  },
  {
    tier: 'Silver',
    title: 'Silver Pro Pack',
    desc: '160–260 Coins, +5 Gems & guaranteed unlocked star or duplicate bonus',
    currency: 'gems',
    cost: 25,
    accent: '#94A3B8',
  },
  {
    tier: 'Gold',
    title: 'Gold Elite Pack',
    desc: '280–460 Coins, +10 Gems & high-tier Rare/Epic/Legendary odds',
    currency: 'gems',
    cost: 55,
    accent: '#FACC15',
  },
  {
    tier: 'Pro',
    title: 'Mythical Legend Bag',
    desc: '450–750 Coins, +18 Gems & top-tier star unlock guaranteed',
    currency: 'gems',
    cost: 110,
    accent: '#F43F5E',
  },
];

export const ShopModal: React.FC<ShopModalProps> = ({
  progress,
  initialTab = 'packs',
  onUpdateProgress,
  onClose,
}) => {
  const [tab, setTab] = useState<'packs' | 'currency' | 'cards'>(initialTab);
  const [rewardBanner, setRewardBanner] = useState<PackRewardOutcome | null>(null);
  const [shopMsg, setShopMsg] = useState('');

  const handleBuyPack = (tier: PackTier, currency: 'coins' | 'gems', cost: number) => {
    const res = buyShopPack(progress, tier, currency, cost);
    if (!res) {
      setShopMsg(`Not enough ${currency === 'coins' ? 'Coins' : 'Gems'} for ${tier} Pack.`);
      return;
    }
    onUpdateProgress(res.updated);
    setRewardBanner(res);
    setShopMsg('');
  };

  const handleExchangeGemsForCoins = (gemCost: number, coinGain: number) => {
    if (progress.gems < gemCost) {
      setShopMsg(`Need ${gemCost} Gems for this coin bundle.`);
      return;
    }
    onUpdateProgress({
      ...progress,
      gems: progress.gems - gemCost,
      coins: progress.coins + coinGain,
    });
    setShopMsg(`Exchanged ${gemCost} Gems for +${coinGain.toLocaleString()} Coins!`);
  };

  const handleClaimStarterGems = () => {
    if (progress.unlockedIds.includes('starter_welcome_claimed')) return;
    onUpdateProgress({
      ...progress,
      coins: progress.coins + 500,
      gems: progress.gems + 40,
      unlockedIds: [...progress.unlockedIds, 'starter_welcome_claimed'],
    });
    setShopMsg('Welcome Starter Pack claimed: +500 Coins and +40 Gems!');
  };

  const handleBuyCard = (cardId: string, costCoins: number, nickname: string) => {
    if (progress.unlockedIds.includes(cardId) || progress.coins < costCoins) return;
    onUpdateProgress({
      ...progress,
      coins: progress.coins - costCoins,
      unlockedIds: [...progress.unlockedIds, cardId],
      cardLevels: { ...progress.cardLevels, [cardId]: 1 },
    });
    setShopMsg(`Signed ${nickname} to your club roster!`);
  };

  const lockedCards = PLAYER_CARDS.filter((c) => !progress.unlockedIds.includes(c.id));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 10, 20, 0.85)' }}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-white/15 bg-[#11192B] shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-wide text-white">Club Shop & Transfer Market</h2>
            <div className="flex items-center gap-3 text-xs text-slate-300 tabular-nums">
              <span className="text-amber-300 font-semibold">{progress.coins.toLocaleString()} Coins</span>
              <span>·</span>
              <span className="text-sky-300 font-semibold">{progress.gems} Gems</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Shop"
            className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 flex gap-2 border-b border-white/10 px-6 py-3 overflow-x-auto">
          {[
            { id: 'packs', label: 'Card Packs' },
            { id: 'currency', label: 'Coins & Gems' },
            { id: 'cards', label: `Sign Players (${lockedCards.length})` },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === item.id ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-6 space-y-5">
          {rewardBanner && (
            <div className="rounded-xl border border-amber-400/50 bg-amber-400/15 p-4 text-sm text-amber-100">
              <div className="font-display text-xl font-extrabold text-amber-300">Pack Opened!</div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs tabular-nums">
                <span className="font-bold text-emerald-300">+{rewardBanner.coinsAwarded} Coins</span>
                <span className="font-bold text-sky-300">+{rewardBanner.gemsAwarded} Gems</span>
                <span className="font-bold text-amber-200">+{rewardBanner.xpAwarded} XP</span>
                {rewardBanner.cardReward && (
                  <span className="font-bold text-white">
                    {rewardBanner.isDuplicateBonus ? 'Duplicate Bonus:' : 'New Star Unlocked:'} {rewardBanner.cardReward.nickname} ({rewardBanner.cardReward.rarity})
                  </span>
                )}
              </div>
            </div>
          )}

          {shopMsg && (
            <div className="rounded-lg border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-xs text-sky-200">
              {shopMsg}
            </div>
          )}

          {tab === 'packs' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {PACK_OFFERS.map((offer) => {
                const canAfford =
                  offer.currency === 'coins' ? progress.coins >= offer.cost : progress.gems >= offer.cost;
                return (
                  <div
                    key={offer.tier}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-900 p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-display text-2xl font-extrabold text-white">{offer.title}</span>
                        <PackageOpen className="h-6 w-6" style={{ color: offer.accent }} />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-300">{offer.desc}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handleBuyPack(offer.tier, offer.currency, offer.cost)}
                      className={`mt-5 w-full rounded-xl py-2.5 text-xs font-extrabold transition-colors ${
                        canAfford
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Open Pack ({offer.cost} {offer.currency === 'coins' ? 'Coins' : 'Gems'})
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'currency' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-5">
                <div>
                  <div className="flex items-center gap-2 font-display text-2xl font-extrabold text-amber-300">
                    <Sparkles className="h-5 w-5" />
                    <span>Welcome Starter Offer</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-200">
                    Claim a one-time club boost of +500 Coins and +40 Gems!
                  </p>
                </div>
                <button
                  type="button"
                  disabled={progress.unlockedIds.includes('starter_welcome_claimed')}
                  onClick={handleClaimStarterGems}
                  className={`rounded-xl px-5 py-2.5 text-xs font-extrabold ${
                    progress.unlockedIds.includes('starter_welcome_claimed')
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  }`}
                >
                  {progress.unlockedIds.includes('starter_welcome_claimed') ? 'Claimed' : 'Claim Free Bundle'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { coins: 400, gemsCost: 20, label: 'Small Coin Bag' },
                  { coins: 1200, gemsCost: 50, label: 'Club Vault Stack' },
                  { coins: 3000, gemsCost: 110, label: 'Champion Treasury' },
                ].map((b) => (
                  <div
                    key={b.label}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-900 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-amber-300 font-display text-xl font-bold">
                        <Coins className="h-5 w-5" />
                        <span>+{b.coins.toLocaleString()} Coins</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{b.label}</div>
                    </div>
                    <button
                      type="button"
                      disabled={progress.gems < b.gemsCost}
                      onClick={() => handleExchangeGemsForCoins(b.gemsCost, b.coins)}
                      className={`mt-4 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold ${
                        progress.gems >= b.gemsCost
                          ? 'bg-sky-400 text-slate-950 hover:bg-sky-300'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Gem className="h-3.5 w-3.5" />
                      <span>Exchange {b.gemsCost} Gems</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'cards' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lockedCards.length === 0 ? (
                <div className="col-span-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center text-sm text-emerald-200">
                  Every star player card is already signed to your club!
                </div>
              ) : (
                lockedCards.map((card) => {
                  const canAfford = progress.coins >= card.unlockCostCoins;
                  const baseEff = getCardEffectiveStats(card, 1);
                  return (
                    <PremiumPlayerCard key={card.id} rarity={card.rarity}>
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: RARITY_COLORS[card.rarity] }}>
                              {card.rarity} · {card.role} #{card.number}
                            </div>
                            <div className="font-display text-xl font-bold text-white">{card.nickname}</div>
                            <div className="text-xs text-slate-400">{card.parodyNote}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-3xl font-extrabold text-amber-400 tabular-nums">{baseEff.ovr}</div>
                            <div className="text-[10px] text-slate-400 uppercase">OVR</div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[11px] tabular-nums">
                          <div className="rounded bg-slate-800/90 py-1">
                            <div className="text-slate-400">PAC</div>
                            <div className="font-bold text-white">{baseEff.pace}</div>
                          </div>
                          <div className="rounded bg-slate-800/90 py-1">
                            <div className="text-slate-400">SHO</div>
                            <div className="font-bold text-white">{baseEff.shooting}</div>
                          </div>
                          <div className="rounded bg-slate-800/90 py-1">
                            <div className="text-slate-400">PAS</div>
                            <div className="font-bold text-white">{baseEff.passing}</div>
                          </div>
                          <div className="rounded bg-slate-800/90 py-1">
                            <div className="text-slate-400">TAC</div>
                            <div className="font-bold text-white">{baseEff.tackling}</div>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => handleBuyCard(card.id, card.unlockCostCoins, card.nickname)}
                        className={`mt-4 w-full rounded-lg py-2 text-xs font-bold ${
                          canAfford
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Sign ({card.unlockCostCoins} Coins)
                      </button>
                    </PremiumPlayerCard>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
