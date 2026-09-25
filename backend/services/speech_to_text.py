"""
speech_to_text.py
-----------------
Transcription via Groq Speech-to-Text API (whisper-large-v3-turbo).

Local Whisper / PyTorch removed to eliminate Railway OOM issues.
The function interface (transcribe_audio_file) is unchanged so all
downstream analysis continues to work without modification.

NOTE: imageio_ffmpeg PATH setup is retained because audio_features.py
still uses ffmpeg (via imageio_ffmpeg) to transcode .webm → WAV.
"""

import logging
import os

logger = logging.getLogger(__name__)

# ── FFmpeg PATH setup ─────────────────────────────────────────────────────────
# Keep this block: audio_features.py uses imageio_ffmpeg for WebM decoding.
# Do NOT remove without verifying audio_features.py no longer calls it.
try:
    import imageio_ffmpeg
    import shutil

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)

    # On Linux (Railway) the binary is already called "ffmpeg"; the alias is
    # only needed on Windows where imageio names it differently.
    target_ffmpeg = os.path.join(ffmpeg_dir, "ffmpeg")
    if not os.path.exists(target_ffmpeg):
        shutil.copyfile(ffmpeg_exe, target_ffmpeg)
        logger.info(f"Created ffmpeg alias at: {target_ffmpeg}")

    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
        logger.info(f"Added FFmpeg directory to PATH: {ffmpeg_dir}")
except Exception as err:
    logger.warning(f"imageio_ffmpeg PATH setup skipped: {err}")

# ── Known Whisper hallucinations on silent/short audio ───────────────────────
# Whisper (and Groq's hosted version) produces these exact strings when it
# receives near-silent, very short, or unrecognisable audio.  We detect and
# reject them so the frontend never shows a fake transcript.
_HALLUCINATION_PHRASES = {
    "thank you.",
    "thank you",
    "thanks for watching.",
    "thanks for watching",
    "you",
    "bye.",
    "bye",
    ".",
    "",
}

# ── Groq client ───────────────────────────────────────────────────────────────
try:
    from groq import Groq
    _groq_available = True
except ImportError:
    _groq_available = False
    logger.warning("groq package not installed – transcription will return a placeholder.")


def transcribe_audio_file(audio_path: str) -> str:
    """
    Send an audio file to the Groq Speech-to-Text API and return the transcript.

    The function signature is identical to the old local-Whisper version so
    all callers (main.py) work without any changes.

    Safe diagnostic information IS logged (filename, size, Groq response text).
    GROQ_API_KEY is never logged.
    """
    if not _groq_available:
        logger.error("[Groq STT] groq package missing – cannot transcribe.")
        return "Transcription unavailable: groq package not installed."

    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        # Fallback: attempt reading from backend/.env or root .env file directly
        possible_paths = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
        ]
        for p in possible_paths:
            if os.path.exists(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith("#") and "=" in line:
                                k, v = line.split("=", 1)
                                if k.strip() == "GROQ_API_KEY":
                                    api_key = v.strip().strip("'\"")
                                    os.environ["GROQ_API_KEY"] = api_key
                                    break
                except Exception as err:
                    logger.warning(f"Failed to read .env at {p}: {err}")
            if api_key:
                break

    if not api_key:
        logger.error("[Groq STT] GROQ_API_KEY is not set in the environment.")
        return "Transcription unavailable: GROQ_API_KEY not configured on the server."

    # ── Diagnostic: verify the file before sending ────────────────────────────
    if not os.path.exists(audio_path):
        logger.error(f"[Groq STT] Audio file not found: {audio_path}")
        return "Transcription unavailable: audio file missing."

    file_size = os.path.getsize(audio_path)
    filename   = os.path.basename(audio_path)
    logger.info(
        f"[Groq STT] Preparing to transcribe | file={filename} | size={file_size} bytes"
    )

    # Guard against empty or suspiciously small files (< 1 KB is almost always
    # silent or corrupt and would cause Whisper to hallucinate).
    if file_size < 1000:
        logger.warning(
            f"[Groq STT] File too small ({file_size} bytes) – likely silent or corrupt. "
            "Skipping Groq call."
        )
        return "No speech detected: the recording appears to be empty or too short."

    try:
        client = Groq(api_key=api_key)

        # Open fresh from disk with binary mode.  Pass the filename explicitly
        # so that Groq correctly identifies the container format (WebM/Opus).
        # We do NOT use a prompt here: even a benign prompt biases Whisper on
        # short/quiet audio and is the primary cause of "Thank you." hallucinations.
        with open(audio_path, "rb") as audio_file:
            logger.info(
                f"[Groq STT] Sending to whisper-large-v3-turbo | "
                f"filename={filename} | size={file_size} bytes"
            )
            transcription = client.audio.transcriptions.create(
                model="whisper-large-v3-turbo",
                file=(filename, audio_file, "audio/webm"),   # explicit MIME hint
                response_format="text",
                language="en",
                # NO prompt parameter — avoids hallucination bias on quiet audio
            )

        # response_format="text" → SDK returns a plain string directly
        if isinstance(transcription, str):
            result = transcription.strip()
        else:
            result = (getattr(transcription, "text", "") or "").strip()

        logger.info(f"[Groq STT] Raw response: '{result[:120]}'")

        # ── Hallucination detection ───────────────────────────────────────────
        if result.lower() in _HALLUCINATION_PHRASES:
            logger.warning(
                f"[Groq STT] Detected hallucination output: '{result}'. "
                "Replacing with no-speech indicator."
            )
            return "No speech detected in the recording."

        if not result:
            return "No speech detected in the recording."

        logger.info(f"[Groq STT] Transcript accepted ({len(result)} chars).")
        return result

    except Exception as err:
        logger.error(f"[Groq STT] Transcription error: {err}")
        return f"Audio recorded successfully. (Transcription notice: {err})"
