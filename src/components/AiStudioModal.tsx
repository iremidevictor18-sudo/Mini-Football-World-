import React, { useRef, useState } from 'react';
import { X, Send, Mic, Square, Volume2, Music, Image as ImageIcon, Film, ScanEye } from 'lucide-react';
import { PLAYER_CARDS } from '../game/catalog';
import type { UserProgress } from '../game/types';

interface AiStudioModalProps {
  progress: UserProgress;
  onClose: () => void;
}

type AiTab = 'coach' | 'audio' | 'music' | 'image' | 'analyze' | 'video';

export const AiStudioModal: React.FC<AiStudioModalProps> = ({ progress, onClose }) => {
  const [tab, setTab] = useState<AiTab>('coach');

  // Coach Chat State
  const [chatModelMode, setChatModelMode] = useState<'deep' | 'interactive' | 'general' | 'fast'>('deep');
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    {
      role: 'model',
      text: `Coach Marco here! You're running ${progress.formation} with ${progress.trophies} trophies. Ask me for counter-tactics, card upgrade priorities, or press strategy.`,
    },
  ]);

  // TTS & Mic Transcription State
  const [ttsScript, setTtsScript] = useState('Goal! Black Belt launches a blistering Mythical volley straight into the top corner!');
  const [dualSpeaker, setDualSpeaker] = useState(true);
  const [ttsAudioUrl, setTtsAudioUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Lyria Music State
  const [musicPrompt, setMusicPrompt] = useState('High-energy stadium football walkout anthem with triumphant brass, drums, and crowd chants');
  const [fullTrack, setFullTrack] = useState(false);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicLyrics, setMusicLyrics] = useState('');

  // Image Generation & Editing State
  const [imgPrompt, setImgPrompt] = useState('Chibi low-poly football club crest shield with emerald and gold lightning, clean sports badge');
  const [imgSize, setImgSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [imgEngine, setImgEngine] = useState<'pro' | 'edit'>('pro');
  const [generatedImgUrl, setGeneratedImgUrl] = useState('');
  const [uploadImgBase64, setUploadImgBase64] = useState('');
  const [uploadImgMime, setUploadImgMime] = useState('image/png');

  // Image Analysis State
  const [analyzeQuestion, setAnalyzeQuestion] = useState('Analyze this football formation screenshot or crest and suggest tactical improvements.');
  const [analysisText, setAnalysisText] = useState('');

  // Video Generation State
  const [videoPrompt, setVideoPrompt] = useState('Dynamic stadium highlight clip with floodlights gleaming and confetti falling on the emerald pitch.');
  const [videoAspect, setVideoAspect] = useState<'16:9' | '9:16'>('16:9');
  const [videoUrl, setVideoUrl] = useState('');

  const [busyMsg, setBusyMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const squadContext = `Club: ${progress.clubName}, League: ${progress.leagueTier}, Formation: ${progress.formation}, Lineup: ${progress.activeLineup
    .map((id) => PLAYER_CARDS.find((c) => c.id === id)?.nickname || id)
    .join(', ')}`;

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatBusy) return;
    const nextMsgs = [...messages, { role: 'user' as const, text: chatInput.trim() }];
    setMessages(nextMsgs);
    setChatInput('');
    setChatBusy(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMsgs, mode: chatModelMode, squadContext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Coach request failed.');
      setMessages([...nextMsgs, { role: 'model', text: data.text }]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error calling Coach AI.');
    } finally {
      setChatBusy(false);
    }
  };

  const handleGenerateTts = async () => {
    setBusyMsg('Synthesizing matchday commentary...');
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai/commentary-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: ttsScript, dualSpeaker }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'TTS failed.');
      setTtsAudioUrl(data.audioDataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'TTS generation failed.');
    } finally {
      setBusyMsg('');
    }
  };

  const handleToggleMic = async () => {
    if (recording) {
      mediaRecRef.current?.stop();
      setRecording(false);
      return;
    }
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const result = String(reader.result || '');
          const base64Audio = result.split(',')[1] || '';
          setBusyMsg('Transcribing voice order with gemini-3.5-transcribe...');
          try {
            const res = await fetch('/api/ai/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ base64Audio, mimeType: blob.type || 'audio/webm' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Transcription failed.');
            setTranscript(data.transcript);
            setChatInput(data.transcript);
          } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Transcription error.');
          } finally {
            setBusyMsg('');
          }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setErrorMsg('Microphone permission unavailable in this browser.');
    }
  };

  const handleGenerateMusic = async () => {
    setBusyMsg('Composing stadium anthem with Lyria...');
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: musicPrompt, fullTrack }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Music generation failed.');
      setMusicUrl(data.audioDataUrl);
      setMusicLyrics(data.lyrics || '');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Music generation error.');
    } finally {
      setBusyMsg('');
    }
  };

  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    setUploadImgMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = String(reader.result || '');
      setUploadImgBase64(res.split(',')[1] || '');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateImage = async () => {
    setBusyMsg(imgEngine === 'pro' ? 'Generating high-resolution artwork...' : 'Creating/editing with Nano Banana 2.1...');
    setErrorMsg('');
    try {
      const endpoint = imgEngine === 'pro' ? '/api/ai/image/generate' : '/api/ai/image/edit';
      const body =
        imgEngine === 'pro'
          ? { prompt: imgPrompt, imageSize: imgSize, aspectRatio: '1:1' }
          : { prompt: imgPrompt, base64Image: uploadImgBase64 || undefined, mimeType: uploadImgMime };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed.');
      setGeneratedImgUrl(data.imageUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Image studio error.');
    } finally {
      setBusyMsg('');
    }
  };

  const handleAnalyzeImage = async () => {
    if (!uploadImgBase64) {
      setErrorMsg('Please upload a tactical board or screenshot first.');
      return;
    }
    setBusyMsg('Analyzing image with gemini-4-argon...');
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai/image/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image: uploadImgBase64, mimeType: uploadImgMime, question: analyzeQuestion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed.');
      setAnalysisText(data.analysis);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Image analysis error.');
    } finally {
      setBusyMsg('');
    }
  };

  const handleAnimateVideo = async () => {
    if (!uploadImgBase64) {
      setErrorMsg('Please upload a starting photo to animate into a highlight video.');
      return;
    }
    setBusyMsg('Rendering highlight video via gemini-omni-1.2-flash (may take ~1–2 mins)...');
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image: uploadImgBase64,
          mimeType: uploadImgMime,
          prompt: videoPrompt,
          aspectRatio: videoAspect,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Video generation failed.');
      setVideoUrl(data.videoDataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Video generation error.');
    } finally {
      setBusyMsg('');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 10, 20, 0.84)' }}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-white/15 bg-[#11192B] shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-wide text-white">
              Matchday AI Studio & Tactical Assistant
            </h2>
            <div className="text-xs text-slate-300">
              Server-powered Gemini coaching, commentary, stadium music, crest studio, & highlight reels
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Matchday Studio"
            className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 flex gap-2 border-b border-white/10 px-6 py-3 overflow-x-auto">
          {[
            { id: 'coach', label: 'Tactical Coach Chat' },
            { id: 'audio', label: 'Commentary TTS & Mic' },
            { id: 'music', label: 'Stadium Anthem' },
            { id: 'image', label: 'Crest & Kit Art' },
            { id: 'analyze', label: 'Tactics Analyzer' },
            { id: 'video', label: 'Highlight Video' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id as AiTab);
                setErrorMsg('');
              }}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === item.id ? 'bg-rose-500 text-white' : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-6 space-y-4">
          {busyMsg && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs text-amber-200">
              {busyMsg}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-xs text-rose-200 break-words">
              {errorMsg}
            </div>
          )}

          {tab === 'coach' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-400">Select Reasoning Mode:</div>
                <div className="flex gap-1.5">
                  {[
                    { id: 'deep', label: 'Deep Strategy (Carbon High Thinking)' },
                    { id: 'interactive', label: 'Interactive (Argon)' },
                    { id: 'general', label: 'Standard (Hydrogen)' },
                    { id: 'fast', label: 'Quick Tip (Flash-Lite)' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setChatModelMode(m.id as typeof chatModelMode)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                        chatModelMode === m.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3 custom-scroll">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'ml-auto max-w-[82%] bg-emerald-500/20 text-emerald-100 border border-emerald-500/30'
                        : 'mr-auto max-w-[88%] bg-slate-800 text-slate-200 border border-white/10'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Coach Marco about counter-attacks, stamina, or upgrades..."
                  className="flex-1 rounded-lg border border-white/15 bg-slate-900 px-3.5 py-2.5 text-xs text-white focus:border-emerald-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={chatBusy}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {chatBusy ? 'Thinking...' : 'Ask Coach'}
                </button>
              </form>
            </div>
          )}

          {tab === 'audio' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3">
                <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-emerald-400" />
                  Live Commentary TTS (gemini-3.8-flash-tts)
                </h3>
                <textarea
                  value={ttsScript}
                  onChange={(e) => setTtsScript(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-white/15 bg-slate-950 p-2.5 text-xs text-white"
                />
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={dualSpeaker}
                    onChange={(e) => setDualSpeaker(e.target.checked)}
                  />
                  Dual-Speaker Booth Commentary (Leo & Maya)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateTts}
                  className="w-full rounded-lg bg-emerald-500 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Generate Broadcast Audio
                </button>
                {ttsAudioUrl && <audio controls src={ttsAudioUrl} className="w-full mt-2" />}
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3">
                <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <Mic className="h-4 w-4 text-rose-400" />
                  Voice Tactical Mic (gemini-3.5-transcribe)
                </h3>
                <p className="text-xs text-slate-400">
                  Record a quick voice tactical command or match memo to transcribe it directly into Coach chat.
                </p>
                <button
                  type="button"
                  onClick={handleToggleMic}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold ${
                    recording ? 'bg-rose-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {recording ? 'Stop & Transcribe' : 'Record Voice Order'}
                </button>
                {transcript && (
                  <div className="rounded-lg border border-white/10 bg-slate-950 p-3 text-xs text-emerald-300">
                    Transcript: {transcript}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'music' && (
            <div className="rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Music className="h-4 w-4 text-amber-400" />
                Stadium Anthem Studio (Lyria 3)
              </h3>
              <input
                type="text"
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white"
              />
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={fullTrack}
                    onChange={(e) => setFullTrack(e.target.checked)}
                  />
                  Full-Length Track (lyria-3-pro-preview) instead of 30s clip (lyria-3-clip-preview)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateMusic}
                  className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
                >
                  Compose Anthem
                </button>
              </div>
              {musicUrl && <audio controls src={musicUrl} className="w-full" />}
              {musicLyrics && <pre className="whitespace-pre-wrap text-xs text-slate-300">{musicLyrics}</pre>}
            </div>
          )}

          {tab === 'image' && (
            <div className="rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-sky-400" />
                Club Crest & Kit Designer
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setImgEngine('pro')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    imgEngine === 'pro' ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  High-Res 1K/2K/4K (gemini-3-pro-image-preview)
                </button>
                <button
                  type="button"
                  onClick={() => setImgEngine('edit')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    imgEngine === 'edit' ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Create & Edit Photo (gemini-nano-banana-2.1)
                </button>
              </div>
              <input
                type="text"
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                {imgEngine === 'pro' ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Resolution:</span>
                    {(['1K', '2K', '4K'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setImgSize(sz)}
                        className={`rounded px-2.5 py-1 font-bold ${
                          imgSize === sz ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    className="text-xs text-slate-300"
                  />
                )}
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  className="rounded-lg bg-sky-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-sky-300"
                >
                  Generate Artwork
                </button>
              </div>
              {generatedImgUrl && (
                <img
                  src={generatedImgUrl}
                  alt="Generated Football Artwork"
                  className="mt-2 max-h-64 rounded-xl border border-white/15 object-contain"
                />
              )}
            </div>
          )}

          {tab === 'analyze' && (
            <div className="rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <ScanEye className="h-4 w-4 text-purple-400" />
                Tactics Board & Screenshot Analyzer (gemini-4-argon)
              </h3>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
                className="text-xs text-slate-300"
              />
              <input
                type="text"
                value={analyzeQuestion}
                onChange={(e) => setAnalyzeQuestion(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAnalyzeImage}
                className="rounded-lg bg-purple-500 px-4 py-2 text-xs font-bold text-white hover:bg-purple-400"
              >
                Analyze Image
              </button>
              {analysisText && (
                <div className="rounded-lg border border-white/10 bg-slate-950 p-3 text-xs text-slate-200 whitespace-pre-wrap">
                  {analysisText}
                </div>
              )}
            </div>
          )}

          {tab === 'video' && (
            <div className="rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Film className="h-4 w-4 text-rose-400" />
                Animate Match Photo to Highlight Video (gemini-omni-1.2-flash)
              </h3>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
                className="text-xs text-slate-300"
              />
              <input
                type="text"
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white"
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Aspect Ratio:</span>
                  {(['16:9', '9:16'] as const).map((ar) => (
                    <button
                      key={ar}
                      type="button"
                      onClick={() => setVideoAspect(ar)}
                      className={`rounded px-2.5 py-1 font-bold ${
                        videoAspect === ar ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAnimateVideo}
                  className="rounded-lg bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-400"
                >
                  Animate Video
                </button>
              </div>
              {videoUrl && <video controls src={videoUrl} className="mt-2 max-h-64 w-full rounded-xl" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
