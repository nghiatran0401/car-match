"use client";

import { startTransition, useEffect, useRef, useState, type CSSProperties } from "react";

type Role = "assistant" | "user";
type SessionPhase =
  | "idle"
  | "requesting"
  | "listening"
  | "capturing"
  | "processing"
  | "speaking";

type ChatHistoryMessage = {
  role: Role;
  content: string;
};

type TimelineMessage = {
  id: string;
  role: Role;
  text: string;
  language?: string;
  emotion?: string;
};

type VoiceTurnResponse = {
  transcript: {
    text: string;
    language?: string;
    emotion?: string;
  };
  assistant: {
    text: string;
    audioDataUrl?: string | null;
    audioMimeType?: string | null;
  };
};

type ErrorResponse = {
  detail?: string;
};

type MicSession = {
  stream: MediaStream;
  audioContext: AudioContext;
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  processor: ScriptProcessorNode;
  sink: GainNode;
  rafId: number | null;
  sampleRate: number;
};

type ActiveUtterance = {
  active: boolean;
  startedAt: number;
  lastSpeechAt: number;
  loudFrames: number;
  peak: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "/api";

const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto detect" },
  { value: "en", label: "English" },
  { value: "vi", label: "Vietnamese" },
  { value: "zh", label: "Chinese" },
];

const VOICE_OPTIONS = [
  { value: "Cherry", label: "Cherry" },
  { value: "Ethan", label: "Ethan" },
  { value: "Serena", label: "Serena" },
  { value: "Chelsie", label: "Chelsie" },
];

const INITIAL_MESSAGE: TimelineMessage = {
  id: crypto.randomUUID(),
  role: "assistant",
  text: "Tap the mic to enter voice mode. Once it is on, just speak naturally and pause when you're done.",
};

const INITIAL_METER = new Array(18).fill(0.08);
const SPEECH_THRESHOLD = 0.014;
const BARGE_IN_THRESHOLD = 0.022;
const SILENCE_MS = 2000;
const MIN_UTTERANCE_MS = 350;
const MIN_LOUD_FRAMES = 2;
const MAX_UTTERANCE_MS = 18000;
const MAX_HISTORY_ITEMS = 8;

