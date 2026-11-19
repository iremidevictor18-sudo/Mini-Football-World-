import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '25mb' }));

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sendError(res: express.Response, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const status = message.includes('RESOURCE_EXHAUSTED') || message.includes('429')
    ? 429
    : message.includes('PERMISSION_DENIED') || message.includes('403')
      ? 403
      : 500;
  res.status(status).json({ error: message });
}

// 1. Multi-turn Tactical Coach Chatbot (supports gemini-4-carbon High Thinking, gemini-4-argon, gemini-4-hydrogen, gemini-3.1-flash-lite)
app.post('/api/ai/coach', async (req, res) => {
  try {
    const ai = getAiClient();
    const {
      messages = [],
      mode = 'deep',
      squadContext = '',
    }: {
      messages: Array<{ role: 'user' | 'model'; text: string }>;
      mode?: 'deep' | 'interactive' | 'general' | 'fast';
      squadContext?: string;
    } = req.body;

    const modelMap = {
      deep: 'gemini-4-carbon',
      interactive: 'gemini-4-argon',
      general: 'gemini-4-hydrogen',
      fast: 'gemini-3.1-flash-lite',
    } as const;
    const model = modelMap[mode] ?? 'gemini-4-hydrogen';

    const systemInstruction = `You are Coach Marco, the tactical mastermind for Mini Football World (a fast-paced 6v6 arcade football game). Give sharp, actionable coaching advice on formations (4-4-2, 3-4-3, 4-3-3, 3-5-2), pressing tactics, player card upgrades, and match analytics. Keep responses well-structured and concise. Current squad context: ${squadContext}`;

    const chat = ai.chats.create({
      model,
      history: messages.slice(0, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      config: {
        systemInstruction,
        ...(model === 'gemini-4-carbon'
          ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
          : {}),
      },
    });

    const latest = messages[messages.length - 1]?.text ?? 'Analyze my squad tactics.';
    const response = await chat.sendMessage({ message: latest });
    res.json({ text: response.text ?? '', model });
  } catch (err) {
    sendError(res, err);
  }
});

// 2. Match Commentary Text-to-Speech (gemini-3.8-flash-tts)
app.post('/api/ai/commentary-tts', async (req, res) => {
  try {
    const ai = getAiClient();
    const {
      script = 'What a thunderbolt into the top corner! Unstoppable finish!',
      dualSpeaker = true,
    }: { script?: string; dualSpeaker?: boolean } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: dualSpeaker
        ? [
            {
              role: 'user',
              parts: [
                {
                  text: `Leo: ${script}`,
                  speechMetadata: {
                    speaker: 'Leo',
                    style: 'Electric, passionate football play-by-play commentator',
                  },
                },
                {
                  text: 'Maya: |yeah| Pure arcade magic! The crowd is going wild!',
                  speechMetadata: {
                    speaker: 'Maya',
                    style: 'Sharp, excited co-commentator',
                  },
                },
              ],
            },
          ]
        : [
            {
              role: 'user',
              parts: [
                {
                  text: script,
                  speechMetadata: {
                    style: 'Electric, passionate stadium football announcer',
                  },
                },
              ],
            },
          ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: dualSpeaker
          ? {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  { speaker: 'Leo', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
                  { speaker: 'Maya', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                ],
              },
            }
          : {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Puck' },
              },
            },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('No audio returned from gemini-3.8-flash-tts.');
    }
    res.json({ audioDataUrl: `data:audio/wav;base64,${base64Audio}` });
  } catch (err) {
    sendError(res, err);
  }
});

// 3. Voice Tactical Audio Transcription (gemini-3.5-transcribe)
app.post('/api/ai/transcribe', async (req, res) => {
  try {
    const ai = getAiClient();
    const { base64Audio, mimeType = 'audio/webm' }: { base64Audio: string; mimeType?: string } = req.body;
    if (!base64Audio) throw new Error('Missing audio payload.');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Audio } },
          { text: 'Transcribe this football manager voice note accurately.' },
        ],
      },
    });
    res.json({ transcript: response.text ?? '' });
  } catch (err) {
    sendError(res, err);
  }
});

