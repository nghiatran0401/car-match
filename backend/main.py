from __future__ import annotations

import base64
import io
import json
import os
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
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
    chat_model: str
    chat_max_tokens: int
    chat_temperature: float
    asr_model: str
    tts_model: str
    default_voice: str
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
    return Settings(
        api_key=env_first("DASHSCOPE_API_KEY", "VITE_QWEN_API_KEY"),
        dashscope_base_url=dashscope_base_url,
        chat_model=env_first(
            "QWEN_CHAT_MODEL",
            "VITE_QWEN_CHAT_MODEL",
            "VITE_QWEN_MODEL",
            default="qwen3.6-plus",
        )
        or "qwen3.6-plus",
        chat_max_tokens=int(env_first("QWEN_CHAT_MAX_TOKENS", default="140") or "140"),
        chat_temperature=float(
            env_first("QWEN_CHAT_TEMPERATURE", default="0.35") or "0.35"
        ),
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
        system_prompt=env_first(
            "QWEN_SYSTEM_PROMPT",
            default=(
                "You are Pulse, a fast and natural voice assistant. "
                "Reply in the user's language when possible. "
                "Keep spoken answers short, direct, and easy to hear aloud. "
                "Default to one to three concise sentences unless the user asks for more."
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
    system_prompt = settings.system_prompt
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
        "top_p": 0.8,
    }
    data = await post_json(settings.compatible_endpoint, payload)
    choice = (data.get("choices") or [{}])[0]
    message = choice.get("message") or {}
    content = message.get("content")
    if isinstance(content, list):
        return " ".join(str(item) for item in content if item).strip()
    return str(content or "").strip()


async def synthesize_speech(text: str, voice: str, language_hint: str | None) -> dict:
    headers = {
        "Authorization": f"Bearer {require_api_key()}",
        "Content-Type": "application/json",
        "X-DashScope-SSE": "enable",
    }
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
            "audioDataUrl": None,
            "audioMimeType": None,
        }

    wav_bytes = pcm_to_wav(bytes(pcm_chunks))
    return {
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
        "asrModel": settings.asr_model,
        "ttsModel": settings.tts_model,
    }


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
