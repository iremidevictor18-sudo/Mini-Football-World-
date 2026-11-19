import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { AiStudioModal } from './components/AiStudioModal';
import { AnalyticsProfileModal } from './components/AnalyticsProfileModal';
import { ClubsLeaguesModal } from './components/ClubsLeaguesModal';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { EquipmentModal } from './components/EquipmentModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MatchHud } from './components/MatchHud';
import { GameOverModal, PauseModal } from './components/MatchModals';
import { PlayMatchmakingModal } from './components/PlayMatchmakingModal';
import { RewardsEventsModal } from './components/RewardsEventsModal';
import { SettingsModal } from './components/SettingsModal';
import { ShopModal } from './components/ShopModal';
import { SquadGearModal } from './components/SquadGearModal';
import { type HubTab, TitleOverlay } from './components/TitleOverlay';
import { TutorialOverlay } from './components/TutorialOverlay';
import { soundEngine } from './engine/audio';
import { StadiumRenderer } from './engine/stadiumScene';
import {
  fetchUserProfileFromCloud,
  loadLocalProgress,
  saveLocalProgress,
  saveMatchRecordToCloud,
  subscribeAuth,
  syncUserProfileToCloud,
} from './firebase/client';
import { createDefaultProgress, OPPONENT_CLUBS, STADIUM_CATALOG } from './game/catalog';
import { claimDailyMissionReward } from './game/dailyMissions';
import { enterStadiumMatch, normalizeUserProgress, openVictoryPackSlot } from './game/menuSystems';
import {
  applyMatchOutcome,
  createSimulation,
  flushSimulationMissionDelta,
  getHudSnapshot,
  type MatchSimulation,
  stepSimulation,
} from './game/physics';
import type { GamePhase, MatchHudSnapshot, MatchMode, TacticMode, UserProgress, VictoryPackSlot } from './game/types';

const STADIUM_STORAGE_KEY = 'mini_football_stadium_v1';

function loadSavedStadiumId(): string {
  if (typeof window === 'undefined') return STADIUM_CATALOG[0].id;
  try {
    const saved = window.localStorage.getItem(STADIUM_STORAGE_KEY);
    if (saved && STADIUM_CATALOG.some((s) => s.id === saved)) {
      return saved;
    }
  } catch {
    // Ignore storage read issues
  }
  return STADIUM_CATALOG[0].id;
}