// 4. Stadium Anthem Music Generation (lyria-3-clip-preview / lyria-3-pro-preview)
app.post('/api/ai/music', async (req, res) => {
  try {
    const ai = getAiClient();
    const {
      prompt = 'Energetic upbeat stadium football walkout anthem with brass fanfare, crowd claps, and driving synth drums',
      fullTrack = false,
    }: { prompt?: string; fullTrack?: boolean } = req.body;

    const model = fullTrack ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
    const response = await ai.models.generateContentStream({
      model,
      contents: prompt,
    });

    const audioChunks: Buffer[] = [];
    let lyrics = '';
    let mimeType = 'audio/mpeg';

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (audioChunks.length === 0 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
        }
        if (part.text) lyrics += part.text;
      }
    }

    const audioBase64 = Buffer.concat(audioChunks).toString('base64');
    res.json({ audioDataUrl: `data:${mimeType};base64,${audioBase64}`, lyrics, model });
  } catch (err) {
    sendError(res, err);
  }
});

// 5. High-Quality Club Crest / Poster Generation (gemini-3-pro-image-preview with 1K, 2K, 4K)
app.post('/api/ai/image/generate', async (req, res) => {
  try {
    const ai = getAiClient();
    const {
      prompt = 'Bold modern esports football club crest shield with emerald and gold accents on dark slate background',
      imageSize = '1K',
      aspectRatio = '1:1',
    }: { prompt?: string; imageSize?: '1K' | '2K' | '4K'; aspectRatio?: string } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    });

    let imageUrl = '';
    let note = '';
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? 'image/png';
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        note += part.text;
      }
    }
    if (!imageUrl) throw new Error('No image generated.');
    res.json({ imageUrl, note });
  } catch (err) {
    sendError(res, err);
  }
});

// 6. Create & Edit Images (gemini-nano-banana-2.1)
app.post('/api/ai/image/edit', async (req, res) => {
  try {
    const ai = getAiClient();
    const {
      prompt,
      base64Image,
      mimeType = 'image/png',
    }: { prompt: string; base64Image?: string; mimeType?: string } = req.body;
    if (!prompt) throw new Error('Prompt is required.');

    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];
    if (base64Image) {
      parts.push({ inlineData: { data: base64Image, mimeType } });
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: '1:1', imageSize: '1K' },
      },
    });

    let imageUrl = '';
    let note = '';
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? 'image/png';
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        note += part.text;
      }
    }
    if (!imageUrl) throw new Error('No image returned from gemini-nano-banana-2.1.');
    res.json({ imageUrl, note });
  } catch (err) {
    sendError(res, err);
  }
});

// 7. Image Understanding / Tactical Board Analyzer (gemini-4-argon)
app.post('/api/ai/image/analyze', async (req, res) => {
  try {
    const ai = getAiClient();
    const {
      base64Image,
      mimeType = 'image/png',
      question = 'Analyze this football formation, tactical screenshot, or jersey design and suggest improvements.',
    }: { base64Image: string; mimeType?: string; question?: string } = req.body;
    if (!base64Image) throw new Error('Please upload an image to analyze.');

    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: question },
        ],
      },
    });
    res.json({ analysis: response.text ?? '' });
  } catch (err) {
    sendError(res, err);
  }
});

// 8. Animate Image into Video (gemini-omni-1.2-flash via Interactions API)
app.post('/api/ai/video', async (req, res) => {
  try {
    const ai = getAiClient();
    const {
      base64Image,
      mimeType = 'image/png',
      prompt = 'Animate this football scene into a dynamic stadium highlight reel with dramatic floodlights and cheering crowd.',
      aspectRatio = '16:9',
    }: {
      base64Image: string;
      mimeType?: string;
      prompt?: string;
      aspectRatio?: '16:9' | '9:16';
    } = req.body;
    if (!base64Image) throw new Error('Please upload a starting photo.');

    const interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.2-flash',
        input: [
          { type: 'image', mime_type: mimeType, data: base64Image },
          { type: 'text', text: prompt },
        ],
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
          duration: '6s',
          resolution: '720p',
        },
      },
      { timeout: 300000 }
    );

    const videoPart = interaction.output_video;
    if (videoPart?.data) {
      res.json({ videoDataUrl: `data:${videoPart.mime_type || 'video/mp4'};base64,${videoPart.data}` });
    } else if (videoPart?.uri) {
      res.json({ videoDataUrl: videoPart.uri });
    } else {
      throw new Error('No video returned from gemini-omni-1.2-flash.');
    }
  } catch (err) {
    sendError(res, err);
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Mini Football World server running on http://localhost:${port}`);
  });
}

startServer();
