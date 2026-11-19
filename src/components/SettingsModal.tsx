import React from 'react';
import { BookOpen, Gamepad2, Globe, Volume2, VolumeX, X } from 'lucide-react';
import type { LanguageCode, UserProgress } from '../game/types';

interface SettingsModalProps {
  progress: UserProgress;
  muted: boolean;
  onToggleMute: () => void;
  onUpdateProgress: (next: UserProgress) => void;
  onReplayTutorial: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  progress,
  muted,
  onToggleMute,
  onUpdateProgress,
  onReplayTutorial,
  onClose,
}) => {
  const languages: Array<{ code: LanguageCode; label: string }> = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'pt', label: 'Português' },
    { code: 'de', label: 'Deutsch' },
  ];

  const updateSettings = (patch: Partial<UserProgress['settings']>) => {
    onUpdateProgress({
      ...progress,
      settings: {
        ...progress.settings,
        ...patch,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 10, 20, 0.85)' }}>
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-white/15 bg-[#11192B] shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-wide text-white">Game Settings</h2>
            <div className="text-xs text-slate-300">Audio, controls, language & arcade tutorial</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-6 space-y-5">
          {/* Audio */}
          <div className="rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
              Audio & Stadium Atmosphere
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                className={`rounded-lg px-4 py-2 text-xs font-bold ${
                  muted ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {muted ? 'Master Audio: Muted' : 'Master Audio: Active'}
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ sfxEnabled: !progress.settings.sfxEnabled })}
                className={`rounded-lg px-4 py-2 text-xs font-bold ${
                  progress.settings.sfxEnabled ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Kick & Whistle SFX: {progress.settings.sfxEnabled ? 'On' : 'Off'}
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ crowdEnabled: !progress.settings.crowdEnabled })}
                className={`rounded-lg px-4 py-2 text-xs font-bold ${
                  progress.settings.crowdEnabled ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Stadium Crowd Cheer: {progress.settings.crowdEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-amber-400" />
              Controls & Input Scheme
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'standard' as const, label: 'Standard Arcade' },
                { id: 'pro' as const, label: 'Pro Auto-Switch' },
                { id: 'lefty' as const, label: 'Left-Handed Touch' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => updateSettings({ controlScheme: preset.id })}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    progress.settings.controlScheme === preset.id
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="pt-1">
              <label className="flex items-center justify-between text-xs text-slate-300">
                <span>Joystick Sensitivity</span>
                <span className="font-mono-num font-bold text-amber-300">
                  {progress.settings.joystickSensitivity.toFixed(1)}x
                </span>
              </label>
              <input
                type="range"
                min="0.6"
                max="1.6"
                step="0.1"
                value={progress.settings.joystickSensitivity}
                onChange={(e) => updateSettings({ joystickSensitivity: Number(e.target.value) })}
                className="mt-1.5 w-full accent-emerald-400"
              />
            </div>

            <div className="rounded-lg bg-slate-800/70 p-3 text-xs text-slate-300">
              Keyboard Controls: WASD / Arrows to Move · Shift to Sprint · E to Pass · Space to Shoot / Slide Tackle · P / Esc to Pause
            </div>
          </div>

          {/* Language */}
          <div className="rounded-xl border border-white/10 bg-slate-900 p-4 space-y-2.5">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-sky-400" />
              Language ({progress.language.toUpperCase()})
            </h3>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onUpdateProgress({ ...progress, language: lang.code })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    progress.language === lang.code
                      ? 'bg-sky-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tutorial Replay */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div>
              <div className="font-display text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                Kickoff Basics Tutorial
              </div>
              <div className="text-xs text-slate-300">Replay the quick arcade controls and pack progression guide.</div>
            </div>
            <button
              type="button"
              onClick={onReplayTutorial}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              Replay Tutorial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
