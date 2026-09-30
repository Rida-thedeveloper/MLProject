import os
import json
import re
import logging
import numpy as np
from sentence_transformers import SentenceTransformer, util

logger = logging.getLogger(__name__)

# Load a lightweight, CPU-friendly embeddings model locally for offline fallback
MODEL_NAME = "all-MiniLM-L6-v2"
_model = None

def get_mapping_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model

# Phrases indicating explicit refusal, admission of ignorance, or non-answer
REFUSAL_PHRASES = [
    "i don't know", "i do not know", "i'm not sure", "i am not sure",
    "no idea", "have no idea", "can you help", "help me out",
    "can you explain", "don't know", "do not know", "i pass",
    "skip this", "i don't understand", "i do not understand",
    "can you tell me", "what is the answer", "not sure about this"
]

def calculate_relevance_details(question: str, answer: str) -> dict:
    """
    Strictly evaluates how accurately and relevantly the candidate's answer addresses the question asked.
    Uses Groq LLM evaluation with domain scoring guidelines.
    Falls back to semantic sentence-transformer embeddings if LLM is unavailable.
    """
    if not question or not answer:
        return {
            "score": 0,
            "label": "Off-Topic / Empty",
            "feedback": "No answer was provided.",
            "ideal_answer": "Provide a structured response defining the core concept and its key use case.",
            "method": "Empty input"
        }

    q_text = question.strip()
    a_text = answer.strip()
    a_lower = a_text.lower()

    # Rule 1: Fast-check for explicit refusal or admission of ignorance on short answers
    is_refusal = any(phrase in a_lower for phrase in REFUSAL_PHRASES)
    word_count = len(a_text.split())
    if is_refusal and word_count < 35:
        ideal_ans = get_ideal_answer_llm(q_text)
        return {
            "score": 0,
            "label": "Off-Topic / Refusal",
            "feedback": "You indicated you were unsure or did not know the answer. Review the ideal response below.",
            "ideal_answer": ideal_ans,
            "method": "Ignorance / Refusal Detection"
        }

    # Rule 2: High-accuracy Groq LLM evaluation
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if api_key:
        try:
            from groq import Groq
            client = Groq(api_key=api_key)

            system_prompt = (
                "You are an expert, strict technical interview evaluator. "
                "Carefully evaluate whether the candidate's answer actually addresses and explains the specific question asked.\n\n"
                "Scoring Rubric:\n"
                "- 85-100 (Highly Relevant): Directly and accurately explains the core technical concepts asked in the question.\n"
                "- 60-84 (Moderately Relevant): On-topic and partially correct, but misses technical depth or practical nuance.\n"
                "- 25-59 (Low Relevance): Vague or superficial. Mentions related keywords but does not properly answer the specific prompt.\n"
                "- 0-24 (Off-Topic / Refusal / Incorrect): Completely off-topic, factually incorrect explanation, empty, or admission of ignorance.\n\n"
                "Respond with a single JSON object containing keys:\n"
                "- 'score': integer from 0 to 100\n"
                "- 'label': string ('Highly Relevant', 'Moderately Relevant', 'Low Relevance', or 'Off-Topic / Low Relevance')\n"
                "- 'feedback': concise explanation (max 2 sentences) on how well the answer addressed the question\n"
                "- 'ideal_answer': concise, high-quality technical ideal answer (2-3 sentences max)"
            )

            user_prompt = f"Question: {q_text}\nCandidate Answer: {a_text}"

            res = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                max_tokens=600,
                temperature=0.1,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )

            content = res.choices[0].message.content.strip()
            
            # Parse JSON with fallback for markdown code fences
            try:
                data = json.loads(content)
            except Exception:
                match = re.search(r"\{.*\}", content, re.DOTALL)
                if match:
                    data = json.loads(match.group(0))
                else:
                    raise ValueError("Failed to extract JSON from response")

            score = int(np.clip(data.get("score", 0), 0, 100))
            label = data.get("label", "Moderately Relevant")
            feedback = data.get("feedback", "Answer evaluated.")
            ideal_answer = data.get("ideal_answer", "")

            # Ensure label matches score thresholds
            if score >= 85:
                label = "Highly Relevant"
            elif score >= 60:
                label = "Moderately Relevant"
            elif score >= 25:
                label = "Low Relevance"
            else:
                label = "Off-Topic / Low Relevance"

            return {
                "score": score,
                "label": label,
                "feedback": feedback,
                "ideal_answer": ideal_answer,
                "method": "Groq LLM Evaluation"
            }

        except Exception as e:
            logger.warning(f"Groq LLM relevance evaluation failed, falling back to embeddings: {e}")

    # Fallback: Embedding Cosine Similarity (Strictly calibrated)
    try:
        model = get_mapping_model()
        emb_q = model.encode(q_text, convert_to_tensor=True)
        emb_a = model.encode(a_text, convert_to_tensor=True)
        score_float = float(util.cos_sim(emb_q, emb_a)[0][0])

        if is_refusal or score_float <= 0.20:
            final_score = 0
            label = "Off-Topic / Low Relevance"
            feedback = "The response did not appear relevant to the question asked."
        elif score_float >= 0.75:
            final_score = int(np.clip(85 + (score_float - 0.75) / 0.25 * 15, 85, 100))
            label = "Highly Relevant"
            feedback = "Strong conceptual alignment with the question."
        elif score_float >= 0.50:
            final_score = int(np.clip(60 + (score_float - 0.50) / 0.25 * 24, 60, 84))
            label = "Moderately Relevant"
            feedback = "The answer touches on the subject but may lack technical completeness."
        else:
            final_score = int(np.clip(25 + (score_float - 0.20) / 0.30 * 34, 25, 59))
            label = "Low Relevance"
            feedback = "The answer had minimal direct relation to what was asked."

        return {
            "score": final_score,
            "label": label,
            "feedback": feedback,
            "ideal_answer": f"For '{q_text}', a strong answer should clearly define the core concept, its mechanics, and key trade-offs.",
            "method": "Sentence Transformer Cosine Similarity"
        }

    except Exception as e:
        logger.error(f"Fallback semantic relevance failed: {e}")
        return {
            "score": 0,
            "label": "Error",
            "feedback": "Could not evaluate relevance due to processing error.",
            "ideal_answer": "",
            "method": "Error"
        }

def get_ideal_answer_llm(question: str) -> str:
    """Generates a concise ideal answer for a given question using LLM or template."""
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if api_key:
        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            res = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                max_tokens=200,
                temperature=0.2,
                messages=[
                    {"role": "system", "content": "You are an expert technical interviewer. Provide a concise, clear 2-3 sentence ideal answer to the question asked."},
                    {"role": "user", "content": f"Question: '{question}'"}
                ]
            )
            return res.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Failed to generate ideal answer from Groq: {e}")

    return f"An ideal answer for '{question}' should clearly define the main concept and provide a real-world technical use case."

def calculate_relevance(question: str, answer: str) -> int:
    """Legacy integer interface retained for backward compatibility."""
    return calculate_relevance_details(question, answer)["score"]
