import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Radio, Volume2 } from 'lucide-react';

import { useI18n } from '../../i18n';

interface VoiceTurn {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
}

interface LiveVoicePanelProps {
  profileContextSummary?: string;
}

function float32ToPcm16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i += 1) {
    float32[i] = int16[i] / 0x8000;
  }
  return float32;
}

export function LiveVoicePanel({ profileContextSummary }: LiveVoicePanelProps) {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [muted, setMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [turns, setTurns] = useState<VoiceTurn[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const mutedRef = useRef(false);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);

  mutedRef.current = muted;

  const stopPlaybackQueue = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    activeSourcesRef.current = [];
    if (playbackCtxRef.current) {
      nextStartTimeRef.current = playbackCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
  }, []);

  const stopSession = useCallback(() => {
    stopPlaybackQueue();
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        /* ignore */
      }
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    if (captureCtxRef.current) {
      void captureCtxRef.current.close().catch(() => undefined);
      captureCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      void playbackCtxRef.current.close().catch(() => undefined);
      playbackCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    }
    setStatus('idle');
  }, [stopPlaybackQueue]);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  const appendTranscript = useCallback((speaker: 'user' | 'assistant', chunk: string) => {
    const clean = chunk.trim();
    if (!clean) return;
    setTurns((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.speaker === speaker) {
        return [...prev.slice(0, -1), { ...last, text: `${last.text} ${clean}`.trim() }];
      }
      return [...prev, { id: `${Date.now()}-${Math.random()}`, speaker, text: clean }].slice(-20);
    });
  }, []);

  const schedulePcmPlayback = useCallback((base64Audio: string) => {
    const ctx = playbackCtxRef.current;
    if (!ctx) return;
    const samples = pcm16Base64ToFloat32(base64Audio);
    if (samples.length === 0) return;

    const buffer = ctx.createBuffer(1, samples.length, 24000);
    buffer.getChannelData(0).set(samples);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now + 0.02, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + buffer.duration;

    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((item) => item !== source);
    };
  }, []);

  const startSession = async () => {
    if (status === 'connecting' || status === 'live') return;
    setErrorMsg(null);
    setStatus('connecting');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone capture is not available in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const captureCtx = new AudioCtx({ sampleRate: 16000 });
      const playbackCtx = new AudioCtx({ sampleRate: 24000 });
      captureCtxRef.current = captureCtx;
      playbackCtxRef.current = playbackCtx;
      nextStartTimeRef.current = playbackCtx.currentTime;

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const qs = new URLSearchParams({ lang: language });
      const ws = new WebSocket(`${proto}//${window.location.host}/api/live?${qs.toString()}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            init: {
              language,
              profileContext: profileContextSummary ? profileContextSummary.slice(0, 600) : undefined,
            },
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as {
            ready?: boolean;
            audio?: string;
            inputTranscript?: string;
            outputTranscript?: string;
            interrupted?: boolean;
            error?: string;
          };
          if (payload.ready) {
            setStatus('live');
          }
          if (payload.inputTranscript) {
            appendTranscript('user', payload.inputTranscript);
          }
          if (payload.outputTranscript) {
            appendTranscript('assistant', payload.outputTranscript);
          }
          if (payload.audio) {
            schedulePcmPlayback(payload.audio);
          }
          if (payload.interrupted) {
            stopPlaybackQueue();
          }
          if (payload.error) {
            setErrorMsg(payload.error);
            setStatus('error');
          }
        } catch {
          /* ignore malformed WS packet */
        }
      };

      ws.onerror = () => {
        setErrorMsg(t('tikabot.voice.error'));
        setStatus('error');
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          stopSession();
        }
      };

      const sourceNode = captureCtx.createMediaStreamSource(stream);
      const processor = captureCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (ev) => {
        if (mutedRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }
        const channelData = ev.inputBuffer.getChannelData(0);
        const pcmBase64 = float32ToPcm16Base64(channelData);
        wsRef.current.send(JSON.stringify({ audio: pcmBase64 }));
      };

      sourceNode.connect(processor);
      processor.connect(captureCtx.destination);
    } catch (error) {
      stopSession();
      setErrorMsg(error instanceof Error ? error.message : t('tikabot.voice.error'));
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-between p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Gemini Live · 16kHz / 24kHz PCM</span>
          </p>
          <h2 className={`mt-1 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
            {t('tikabot.voice.title')}
          </h2>
          <p className={`mt-0.5 text-xs text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('tikabot.voice.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status === 'live' && (
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="btn-secondary btn-sm"
            >
              {muted ? (
                <>
                  <MicOff className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  <span>{t('tikabot.voice.unmute')}</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span>{t('tikabot.voice.mute')}</span>
                </>
              )}
            </button>
          )}

          {status === 'idle' || status === 'error' ? (
            <button
              type="button"
              onClick={() => void startSession()}
              className="btn-primary btn-sm"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('tikabot.voice.start')}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopSession}
              className="btn-danger btn-sm"
            >
              <PhoneOff className="h-4 w-4" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {status === 'connecting' ? t('common.status.loading') : t('tikabot.voice.stop')}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Live synchronized transcripts */}
      <div className="my-4 flex-1 space-y-3 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
        {turns.length === 0 ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center">
            <Volume2 className="h-8 w-8 text-emerald-600/70 dark:text-emerald-400/70" aria-hidden="true" />
            <p className={`mt-3 max-w-md text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
              {status === 'live' ? t('tikabot.voice.listening') : t('tikabot.voice.empty')}
            </p>
          </div>
        ) : (
          turns.map((turn) => (
            <div
              key={turn.id}
              className={`rounded-xl px-3.5 py-2.5 text-sm ${
                turn.speaker === 'user'
                  ? 'ml-auto max-w-[82%] bg-emerald-600 text-white'
                  : 'mr-auto max-w-[85%] border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'
              }`}
            >
              <p className="mb-0.5 text-[11px] font-semibold uppercase opacity-75">
                {turn.speaker === 'user' ? t('tikabot.voice.you') : 'TikaBot'}
              </p>
              <p className={isBangla ? 'font-bangla' : undefined}>{turn.text}</p>
            </div>
          ))
        )}
      </div>

      {errorMsg && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
