from sentence_transformers import SentenceTransformer, util
import numpy as np
import os
import logging

logger = logging.getLogger(__name__)

# Load a lightweight, CPU-friendly embeddings model locally
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
    "can you tell me", "what is the answer"
]

def calculate_relevance_details(question: str, answer: str) -> dict:
    """
    Evaluates candidate answer against the question.
    Uses Groq LLM if available to grade relevance and generate ideal answer.
    Falls back to refusal-checking + Sentence Transformers if LLM is unavailable.
    """
    if not question or not answer:
        return {
            "score": 0,
            "label": "Off-Topic / Empty",
            "ideal_answer": "No answer provided.",
            "method": "Empty input"
        }

    q_text = question.strip()
    a_text = answer.strip()
    a_lower = a_text.lower()

    # Rule 1: Check for explicit refusal or admission of ignorance
    is_refusal = any(phrase in a_lower for phrase in REFUSAL_PHRASES)
    word_count = len(a_text.split())
    if is_refusal and word_count < 35:
        ideal_ans = get_ideal_answer_llm(q_text)
        return {
            "score": 0,
            "label": "Off-Topic / Admission of Ignorance",
            "ideal_answer": ideal_ans,
            "method": "Refusal / Ignorance Detection"
        }

    # Rule 2: Groq LLM evaluation for accurate scoring and ideal answer generation
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if api_key:
        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            prompt = (
                f"You are an expert technical interviewer.\n"
                f"Question: {q_text}\n"
                f"Candidate Answer: {a_text}\n\n"
                f"Task:\n"
                f"1. Evaluate if candidate answer actually explains/answers the question correctly. "
                f"If candidate admits ignorance (e.g., 'I don't know', 'help me out'), score MUST BE 0.\n"
                f"2. Generate a concise Ideal Answer (2-3 sentences max) for this question.\n\n"
                f"Return ONLY a JSON object with keys:\n"
                f"- score: integer 0 to 100\n"
                f"- label: string ('Highly Relevant', 'Moderately Relevant', or 'Off-Topic / Admission of Ignorance')\n"
                f"- ideal_answer: string\n"
            )
            res = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                max_tokens=250,
                response_format={"type": "json_object"},
                messages=[{"role": "user", "content": prompt}]
            )
            content = res.choices[0].message.content
            import json
            data = json.loads(content)
            score = int(np.clip(data.get("score", 0), 0, 100))
            label = data.get("label", "Moderately Relevant")
            ideal_answer = data.get("ideal_answer", "")
            return {
                "score": score,
                "label": label,
                "ideal_answer": ideal_answer,
                "method": "Groq LLM Evaluation"
            }
        except Exception as e:
            logger.warning(f"Groq LLM relevance evaluation failed: {e}")

    # Fallback: Embedding Cosine Similarity
    try:
        model = get_mapping_model()
        embeddings1 = model.encode(q_text, convert_to_tensor=True)
        embeddings2 = model.encode(a_text, convert_to_tensor=True)
        cosine_scores = util.cos_sim(embeddings1, embeddings2)
        score_float = float(cosine_scores[0][0])
        
        if is_refusal:
            final_score = 0
            label = "Off-Topic / Admission of Ignorance"
        elif score_float <= 0.1:
            final_score = 0
            label = "Off-Topic / Low Relevance"
        elif score_float >= 0.7:
            final_score = 100
            label = "Highly Relevant"
        else:
            mapped_score = (score_float - 0.1) / (0.7 - 0.1) * 100.0
            final_score = int(np.clip(mapped_score, 0, 100))
            label = "Highly Relevant" if final_score >= 75 else ("Moderately Relevant" if final_score >= 40 else "Off-Topic / Low Relevance")

        return {
            "score": final_score,
            "label": label,
            "ideal_answer": f"For '{q_text}', a strong answer should clearly define the core concept and provide a practical example.",
            "method": "Sentence Transformer Cosine Similarity"
        }
    except Exception as e:
        logger.error(f"Fallback semantic relevance failed: {e}")
        return {
            "score": 0,
            "label": "Error",
            "ideal_answer": "",
            "method": "Error"
        }

def get_ideal_answer_llm(question: str) -> str:
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if api_key:
        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            res = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                max_tokens=150,
                messages=[{"role": "user", "content": f"Provide a 2-sentence concise ideal answer for the technical interview question: '{question}'"}]
            )
            return res.choices[0].message.content.strip()
        except Exception:
            pass
    return f"A concise ideal answer for '{question}' should explain the core definition and key use case."

def calculate_relevance(question: str, answer: str) -> int:
    """Legacy integer interface retained for backward compatibility."""
    return calculate_relevance_details(question, answer)["score"]