function shouldAutostart(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

function mergeProgressWithCloud(local: UserProgress, cloud: Partial<UserProgress>, user: User): UserProgress {
  const cloudTrophies = typeof cloud.trophies === 'number' ? cloud.trophies : 0;
  const localTrophies = local.trophies;
  const preferCloud = cloudTrophies >= localTrophies && (cloud.matchesPlayed ?? 0) >= local.matchesPlayed;
  if (preferCloud) {
    return normalizeUserProgress({
      ...local,
      ...cloud,
      uid: user.uid,
      displayName: cloud.displayName || user.displayName || local.displayName,
      unlockedIds: Array.from(new Set([...local.unlockedIds, ...(cloud.unlockedIds ?? [])])),
      cardLevels: { ...local.cardLevels, ...(cloud.cardLevels ?? {}) },
      dailyMissions: cloud.dailyMissions ?? local.dailyMissions,
    });
  }
  return normalizeUserProgress({
    ...local,
    uid: user.uid,
    displayName: user.displayName || local.displayName,
    unlockedIds: Array.from(new Set([...local.unlockedIds, ...(cloud.unlockedIds ?? [])])),
    dailyMissions: local.dailyMissions ?? cloud.dailyMissions,
  });
}

function MiniFootballApp() {
  const [progress, setProgress] = useState<UserProgress>(() =>
    normalizeUserProgress(loadLocalProgress() ?? createDefaultProgress())
  );
  const [phase, setPhase] = useState<GamePhase>(() => (shouldAutostart() ? 'playing' : 'title'));
  const [activeHubTab, setActiveHubTab] = useState<HubTab>(null);
  const [selectedStadiumId, setSelectedStadiumId] = useState<string>(() => loadSavedStadiumId());
  const [selectedMode, setSelectedMode] = useState<MatchMode>('Quick Match');
  const [selectedOpponentIdx, setSelectedOpponentIdx] = useState<number>(0);
  const [playErrorMsg, setPlayErrorMsg] = useState<string>('');
  const [packRewardBanner, setPackRewardBanner] = useState<string>('');
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [muted, setMuted] = useState<boolean>(() => !normalizeUserProgress(loadLocalProgress() ?? createDefaultProgress()).settings.sfxEnabled);
  const [matchRewards, setMatchRewards] = useState<{ coinsEarned: number; trophiesDelta: number }>({
    coinsEarned: 0,
    trophiesDelta: 0,
  });

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const stadiumRef = useRef<StadiumRenderer | null>(null);
  const initialStadiumId = loadSavedStadiumId();
  const initialStadiumDef = STADIUM_CATALOG.find((s) => s.id === initialStadiumId) ?? STADIUM_CATALOG[0];
  const simRef = useRef<MatchSimulation>(
    createSimulation(
      normalizeUserProgress(loadLocalProgress() ?? createDefaultProgress()),
      'Quick Match',
      OPPONENT_CLUBS[0],
      initialStadiumDef.difficulty
    )
  );
  const phaseRef = useRef<GamePhase>(phase);
  const progressRef = useRef<UserProgress>(progress);
  const selectedStadiumIdRef = useRef<string>(selectedStadiumId);
  const firebaseUserRef = useRef<User | null>(null);
  const activeHubTabRef = useRef<HubTab>(null);
  const matchFinalizedRef = useRef<boolean>(false);

  const [hud, setHud] = useState<MatchHudSnapshot>(() => getHudSnapshot(simRef.current));

  // Mutable input state shared between DOM keyboard, touch controls, and simulation tick
  const keysHeldRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef<{ vx: number; vz: number }>({ vx: 0, vz: 0 });
  const touchSprintRef = useRef<boolean>(false);
  const passQueuedRef = useRef<boolean>(false);
  const shootQueuedRef = useRef<boolean>(false);

  useEffect(() => {
    phaseRef.current = phase;
    document.body.dataset.state = phase;
  }, [phase]);

  useEffect(() => {
    progressRef.current = progress;
    saveLocalProgress(progress);
    const shouldMute = !progress.settings?.sfxEnabled;
    setMuted(shouldMute);
    soundEngine.setMuted(shouldMute);
  }, [progress]);

  useEffect(() => {
    activeHubTabRef.current = activeHubTab;
  }, [activeHubTab]);

  useEffect(() => {
    firebaseUserRef.current = firebaseUser;
  }, [firebaseUser]);

  useEffect(() => {
    selectedStadiumIdRef.current = selectedStadiumId;
    document.body.dataset.stadium = selectedStadiumId;
    try {
      window.localStorage.setItem(STADIUM_STORAGE_KEY, selectedStadiumId);
    } catch {
      // Ignore storage write errors
    }
    if (stadiumRef.current) {
      stadiumRef.current.applyStadiumTheme(selectedStadiumId);
      stadiumRef.current.renderFrame(simRef.current, phaseRef.current, 0.016, 0);
    }
  }, [selectedStadiumId]);

  // Online/Offline status listeners
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Firebase Auth subscription & automatic cloud merge
  useEffect(() => {
    const unsub = subscribeAuth(async (user) => {
      setFirebaseUser(user);
      if (!user) return;
      try {
        const cloud = await fetchUserProfileFromCloud(user);
        if (cloud) {
          setProgress((prev) => mergeProgressWithCloud(prev, cloud, user));
        } else {
          await syncUserProfileToCloud(user, progressRef.current);
        }
      } catch {
        // Offline or auth sync fallback uses localStorage seamlessly
      }
    });
    return unsub;
  }, []);

  const handleUpdateProgress = useCallback((next: UserProgress) => {
    setProgress(next);
    if (firebaseUserRef.current && navigator.onLine) {
      syncUserProfileToCloud(firebaseUserRef.current, next).catch(() => {});
    }
  }, []);

  const syncPartialMatchMissions = useCallback(() => {
    if (matchFinalizedRef.current) return;
    const updated = flushSimulationMissionDelta(progressRef.current, simRef.current, false);
    if (updated !== progressRef.current) {
      handleUpdateProgress(updated);
    }
  }, [handleUpdateProgress]);

  const startNewMatch = useCallback(
    (modeOverride?: MatchMode, oppIdxOverride?: number) => {
      const m = modeOverride ?? selectedMode;
      const opp = OPPONENT_CLUBS[oppIdxOverride ?? selectedOpponentIdx] ?? OPPONENT_CLUBS[0];
      const stadium = STADIUM_CATALOG.find((s) => s.id === selectedStadiumId) ?? STADIUM_CATALOG[0];
      const nextSim = createSimulation(progressRef.current, m, opp, stadium.difficulty);
      simRef.current = nextSim;
      matchFinalizedRef.current = false;
      passQueuedRef.current = false;
      shootQueuedRef.current = false;
      keysHeldRef.current.clear();
      stadiumRef.current?.applyStadiumTheme(stadium.id);
      stadiumRef.current?.syncRosterAndGear(nextSim, progressRef.current);
      setHud(getHudSnapshot(nextSim));
      setActiveHubTab(null);
      setPlayErrorMsg('');
      soundEngine.playUiChime();
      phaseRef.current = 'playing';
      stadiumRef.current?.renderFrame(nextSim, 'playing', 0.016, 0);
      setPhase('playing');
    },
    [selectedMode, selectedOpponentIdx, selectedStadiumId]
  );

  const handleStadiumKickOff = useCallback(() => {
    if (selectedMode === 'Practice Drill') {
      startNewMatch();
      return;
    }
    const stadium = STADIUM_CATALOG.find((s) => s.id === selectedStadiumId) ?? STADIUM_CATALOG[0];
    const check = enterStadiumMatch(progressRef.current, stadium);
    if (!check.ok) {
      setPlayErrorMsg(check.reason);
      return;
    }
    handleUpdateProgress(check.updated);
    progressRef.current = check.updated;
    startNewMatch();
  }, [selectedMode, selectedStadiumId, handleUpdateProgress, startNewMatch]);

  const handlePackSlotClick = useCallback(
    (slot: VictoryPackSlot) => {
      if (slot.status === 'ready') {
        const res = openVictoryPackSlot(progressRef.current, slot.slotIndex);
        if (res) {
          soundEngine.playUiChime();
          handleUpdateProgress(res.updated);
          setPackRewardBanner(
            `${slot.tier} Pack Opened: +${res.coinsAwarded} Coins, +${res.gemsAwarded} Gems${res.cardReward ? `, & ${res.cardReward.nickname}!` : '!'}`
          );
          window.setTimeout(() => setPackRewardBanner(''), 4500);
          return;
        }
      }
      setActiveHubTab('rewards_packs');
    },
    [handleUpdateProgress]
  );

  // Live preview sync on Title or Pause whenever progress/mode/opponent/stadium changes
  useEffect(() => {
    if (phase === 'title') {
      const opp = OPPONENT_CLUBS[selectedOpponentIdx] ?? OPPONENT_CLUBS[0];
      const stadium = STADIUM_CATALOG.find((s) => s.id === selectedStadiumId) ?? STADIUM_CATALOG[0];
      const previewSim = createSimulation(progress, selectedMode, opp, stadium.difficulty);
      simRef.current = previewSim;
      stadiumRef.current?.syncRosterAndGear(previewSim, progress);
      setHud(getHudSnapshot(previewSim));
    } else if (phase === 'paused') {
      simRef.current.formation = progress.formation;
      simRef.current.celebrationId = progress.celebrationId;
      stadiumRef.current?.syncRosterAndGear(simRef.current, progress);
    }
  }, [progress, selectedMode, selectedOpponentIdx, selectedStadiumId, phase]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = progressRef.current.settings.sfxEnabled;
    soundEngine.setMuted(nextMuted);
    setMuted(nextMuted);
    handleUpdateProgress({
      ...progressRef.current,
      settings: {
        ...progressRef.current.settings,
        sfxEnabled: !nextMuted,
      },
    });
  }, [handleUpdateProgress]);

  // Keyboard bindings & window focus safety
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.code === 'KeyM' && !e.repeat) {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (activeHubTabRef.current) {
        if (e.code === 'Escape' && !e.repeat) {
          e.preventDefault();
          setActiveHubTab(null);
        }
        return;
      }

      const curPhase = phaseRef.current;

      if (curPhase === 'title') {
        if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) {
          e.preventDefault();
          startNewMatch();
        }
        return;
      }

      if (curPhase === 'paused') {
        if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
          e.preventDefault();
          setPhase('playing');
        }
        return;
      }

      if (curPhase === 'playing') {
        if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
          e.preventDefault();
          keysHeldRef.current.clear();
          syncPartialMatchMissions();
          setPhase('paused');
          return;
        }
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }
        keysHeldRef.current.add(e.code);
        if (e.code === 'KeyE' && !e.repeat) {
          passQueuedRef.current = true;
        }
        if (e.code === 'Space' && !e.repeat) {
          shootQueuedRef.current = true;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    const clearHeld = () => {
      keysHeldRef.current.clear();
      touchSprintRef.current = false;
      joystickRef.current = { vx: 0, vz: 0 };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeld);
    document.addEventListener('visibilitychange', clearHeld);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeld);
      document.removeEventListener('visibilitychange', clearHeld);
    };
  }, [handleToggleMute, startNewMatch, syncPartialMatchMissions]);

  // Isolated Single-Mount Three.js Render & Fixed-Delta Simulation Loop
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const stadium = new StadiumRenderer(mount);
    stadiumRef.current = stadium;
    stadium.applyStadiumTheme(selectedStadiumIdRef.current);
    stadium.syncRosterAndGear(simRef.current, progressRef.current);

    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let hudSyncAccum = 0;

    const gl = stadium.renderer.getContext() as WebGL2RenderingContext;

    const scheduleNext = (cb: () => void) => {
      if (disposed) return;
      if (stadium.isSoftwareGl) {
        if (typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          let polls = 0;
          const poll = () => {
            if (disposed) {
              if (sync) gl.deleteSync(sync);
              return;
            }
            polls += 1;
            const status = sync ? gl.clientWaitSync(sync, 0, 0) : gl.ALREADY_SIGNALED;
            if (
              status === gl.ALREADY_SIGNALED ||
              status === gl.CONDITION_SATISFIED ||
              status === gl.WAIT_FAILED ||
              polls >= 12
            ) {
              if (sync) gl.deleteSync(sync);
              timerId = window.setTimeout(cb, activeHubTabRef.current ? 240 : 55);
            } else {
              timerId = window.setTimeout(poll, 25);
            }
          };
          timerId = window.setTimeout(poll, activeHubTabRef.current ? 240 : 55);
        } else {
          timerId = window.setTimeout(cb, 90);
        }
      } else {
        rafId = window.requestAnimationFrame(cb);
      }
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const rawDt = Math.max(0.001, (now - lastTime) / 1000);
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      elapsed += dt;

      const sim = simRef.current;
      const curPhase = phaseRef.current;

      if (curPhase === 'playing') {
        const keys = keysHeldRef.current;
        let kbX = 0;
        let kbZ = 0;
        if (keys.has('KeyW') || keys.has('ArrowUp')) kbX += 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) kbX -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) kbZ += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) kbZ -= 1;

        const moveX = Math.abs(kbX) > 0.05 ? kbX : joystickRef.current.vx;
        const moveZ = Math.abs(kbZ) > 0.05 ? kbZ : joystickRef.current.vz;
        const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || touchSprintRef.current;

        const passJustPressed = passQueuedRef.current;
        const shootOrTackleJustPressed = shootQueuedRef.current;
        passQueuedRef.current = false;
        shootQueuedRef.current = false;

        stepSimulation(sim, dt, {
          moveX,
          moveZ,
          sprint,
          passJustPressed,
          shootOrTackleJustPressed,
        });

        // Process discrete simulation events (audio + particles)
        if (sim.pendingEvents.length > 0) {
          const events = sim.pendingEvents.splice(0, sim.pendingEvents.length);
          for (const ev of events) {
            if (ev.type === 'kick') {
              soundEngine.playKick(false);
            } else if (ev.type === 'power_shot') {
              soundEngine.playKick(true);
              stadium.spawnParticles(ev.x, ev.y, ev.z, ev.color || '#F59E0B', 14, 9);
            } else if (ev.type === 'pass') {
              soundEngine.playKick(false);
            } else if (ev.type === 'tackle') {
              soundEngine.playTackle();
              stadium.spawnParticles(ev.x, ev.y, ev.z, '#15803D', 8, 5.5);
            } else if (ev.type === 'save') {
              soundEngine.playKick(true);
              stadium.spawnParticles(ev.x, ev.y, ev.z, '#38BDF8', 10, 6);
            } else if (ev.type === 'post') {
              soundEngine.playPostClang();
              stadium.spawnParticles(ev.x, ev.y, ev.z, '#FACC15', 8, 6);
            } else if (ev.type === 'whistle') {
              soundEngine.playWhistle(Boolean(ev.heavy));
            } else if (ev.type === 'goal') {
              soundEngine.playGoalCheer();
              const palette = ['#FACC15', '#10B981', '#38BDF8', '#F43F5E'];
              palette.forEach((col) => stadium.spawnParticles(ev.x, ev.y + 1.1, ev.z, col, 9, 10));
            }
          }
        }

        // Throttle HUD React updates cleanly (<= 10 Hz or immediate on goal/end)
        hudSyncAccum += dt;
        if (hudSyncAccum >= 0.1 || sim.goalFreezeTimer > 0 || sim.matchEnded) {
          hudSyncAccum = 0;
          setHud(getHudSnapshot(sim));
        }

        // Handle Full Time once
        if (sim.matchEnded && !matchFinalizedRef.current) {
          matchFinalizedRef.current = true;
          const outcome = applyMatchOutcome(progressRef.current, sim);
          setMatchRewards({ coinsEarned: outcome.coinsEarned, trophiesDelta: outcome.trophiesDelta });
          setProgress(outcome.updated);
          if (firebaseUserRef.current && navigator.onLine) {
            const latestRecord = outcome.updated.matchHistory[0];
            if (latestRecord) {
              saveMatchRecordToCloud(firebaseUserRef.current, latestRecord).catch(() => {});
            }
            syncUserProfileToCloud(firebaseUserRef.current, outcome.updated).catch(() => {});
          }
          setPhase('gameover');
        }
      }

      stadium.renderFrame(sim, curPhase, dt, elapsed);
      scheduleNext(tick);
    };

    // Initial render then start loop
    stadium.renderFrame(simRef.current, phaseRef.current, 0.016, 0);
    scheduleNext(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      stadium.dispose();
      stadiumRef.current = null;
    };
  }, []);

  const handleChangeTactic = useCallback((tactic: TacticMode) => {
    simRef.current.tactic = tactic;
    setHud(getHudSnapshot(simRef.current));
  }, []);

  const activeOpponent = OPPONENT_CLUBS[selectedOpponentIdx] ?? OPPONENT_CLUBS[0];

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1220]">
      {/* Isolated Full-Viewport 3D Stadium Canvas */}
      <div ref={canvasMountRef} data-testid="stadium-canvas" className="fixed inset-0 z-0" />

      {/* Title Screen Overlay (Reference-Matched Main Menu) */}
      {phase === 'title' && (
        <TitleOverlay
          progress={progress}
          isOnline={isOnline}
          isSignedIn={Boolean(firebaseUser)}
          muted={muted}
          onOpenHub={(tab) => {
            setPlayErrorMsg('');
            setActiveHubTab(tab);
          }}
          onPackSlotClick={handlePackSlotClick}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Brief Victory Pack Reward Toast on Title */}
      {phase === 'title' && packRewardBanner && !activeHubTab && (
        <div className="pointer-events-none fixed top-20 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-amber-400/60 bg-slate-950/95 px-5 py-2.5 text-xs font-bold text-amber-300 shadow-2xl">
          {packRewardBanner}
        </div>
      )}

      {/* Live Match HUD */}
      {phase === 'playing' && (
        <MatchHud
          hud={hud}
          clubName={progress.clubName}
          opponentName={simRef.current.opponentName}
          language={progress.language}
          muted={muted}
          onToggleMute={handleToggleMute}
          onPause={() => {
            keysHeldRef.current.clear();
            syncPartialMatchMissions();
            setPhase('paused');
          }}
          onChangeTactic={handleChangeTactic}
          onJoystickMove={(vx, vz) => {
            joystickRef.current = { vx, vz };
          }}
          onSprintChange={(held) => {
            touchSprintRef.current = held;
          }}
          onPassPress={() => {
            passQueuedRef.current = true;
          }}
          onShootOrTacklePress={() => {
            shootQueuedRef.current = true;
          }}
        />
      )}

      {/* Pause Modal */}
      {phase === 'paused' && !activeHubTab && (
        <PauseModal
          language={progress.language}
          onResume={() => setPhase('playing')}
          onRestart={() => {
            syncPartialMatchMissions();
            startNewMatch();
          }}
          onOpenHub={(tab) => setActiveHubTab(tab)}
          onQuitToTitle={() => {
            syncPartialMatchMissions();
            setActiveHubTab(null);
            setPhase('title');
          }}
        />
      )}

      {/* Full-Time Game Over Modal */}
      {phase === 'gameover' && (
        <GameOverModal
          hud={hud}
          clubName={progress.clubName}
          opponentName={activeOpponent.name}
          coinsEarned={matchRewards.coinsEarned}
          trophiesDelta={matchRewards.trophiesDelta}
          language={progress.language}
          dailyMissions={progress.dailyMissions}
          onClaimDailyMission={(taskId) => {
            const res = claimDailyMissionReward(progressRef.current, taskId);
            if (res) {
              soundEngine.playUiChime();
              handleUpdateProgress(res.updated);
            }
          }}
          onPlayAgain={() => startNewMatch()}
          onBackToTitle={() => setPhase('title')}
        />
      )}

      {/* Main Menu Hub Modals */}
      {activeHubTab === 'play' && (
        <PlayMatchmakingModal
          progress={progress}
          selectedStadiumId={selectedStadiumId}
          selectedMode={selectedMode}
          selectedOpponentIdx={selectedOpponentIdx}
          errorMsg={playErrorMsg}
          onSelectStadium={(s) => {
            setPlayErrorMsg('');
            setSelectedStadiumId(s.id);
          }}
          onSelectMode={setSelectedMode}
          onSelectOpponent={setSelectedOpponentIdx}
          onKickOff={handleStadiumKickOff}
          onClose={() => setActiveHubTab(null)}
        />
      )}

      {(activeHubTab === 'shop' || activeHubTab === 'shop_currency') && (
        <ShopModal
          progress={progress}
          initialTab={activeHubTab === 'shop_currency' ? 'currency' : 'packs'}
          onUpdateProgress={handleUpdateProgress}
          onClose={() => setActiveHubTab(null)}
        />
      )}

      {activeHubTab === 'equipment' && (
        <EquipmentModal
          progress={progress}
          onUpdateProgress={handleUpdateProgress}
          onOpenShopCurrency={() => setActiveHubTab('shop_currency')}
          onClose={() => setActiveHubTab(null)}
        />
      )}

      {activeHubTab === 'squad' && (
        <SquadGearModal
          progress={progress}
          onUpdateProgress={handleUpdateProgress}
          onOpenShopCurrency={() => setActiveHubTab('shop_currency')}
          onClose={() => setActiveHubTab(null)}
        />
      )}

      {activeHubTab === 'clubs' && (
        <ClubsLeaguesModal
          progress={progress}
          firebaseUser={firebaseUser}
          onUpdateProgress={handleUpdateProgress}
          onOpenShopCurrency={() => setActiveHubTab('shop_currency')}
          onClose={() => setActiveHubTab(null)}
        />
      )}

      {(activeHubTab === 'rewards' ||
        activeHubTab === 'rewards_missions' ||
        activeHubTab === 'rewards_packs' ||
        activeHubTab === 'rewards_pass') && (
        <RewardsEventsModal
          progress={progress}
          initialTab={
            activeHubTab === 'rewards_missions'
              ? 'missions'
              : activeHubTab === 'rewards_packs'
                ? 'packs'
                : activeHubTab === 'rewards_pass'
                  ? 'pass'
                  : 'rewards'
          }
          onUpdateProgress={handleUpdateProgress}
          onClose={() => setActiveHubTab(null)}
        />
      )}

      {(activeHubTab === 'profile' || activeHubTab === 'analytics') && (
        <AnalyticsProfileModal
          progress={progress}
          firebaseUser={firebaseUser}
          isOnline={isOnline}
          onUpdateProgress={handleUpdateProgress}
          onClose={() => setActiveHubTab(null)}
        />
      )}

      {activeHubTab === 'settings' && (
        <SettingsModal
          progress={progress}
          muted={muted}
          onToggleMute={handleToggleMute}
          onUpdateProgress={handleUpdateProgress}
          onReplayTutorial={() => {
            setActiveHubTab(null);
            setShowTutorial(true);
          }}
          onClose={() => setActiveHubTab(null)}
        />
      )}

      {activeHubTab === 'ai' && (
        <AiStudioModal progress={progress} onClose={() => setActiveHubTab(null)} />
      )}

      {activeHubTab === 'missions' && (
        <DailyMissionsModal
          progress={progress}
          onUpdateProgress={handleUpdateProgress}
          onClose={() => setActiveHubTab(null)}
        />
      )}

      {showTutorial && (
        <TutorialOverlay
          onComplete={() => {
            setShowTutorial(false);
            handleUpdateProgress({
              ...progress,
              settings: { ...progress.settings, tutorialCompleted: true },
            });
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MiniFootballApp />
    </ErrorBoundary>
  );
}
