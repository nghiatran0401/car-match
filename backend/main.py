from __future__ import annotations

import asyncio
import base64
import contextlib
import io
import json
import os
import re
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Literal
from uuid import uuid4

import httpx
import websockets
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MAX_AUDIO_BYTES = 9_500_000
DEFAULT_TIMEOUT = httpx.Timeout(90.0, connect=10.0)
LOCAL_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
REPO_ROOT = Path(__file__).resolve().parent.parent

load_dotenv(REPO_ROOT / ".env")
load_dotenv(REPO_ROOT / ".env.local", override=True)


def env_first(*names: str, default: str | None = None) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def normalize_dashscope_base(raw_value: str | None) -> str:
    value = (raw_value or "https://dashscope-intl.aliyuncs.com").rstrip("/")
    for suffix in ("/compatible-mode/v1", "/api/v1"):
        if value.endswith(suffix):
            value = value[: -len(suffix)]
    return value.rstrip("/")


def parse_origins(raw_value: str | None) -> list[str]:
    if not raw_value:
        return LOCAL_ORIGINS
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


def normalize_tts_model(raw_value: str | None) -> str:
    if not raw_value:
        return "qwen3-tts-flash"
    normalized = raw_value.strip()
    if normalized in {"qwen-omni-turbo", "qwen-omni-turbo-latest"}:
        return "qwen3-tts-flash"
    return normalized


@dataclass(frozen=True)
class Settings:
    api_key: str | None
    dashscope_base_url: str
    dashscope_ws_url: str
    chat_model: str
    chat_max_tokens: int
    chat_temperature: float
    chat_top_p: float
    enable_thinking: bool
    asr_model: str
    tts_model: str
    default_voice: str
    realtime_model: str
    realtime_default_voice: str
    realtime_vietnamese_voice: str
    realtime_transcription_model: str
    realtime_vad_threshold: float
    realtime_vad_silence_ms: int
    realtime_vad_prefix_padding_ms: int
    system_prompt: str
    cors_origins: list[str]

    @property
    def compatible_endpoint(self) -> str:
        return f"{self.dashscope_base_url}/compatible-mode/v1/chat/completions"

    @property
    def tts_stream_endpoint(self) -> str:
        return (
            f"{self.dashscope_base_url}"
            "/api/v1/services/aigc/multimodal-generation/generation"
        )


def load_settings() -> Settings:
    dashscope_base_url = normalize_dashscope_base(
        env_first("DASHSCOPE_BASE_URL", "VITE_QWEN_API_BASE_URL")
    )
    dashscope_ws_url = dashscope_base_url.replace("https://", "wss://").replace(
        "http://", "ws://"
    )
    return Settings(
        api_key=env_first("DASHSCOPE_API_KEY", "VITE_QWEN_API_KEY"),
        dashscope_base_url=dashscope_base_url,
        dashscope_ws_url=f"{dashscope_ws_url}/api-ws/v1/realtime",
        chat_model=env_first(
            "QWEN_CHAT_MODEL",
            "VITE_QWEN_CHAT_MODEL",
            "VITE_QWEN_MODEL",
            default="qwen-flash",
        )
        or "qwen-flash",
        chat_max_tokens=int(env_first("QWEN_CHAT_MAX_TOKENS", default="110") or "110"),
        chat_temperature=float(
            env_first("QWEN_CHAT_TEMPERATURE", default="0.2") or "0.2"
        ),
        chat_top_p=float(env_first("QWEN_CHAT_TOP_P", default="0.7") or "0.7"),
        enable_thinking=env_bool("QWEN_ENABLE_THINKING", default=False),
        asr_model=env_first("QWEN_ASR_MODEL", default="qwen3-asr-flash")
        or "qwen3-asr-flash",
        tts_model=normalize_tts_model(
            env_first(
                "QWEN_TTS_MODEL",
                "VITE_QWEN_TTS_MODEL",
                default="qwen3-tts-flash",
            )
        ),
        default_voice=env_first(
            "QWEN_DEFAULT_VOICE",
            "VITE_QWEN_TTS_VOICE_EN",
            default="Cherry",
        )
        or "Cherry",
        realtime_model=env_first(
            "QWEN_OMNI_REALTIME_MODEL",
            default="qwen3.5-omni-plus-realtime",
        )
        or "qwen3.5-omni-plus-realtime",
        realtime_default_voice=env_first(
            "QWEN_OMNI_REALTIME_DEFAULT_VOICE",
            default="Tina",
        )
        or "Tina",
        realtime_vietnamese_voice=env_first(
            "QWEN_OMNI_REALTIME_VI_VOICE",
            default="Hana",
        )
        or "Hana",
        realtime_transcription_model=env_first(
            "QWEN_OMNI_REALTIME_TRANSCRIPTION_MODEL",
            default="gummy-realtime-v1",
        )
        or "gummy-realtime-v1",
        realtime_vad_threshold=float(
            env_first("QWEN_OMNI_REALTIME_VAD_THRESHOLD", default="0.72") or "0.72"
        ),
        realtime_vad_silence_ms=int(
            env_first("QWEN_OMNI_REALTIME_SILENCE_MS", default="1000") or "1000"
        ),
        realtime_vad_prefix_padding_ms=int(
            env_first(
                "QWEN_OMNI_REALTIME_PREFIX_PADDING_MS",
                default="400",
            )
            or "400"
        ),
        system_prompt=env_first(
            "QWEN_SYSTEM_PROMPT",
            default=(
                "You are Pulse, a fast voice assistant. "
                "Reply in the user's language when possible. "
                "Keep spoken answers short, direct, and natural to hear aloud."
            ),
        )
        or "",
        cors_origins=parse_origins(env_first("CORS_ORIGINS")),
    )


