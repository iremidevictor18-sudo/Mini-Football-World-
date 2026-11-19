import React, { useEffect, useState } from 'react';
import { X, Gift, Package, Crown, Plus } from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  DAILY_REWARDS,
  LEAGUE_TIERS,
  MISSIONS,
  PLAYER_CARDS,
  RARITY_COLORS,
} from '../game/catalog';
import {
  createClubInCloud,
  createTournamentInCloud,
  fetchClubs,
  fetchLeaderboard,
  fetchTournaments,
} from '../firebase/client';
import type {
  ClubInfo,
  CustomClubLogo,
  LeaderboardRow,
  SubscriptionTier,
  TournamentInfo,
  UserProgress,
} from '../game/types';
import { ClubLogoCustomizerModal } from './ClubLogoCustomizerModal';
import { CustomClubLogoSvg } from './CustomClubLogoSvg';

interface ClubsLeaguesModalProps {
  progress: UserProgress;
  firebaseUser: User | null;
  onUpdateProgress: (next: UserProgress) => void;
  onOpenShopCurrency?: () => void;
  onClose: () => void;
}

const DEFAULT_RIVALS: Array<LeaderboardRow & { countryCode: string }> = [
  { userId: 'bot_1', displayName: 'Z. Karat', clubName: 'Nordic Crown FC', trophies: 2640, leagueTier: 'Football Legend', wins: 68, countryCode: 'PT' },
  { userId: 'bot_2', displayName: 'Samba King', clubName: 'Rio Futsal', trophies: 1720, leagueTier: 'Diamond', wins: 45, countryCode: 'BR' },
  { userId: 'bot_3', displayName: 'El Maestro', clubName: 'Catalan Magic', trophies: 1120, leagueTier: 'Platinum', wins: 31, countryCode: 'ES' },
  { userId: 'bot_4', displayName: 'Turbo Fox', clubName: 'Midlands Blitz', trophies: 640, leagueTier: 'Gold', wins: 19, countryCode: 'GB' },
  { userId: 'bot_5', displayName: 'Lisbon Rocket', clubName: 'Tejo Athletic', trophies: 420, leagueTier: 'Silver', wins: 12, countryCode: 'PT' },
];