export function VoiceStudio() {
  const [messages, setMessages] = useState<TimelineMessage[]>([INITIAL_MESSAGE]);
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [status, setStatus] = useState("Tap the mic to start voice mode.");
  const [error, setError] = useState<string | null>(null);
  const [languageHint, setLanguageHint] = useState("auto");
  const [voice, setVoice] = useState("Cherry");
  const [meterValues, setMeterValues] = useState<number[]>(INITIAL_METER);
  const [signalLevel, setSignalLevel] = useState(0.08);
  const [showSettings, setShowSettings] = useState(false);

  const micRef = useRef<MicSession | null>(null);
  const messagesRef = useRef<TimelineMessage[]>([INITIAL_MESSAGE]);
  const utteranceRef = useRef<ActiveUtterance>({
    active: false,
    startedAt: 0,
    lastSpeechAt: 0,
    loudFrames: 0,
    peak: 0,
  });
  const turnFramesRef = useRef<Float32Array[]>([]);
  const sessionActiveRef = useRef(false);
  const processingRef = useRef(false);
  const assistantSpeakingRef = useRef(false);
  const audioReplyRef = useRef<HTMLAudioElement | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const phaseRef = useRef<SessionPhase>("idle");
  const requestIdRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      void endVoiceSession({ preserveMessages: true, quiet: true });
    };
  }, []);

  function setPhaseAndStatus(nextPhase: SessionPhase, nextStatus: string) {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
    setStatus(nextStatus);
  }

  function replaceMessages(nextMessages: TimelineMessage[]) {
    messagesRef.current = nextMessages;
    startTransition(() => {
      setMessages(nextMessages);
    });
  }

  async function startVoiceSession() {
    if (sessionActiveRef.current) {
      return;
    }

    setError(null);
    setPhaseAndStatus("requesting", "Waiting for microphone permission...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioContext = new AudioContext({ sampleRate: 16000 });
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;

      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      const sink = audioContext.createGain();
      sink.gain.value = 0;

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(sink);
      sink.connect(audioContext.destination);

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        handleAudioFrame(new Float32Array(input), performance.now());
      };

      micRef.current = {
        stream,
        audioContext,
        source,
        analyser,
        processor,
        sink,
        rafId: null,
        sampleRate: audioContext.sampleRate,
      };

      sessionActiveRef.current = true;
      runMeterLoop();
      setPhaseAndStatus("listening", "I'm here and listening.");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to access the microphone.";
      setError(message);
      setPhaseAndStatus("idle", "Microphone access failed.");
      await cleanupMic();
    }
  }

  async function endVoiceSession(options?: {
    preserveMessages?: boolean;
    quiet?: boolean;
  }) {
    sessionActiveRef.current = false;
    resetUtterance();
    abortInFlightTurn();
    stopAssistantSpeech();
    await cleanupMic();

    setMeterValues(INITIAL_METER);
    setSignalLevel(0.08);

    if (!options?.preserveMessages) {
      replaceMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Session closed. Tap the mic whenever you want to talk again.",
        },
      ]);
    }

    if (!options?.quiet) {
      setPhaseAndStatus("idle", "Voice mode is off.");
    } else {
      phaseRef.current = "idle";
    }
  }

  async function cleanupMic() {
    const mic = micRef.current;
    if (!mic) {
      return;
    }

    if (mic.rafId) {
      cancelAnimationFrame(mic.rafId);
    }
    mic.processor.onaudioprocess = null;
    mic.source.disconnect();
    mic.analyser.disconnect();
    mic.processor.disconnect();
    mic.sink.disconnect();
    mic.stream.getTracks().forEach((track) => track.stop());

    if (mic.audioContext.state !== "closed") {
      await mic.audioContext.close();
    }

    micRef.current = null;
  }

  function handleAudioFrame(frame: Float32Array, now: number) {
    if (!sessionActiveRef.current) {
      return;
    }

    const utterance = utteranceRef.current;
    const rms = calculateRms(frame);
    const threshold =
      assistantSpeakingRef.current || processingRef.current
        ? BARGE_IN_THRESHOLD
        : SPEECH_THRESHOLD;

    if (rms >= threshold) {
      if (!utterance.active) {
        interruptCurrentTurn();
        utterance.active = true;
        utterance.startedAt = now;
        utterance.lastSpeechAt = now;
        utterance.loudFrames = 1;
        utterance.peak = rms;
        turnFramesRef.current = [frame];
        setPhaseAndStatus(
          "capturing",
          "Keep talking. I will answer when you pause for two seconds."
        );
        return;
      }

      utterance.lastSpeechAt = now;
      utterance.loudFrames += 1;
      utterance.peak = Math.max(utterance.peak, rms);
      turnFramesRef.current.push(frame);

      if (phaseRef.current !== "capturing") {
        setPhaseAndStatus(
          "capturing",
          "Keep talking. I will answer when you pause for two seconds."
        );
      }

      if (now - utterance.startedAt >= MAX_UTTERANCE_MS) {
        finalizeUtterance();
      }
      return;
    }

    if (!utterance.active) {
      return;
    }

    turnFramesRef.current.push(frame);

    const elapsed = now - utterance.startedAt;
    const silenceElapsed = now - utterance.lastSpeechAt;
    if (
      elapsed >= MIN_UTTERANCE_MS &&
      utterance.loudFrames >= MIN_LOUD_FRAMES &&
      silenceElapsed >= SILENCE_MS
    ) {
      finalizeUtterance();
    }
  }

  function finalizeUtterance() {
    const mic = micRef.current;
    const utterance = utteranceRef.current;
    if (!mic || !utterance.active || !sessionActiveRef.current) {
      return;
    }

    const snapshot = turnFramesRef.current.slice();
    const sampleRate = mic.sampleRate;
    const peak = utterance.peak;
    resetUtterance();

    const audioBlob = encodeWav(snapshot, sampleRate);
    if (audioBlob.size <= 44 || peak < SPEECH_THRESHOLD) {
      if (
        sessionActiveRef.current &&
        !assistantSpeakingRef.current &&
        !processingRef.current
      ) {
        setPhaseAndStatus("listening", "I'm here and listening.");
      }
      return;
    }

    void sendVoiceTurn(audioBlob);
  }

  function resetUtterance() {
    utteranceRef.current = {
      active: false,
      startedAt: 0,
      lastSpeechAt: 0,
      loudFrames: 0,
      peak: 0,
    };
    turnFramesRef.current = [];
  }

  function interruptCurrentTurn() {
    if (assistantSpeakingRef.current) {
      stopAssistantSpeech();
    }
    if (processingRef.current) {
      abortInFlightTurn();
    }
  }

  function abortInFlightTurn() {
    const controller = fetchAbortRef.current;
    if (!controller) {
      return;
    }
    controller.abort();
    fetchAbortRef.current = null;
    processingRef.current = false;
  }

  function stopAssistantSpeech() {
    const audio = audioReplyRef.current;
    if (!audio) {
      assistantSpeakingRef.current = false;
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    audioReplyRef.current = null;
    assistantSpeakingRef.current = false;
  }

  async function sendVoiceTurn(audioBlob: Blob) {
    if (!sessionActiveRef.current) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    processingRef.current = true;
    setError(null);
    setPhaseAndStatus("processing", "Thinking...");

    const formData = new FormData();
    formData.append("audio_file", audioBlob, "turn.wav");
    formData.append("messages", JSON.stringify(buildHistory(messagesRef.current)));
    formData.append("voice", voice);
    formData.append("language_hint", languageHint);

    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/voice-turn`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const payload = (await response.json()) as VoiceTurnResponse | ErrorResponse;
      if (!response.ok) {
        throw new Error(
          isErrorResponse(payload) && payload.detail
            ? payload.detail
            : "Voice turn request failed."
        );
      }
      if (!isVoiceTurnResponse(payload)) {
        throw new Error("Unexpected voice response payload.");
      }
      if (requestId !== requestIdRef.current) {
        return;
      }

      processingRef.current = false;
      if (fetchAbortRef.current === controller) {
        fetchAbortRef.current = null;
      }

      const nextMessages = [
        ...messagesRef.current,
        {
          id: crypto.randomUUID(),
          role: "user" as const,
          text: payload.transcript.text,
          language: payload.transcript.language,
          emotion: payload.transcript.emotion,
        },
        {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          text: payload.assistant.text,
        },
      ];
      replaceMessages(nextMessages);

      if (payload.assistant.audioDataUrl && sessionActiveRef.current) {
        setPhaseAndStatus("speaking", "Speaking. Cut in whenever you want.");
        await playAssistantAudio(payload.assistant.audioDataUrl);
      }

      if (
        sessionActiveRef.current &&
        !utteranceRef.current.active &&
        !processingRef.current &&
        !assistantSpeakingRef.current
      ) {
        setPhaseAndStatus("listening", "I'm here and listening.");
      }
    } catch (caughtError) {
      processingRef.current = false;
      if (fetchAbortRef.current === controller) {
        fetchAbortRef.current = null;
      }

      if (isAbortError(caughtError)) {
        if (
          sessionActiveRef.current &&
          !utteranceRef.current.active &&
          !assistantSpeakingRef.current
        ) {
          setPhaseAndStatus("listening", "Interrupted. I’m listening again.");
        }
        return;
      }

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Voice request failed.";
      setError(message);
      if (sessionActiveRef.current) {
        setPhaseAndStatus("listening", "The mic is still on. Try again.");
      }
    }
  }

  async function playAssistantAudio(audioDataUrl: string) {
    const audio = new Audio(audioDataUrl);
    audioReplyRef.current = audio;
    assistantSpeakingRef.current = true;

    try {
      await audio.play();
    } catch (caughtError) {
      audioReplyRef.current = null;
      assistantSpeakingRef.current = false;
      throw caughtError;
    }

    await new Promise<void>((resolve) => {
      const finalize = () => {
        audio.removeEventListener("ended", finalize);
        audio.removeEventListener("pause", finalize);
        audio.removeEventListener("error", finalize);
        if (audioReplyRef.current === audio) {
          audioReplyRef.current = null;
        }
        assistantSpeakingRef.current = false;
        resolve();
      };

      audio.addEventListener("ended", finalize, { once: true });
      audio.addEventListener("pause", finalize, { once: true });
      audio.addEventListener("error", finalize, { once: true });
    });
  }

  function runMeterLoop() {
    const mic = micRef.current;
    if (!mic) {
      return;
    }

    const frequencyData = new Uint8Array(mic.analyser.frequencyBinCount);
    const update = () => {
      const currentMic = micRef.current;
      if (!currentMic) {
        return;
      }

      currentMic.analyser.getByteFrequencyData(frequencyData);
      const bucket = Math.max(
        1,
        Math.floor(frequencyData.length / INITIAL_METER.length)
      );
      const nextValues = Array.from({ length: INITIAL_METER.length }, (_, index) => {
        const start = index * bucket;
        const end = Math.min(start + bucket, frequencyData.length);
        let sum = 0;
        for (let cursor = start; cursor < end; cursor += 1) {
          sum += frequencyData[cursor] ?? 0;
        }
        const average = sum / Math.max(1, end - start);
        return Math.max(0.06, average / 255);
      });

      const mean =
        nextValues.reduce((total, value) => total + value, 0) / nextValues.length;
      setMeterValues(nextValues);
      setSignalLevel(mean);
      currentMic.rafId = requestAnimationFrame(update);
    };

    mic.rafId = requestAnimationFrame(update);
  }

  const isSessionActive = phase !== "idle";
  const sphereStyle = {
    "--voice-level": signalLevel.toFixed(3),
  } as CSSProperties;

  return (
    <main className="voice-shell">
      <section className="voice-chrome">
        <div className="voice-brand">
          <span className="voice-brand-mark">Pulse</span>
          <span className="voice-brand-copy">Qwen voice mode</span>
        </div>

        <button
          aria-expanded={showSettings}
          className="voice-icon-button"
          onClick={() => setShowSettings((current) => !current)}
          type="button"
        >
          <SettingsIcon />
        </button>

        {showSettings ? (
          <section className="voice-settings-panel">
            <div className="voice-settings-header">
              <strong>Session settings</strong>
              <span>Auto send happens after 2 seconds of silence.</span>
            </div>

            <label className="voice-setting">
              <span>ASR language hint</span>
              <select
                onChange={(event) => setLanguageHint(event.target.value)}
                value={languageHint}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="voice-setting">
              <span>TTS voice</span>
              <select
                onChange={(event) => setVoice(event.target.value)}
                value={voice}
              >
                {VOICE_OPTIONS.map((option) => (
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
        <aside className="voice-history-panel">
          <span className="voice-history-label">Recent turns</span>
          <div className="voice-history-list">
            {messages.slice(-6).map((message) => (
              <article
                className={`voice-history-card ${message.role}`}
                key={message.id}
              >
                <div className="voice-history-role">
                  {message.role === "assistant" ? "Assistant" : "You"}
                </div>
                <p>{message.text}</p>
              </article>
            ))}
          </div>
        </aside>

        <div className="voice-center">
          <div className="voice-center-copy">
            <span className="voice-center-label">
              {phase === "idle" ? "Hands-free voice mode" : "Live voice session"}
            </span>
            <h1 className="voice-status">{status}</h1>
            <p className="voice-subcopy">
              Speak naturally. Pause for two seconds to hand the turn over. If you
              interrupt while I am talking, I will stop and listen.
            </p>
          </div>

          {error ? <div className="voice-error">{error}</div> : null}

          {phase === "speaking" ? (
            <button
              className="voice-stop-pill"
              onClick={() => {
                stopAssistantSpeech();
                if (sessionActiveRef.current && !utteranceRef.current.active) {
                  setPhaseAndStatus("listening", "Speech stopped. I’m still listening.");
                }
              }}
              type="button"
            >
              Stop AI voice
            </button>
          ) : null}

          <div className={`voice-sphere-wrap ${phase}`} style={sphereStyle}>
            <div className="voice-sphere">
              <div className="voice-sphere-core" />
              <div className="voice-sphere-dots" />
            </div>

            <div className="voice-meter" aria-hidden="true">
              {meterValues.map((value, index) => (
                <span
                  className="voice-meter-bar"
                  key={`${index}-${value}`}
                  style={{ height: `${10 + value * 54}px` }}
                />
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
            className={`voice-dock-button mic ${isSessionActive ? "active" : ""}`}
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
  );
}

function buildHistory(messages: TimelineMessage[]): ChatHistoryMessage[] {
  return messages.slice(-MAX_HISTORY_ITEMS).map((message) => ({
    role: message.role,
    content: message.text,
  }));
}

function encodeWav(frames: Float32Array[], sampleRate: number): Blob {
  const samples = mergeFrames(frames);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPcm(view, 44, samples);
  return new Blob([buffer], { type: "audio/wav" });
}

function mergeFrames(frames: Float32Array[]) {
  const totalLength = frames.reduce((sum, frame) => sum + frame.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const frame of frames) {
    merged.set(frame, offset);
    offset += frame.length;
  }
  return merged;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function floatTo16BitPcm(view: DataView, offset: number, samples: Float32Array) {
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(
      offset + index * 2,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true
    );
  }
}

function calculateRms(frame: Float32Array) {
  let total = 0;
  for (let index = 0; index < frame.length; index += 1) {
    const sample = frame[index] ?? 0;
    total += sample * sample;
  }
  return Math.sqrt(total / Math.max(1, frame.length));
}

function isErrorResponse(payload: unknown): payload is ErrorResponse {
  return (
    payload !== null &&
    typeof payload === "object" &&
    "detail" in (payload as Record<string, unknown>)
  );
}

function isVoiceTurnResponse(payload: unknown): payload is VoiceTurnResponse {
  return (
    payload !== null &&
    typeof payload === "object" &&
    "transcript" in (payload as Record<string, unknown>) &&
    "assistant" in (payload as Record<string, unknown>)
  );
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
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
      <path
        d="M12 3.5a3 3 0 0 1 3 3v5a3 3 0 1 1-6 0v-5a3 3 0 0 1 3-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M6.5 11.2a5.5 5.5 0 0 0 11 0M12 16.7v3.8M8.6 20.5h6.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
