import React, { useMemo, useState } from 'react';
import { X, Cloud, LogIn, LogOut, Check, Shield, BarChart3, Radar as RadarIcon } from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { signInWithGoogle, signOutUser, syncUserProfileToCloud } from '../firebase/client';
import { COUNTRY_OPTIONS, CREST_CATALOG, RARITY_COLORS } from '../game/catalog';
import { computeSquadAnalysis, getPlayerLevelInfo } from '../game/menuSystems';
import type { UserProgress } from '../game/types';
import { CustomClubLogoSvg } from './CustomClubLogoSvg';
import { ClubCrestSvg } from './EquipmentModal';

interface AnalyticsProfileModalProps {
  progress: UserProgress;
  firebaseUser: User | null;
  isOnline: boolean;
  onUpdateProgress: (next: UserProgress) => void;
  onClose: () => void;
}

export const AnalyticsProfileModal: React.FC<AnalyticsProfileModalProps> = ({
  progress,
  firebaseUser,
  isOnline,
  onUpdateProgress,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'squad'>('overview');
  const [syncStatus, setSyncStatus] = useState('');
  const [editingName, setEditingName] = useState(progress.displayName);
  const [editingClub, setEditingClub] = useState(progress.clubName);

  const squadAnalysis = useMemo(() => computeSquadAnalysis(progress), [progress]);
  const levelInfo = getPlayerLevelInfo(progress.xp);
  const activeCrest = CREST_CATALOG.find((c) => c.id === progress.crestId) ?? CREST_CATALOG[0];
  const winRate = progress.matchesPlayed > 0 ? Math.round((progress.wins / progress.matchesPlayed) * 100) : 0;
  const avgGoals = progress.matchesPlayed > 0 ? (progress.goalsScored / progress.matchesPlayed).toFixed(1) : '0.0';
  const totalShots = progress.matchHistory.reduce((acc, m) => acc + m.shots, 0);
  const totalOnTarget = progress.matchHistory.reduce((acc, m) => acc + m.shotsOnTarget, 0);
  const shotAccuracy = totalShots > 0 ? Math.round((totalOnTarget / totalShots) * 100) : 0;
  const recentMatches = [...progress.matchHistory].slice(0, 8).reverse();

  const handleGoogleSignIn = async () => {
    try {
      setSyncStatus('Signing in with Google...');
      const u = await signInWithGoogle();
      const linked = Array.from(new Set([...progress.linkedProviders, 'google' as const]));
      const next = { ...progress, linkedProviders: linked };
      onUpdateProgress(next);
      await syncUserProfileToCloud(u, next);
      setSyncStatus(`Connected Google Cloud Save for ${u.displayName || u.email}`);
    } catch (err) {
      setSyncStatus(err instanceof Error ? err.message : 'Sign-in failed.');
    }
  };

  const handleManualSync = async () => {
    if (!firebaseUser) return;
    try {
      setSyncStatus('Syncing progress to Firestore...');
      await syncUserProfileToCloud(firebaseUser, progress);
      setSyncStatus('Cloud backup complete.');
    } catch (err) {
      setSyncStatus(err instanceof Error ? err.message : 'Sync failed.');
    }
  };

  const handleToggleSocialLink = (provider: 'facebook' | 'apple') => {
    const already = progress.linkedProviders.includes(provider);
    const nextLinked = already
      ? progress.linkedProviders.filter((p) => p !== provider)
      : [...progress.linkedProviders, provider];
    onUpdateProgress({ ...progress, linkedProviders: nextLinked });
    const label = provider === 'facebook' ? 'Facebook' : 'Apple ID';
    setSyncStatus(already ? `Unlinked ${label} profile.` : `${label} account connected to your career profile!`);
  };

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = editingName.trim().slice(0, 32) || progress.displayName;
    const cleanClub = editingClub.trim().slice(0, 32) || progress.clubName;
    onUpdateProgress({ ...progress, displayName: cleanName, clubName: cleanClub });
    setSyncStatus('Player & Club profile updated!');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 10, 20, 0.85)' }}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-white/15 bg-[#11192B] shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            {progress.clubLogo ? (
              <CustomClubLogoSvg logo={progress.clubLogo} className="h-11 w-11 shrink-0" />
            ) : (
              <ClubCrestSvg primary={activeCrest.primary} accent={activeCrest.accent} shape={activeCrest.shape} className="h-10 w-10" />
            )}
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-wide text-white">
                Player Profile & Career Stats
              </h2>
              <div className="text-xs text-slate-300 tabular-nums">
                Level {levelInfo.level} ({levelInfo.currentXp}/{levelInfo.nextLevelXp} XP) · {isOnline ? 'Online Ready' : 'Offline Mode'} · {firebaseUser ? `Synced: ${firebaseUser.displayName}` : 'Local Save'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Profile"
            className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="shrink-0 flex gap-2 border-b border-white/10 px-6 py-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Career & Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('squad')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'squad' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <RadarIcon className="h-3.5 w-3.5" />
            <span>Squad Analysis</span>
          </button>
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-6 space-y-6">
          {syncStatus && (
            <div className="rounded-lg border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-xs text-sky-200">
              {syncStatus}
            </div>
          )}

          {activeTab === 'squad' ? (
            <div className="space-y-5" data-testid="squad-analysis-panel">
              {/* Squad Summary Header */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
                  <div className="text-xs text-slate-400">Starting OVR</div>
                  <div className="mt-1 font-display text-3xl font-extrabold text-amber-400 tabular-nums">
                    {squadAnalysis.overallRating}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
                  <div className="text-xs text-slate-400">Formation</div>
                  <div className="mt-1 font-display text-3xl font-extrabold text-white tabular-nums">
                    {progress.formation}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
                  <div className="text-xs text-slate-400">Top Strength</div>
                  <div className="mt-1 font-display text-2xl font-extrabold text-emerald-400 tabular-nums">
                    {squadAnalysis.strongestAxis.stat} ({squadAnalysis.strongestAxis.squad})
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
                  <div className="text-xs text-slate-400">Upgrade Focus</div>
                  <div className="mt-1 font-display text-2xl font-extrabold text-sky-400 tabular-nums">
                    {squadAnalysis.focusAxis.stat} ({squadAnalysis.focusAxis.squad})
                  </div>
                </div>
              </div>

              {/* Team Chemistry Passive Boost Summary */}
              <div className="rounded-xl border border-emerald-400/25 bg-gradient-to-r from-slate-900 via-emerald-950/35 to-slate-900 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                      Team Chemistry ({squadAnalysis.chemistry.tierLabel})
                    </div>
                    <div className="mt-0.5 font-display text-2xl font-extrabold text-white tabular-nums">
                      {squadAnalysis.chemistry.chemistryScore}% Chemistry · Passive +{squadAnalysis.chemistry.speedBoost} SPD / +{squadAnalysis.chemistry.dribblingBoost} DRI
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                    {squadAnalysis.chemistry.nationLinks.map((link) => (
                      <span
                        key={`nat-${link.key}`}
                        className="rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-sky-200 tabular-nums"
                      >
                        {link.label} ×{link.count} (+{link.speedBonus} SPD, +{link.dribblingBonus} DRI)
                      </span>
                    ))}
                    {squadAnalysis.chemistry.clubLinks.map((link) => (
                      <span
                        key={`club-${link.key}`}
                        className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-amber-200 tabular-nums"
                      >
                        {link.label} ×{link.count} (+{link.speedBonus} SPD, +{link.dribblingBonus} DRI)
                      </span>
                    ))}
                    {squadAnalysis.chemistry.nationLinks.length === 0 &&
                      squadAnalysis.chemistry.clubLinks.length === 0 && (
                        <span className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1 text-slate-300">
                          Pair players from the same Nation or Club to activate boosts
                        </span>
                      )}
                  </div>
                </div>
              </div>

              {/* Recharts Radar Chart + Aggregate Breakdown */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3 rounded-xl border border-white/10 bg-slate-900 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">
                        Starting Lineup Attribute Radar
                      </h3>
                      <p className="text-xs text-slate-400">
                        Aggregate Speed, Shooting, Defense &amp; Dribbling (incl. Team Chemistry) vs {progress.leagueTier} benchmark
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-[300px] sm:h-[320px] w-full">
                    <ResponsiveContainer width="100%" height={310}>
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="62%"
                        margin={{ top: 12, right: 36, bottom: 12, left: 36 }}
                        data={squadAnalysis.axes}
                      >
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis
                          dataKey="stat"
                          tick={{ fill: '#E2E8F0', fontSize: 12, fontWeight: 700 }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 100]}
                          tickCount={5}
                          tick={{ fill: '#94A3B8', fontSize: 10 }}
                        />
                        <Radar
                          name="Starting Lineup"
                          dataKey="squad"
                          stroke="#10B981"
                          strokeWidth={2.5}
                          fill="#10B981"
                          fillOpacity={0.38}
                          animationDuration={350}
                        />
                        <Radar
                          name={`${progress.leagueTier} Benchmark`}
                          dataKey="leagueTarget"
                          stroke="#38BDF8"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fill="#38BDF8"
                          fillOpacity={0.14}
                          animationDuration={350}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderColor: 'rgba(255,255,255,0.15)',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                            color: '#F8FAFC',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', color: '#CBD5E1' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-slate-900 p-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">Aggregate Core Metrics</h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Averaged across your {squadAnalysis.starters.length} starting eleven cards
                    </p>
                  </div>
                  <div className="space-y-3">
                    {squadAnalysis.axes.map((axis) => {
                      const delta = axis.squad - axis.leagueTarget;
                      const chemNote =
                        axis.stat === 'Speed' && squadAnalysis.chemistry.speedBoost > 0
                          ? ` (+${squadAnalysis.chemistry.speedBoost} Chem)`
                          : axis.stat === 'Dribbling' && squadAnalysis.chemistry.dribblingBoost > 0
                            ? ` (+${squadAnalysis.chemistry.dribblingBoost} Chem)`
                            : '';
                      return (
                        <div key={axis.stat} className="rounded-lg border border-white/10 bg-slate-800/75 p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white">
                              {axis.stat}
                              {chemNote && <span className="ml-1 text-[10px] font-semibold text-emerald-300">{chemNote}</span>}
                            </span>
                            <div className="flex items-center gap-2 font-mono-num tabular-nums">
                              <span
                                className={`text-[11px] font-semibold ${
                                  delta >= 0 ? 'text-emerald-400' : 'text-amber-300'
                                }`}
                              >
                                {delta >= 0 ? `+${delta}` : delta} vs tier
                              </span>
                              <span className="text-sm font-extrabold text-white">{axis.squad}/99</span>
                            </div>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                            <div
                              className="h-full rounded-full bg-emerald-400"
                              style={{ width: `${Math.min(100, axis.squad)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Starter Card Breakdown */}
              <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
                <h3 className="font-display text-lg font-bold text-white">
                  Active Starting Eleven Breakdown ({squadAnalysis.starters.length})
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {squadAnalysis.starters.map((starter) => (
                    <div
                      key={starter.id}
                      className="rounded-lg border border-white/10 bg-slate-800/60 p-3 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: RARITY_COLORS[starter.rarity] }}
                          >
                            {starter.role} · {starter.rarity} · Lv.{starter.level}
                          </div>
                          <div className="font-display text-base font-bold text-white">
                            {starter.nationFlag} {starter.nickname}
                          </div>
                          <div className="text-[10px] text-slate-400">{starter.club}</div>
                        </div>
                        <span className="font-display text-2xl font-extrabold text-amber-400 tabular-nums">
                          {starter.ovr}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-mono-num tabular-nums">
                        <div className="rounded bg-slate-900 py-1">
                          <div className="text-slate-400">SPD</div>
                          <div className="font-bold text-emerald-300">{starter.speed}</div>
                        </div>
                        <div className="rounded bg-slate-900 py-1">
                          <div className="text-slate-400">SHO</div>
                          <div className="font-bold text-white">{starter.shooting}</div>
                        </div>
                        <div className="rounded bg-slate-900 py-1">
                          <div className="text-slate-400">DEF</div>
                          <div className="font-bold text-white">{starter.defense}</div>
                        </div>
                        <div className="rounded bg-slate-900 py-1">
                          <div className="text-slate-400">DRI</div>
                          <div className="font-bold text-emerald-300">{starter.dribbling}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>

          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <div className="text-xs text-slate-400">Matches / Wins</div>
              <div className="mt-1 font-display text-3xl font-extrabold text-white tabular-nums">
                {progress.matchesPlayed} / {progress.wins}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <div className="text-xs text-slate-400">Win Rate</div>
              <div className="mt-1 font-display text-3xl font-extrabold text-emerald-400 tabular-nums">{winRate}%</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <div className="text-xs text-slate-400">Goals / Match</div>
              <div className="mt-1 font-display text-3xl font-extrabold text-amber-400 tabular-nums">{avgGoals}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <div className="text-xs text-slate-400">Shot Accuracy</div>
              <div className="mt-1 font-display text-3xl font-extrabold text-sky-400 tabular-nums">{shotAccuracy}%</div>
            </div>
          </div>

          {/* Performance Trend Charts */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <h3 className="font-display text-lg font-bold text-white">Goals For vs Against Trend</h3>
              <svg viewBox="0 0 320 130" className="mt-3 w-full h-36">
                <line x1="24" y1="108" x2="306" y2="108" stroke="#334155" strokeWidth="1" />
                <line x1="24" y1="60" x2="306" y2="60" stroke="#1E293B" strokeDasharray="3 3" strokeWidth="1" />
                <line x1="24" y1="16" x2="306" y2="16" stroke="#1E293B" strokeDasharray="3 3" strokeWidth="1" />
                {recentMatches.map((m, idx) => {
                  const slotW = 270 / Math.max(1, recentMatches.length);
                  const x = 32 + idx * slotW;
                  const hFor = Math.min(88, m.goalsFor * 18);
                  const hAgainst = Math.min(88, m.goalsAgainst * 18);
                  return (
                    <g key={m.id}>
                      <rect x={x} y={108 - hFor} width="11" height={Math.max(4, hFor)} rx="2" fill="#10B981" />
                      <rect x={x + 13} y={108 - hAgainst} width="11" height={Math.max(4, hAgainst)} rx="2" fill="#F43F5E" />
                      <text x={x + 11} y="122" textAnchor="middle" fontSize="9" fill="#94A3B8">
                        M{idx + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="mt-1 flex gap-4 text-[11px] text-slate-400">
                <span className="text-emerald-400">Green: Goals For</span>
                <span className="text-rose-400">Red: Goals Against</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <h3 className="font-display text-lg font-bold text-white">Possession % History</h3>
              <svg viewBox="0 0 320 130" className="mt-3 w-full h-36">
                <line x1="24" y1="108" x2="306" y2="108" stroke="#334155" strokeWidth="1" />
                <line x1="24" y1="62" x2="306" y2="62" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
                {recentMatches.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2.5"
                    points={recentMatches
                      .map((m, idx) => {
                        const x = 36 + (idx * 255) / Math.max(1, recentMatches.length - 1);
                        const y = 108 - (m.possessionPct / 100) * 90;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                )}
                {recentMatches.map((m, idx) => {
                  const x = 36 + (idx * 255) / Math.max(1, Math.max(1, recentMatches.length - 1));
                  const y = 108 - (m.possessionPct / 100) * 90;
                  return (
                    <g key={m.id}>
                      <circle cx={x} cy={y} r="4" fill="#FACC15" />
                      <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fill="#E2E8F0">
                        {m.possessionPct}%
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Player Identity, Country & Connected Accounts */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <form onSubmit={handleSaveIdentity} className="rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                Player Identity & Country
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] text-slate-400">Manager Name</label>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Club Name</label>
                  <input
                    type="text"
                    value={editingClub}
                    onChange={(e) => setEditingClub(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <select
                  aria-label="Country Region"
                  value={progress.countryCode}
                  onChange={(e) => onUpdateProgress({ ...progress, countryCode: e.target.value })}
                  className="rounded-lg border border-white/15 bg-slate-800 px-3 py-1.5 text-xs text-white"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Save Profile
                </button>
              </div>
            </form>

            <div className="rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Cloud className="h-4 w-4 text-sky-400" />
                Connect Account to Save Progress
              </h3>
              <p className="text-xs text-slate-400">
                Link your social or cloud account to protect squads, packs, and trophy progress across devices.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSocialLink('facebook')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                    progress.linkedProviders.includes('facebook')
                      ? 'border border-sky-400 bg-sky-500/20 text-sky-200'
                      : 'bg-[#1877F2] text-white hover:opacity-90'
                  }`}
                >
                  {progress.linkedProviders.includes('facebook') && <Check className="h-3.5 w-3.5" />}
                  <span>{progress.linkedProviders.includes('facebook') ? 'Facebook Connected' : 'Connect Facebook'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSocialLink('apple')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                    progress.linkedProviders.includes('apple')
                      ? 'border border-white/40 bg-white/15 text-white'
                      : 'bg-white text-slate-950 hover:bg-slate-200'
                  }`}
                >
                  {progress.linkedProviders.includes('apple') && <Check className="h-3.5 w-3.5" />}
                  <span>{progress.linkedProviders.includes('apple') ? 'Apple ID Connected' : 'Connect Apple ID'}</span>
                </button>
                {firebaseUser ? (
                  <>
                    <button
                      type="button"
                      onClick={handleManualSync}
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                    >
                      Sync Cloud Now
                    </button>
                    <button
                      type="button"
                      onClick={() => signOutUser()}
                      className="flex items-center gap-1 rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    Google Cloud Sync
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Match History Table */}
          <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
            <h3 className="font-display text-lg font-bold text-white">Recent Match History</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2 pr-3">Mode</th>
                    <th className="py-2 pr-3">Opponent</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2 pr-3">Poss</th>
                    <th className="py-2 pr-3">Shots</th>
                    <th className="py-2 pr-3">Tackles</th>
                    <th className="py-2">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.matchHistory.slice(0, 8).map((m) => (
                    <tr key={m.id} className="border-b border-white/5 text-slate-200">
                      <td className="py-2 pr-3">{m.mode}</td>
                      <td className="py-2 pr-3 font-medium text-white">{m.opponentName}</td>
                      <td className="py-2 pr-3 font-mono-num font-bold">
                        {m.goalsFor} - {m.goalsAgainst}
                      </td>
                      <td className="py-2 pr-3 font-mono-num">{m.possessionPct}%</td>
                      <td className="py-2 pr-3 font-mono-num">{m.shots}</td>
                      <td className="py-2 pr-3 font-mono-num">{m.tackles}</td>
                      <td className="py-2 font-mono-num text-emerald-400">+{m.coinsEarned}c</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