export const ClubsLeaguesModal: React.FC<ClubsLeaguesModalProps> = ({
  progress,
  firebaseUser,
  onUpdateProgress,
  onOpenShopCurrency,
  onClose,
}) => {
  const [tab, setTab] = useState<'leagues' | 'clubs' | 'rewards' | 'pass'>('leagues');
  const [showLogoStudio, setShowLogoStudio] = useState(false);
  const [rankingScope, setRankingScope] = useState<'global' | 'country'>('global');
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>(DEFAULT_RIVALS);
  const [clubs, setClubs] = useState<ClubInfo[]>([
    {
      clubId: 'seed_club_1',
      name: 'Emerald Legends',
      tag: 'EMLD',
      ownerId: 'system',
      leagueTier: 'Gold',
      memberCount: 18,
      totalTrophies: 8420,
      crestColor: '#10B981',
    },
    {
      clubId: 'seed_club_2',
      name: 'Samba Street XI',
      tag: 'SMBA',
      ownerId: 'system',
      leagueTier: 'Platinum',
      memberCount: 24,
      totalTrophies: 12900,
      crestColor: '#F59E0B',
    },
  ]);
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([
    {
      tournamentId: 'seed_cup_1',
      title: 'Weekend Arcade Cup',
      ownerId: 'system',
      status: 'open',
      maxTeams: 8,
      entryFeeCoins: 100,
      prizeCoins: 1200,
    },
  ]);

  const [newClubName, setNewClubName] = useState('');
  const [newClubTag, setNewClubTag] = useState('');
  const [newCupTitle, setNewCupTitle] = useState('');
  const [lootResult, setLootResult] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');

  useEffect(() => {
    if (!firebaseUser) return;
    fetchLeaderboard()
      .then((rows) => {
        if (rows.length > 0) setLeaderboard(rows);
      })
      .catch(() => {});
    fetchClubs()
      .then((rows) => {
        if (rows.length > 0) setClubs((prev) => [...rows, ...prev.filter((p) => p.ownerId === 'system')]);
      })
      .catch(() => {});
    fetchTournaments()
      .then((rows) => {
        if (rows.length > 0) setTournaments((prev) => [...rows, ...prev.filter((p) => p.ownerId === 'system')]);
      })
      .catch(() => {});
  }, [firebaseUser]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const dailyClaimedToday = progress.lastDailyClaimAt.slice(0, 10) === todayStr;

  const handleClaimDaily = () => {
    if (dailyClaimedToday) return;
    const reward = DAILY_REWARDS[progress.dailyRewardStreak % DAILY_REWARDS.length];
    onUpdateProgress({
      ...progress,
      coins: progress.coins + reward.coins,
      gems: progress.gems + reward.gems,
      dailyRewardStreak: progress.dailyRewardStreak + 1,
      lastDailyClaimAt: new Date().toISOString(),
    });
    setLootResult(`Daily Reward Claimed: +${reward.coins} Coins and +${reward.gems} Gems!`);
  };

  const handleOpenLootBag = () => {
    const costGems = 15;
    if (progress.gems < costGems) {
      setLootResult('Need 15 Gems to open a Pro Loot Bag.');
      return;
    }
    const locked = PLAYER_CARDS.filter((c) => !progress.unlockedIds.includes(c.id));
    if (locked.length > 0) {
      const picked = locked[Math.floor(Math.random() * locked.length)];
      onUpdateProgress({
        ...progress,
        gems: progress.gems - costGems,
        unlockedIds: [...progress.unlockedIds, picked.id],
        cardLevels: { ...progress.cardLevels, [picked.id]: 1 },
      });
      setLootResult(`Loot Bag Unlocked ${picked.rarity} Star: ${picked.nickname}!`);
    } else {
      const bonusCoins = 450;
      onUpdateProgress({
        ...progress,
        gems: progress.gems - costGems,
        coins: progress.coins + bonusCoins,
      });
      setLootResult(`All stars owned! Duplicate fragment bonus: +${bonusCoins} Coins!`);
    }
  };

  const handleClaimMission = (missionId: string, rewardCoins: number, rewardGems: number) => {
    if (progress.claimedMissions.includes(missionId)) return;
    onUpdateProgress({
      ...progress,
      coins: progress.coins + rewardCoins,
      gems: progress.gems + rewardGems,
      claimedMissions: [...progress.claimedMissions, missionId],
    });
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newClubName.trim().length < 2 || newClubTag.trim().length < 2) return;
    if (firebaseUser) {
      try {
        const created = await createClubInCloud(firebaseUser, progress, newClubName, newClubTag, '#10B981');
        setClubs((prev) => [created, ...prev]);
        onUpdateProgress({ ...progress, clubName: created.name });
        setStatusMsg(`Club "${created.name}" synced to cloud!`);
      } catch (err) {
        setStatusMsg(err instanceof Error ? err.message : 'Cloud club creation failed.');
      }
    } else {
      const localClub: ClubInfo = {
        clubId: `local_club_${Date.now()}`,
        name: newClubName.trim(),
        tag: newClubTag.trim().toUpperCase().slice(0, 5),
        ownerId: progress.uid,
        leagueTier: progress.leagueTier,
        memberCount: 1,
        totalTrophies: progress.trophies,
        crestColor: '#10B981',
      };
      setClubs((prev) => [localClub, ...prev]);
      onUpdateProgress({ ...progress, clubName: localClub.name });
      setStatusMsg(`Club "${localClub.name}" created locally!`);
    }
    setNewClubName('');
    setNewClubTag('');
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCupTitle.trim().length < 2) return;
    if (firebaseUser) {
      try {
        const cup = await createTournamentInCloud(firebaseUser, newCupTitle, 8, 1500);
        setTournaments((prev) => [cup, ...prev]);
        setStatusMsg(`Tournament "${cup.title}" created!`);
      } catch (err) {
        setStatusMsg(err instanceof Error ? err.message : 'Could not create tournament.');
      }
    } else {
      setTournaments((prev) => [
        {
          tournamentId: `local_cup_${Date.now()}`,
          title: newCupTitle.trim(),
          ownerId: progress.uid,
          status: 'open',
          maxTeams: 8,
          entryFeeCoins: 100,
          prizeCoins: 1500,
        },
        ...prev,
      ]);
      setStatusMsg(`Local Tournament "${newCupTitle.trim()}" created!`);
    }
    setNewCupTitle('');
  };

  const handleSelectTier = (tier: SubscriptionTier) => {
    onUpdateProgress({ ...progress, subscriptionTier: tier });
    setStatusMsg(`Subscription tier updated to ${tier}.`);
  };

  if (showLogoStudio) {
    return (
      <ClubLogoCustomizerModal
        progress={progress}
        title="CLUBS"
        onUpdateProgress={onUpdateProgress}
        onOpenShopCurrency={onOpenShopCurrency}
        onCreateClubWithLogo={async ({ name, motto, isOpen, logo }) => {
          const cleanTag = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'CLUB';
          if (firebaseUser) {
            try {
              const created = await createClubInCloud(firebaseUser, progress, name, cleanTag, logo.shieldColor);
              setClubs((prev) => [{ ...created, motto, isOpen, clubLogo: logo }, ...prev]);
              setStatusMsg(`Club "${created.name}" created & synced!`);
              return;
            } catch {
              // Fallback to local club entry
            }
          }
          setClubs((prev) => [
            {
              clubId: `custom_club_${Date.now()}`,
              name,
              tag: cleanTag,
              ownerId: progress.uid,
              leagueTier: progress.leagueTier,
              memberCount: 1,
              totalTrophies: progress.trophies,
              crestColor: logo.shieldColor,
              motto,
              isOpen,
              clubLogo: logo,
            },
            ...prev,
          ]);
          setStatusMsg(`Club "${name}" created with custom logo!`);
        }}
        onClose={() => setShowLogoStudio(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 10, 20, 0.84)' }}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-white/15 bg-[#11192B] shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-wide text-white">
              Leagues, Clubs, Rewards & Tournaments
            </h2>
            <div className="text-xs text-slate-300 tabular-nums">
              {progress.leagueTier} Tier · {progress.trophies} Trophies · {progress.subscriptionTier}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Clubs and Leagues"
            className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 flex gap-2 border-b border-white/10 px-6 py-3 overflow-x-auto">
          {[
            { id: 'leagues', label: 'League Ladder & Rivals' },
            { id: 'clubs', label: 'Clubs & Custom Cups' },
            { id: 'rewards', label: 'Daily Rewards & Loot Bags' },
            { id: 'pass', label: 'Season Pass Tiers' },
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

        <div className="custom-scroll flex-1 overflow-y-auto p-6 space-y-6">
          {statusMsg && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">
              {statusMsg}
            </div>
          )}

          {tab === 'leagues' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-display text-lg font-bold text-white">Competitive League Tiers</h3>
                <div className="mt-2 space-y-2">
                  {LEAGUE_TIERS.map((tier) => {
                    const reached = progress.trophies >= tier.minTrophies;
                    return (
                      <div
                        key={tier.name}
                        className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs ${
                          progress.leagueTier === tier.name
                            ? 'border-amber-400 bg-amber-400/15'
                            : 'border-white/10 bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tier.color }} />
                          <span className="font-semibold text-white">{tier.name}</span>
                        </div>
                        <div className="font-mono-num text-slate-300">
                          {tier.minTrophies}+ Trophies · {reached ? 'Unlocked' : 'Locked'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-white">Rankings Leaderboard</h3>
                  <div className="flex gap-1 rounded-lg bg-slate-900 p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setRankingScope('global')}
                      className={`rounded px-2.5 py-1 text-[11px] font-bold ${
                        rankingScope === 'global' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Global
                    </button>
                    <button
                      type="button"
                      onClick={() => setRankingScope('country')}
                      className={`rounded px-2.5 py-1 text-[11px] font-bold ${
                        rankingScope === 'country' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Country ({progress.countryCode})
                    </button>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {[
                    ...leaderboard.filter((row) => {
                      if (rankingScope === 'global') return true;
                      const c = (row as LeaderboardRow & { countryCode?: string }).countryCode;
                      return !c || c === progress.countryCode;
                    }),
                    {
                      userId: progress.uid,
                      displayName: `${progress.displayName} (You)`,
                      clubName: progress.clubName,
                      trophies: progress.trophies,
                      leagueTier: progress.leagueTier,
                      wins: progress.wins,
                    },
                  ]
                    .sort((a, b) => b.trophies - a.trophies)
                    .slice(0, 8)
                    .map((row, idx) => (
                      <div
                        key={`${row.userId}_${idx}`}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono-num font-bold text-slate-400">#{idx + 1}</span>
                          <div>
                            <div className="font-semibold text-white">{row.displayName}</div>
                            <div className="text-[11px] text-slate-400">{row.clubName} · {row.leagueTier}</div>
                          </div>
                        </div>
                        <span className="font-mono-num font-bold text-amber-400">{row.trophies}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'clubs' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-white">Football Clubs</h3>
                  <button
                    type="button"
                    onClick={() => setShowLogoStudio(true)}
                    className="flex items-center gap-2 rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-500/30"
                  >
                    <CustomClubLogoSvg logo={progress.clubLogo} className="h-5 w-5" />
                    <span>Customize Logo & Create Club</span>
                  </button>
                </div>
                <form onSubmit={handleCreateClub} className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                    placeholder="Club Name"
                    className="flex-1 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newClubTag}
                    onChange={(e) => setNewClubTag(e.target.value)}
                    placeholder="TAG"
                    maxLength={5}
                    className="w-20 rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 text-xs text-white uppercase"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create
                  </button>
                </form>

                <div className="mt-3 space-y-2">
                  {clubs.map((c) => (
                    <div
                      key={c.clubId}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        {c.clubLogo && <CustomClubLogoSvg logo={c.clubLogo} className="h-8 w-8 shrink-0" />}
                        <div>
                          <div className="font-semibold text-white">[{c.tag}] {c.name}</div>
                          <div className="text-[11px] text-slate-400 tabular-nums">
                            {c.memberCount} Members · {c.totalTrophies} Trophies
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateProgress({ ...progress, clubName: c.name });
                          setStatusMsg(`Joined club ${c.name}!`);
                        }}
                        className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                      >
                        {progress.clubName === c.name ? 'Active Club' : 'Join'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-display text-lg font-bold text-white">Play With Friends & Custom Cups</h3>
                <div className="mt-2 mb-3 flex items-center justify-between gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 p-3 text-xs">
                  <div>
                    <div className="font-bold text-white">Friend Match Room Code</div>
                    <div className="text-[11px] text-sky-200 font-mono-num">
                      MFW-{progress.uid.slice(0, 4).toUpperCase()}-{progress.clubName.slice(0, 3).toUpperCase()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const code = `MFW-${progress.uid.slice(0, 4).toUpperCase()}-${progress.clubName.slice(0, 3).toUpperCase()}`;
                      navigator.clipboard?.writeText(`Join my Mini Football World club match! Code: ${code}`).catch(() => {});
                      setStatusMsg(`Friend invite code ${code} copied to clipboard!`);
                    }}
                    className="rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-300"
                  >
                    Invite Friend
                  </button>
                </div>
                <form onSubmit={handleCreateTournament} className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newCupTitle}
                    onChange={(e) => setNewCupTitle(e.target.value)}
                    placeholder="Tournament Title (e.g. Friday Cup)"
                    className="flex-1 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Host
                  </button>
                </form>
                <div className="mt-3 space-y-2">
                  {tournaments.map((cup) => (
                    <div
                      key={cup.tournamentId}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{cup.title}</div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          {cup.maxTeams} Teams · Prize {cup.prizeCoins} Coins · {cup.status}
                        </div>
                      </div>
                      <span className="font-mono-num text-emerald-400 font-semibold">Open</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'rewards' && (
            <div className="space-y-6">
              {lootResult && (
                <div className="rounded-xl border border-amber-400/50 bg-amber-400/15 px-4 py-3 text-sm font-semibold text-amber-200">
                  {lootResult}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                      <Gift className="h-5 w-5 text-emerald-400" />
                      Daily Login Rewards
                    </h3>
                    <button
                      type="button"
                      disabled={dailyClaimedToday}
                      onClick={handleClaimDaily}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold ${
                        dailyClaimedToday
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                      }`}
                    >
                      {dailyClaimedToday ? 'Claimed Today' : `Claim Day ${(progress.dailyRewardStreak % 7) + 1}`}
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[11px]">
                    {DAILY_REWARDS.map((r, i) => (
                      <div
                        key={r.day}
                        className={`rounded-lg border p-2 ${
                          i < progress.dailyRewardStreak % 7
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-white/10 bg-slate-800/70 text-slate-300'
                        }`}
                      >
                        <div className="font-bold">D{r.day}</div>
                        <div className="font-mono-num text-[10px]">{r.coins}c</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900 p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                      <Package className="h-5 w-5 text-purple-400" />
                      Pro Star Loot Bag
                    </h3>
                    <p className="mt-1 text-xs text-slate-300">
                      Guaranteed player card unlock or 450 duplicate Coins! Includes Mythical & Legendary parody stars.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenLootBag}
                    className="mt-4 w-full rounded-xl py-2.5 text-xs font-bold text-white hover:opacity-90"
                    style={{ backgroundColor: RARITY_COLORS.Epic }}
                  >
                    Open Loot Bag (15 Gems)
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-display text-lg font-bold text-white">Career Milestones</h3>
                <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {MISSIONS.map((m) => {
                    const currentVal = progress[m.progressKey];
                    const done = currentVal >= m.target;
                    const claimed = progress.claimedMissions.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 p-3.5 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white">{m.title}</div>
                          <div className="text-[11px] text-slate-400 tabular-nums">
                            Progress: {Math.min(currentVal, m.target)} / {m.target} · +{m.rewardCoins}c +{m.rewardGems}g
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!done || claimed}
                          onClick={() => handleClaimMission(m.id, m.rewardCoins, m.rewardGems)}
                          className={`rounded-lg px-3 py-1.5 font-bold ${
                            claimed
                              ? 'bg-slate-800 text-slate-500'
                              : done
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {claimed ? 'Claimed' : done ? 'Claim' : 'In Progress'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'pass' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  tier: 'Free' as SubscriptionTier,
                  price: 'Free Forever',
                  perks: ['Full 6v6 Arcade Matches', 'Offline Practice Mode', 'Daily Rewards & Missions'],
                },
                {
                  tier: 'Pro Pass' as SubscriptionTier,
                  price: '+25% Match Coins',
                  perks: ['Ad-Free Stadium Experience', '+25% Coin Bonus Every Match', 'Priority Cup Access'],
                },
                {
                  tier: 'Legend VIP' as SubscriptionTier,
                  price: '+50% Coins & Exclusives',
                  perks: ['Ad-Free + VIP Tournaments', '+50% Match Coin Multiplier', 'Exclusive Legend Badge'],
                },
              ].map((plan) => {
                const active = progress.subscriptionTier === plan.tier;
                return (
                  <div
                    key={plan.tier}
                    className={`flex flex-col justify-between rounded-xl border p-5 ${
                      active ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-display text-2xl font-extrabold text-white">
                        <Crown className="h-5 w-5 text-amber-400" />
                        <span>{plan.tier}</span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-emerald-400">{plan.price}</div>
                      <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                        {plan.perks.map((perk) => (
                          <li key={perk}>· {perk}</li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectTier(plan.tier)}
                      className={`mt-5 w-full rounded-lg py-2 text-xs font-bold ${
                        active ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}
                    >
                      {active ? 'Current Tier' : `Activate ${plan.tier}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