settings = load_settings()
app = FastAPI(title="Qwen Voice API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class TextTurnRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    messages: list[ConversationMessage] = Field(default_factory=list)
    voice: str | None = None
    language_hint: str | None = None


def require_api_key() -> str:
    if settings.api_key:
        return settings.api_key
    raise HTTPException(
        status_code=500,
        detail="Missing DASHSCOPE_API_KEY or VITE_QWEN_API_KEY.",
    )


def clean_history(messages: list[ConversationMessage]) -> list[ConversationMessage]:
    return messages[-10:]


def guess_tts_language(language_hint: str | None) -> str | None:
    if not language_hint:
        return None
    normalized = language_hint.lower()
    if normalized.startswith("zh"):
        return "Chinese"
    if normalized.startswith("en"):
        return "English"
    return None


def spoken_reply_guidance(language_hint: str | None) -> str:
    if not language_hint:
        return ""
    normalized = language_hint.lower()
    if normalized.startswith("vi"):
        return (
            " Use natural spoken Vietnamese. Prefer short everyday wording, "
            "avoid markdown, bullet points, abbreviations, and unnecessary English."
        )
    return (
        " Keep the wording easy to hear aloud. Avoid bullet points, markdown, "
        "and dense formatting unless the user asks for them."
    )


def spoken_realtime_guidance(language_hint: str | None) -> str:
    if not language_hint or language_hint == "auto":
        return (
            " Reply in the language the user is speaking. Keep the answer concise, "
            "natural, and easy to listen to."
        )
    normalized = language_hint.lower()
    if normalized.startswith("vi"):
        return (
            " Reply in natural everyday Vietnamese with smooth spoken phrasing. "
            "Avoid English unless the user uses it."
        )
    if normalized.startswith("en"):
        return " Reply in natural spoken English."
    if normalized.startswith("zh"):
        return " Reply in natural spoken Chinese."
    return (
        f" Prefer language code `{language_hint}` when replying and keep the delivery natural."
    )


def normalize_text_for_speech(text: str) -> str:
    cleaned = re.sub(r"[*#`_]+", " ", text)
    cleaned = re.sub(r"\s*\n+\s*", " ", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    return cleaned.strip()


def normalize_audio_url(url: str | None) -> str | None:
    if not url:
        return None
    if url.startswith("http://"):
        return "https://" + url[len("http://") :]
    return url


def build_realtime_instructions(language_hint: str | None) -> str:
    return settings.system_prompt + spoken_realtime_guidance(language_hint)


def pick_realtime_voice(voice: str | None, language_hint: str | None) -> str:
    if voice:
        return voice
    if language_hint and language_hint.lower().startswith("vi"):
        return settings.realtime_vietnamese_voice
    return settings.realtime_default_voice


def build_realtime_session_config(
    voice: str | None, language_hint: str | None
) -> dict[str, object]:
    return {
        "modalities": ["text", "audio"],
        "voice": pick_realtime_voice(voice, language_hint),
        "instructions": build_realtime_instructions(language_hint),
        "input_audio_format": "pcm",
        "output_audio_format": "pcm",
        "input_audio_transcription": {
            "model": settings.realtime_transcription_model,
        },
        "turn_detection": {
            "type": "server_vad",
            "threshold": settings.realtime_vad_threshold,
            "prefix_padding_ms": settings.realtime_vad_prefix_padding_ms,
            "silence_duration_ms": settings.realtime_vad_silence_ms,
        },
    }


async def send_realtime_event(
    dashscope_ws: websockets.ClientConnection, event: dict[str, object]
) -> None:
    payload = {
        "event_id": event.get("event_id") or f"event_{uuid4().hex}",
        **event,
    }
    await dashscope_ws.send(json.dumps(payload))


async def apply_realtime_session_config(
    dashscope_ws: websockets.ClientConnection,
    voice: str | None,
    language_hint: str | None,
) -> None:
    await send_realtime_event(
        dashscope_ws,
        {
            "type": "session.update",
            "session": build_realtime_session_config(voice, language_hint),
        },
    )


def pcm_to_wav(pcm_bytes: bytes, sample_rate: int = 24000) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_bytes)
    return buffer.getvalue()


async def post_json(url: str, payload: dict) -> dict:
    headers = {
        "Authorization": f"Bearer {require_api_key()}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()


async def transcribe_audio(
    audio_bytes: bytes, mime_type: str, language_hint: str | None
) -> dict:
    data_uri = f"data:{mime_type};base64,{base64.b64encode(audio_bytes).decode()}"
    payload = {
        "model": settings.asr_model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": data_uri,
                        },
                    }
                ],
            }
        ],
        "stream": False,
        "asr_options": {
            "enable_itn": True,
        },
    }
    if language_hint and language_hint != "auto":
        payload["asr_options"]["language"] = language_hint

    data = await post_json(settings.compatible_endpoint, payload)
    choice = (data.get("choices") or [{}])[0]
    message = choice.get("message") or {}
    annotations = message.get("annotations") or []
    transcript = str(message.get("content") or "").strip()
    audio_info = next(
        (annotation for annotation in annotations if annotation.get("type") == "audio_info"),
        {},
    )
    return {
        "text": transcript,
        "language": audio_info.get("language"),
        "emotion": audio_info.get("emotion"),
    }


