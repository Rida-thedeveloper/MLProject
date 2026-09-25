from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import tempfile
import logging

# Load .env file automatically
env_file = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_file):
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip("'\"")

from services.speech_to_text import transcribe_audio_file
from services.audio_features import extract_audio_features
from services.text_analysis import analyze_transcript
from ml.predict import predict_hesitation
from ml.feedback import generate_feedback
from ml.semantic_relevance import calculate_relevance, calculate_relevance_details, get_ideal_answer_llm

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Mockly API",
    description="Backend API for Mockly AI Interview Platform",
    version="1.0.0"
)

# Configure CORS so React frontend can communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    wpm: float
    pause_count: int
    speech_duration: float
    word_count: int


def is_no_speech_transcript(text: str) -> bool:
    if not text or not text.strip():
        return True
    t = text.strip().lower()
    if t.startswith("transcription unavailable") or t.startswith("no speech detected") or t.startswith("audio recorded successfully"):
        return True
    clean_t = t.rstrip(".!")
    if clean_t in {"thank you", "thanks for watching", "you", "bye", "subtitles by", "amara.org", "english", "subscribe", "playing", "silence", "music"}:
        return True
    return False


@app.get("/")
def read_root():
    return {"message": "Mockly API is running"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/predict-hesitation")
def predict_hesitation_route(req: PredictRequest):
    """
    Dedicated endpoint to run Random Forest hesitation prediction directly from 4 features.
    """
    try:
        features = {
            "wpm": req.wpm,
            "pause_count": req.pause_count,
            "speech_duration": req.speech_duration,
            "word_count": req.word_count,
        }
        result = predict_hesitation(features)
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"Error in /api/predict-hesitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    if not audio:
        raise HTTPException(status_code=400, detail="No audio file provided")

    # Save the uploaded audio to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        logger.info(f"Transcribing uploaded audio file: {tmp_path}")
        # Call the dedicated service rather than hitting Whisper directly from the route
        transcript = transcribe_audio_file(tmp_path)
        logger.info("Transcription completed.")
        return {
            "success": True,
            "transcript": transcript
        }
    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        # Clean up the temporary file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/api/analyze")
async def analyze_audio(
    audio: UploadFile = File(...),
    question: str = Form(None)
):
    """
    Full analysis endpoint: runs Whisper transcription AND librosa audio feature
    extraction on the same uploaded file, returning both results together.

    Accepted formats: .webm, .mp3, .wav, .ogg (anything librosa/ffmpeg handles)
    """
    if not audio:
        raise HTTPException(status_code=400, detail="No audio file provided")

    # Preserve original extension so librosa/ffmpeg can identify the container
    original_ext = os.path.splitext(audio.filename or "recording.webm")[1] or ".webm"

    with tempfile.NamedTemporaryFile(delete=False, suffix=original_ext) as tmp:
        content = await audio.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty")
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # ---------- Transcription ----------
        logger.info(f"[analyze] Running Whisper transcription on {tmp_path}")
        try:
            transcript = transcribe_audio_file(tmp_path)
        except Exception as e:
            logger.warning(f"[analyze] Transcription failed: {e}")
            transcript = None

        # ---------- Audio Feature Extraction ----------
        logger.info(f"[analyze] Extracting audio features from {tmp_path}")
        try:
            audio_feats = extract_audio_features(tmp_path)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e))
        except Exception as e:
            logger.error(f"[analyze] Unexpected error in feature extraction: {e}")
            raise HTTPException(status_code=500, detail=f"Feature extraction failed: {e}")

        # ---------- Text Feature Extraction ----------
        logger.info("[analyze] Extracting text features from transcript")
        # Check if transcript is invalid, empty, or indicates unavailable STT / silence
        is_invalid_transcript = is_no_speech_transcript(transcript)
        
        try:
            text_feats = analyze_transcript("" if is_invalid_transcript else transcript)
        except Exception as e:
            logger.warning(f"[analyze] Text analysis failed: {e}")
            text_feats = {"word_count": 0, "filler_count": 0, "fillers": [], "repetition_count": 0, "repeated_items": []}

        # ---------- WPM (Speaking Rate) ----------
        speech_minutes = audio_feats.get("speech_duration", 0) / 60
        word_count = 0 if is_invalid_transcript else text_feats.get("word_count", 0)
        wpm = round(word_count / speech_minutes) if (speech_minutes > 0 and word_count > 0) else 0

        # Detect silence / no speech
        is_silent = is_invalid_transcript or (word_count == 0) or (audio_feats.get("speech_duration", 0) < 0.5)

        # ---------- Merge into single flat features dict ----------
        features = {
            **audio_feats,
            "word_count": word_count,
            "wpm": wpm,
            "filler_count": text_feats.get("filler_count", 0),
            "fillers": text_feats.get("fillers", []),
            "repetition_count": text_feats.get("repetition_count", 0),
            "repeated_items": text_feats.get("repeated_items", []),
            "is_silent": is_silent
        }

        # ---------- Random Forest Hesitation Prediction ----------
        logger.info("[analyze] Running Random Forest hesitation prediction")
        hesitation_res = None
        if is_silent:
            logger.info("[analyze] Silent or no speech detected — setting prediction to 'No Speech Detected'")
            hesitation_res = {
                "prediction": "No Speech Detected",
                "probabilities": {"Low": 0.0, "Medium": 0.0, "High": 0.0},
                "is_silent": True
            }
        else:
            try:
                wpm_val = features.get("wpm")
                pause_val = features.get("pause_count")
                speech_dur_val = features.get("speech_duration")
                word_cnt_val = features.get("word_count")

                if all(v is not None for v in [wpm_val, pause_val, speech_dur_val, word_cnt_val]):
                    model_inputs = {
                        "wpm": wpm_val,
                        "pause_count": pause_val,
                        "speech_duration": speech_dur_val,
                        "word_count": word_cnt_val,
                    }
                    hesitation_res = predict_hesitation(model_inputs)
                    hesitation_res["is_silent"] = False
                else:
                    logger.warning("[analyze] Required features missing for hesitation prediction")
                    hesitation_res = {"error": "Waiting for speech analysis...", "is_silent": False}
            except Exception as err:
                logger.error(f"[analyze] Hesitation prediction error: {err}")
                hesitation_res = {"error": "ML prediction temporarily unavailable.", "is_silent": False}

        # ---------- Feedback Generation ----------
        logger.info("[analyze] Generating personalized interview feedback")
        feedback_res = None
        if is_silent:
            feedback_res = {
                "summary": "No speech was detected in your recording. Please ensure your microphone is unmuted and speak clearly into it after clicking record.",
                "suggestions": [
                    "Check your microphone volume / input level in browser settings.",
                    "Ensure you speak clearly into the microphone after clicking record.",
                    "Try recording your answer again when you are ready."
                ]
            }
        else:
            try:
                pred_val = hesitation_res.get("prediction") if isinstance(hesitation_res, dict) else None
                prob_val = hesitation_res.get("probabilities") if isinstance(hesitation_res, dict) else None

                feedback_res = generate_feedback(
                    prediction=pred_val,
                    probabilities=prob_val,
                    wpm=features.get("wpm"),
                    pause_count=features.get("pause_count"),
                    speech_duration=features.get("speech_duration"),
                    word_count=features.get("word_count"),
                )
            except Exception as err:
                logger.error(f"[analyze] Feedback generation error: {err}")
                feedback_res = {
                    "summary": "Feedback unavailable due to processing error.",
                    "suggestions": ["Ensure your microphone is clear and try recording again."],
                }

        # ---------- Semantic Relevance & Ideal Answer ----------
        relevance_score = None
        if is_silent:
            ideal_ans = get_ideal_answer_llm(question) if question else "No speech detected."
            relevance_score = {
                "score": 0,
                "label": "No Speech Detected",
                "ideal_answer": ideal_ans,
                "method": "No speech detected (0 words)"
            }
        elif question and transcript and not is_invalid_transcript:
            try:
                logger.info("[analyze] Calculating semantic relevance between question and transcript")
                relevance_score = calculate_relevance_details(question, transcript)
            except Exception as e:
                logger.warning(f"[analyze] Semantic relevance failed: {e}")
                relevance_score = {"score": 0, "label": "Error", "ideal_answer": "", "method": "Error"}
        elif question:
            ideal_ans = get_ideal_answer_llm(question)
            relevance_score = {
                "score": 0,
                "label": "Off-Topic / Empty",
                "ideal_answer": ideal_ans,
                "method": "Empty transcript"
            }

        logger.info("[analyze] Analysis complete.")
        return {
            "success": True,
            "transcript": None if is_invalid_transcript else transcript,
            "features": features,
            "hesitation": hesitation_res,
            "feedback": feedback_res,
            "relevance": relevance_score,
        }

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


