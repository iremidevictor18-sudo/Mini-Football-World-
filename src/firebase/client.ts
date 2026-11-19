import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { ClubInfo, LeaderboardRow, MatchRecord, TournamentInfo, UserProgress } from '../game/types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    return true;
  }
}

void testConnection();

export function subscribeAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle(): Promise<User> {
  const res = await signInWithPopup(auth, googleProvider);
  return res.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

const LOCAL_KEY = 'mini_football_world_save_v1';

export function loadLocalProgress(): UserProgress | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProgress;
  } catch {
    return null;
  }
}

export function saveLocalProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(progress));
  } catch {
    // ignore quota issues offline
  }
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
}

export async function syncUserProfileToCloud(user: User, progress: UserProgress): Promise<void> {
  if (!user.emailVerified) return;
  const uid = sanitizeId(user.uid);
  const userPath = `users/${uid}`;
  const payload = {
    uid,
    displayName: (progress.displayName || user.displayName || 'Manager').slice(0, 64),
    clubName: (progress.clubName || 'Apex Strikers FC').slice(0, 48),
    clubMotto: (progress.clubMotto || 'PLAY TO WIN').slice(0, 64),
    clubOpen: Boolean(progress.clubOpen ?? true),
    countryCode: (progress.countryCode || 'PT').slice(0, 4),
    crestId: (progress.crestId || 'crest_emerald').slice(0, 48),
    ...(progress.clubLogo ? { clubLogo: progress.clubLogo } : {}),
    linkedProviders: (progress.linkedProviders || []).slice(0, 3),
    coins: Math.max(0, Math.min(100000000, Math.round(progress.coins))),
    gems: Math.max(0, Math.min(10000000, Math.round(progress.gems))),
    xp: Math.max(0, Math.min(100000000, Math.round(progress.xp))),
    trophies: Math.max(0, Math.min(1000000, Math.round(progress.trophies))),
    leagueTier: progress.leagueTier,
    formation: progress.formation,
    kitId: progress.kitId.slice(0, 48),
    ...(progress.shortsId ? { shortsId: progress.shortsId.slice(0, 48) } : {}),
    ...(progress.socksId ? { socksId: progress.socksId.slice(0, 48) } : {}),
    ballId: progress.ballId.slice(0, 48),
    bootId: progress.bootId.slice(0, 48),
    celebrationId: progress.celebrationId.slice(0, 48),
    subscriptionTier: progress.subscriptionTier,
    language: progress.language,
    dailyRewardStreak: Math.max(0, Math.min(3650, Math.round(progress.dailyRewardStreak))),
    lastDailyClaimAt: (progress.lastDailyClaimAt || '').slice(0, 40),
    lastFreePrizeClaimAt: (progress.lastFreePrizeClaimAt || '').slice(0, 40),
    goalsPrizeProgress: Math.max(0, Math.min(10000, Math.round(progress.goalsPrizeProgress ?? 0))),
    matchesPlayed: Math.max(0, Math.round(progress.matchesPlayed)),
    wins: Math.max(0, Math.round(progress.wins)),
    goalsScored: Math.max(0, Math.round(progress.goalsScored)),
    unlockedIds: progress.unlockedIds.slice(0, 160),
    cardLevels: progress.cardLevels,
    victoryPacks: (progress.victoryPacks || []).slice(0, 4).map((p, idx) => ({
      slotIndex: idx,
      tier: p.tier,
      status: p.status,
      unlockEndsAt: (p.unlockEndsAt || '').slice(0, 40),
    })),
    settings: {
      sfxEnabled: Boolean(progress.settings?.sfxEnabled ?? true),
      crowdEnabled: Boolean(progress.settings?.crowdEnabled ?? true),
      controlScheme: progress.settings?.controlScheme ?? 'standard',
      joystickSensitivity: Number(progress.settings?.joystickSensitivity ?? 1),
      tutorialCompleted: Boolean(progress.settings?.tutorialCompleted ?? true),
    },
    ...(progress.dailyMissions && progress.dailyMissions.tasks.length === 3
      ? {
          dailyMissions: {
            assignedAt: progress.dailyMissions.assignedAt.slice(0, 40),
            resetAt: progress.dailyMissions.resetAt.slice(0, 40),
            tasks: progress.dailyMissions.tasks.slice(0, 3).map((t) => ({
              id: t.id.slice(0, 32),
              title: t.title.slice(0, 64),
              metric: t.metric,
              target: Math.max(1, Math.round(t.target)),
              progress: Math.max(0, Math.round(t.progress)),
              rewardCoins: Math.max(0, Math.round(t.rewardCoins)),
              claimed: Boolean(t.claimed),
            })),
          },
        }
      : {}),
    updatedAt: serverTimestamp(),
  };

  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    } else {
      await updateDoc(ref, payload);
    }

    // Store PII strictly in private subcollection
    if (user.email) {
      await setDoc(doc(db, 'users', uid, 'private', 'info'), {
        uid,
        email: user.email.slice(0, 128),
        updatedAt: serverTimestamp(),
      });
    }

    // Update public leaderboard entry (no PII)
    await setDoc(doc(db, 'leaderboard', uid), {
      userId: uid,
      displayName: payload.displayName,
      clubName: payload.clubName,
      trophies: payload.trophies,
      leagueTier: payload.leagueTier,
      wins: payload.wins,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

export async function fetchUserProfileFromCloud(user: User): Promise<Partial<UserProgress> | null> {
  const uid = sanitizeId(user.uid);
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: data.uid,
      displayName: data.displayName,
      clubName: data.clubName,
      clubMotto: typeof data.clubMotto === 'string' ? data.clubMotto : undefined,
      clubOpen: typeof data.clubOpen === 'boolean' ? data.clubOpen : undefined,
      countryCode: data.countryCode,
      crestId: data.crestId,
      clubLogo: data.clubLogo && typeof data.clubLogo === 'object' ? data.clubLogo : undefined,
      linkedProviders: Array.isArray(data.linkedProviders) ? data.linkedProviders : undefined,
      coins: data.coins,
      gems: data.gems,
      xp: data.xp,
      trophies: data.trophies,
      leagueTier: data.leagueTier,
      formation: data.formation,
      kitId: data.kitId,
      shortsId: typeof data.shortsId === 'string' ? data.shortsId : undefined,
      socksId: typeof data.socksId === 'string' ? data.socksId : undefined,
      ballId: data.ballId,
      bootId: data.bootId,
      celebrationId: data.celebrationId,
      subscriptionTier: data.subscriptionTier,
      language: data.language,
      dailyRewardStreak: data.dailyRewardStreak,
      lastDailyClaimAt: data.lastDailyClaimAt || '',
      lastFreePrizeClaimAt: data.lastFreePrizeClaimAt || '',
      goalsPrizeProgress: typeof data.goalsPrizeProgress === 'number' ? data.goalsPrizeProgress : undefined,
      matchesPlayed: data.matchesPlayed,
      wins: data.wins,
      goalsScored: data.goalsScored,
      unlockedIds: Array.isArray(data.unlockedIds) ? data.unlockedIds : undefined,
      cardLevels: data.cardLevels && typeof data.cardLevels === 'object' ? data.cardLevels : undefined,
      dailyMissions: data.dailyMissions && typeof data.dailyMissions === 'object' ? data.dailyMissions : undefined,
      victoryPacks: Array.isArray(data.victoryPacks) ? data.victoryPacks : undefined,
      settings: data.settings && typeof data.settings === 'object' ? data.settings : undefined,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveMatchRecordToCloud(user: User, record: MatchRecord): Promise<void> {
  if (!user.emailVerified) return;
  const uid = sanitizeId(user.uid);
  const matchId = sanitizeId(record.id);
  const path = `users/${uid}/matches/${matchId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'matches', matchId), {
      userId: uid,
      mode: record.mode,
      opponentName: record.opponentName.slice(0, 48),
      goalsFor: Math.max(0, Math.min(99, Math.round(record.goalsFor))),
      goalsAgainst: Math.max(0, Math.min(99, Math.round(record.goalsAgainst))),
      shots: Math.max(0, Math.min(200, Math.round(record.shots))),
      shotsOnTarget: Math.max(0, Math.min(200, Math.round(record.shotsOnTarget))),
      tackles: Math.max(0, Math.min(200, Math.round(record.tackles))),
      passesCompleted: Math.max(0, Math.min(500, Math.round(record.passesCompleted))),
      possessionPct: Math.max(0, Math.min(100, Math.round(record.possessionPct))),
      trophiesDelta: Math.max(-100, Math.min(200, Math.round(record.trophiesDelta))),
      coinsEarned: Math.max(0, Math.min(100000, Math.round(record.coinsEarned))),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  if (!auth.currentUser) return [];
  const path = 'leaderboard';
  try {
    const q = query(collection(db, 'leaderboard'), where('trophies', '>=', 0), orderBy('trophies', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        userId: String(data.userId),
        displayName: String(data.displayName),
        clubName: String(data.clubName),
        trophies: Number(data.trophies),
        leagueTier: String(data.leagueTier),
        wins: Number(data.wins),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function fetchClubs(): Promise<ClubInfo[]> {
  if (!auth.currentUser) return [];
  const path = 'clubs';
  try {
    const q = query(collection(db, 'clubs'), where('memberCount', '>=', 1), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        clubId: String(data.clubId),
        name: String(data.name),
        tag: String(data.tag),
        ownerId: String(data.ownerId),
        leagueTier: String(data.leagueTier),
        memberCount: Number(data.memberCount),
        totalTrophies: Number(data.totalTrophies),
        crestColor: String(data.crestColor),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createClubInCloud(user: User, progress: UserProgress, name: string, tag: string, crestColor: string): Promise<ClubInfo> {
  const clubId = sanitizeId(`club_${Date.now()}_${user.uid.slice(0, 6)}`);
  const uid = sanitizeId(user.uid);
  const path = `clubs/${clubId}`;
  const cleanName = name.trim().slice(0, 48);
  const cleanTag = tag.trim().toUpperCase().slice(0, 6);
  try {
    await setDoc(doc(db, 'clubs', clubId), {
      clubId,
      name: cleanName,
      tag: cleanTag,
      ownerId: uid,
      leagueTier: progress.leagueTier,
      memberCount: 1,
      totalTrophies: progress.trophies,
      crestColor: crestColor.slice(0, 16),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'clubs', clubId, 'members', uid), {
      memberId: uid,
      clubId,
      displayName: progress.displayName.slice(0, 64),
      role: 'Owner',
      trophies: progress.trophies,
      joinedAt: serverTimestamp(),
    });
    return {
      clubId,
      name: cleanName,
      tag: cleanTag,
      ownerId: uid,
      leagueTier: progress.leagueTier,
      memberCount: 1,
      totalTrophies: progress.trophies,
      crestColor,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function fetchTournaments(): Promise<TournamentInfo[]> {
  if (!auth.currentUser) return [];
  const path = 'tournaments';
  try {
    const q = query(collection(db, 'tournaments'), where('status', 'in', ['open', 'in_progress', 'completed']), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        tournamentId: String(data.tournamentId),
        title: String(data.title),
        ownerId: String(data.ownerId),
        status: data.status as TournamentInfo['status'],
        maxTeams: Number(data.maxTeams),
        entryFeeCoins: Number(data.entryFeeCoins),
        prizeCoins: Number(data.prizeCoins),
        winnerName: data.winnerName ? String(data.winnerName) : undefined,
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createTournamentInCloud(user: User, title: string, maxTeams: number, prizeCoins: number): Promise<TournamentInfo> {
  const tournamentId = sanitizeId(`cup_${Date.now()}_${user.uid.slice(0, 6)}`);
  const uid = sanitizeId(user.uid);
  const path = `tournaments/${tournamentId}`;
  const cleanTitle = title.trim().slice(0, 64);
  try {
    await setDoc(doc(db, 'tournaments', tournamentId), {
      tournamentId,
      title: cleanTitle,
      ownerId: uid,
      status: 'open',
      maxTeams: Math.max(4, Math.min(32, Math.round(maxTeams))),
      entryFeeCoins: 100,
      prizeCoins: Math.max(100, Math.min(1000000, Math.round(prizeCoins))),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      tournamentId,
      title: cleanTitle,
      ownerId: uid,
      status: 'open',
      maxTeams,
      entryFeeCoins: 100,
      prizeCoins,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}