async def generate_reply(
    history: list[ConversationMessage], user_text: str, language_hint: str | None
) -> str:
    system_prompt = settings.system_prompt + spoken_reply_guidance(language_hint)
    if language_hint and language_hint != "auto":
        system_prompt += (
            f" The user likely prefers language code `{language_hint}`. "
            "Answer naturally in that language if the request supports it."
        )

    payload = {
        "model": settings.chat_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            *[message.model_dump() for message in clean_history(history)],
            {"role": "user", "content": user_text},
        ],
        "temperature": settings.chat_temperature,
        "max_tokens": settings.chat_max_tokens,
        "top_p": settings.chat_top_p,
        "enable_thinking": settings.enable_thinking,
    }
    data = await post_json(settings.compatible_endpoint, payload)
    choice = (data.get("choices") or [{}])[0]
    message = choice.get("message") or {}
    content = message.get("content")
    if isinstance(content, list):
        return normalize_text_for_speech(
            " ".join(str(item) for item in content if item).strip()
        )
    return normalize_text_for_speech(str(content or "").strip())


async def synthesize_speech(text: str, voice: str, language_hint: str | None) -> dict:
    input_payload: dict[str, str] = {
        "text": text,
        "voice": voice,
    }
    tts_language = guess_tts_language(language_hint)
    if tts_language:
        input_payload["language_type"] = tts_language

    payload = {
        "model": settings.tts_model,
        "input": input_payload,
        "parameters": {
            "response_format": "wav",
            "sample_rate": 24000,
        },
    }

    data = await post_json(settings.tts_stream_endpoint, payload)
    audio = (data.get("output") or {}).get("audio") or {}
    audio_url = normalize_audio_url(audio.get("url"))
    if audio_url:
        return {
            "audioUrl": audio_url,
            "audioDataUrl": None,
            "audioMimeType": "audio/wav",
        }

    return await synthesize_speech_streaming(payload)


async def synthesize_speech_streaming(payload: dict) -> dict:
    headers = {
        "Authorization": f"Bearer {require_api_key()}",
        "Content-Type": "application/json",
        "X-DashScope-SSE": "enable",
    }
    pcm_chunks = bytearray()
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
        async with client.stream(
            "POST",
            settings.tts_stream_endpoint,
            headers=headers,
            json=payload,
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data or data == "[DONE]":
                    continue
                try:
                    event = json.loads(data)
                except json.JSONDecodeError:
                    continue
                audio = (event.get("output") or {}).get("audio") or {}
                audio_chunk = audio.get("data")
                if audio_chunk:
                    pcm_chunks.extend(base64.b64decode(audio_chunk))

    if not pcm_chunks:
        return {
            "audioUrl": None,
            "audioDataUrl": None,
            "audioMimeType": None,
        }

    wav_bytes = pcm_to_wav(bytes(pcm_chunks))
    return {
        "audioUrl": None,
        "audioDataUrl": (
            "data:audio/wav;base64," + base64.b64encode(wav_bytes).decode()
        ),
        "audioMimeType": "audio/wav",
    }


def parse_message_history(raw_messages: str) -> list[ConversationMessage]:
    try:
        payload = json.loads(raw_messages or "[]")
        return [ConversationMessage.model_validate(item) for item in payload]
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid message history.") from exc


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "configured": bool(settings.api_key),
        "chatModel": settings.chat_model,
        "thinking": settings.enable_thinking,
        "asrModel": settings.asr_model,
        "ttsModel": settings.tts_model,
        "realtimeModel": settings.realtime_model,
        "realtimeVoice": settings.realtime_default_voice,
    }


