import { startTransition, useEffect, useRef, useState, type CSSProperties } from 'react';
import './VoiceModeOverlay.css';
import { useLanguage } from '../context/LanguageContext';

type Role = 'assistant' | 'user';
type SessionPhase = 'idle' | 'requesting' | 'listening' | 'capturing' | 'processing' | 'speaking';

type TimelineMessage = {
  id: string;
  role: Role;
  text: string;
};

type MicSession = {
  stream: MediaStream;
  audioContext: AudioContext;
  source: MediaStreamAudioSourceNode;
  filter: BiquadFilterNode;
  analyser: AnalyserNode;
  processor: ScriptProcessorNode;
  sink: GainNode;
  rafId: number | null;
};

type PlaybackSession = {
  audioContext: AudioContext | null;
  nextPlaybackTime: number;
  activeSources: Set<AudioBufferSourceNode>;
};

type RealtimeEvent = {
  type?: string;
  [key: string]: unknown;
};

interface VoiceModeOverlayProps {
  open: boolean;
  onClose: () => void;
  onUserTranscript?: (text: string) => void;
  onAssistantTranscript?: (text: string) => void;
  contextSummary?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const EXPLICIT_REALTIME_WS_URL = import.meta.env.VITE_REALTIME_WS_URL ?? null;
const VOICE_OPTIONS = [
  { value: 'Tina', label: 'Tina' },
  { value: 'Hana', label: 'Hana' },
  { value: 'Liora Mira', label: 'Liora Mira' },
  { value: 'Serena', label: 'Serena' },
  { value: 'Raymond', label: 'Raymond' },
  { value: 'Ethan', label: 'Ethan' },
];
const INITIAL_METER = new Array(18).fill(0.08);
const OUTPUT_SAMPLE_RATE = 24000;
const VOICE_RESUME_KEY = 'carmatch-voice-resume-active';

export default function VoiceModeOverlay({
  open,
  onClose,
  onUserTranscript,
  onAssistantTranscript,
  contextSummary,
}: VoiceModeOverlayProps) {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<TimelineMessage[]>(() => [{ id: crypto.randomUUID(), role: 'assistant', text: '' }]);
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [languageHint, setLanguageHint] = useState<'vi' | 'en'>(() => (language === 'vi' ? 'vi' : 'en'));
  const [voice, setVoice] = useState('Tina');
  const [meterValues, setMeterValues] = useState<number[]>(INITIAL_METER);
  const [signalLevel, setSignalLevel] = useState(0.08);
  const [showSettings, setShowSettings] = useState(false);

  const micRef = useRef<MicSession | null>(null);
  const playbackRef = useRef<PlaybackSession>({
    audioContext: null,
    nextPlaybackTime: 0,
    activeSources: new Set(),
  });
  const socketRef = useRef<WebSocket | null>(null);
  const sessionActiveRef = useRef(false);
  const realtimeReadyRef = useRef(false);
  const responseActiveRef = useRef(false);
  const responseDoneRef = useRef(false);
  const assistantAudioActiveRef = useRef(false);
  const phaseRef = useRef<SessionPhase>('idle');
  const messagesRef = useRef<TimelineMessage[]>([{ id: crypto.randomUUID(), role: 'assistant', text: '' }]);
  const assistantDraftIdRef = useRef<string | null>(null);
  const assistantTranscriptRef = useRef('');
  const lastRealtimeErrorRef = useRef<string | null>(null);
  const autoResumeAttemptedRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      void endVoiceSession({ preserveMessages: true, quiet: true });
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setShowSettings(false);
    }
  }, [open]);

  useEffect(() => {
    const nextLanguageHint = language === 'vi' ? 'vi' : 'en';
    setLanguageHint(nextLanguageHint);
  }, [language]);

  useEffect(() => {
    if (phase === 'idle') {
      setStatus(t({ vi: 'Chạm micro để bật chế độ giọng nói.', en: 'Tap the mic to start voice mode.' }));
    }
  }, [phase, t]);

  useEffect(() => {
    const localizedStarter = t({
      vi: 'Chạm micro để bắt đầu chế độ giọng nói realtime. Khi đã kết nối, chỉ cần nói tự nhiên và dừng lại khi bạn nói xong.',
      en: "Tap the mic to start realtime voice mode. Once connected, just speak naturally and pause when you're done.",
    });
    if (messagesRef.current.length === 1 && messagesRef.current[0]?.role === 'assistant') {
      replaceMessages([{ id: messagesRef.current[0].id, role: 'assistant', text: localizedStarter }]);
    }
  }, [language, t]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(VOICE_RESUME_KEY, sessionActiveRef.current ? '1' : '0');
  }, [phase]);

  useEffect(() => {
    if (!open || autoResumeAttemptedRef.current || sessionActiveRef.current) return;
    if (typeof window === 'undefined') return;
    const shouldResume = localStorage.getItem(VOICE_RESUME_KEY) === '1';
    if (!shouldResume) return;
    autoResumeAttemptedRef.current = true;
    void startVoiceSession();
  }, [open]);

  useEffect(() => {
    if (!sessionActiveRef.current || !realtimeReadyRef.current) return;
    sendRealtimeEvent({ type: 'session.configure', voice, languageHint, contextSummary });
  }, [contextSummary, languageHint, voice]);

  function setPhaseAndStatus(nextPhase: SessionPhase, nextStatus: string) {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
    setStatus(nextStatus);
  }

  function replaceMessages(nextMessages: TimelineMessage[]) {
    messagesRef.current = nextMessages;
    startTransition(() => setMessages(nextMessages));
  }

  function appendMessage(message: TimelineMessage) {
    replaceMessages([...messagesRef.current, message]);
  }

  function upsertAssistantMessage(text: string, final = false) {
    const trimmed = text.trim();
    if (!trimmed) {
      if (final) {
        assistantDraftIdRef.current = null;
        assistantTranscriptRef.current = '';
      }
      return;
    }
    const existingId = assistantDraftIdRef.current;
    if (!existingId) {
      const nextId = crypto.randomUUID();
      assistantDraftIdRef.current = nextId;
      appendMessage({ id: nextId, role: 'assistant', text: trimmed });
    } else {
      replaceMessages(messagesRef.current.map(message => (message.id === existingId ? { ...message, text: trimmed } : message)));
    }
    if (final) {
      assistantDraftIdRef.current = null;
      assistantTranscriptRef.current = '';
    }
  }

  async function startVoiceSession() {
    if (sessionActiveRef.current) return;
    setError(null);
    lastRealtimeErrorRef.current = null;
      setPhaseAndStatus('requesting', t({ vi: 'Đang chờ quyền micro...', en: 'Waiting for microphone permission...' }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      });
      const audioContext = new AudioContext({ sampleRate: 16000 });
      if (audioContext.state === 'suspended') await audioContext.resume();
      const source = audioContext.createMediaStreamSource(stream);
      const filter = audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 140;
      filter.Q.value = 0.7;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      const sink = audioContext.createGain();
      sink.gain.value = 0;
      source.connect(filter);
      filter.connect(analyser);
      analyser.connect(processor);
      processor.connect(sink);
      sink.connect(audioContext.destination);

      processor.onaudioprocess = event => {
        const input = event.inputBuffer.getChannelData(0);
        const socket = socketRef.current;
        if (!sessionActiveRef.current || !realtimeReadyRef.current || !socket || socket.readyState !== WebSocket.OPEN) return;
        sendRealtimeEvent({ type: 'input_audio_buffer.append', audio: float32ToPcmBase64(input) });
      };

      micRef.current = { stream, audioContext, source, filter, analyser, processor, sink, rafId: null };
      sessionActiveRef.current = true;
      realtimeReadyRef.current = false;
      responseActiveRef.current = false;
      responseDoneRef.current = false;
      assistantAudioActiveRef.current = false;
      runMeterLoop();
      if (typeof window !== 'undefined') {
        localStorage.setItem(VOICE_RESUME_KEY, '1');
      }
      setPhaseAndStatus('requesting', t({ vi: 'Đang kết nối mô hình thoại realtime...', en: 'Connecting to the realtime voice model...' }));
      connectRealtimeSocket();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t({ vi: 'Không thể truy cập micro.', en: 'Unable to access the microphone.' }));
      setPhaseAndStatus('idle', t({ vi: 'Không cấp được quyền micro.', en: 'Microphone access failed.' }));
      await cleanupMic();
    }
  }

  async function endVoiceSession(options?: { preserveMessages?: boolean; quiet?: boolean }) {
    sessionActiveRef.current = false;
    realtimeReadyRef.current = false;
    responseActiveRef.current = false;
    responseDoneRef.current = false;
    assistantDraftIdRef.current = null;
    assistantTranscriptRef.current = '';

    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close();

    stopAssistantAudio({ keepContext: false });
    await cleanupMic();
    setMeterValues(INITIAL_METER);
    setSignalLevel(0.08);

    if (!options?.preserveMessages) {
      replaceMessages([
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: t({
            vi: 'Đã đóng phiên. Chạm micro bất cứ lúc nào để trò chuyện lại.',
            en: 'Session closed. Tap the mic whenever you want to talk again.',
          }),
        },
      ]);
    }
    if (!options?.quiet) {
      setPhaseAndStatus('idle', t({ vi: 'Đã tắt chế độ giọng nói.', en: 'Voice mode is off.' }));
    } else {
      phaseRef.current = 'idle';
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(VOICE_RESUME_KEY, '0');
    }
  }

  function connectRealtimeSocket() {
    const socket = new WebSocket(getRealtimeWsUrl());
    socketRef.current = socket;
    socket.addEventListener('open', () => {
      setError(null);
      lastRealtimeErrorRef.current = null;
      sendRealtimeEvent({ type: 'session.configure', voice, languageHint, contextSummary });
    });
    socket.addEventListener('message', message => {
      try {
        handleRealtimeEvent(JSON.parse(String(message.data)) as RealtimeEvent);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : t({ vi: 'Sự kiện realtime không hợp lệ.', en: 'Invalid realtime event.' }));
      }
    });
    socket.addEventListener('error', () => {
      setError(t({ vi: 'Kết nối realtime thất bại.', en: 'Realtime connection failed.' }));
      if (sessionActiveRef.current) setPhaseAndStatus('idle', t({ vi: 'Kết nối realtime thất bại.', en: 'Realtime connection failed.' }));
    });
    socket.addEventListener('close', () => {
      realtimeReadyRef.current = false;
      responseActiveRef.current = false;
      if (!sessionActiveRef.current) return;
      void endVoiceSession({ preserveMessages: true, quiet: true });
      const detail = lastRealtimeErrorRef.current ?? t({ vi: 'Phiên realtime đã kết thúc.', en: 'Realtime session ended.' });
      setError(detail);
      setPhaseAndStatus('idle', detail);
    });
  }

  function sendRealtimeEvent(event: Record<string, unknown>) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(event));
  }

  function handleRealtimeEvent(event: RealtimeEvent) {
    const eventType = event.type;
    if (!eventType) return;

    switch (eventType) {
      case 'session.created':
      case 'session.updated': {
        realtimeReadyRef.current = true;
        if (sessionActiveRef.current && phaseRef.current !== 'capturing' && phaseRef.current !== 'speaking' && phaseRef.current !== 'processing') {
          setPhaseAndStatus('listening', t({ vi: 'Tôi đang lắng nghe.', en: "I'm here and listening." }));
        }
        return;
      }
      case 'input_audio_buffer.speech_started': {
        if (assistantAudioActiveRef.current || responseActiveRef.current) {
          stopAssistantAudio();
          sendRealtimeEvent({ type: 'response.cancel' });
        }
        responseActiveRef.current = false;
        responseDoneRef.current = false;
        setPhaseAndStatus('capturing', t({ vi: 'Đang nghe...', en: 'Listening...' }));
        return;
      }
      case 'input_audio_buffer.speech_stopped':
        setPhaseAndStatus('processing', t({ vi: 'Đang suy nghĩ...', en: 'Thinking...' }));
        return;
      case 'conversation.item.input_audio_transcription.completed': {
        const transcript = typeof event.transcript === 'string' ? event.transcript.trim() : '';
        if (!transcript) return;
        appendMessage({ id: crypto.randomUUID(), role: 'user', text: transcript });
        onUserTranscript?.(transcript);
        return;
      }
      case 'response.created':
        responseActiveRef.current = true;
        responseDoneRef.current = false;
        assistantDraftIdRef.current = null;
        assistantTranscriptRef.current = '';
        setPhaseAndStatus('processing', t({ vi: 'Đang suy nghĩ...', en: 'Thinking...' }));
        return;
      case 'response.audio_transcript.delta': {
        const delta = typeof event.delta === 'string' ? event.delta : '';
        if (!delta) return;
        assistantTranscriptRef.current += delta;
        upsertAssistantMessage(assistantTranscriptRef.current);
        return;
      }
      case 'response.audio_transcript.done': {
        const transcript = typeof event.transcript === 'string' ? event.transcript : assistantTranscriptRef.current;
        upsertAssistantMessage(transcript, true);
        const finalTranscript = transcript.trim();
        if (finalTranscript) {
          onAssistantTranscript?.(finalTranscript);
        }
        return;
      }
      case 'response.audio.delta': {
        const delta = typeof event.delta === 'string' ? event.delta : '';
        if (!delta) return;
        void enqueueAssistantAudio(delta);
        setPhaseAndStatus('speaking', t({ vi: 'Đang nói. Bạn có thể ngắt lời bất cứ lúc nào.', en: 'Speaking. Cut in whenever you want.' }));
        return;
      }
      case 'response.audio.done':
        responseDoneRef.current = true;
        maybeReturnToListening();
        return;
      case 'response.done':
        responseActiveRef.current = false;
        responseDoneRef.current = true;
        maybeReturnToListening();
        return;
      case 'error': {
        const detail =
          typeof event.error === 'object' &&
          event.error !== null &&
          'message' in event.error &&
          typeof (event.error as { message?: unknown }).message === 'string'
            ? String((event.error as { message?: unknown }).message)
            : t({ vi: 'Yêu cầu realtime thất bại.', en: 'Realtime request failed.' });
        lastRealtimeErrorRef.current = detail;
        setError(detail);
        if (sessionActiveRef.current) {
          setPhaseAndStatus('listening', t({ vi: 'Micro vẫn đang bật. Thử lại nhé.', en: 'The mic is still on. Try again.' }));
        }
        return;
      }
      default:
        return;
    }
  }

  function maybeReturnToListening() {
    if (sessionActiveRef.current && responseDoneRef.current && !assistantAudioActiveRef.current && phaseRef.current !== 'capturing') {
      setPhaseAndStatus('listening', t({ vi: 'Tôi đang lắng nghe.', en: "I'm here and listening." }));
    }
  }

  async function cleanupMic() {
    const mic = micRef.current;
    if (!mic) return;
    if (mic.rafId) cancelAnimationFrame(mic.rafId);
    mic.processor.onaudioprocess = null;
    mic.source.disconnect();
    mic.filter.disconnect();
    mic.analyser.disconnect();
    mic.processor.disconnect();
    mic.sink.disconnect();
    mic.stream.getTracks().forEach(track => track.stop());
    if (mic.audioContext.state !== 'closed') await mic.audioContext.close();
    micRef.current = null;
  }

  async function getPlaybackContext() {
    let context = playbackRef.current.audioContext;
    if (!context || context.state === 'closed') {
      context = new AudioContext();
      playbackRef.current.audioContext = context;
      playbackRef.current.nextPlaybackTime = context.currentTime;
    }
    if (context.state === 'suspended') await context.resume();
    return context;
  }

  async function enqueueAssistantAudio(base64Pcm: string) {
    const audioContext = await getPlaybackContext();
    const samples = decodePcmBase64(base64Pcm);
    if (samples.length === 0) return;
    const buffer = audioContext.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    const scheduledAt = Math.max(audioContext.currentTime + 0.02, playbackRef.current.nextPlaybackTime);
    playbackRef.current.nextPlaybackTime = scheduledAt + buffer.duration;
    playbackRef.current.activeSources.add(source);
    assistantAudioActiveRef.current = true;
    source.addEventListener('ended', () => {
      playbackRef.current.activeSources.delete(source);
      if (playbackRef.current.activeSources.size === 0) {
        assistantAudioActiveRef.current = false;
        playbackRef.current.nextPlaybackTime = audioContext.currentTime;
        maybeReturnToListening();
      }
    });
    source.start(scheduledAt);
  }

  function stopAssistantAudio(options?: { keepContext?: boolean }) {
    const playback = playbackRef.current;
    assistantAudioActiveRef.current = false;
    responseActiveRef.current = false;
    responseDoneRef.current = true;
    playback.nextPlaybackTime = playback.audioContext?.currentTime ?? 0;

    for (const source of playback.activeSources) {
      try {
        source.stop();
      } catch {
        // Ignore stale sources.
      }
      source.disconnect();
    }
    playback.activeSources.clear();
    if (!options?.keepContext && playback.audioContext) {
      void playback.audioContext.close();
      playback.audioContext = null;
    }
  }

  function runMeterLoop() {
    const mic = micRef.current;
    if (!mic) return;
    const frequencyData = new Uint8Array(mic.analyser.frequencyBinCount);
    const update = () => {
      const currentMic = micRef.current;
      if (!currentMic) return;
      currentMic.analyser.getByteFrequencyData(frequencyData);
      const bucket = Math.max(1, Math.floor(frequencyData.length / INITIAL_METER.length));
      const nextValues = Array.from({ length: INITIAL_METER.length }, (_, index) => {
        const start = index * bucket;
        const end = Math.min(start + bucket, frequencyData.length);
        let sum = 0;
        for (let cursor = start; cursor < end; cursor += 1) sum += frequencyData[cursor] ?? 0;
        const average = sum / Math.max(1, end - start);
        return Math.max(0.06, average / 255);
      });
      const mean = nextValues.reduce((total, value) => total + value, 0) / nextValues.length;
      setMeterValues(nextValues);
      setSignalLevel(mean);
      currentMic.rafId = requestAnimationFrame(update);
    };
    mic.rafId = requestAnimationFrame(update);
  }

  if (!open) return null;
  const isSessionActive = phase !== 'idle';
  const sphereStyle = { '--voice-level': signalLevel.toFixed(3) } as CSSProperties;

  return (
    <div className="voice-overlay">
      <main className="voice-shell">
        <section className="voice-chrome">
          <div className="voice-brand">
            <span className="voice-brand-mark">Pulse</span>
            <span className="voice-brand-copy">{t({ vi: 'Chế độ giọng nói realtime Qwen', en: 'Qwen realtime voice mode' })}</span>
          </div>

          <div className="voice-top-actions">
            <button aria-expanded={showSettings} className="voice-icon-button" onClick={() => setShowSettings(current => !current)} type="button">
              <SettingsIcon />
            </button>
            <button
              aria-label={t({ vi: 'Đóng chế độ giọng nói', en: 'Close voice mode' })}
              className="voice-icon-button"
              onClick={() => {
                onClose();
              }}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>

          {showSettings ? (
            <section className="voice-settings-panel">
              <div className="voice-settings-header">
                <strong>{t({ vi: 'Cài đặt phiên', en: 'Session settings' })}</strong>
                <span>
                  {t({
                    vi: 'VAD realtime sẽ gửi sau khoảng 1 giây im lặng.',
                    en: 'Realtime VAD sends after about one second of silence.',
                  })}
                </span>
              </div>
              <div className="voice-setting">
                <span>{t({ vi: 'Ngôn ngữ', en: 'Language' })}</span>
                <div>{languageHint === 'vi' ? 'Vietnamese' : 'English'}</div>
              </div>
              <label className="voice-setting">
                <span>{t({ vi: 'Giọng nói realtime', en: 'Realtime voice' })}</span>
                <select onChange={event => setVoice(event.target.value)} value={voice}>
                  {VOICE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </section>
          ) : null}
        </section>

        <section className="voice-stage">
          <div className="voice-center">
            <div className="voice-center-copy">
              <h1 className="voice-status">{status}</h1>
              <p className="voice-subcopy">
                {t({
                  vi: 'Nói tự nhiên. Mô hình sẽ lắng nghe liên tục, chuyển lượt sau khoảng 1 giây im lặng, và dừng nói khi bạn ngắt lời.',
                  en: 'Speak naturally. The model listens continuously, hands over after about one second of silence, and stops talking when you cut in.',
                })}
              </p>
            </div>
            {error ? <div className="voice-error">{error}</div> : null}
            {phase === 'speaking' ? (
              <button
                className="voice-stop-pill"
                onClick={() => {
                  stopAssistantAudio({ keepContext: true });
                  sendRealtimeEvent({ type: 'response.cancel' });
                  if (sessionActiveRef.current) {
                    setPhaseAndStatus('listening', t({ vi: 'Đã dừng nói. Tôi vẫn đang lắng nghe.', en: "Speech stopped. I'm still listening." }));
                  }
                }}
                type="button"
              >
                {t({ vi: 'Dừng giọng nói AI', en: 'Stop AI voice' })}
              </button>
            ) : null}
            <div className={`voice-sphere-wrap ${phase}`} style={sphereStyle}>
              <div className="voice-sphere">
                <div className="voice-sphere-core" />
                <div className="voice-sphere-dots" />
              </div>
              <div className="voice-meter" aria-hidden="true">
                {meterValues.map((value, index) => (
                  <span className="voice-meter-bar" key={`${index}-${value}`} style={{ height: `${10 + value * 54}px` }} />
                ))}
              </div>
            </div>
          </div>

          <footer className="voice-dock">
            <button
              className="voice-dock-button ghost"
              disabled={!isSessionActive}
              onClick={() => {
                void endVoiceSession();
              }}
              type="button"
            >
              <CloseIcon />
            </button>
            <button
              className={`voice-dock-button mic ${isSessionActive ? 'active' : ''}`}
              onClick={() => {
                if (isSessionActive) {
                  void endVoiceSession({ preserveMessages: true });
                  return;
                }
                void startVoiceSession();
              }}
              type="button"
            >
              <MicIcon />
            </button>
          </footer>
        </section>
      </main>
    </div>
  );
}

function getRealtimeWsUrl() {
  if (EXPLICIT_REALTIME_WS_URL) return EXPLICIT_REALTIME_WS_URL;
  const origin = typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin;
  const url = new URL(API_BASE, origin);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const path = url.pathname === '/' ? '/realtime' : `${url.pathname.replace(/\/$/, '')}/realtime`;
  return `${protocol}//${url.host}${path}`;
}

function float32ToPcmBase64(samples: Float32Array) {
  const bytes = new Uint8Array(samples.length * 2);
  let offset = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    const int = Math.round(value);
    bytes[offset] = int & 0xff;
    bytes[offset + 1] = (int >> 8) & 0xff;
    offset += 2;
  }
  return bytesToBase64(bytes);
}

function decodePcmBase64(base64Pcm: string) {
  const bytes = base64ToBytes(base64Pcm);
  const sampleCount = Math.floor(bytes.length / 2);
  const samples = new Float32Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    const low = bytes[index * 2] ?? 0;
    const high = bytes[index * 2 + 1] ?? 0;
    let value = (high << 8) | low;
    if (value >= 0x8000) value -= 0x10000;
    samples[index] = value / 0x8000;
  }
  return samples;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(base64Value: string) {
  const binary = atob(base64Value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 8.4A3.6 3.6 0 1 0 12 15.6 3.6 3.6 0 0 0 12 8.4Zm9 4.2-2.16.72c-.12.42-.3.84-.48 1.2l1.02 2.04-1.8 1.8-2.04-1.02c-.36.18-.78.36-1.2.48L14.4 21h-4.8l-.72-2.16c-.42-.12-.84-.3-1.2-.48l-2.04 1.02-1.8-1.8 1.02-2.04c-.18-.36-.36-.78-.48-1.2L3 12.6V11.4l2.16-.72c.12-.42.3-.84.48-1.2L4.62 7.44l1.8-1.8 2.04 1.02c.36-.18.78-.36 1.2-.48L9.6 3h4.8l.72 2.16c.42.12.84.3 1.2.48l2.04-1.02 1.8 1.8-1.02 2.04c.18.36.36.78.48 1.2l2.16.72Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3.5a3 3 0 0 1 3 3v5a3 3 0 1 1-6 0v-5a3 3 0 0 1 3-3Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6.5 11.2a5.5 5.5 0 0 0 11 0M12 16.7v3.8M8.6 20.5h6.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