@app.websocket("/realtime")
async def realtime_proxy(websocket: WebSocket) -> None:
    await websocket.accept()

    try:
        dashscope_ws = await websockets.connect(
            f"{settings.dashscope_ws_url}?model={settings.realtime_model}",
            additional_headers={
                "Authorization": f"Bearer {require_api_key()}",
            },
        )
    except Exception as exc:
        await websocket.send_text(
            json.dumps(
                {
                    "type": "error",
                    "error": {
                        "message": f"Failed to connect to realtime model: {exc}",
                    },
                }
            )
        )
        await websocket.close(code=1011)
        return

    await apply_realtime_session_config(
        dashscope_ws=dashscope_ws,
        voice=None,
        language_hint="auto",
    )

    async def client_to_dashscope() -> None:
        while True:
            raw_message = await websocket.receive_text()
            try:
                event = json.loads(raw_message)
            except json.JSONDecodeError:
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "error",
                            "error": {
                                "message": "Invalid realtime message payload.",
                            },
                        }
                    )
                )
                continue

            event_type = event.get("type")
            if event_type == "session.configure":
                await apply_realtime_session_config(
                    dashscope_ws=dashscope_ws,
                    voice=event.get("voice") if isinstance(event.get("voice"), str) else None,
                    language_hint=(
                        event.get("languageHint")
                        if isinstance(event.get("languageHint"), str)
                        else None
                    ),
                )
                continue

            if event_type in {
                "input_audio_buffer.append",
                "input_audio_buffer.clear",
                "input_audio_buffer.commit",
                "response.create",
                "response.cancel",
            }:
                await send_realtime_event(dashscope_ws, event)
                continue

            if event_type == "session.close":
                await websocket.close(code=1000)
                return

            await websocket.send_text(
                json.dumps(
                    {
                        "type": "error",
                        "error": {
                            "message": f"Unsupported realtime event: {event_type}",
                        },
                    }
                )
            )

    async def dashscope_to_client() -> None:
        async for message in dashscope_ws:
            await websocket.send_text(message)

    client_task = asyncio.create_task(client_to_dashscope())
    dashscope_task = asyncio.create_task(dashscope_to_client())

    try:
        done, pending = await asyncio.wait(
            {client_task, dashscope_task},
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in done:
            exc = task.exception()
            if exc is None:
                continue
            if isinstance(exc, WebSocketDisconnect):
                break
            await websocket.send_text(
                json.dumps(
                    {
                        "type": "error",
                        "error": {
                            "message": str(exc),
                        },
                    }
                )
            )
        for task in pending:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
    except WebSocketDisconnect:
        pass
    finally:
        for task in (client_task, dashscope_task):
            if not task.done():
                task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await task
        await dashscope_ws.close()


@app.post("/text-turn")
async def text_turn(payload: TextTurnRequest) -> dict:
    assistant_text = await generate_reply(
        history=payload.messages,
        user_text=payload.text,
        language_hint=payload.language_hint,
    )
    speech = await synthesize_speech(
        text=assistant_text,
        voice=payload.voice or settings.default_voice,
        language_hint=payload.language_hint,
    )
    return {
        "assistant": {
            "text": assistant_text,
            **speech,
        }
    }


@app.post("/voice-turn")
async def voice_turn(
    audio_file: UploadFile = File(...),
    messages: str = Form("[]"),
    voice: str | None = Form(None),
    language_hint: str | None = Form(None),
) -> dict:
    audio_bytes = await audio_file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio upload was empty.")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Audio file is too large. Keep each turn under 10 MB.",
        )

    mime_type = audio_file.content_type or "audio/wav"
    history = parse_message_history(messages)
    transcript = await transcribe_audio(audio_bytes, mime_type, language_hint)

    if not transcript["text"]:
        raise HTTPException(status_code=400, detail="No speech was detected in the clip.")

    detected_language = transcript["language"] or language_hint
    assistant_text = await generate_reply(
        history=history,
        user_text=transcript["text"],
        language_hint=detected_language,
    )
    speech = await synthesize_speech(
        text=assistant_text,
        voice=voice or settings.default_voice,
        language_hint=detected_language,
    )

    return {
        "transcript": transcript,
        "assistant": {
            "text": assistant_text,
            **speech,
        },
    }
