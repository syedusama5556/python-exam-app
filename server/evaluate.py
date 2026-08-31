import os
import json
import re
import ast
import time
from typing import Dict, Any, Tuple, List
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai
                _client = genai.Client(api_key=api_key)
            except Exception as e:
                print(f"[Grading] Failed to initialize Google GenAI Client: {e}")
    return _client


# Model priority list for fallback redundancy
FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]

TEACHER_SYSTEM = """You are an encouraging, expert Python educator assessing a student's answer.
Focus on understanding and constructive guidance.
Give partial credit generously for correct concepts, logic, or syntax even if there are minor typos.

Scoring Rubric (0 to 10 points):
- 10: Completely correct, optimal, or equivalent solution
- 8-9: Correct approach and understanding, minor syntax or formatting difference
- 6-7: Partially correct, core idea is present but incomplete or has minor errors
- 3-5: Shows some relevant Python understanding but with major conceptual gaps
- 1-2: Minimal relevant attempt
- 0: Completely incorrect, irrelevant, or blank answer

Provide a warm, constructive 2-3 sentence explanation highlighting what is right and how to improve."""


def _normalize(text: str) -> str:
    """Normalize text for deterministic comparison."""
    if not text:
        return ""
    # Strip quotes, whitespace, trailing semicolons, lower
    t = text.strip().lower()
    t = re.sub(r'[\'"`]', '', t)
    t = re.sub(r'\s+', ' ', t)
    t = t.rstrip(';')
    return t


def _exact_or_deterministic_short(question: str, correct_answer: str, user_answer: str) -> Tuple[int, str]:
    """Check if short answer matches deterministically."""
    u_norm = _normalize(user_answer)
    c_norm = _normalize(correct_answer)

    if not u_norm:
        return 0, "No answer was provided for this question."

    if u_norm == c_norm:
        return 10, "Spot on! Perfect answer."

    # Specific common pattern aliases
    if "snake_case" in c_norm and ("snake" in u_norm or "snake_case" in u_norm or "snake case" in u_norm):
        return 10, "Correct! Python standard is snake_case."

    if "len" in c_norm and u_norm == "6":
        return 10, "Correct! len('Python') evaluates to 6."

    if "strip" in c_norm and (u_norm == "strip" or u_norm == "strip()"):
        return 10, "Correct! str.strip() removes whitespace from both ends."

    if "%" in c_norm and ("%" in u_norm or "modulo" in u_norm or "mod" in u_norm):
        return 10, "Correct! The % (modulo) operator returns the remainder."

    if "intersection" in c_norm and ("intersection" in u_norm or "intersection()" in u_norm or "&" == u_norm):
        return 10, "Correct! intersection() or the & operator returns elements common to both sets."

    if "update" in c_norm and ("update" in u_norm or "update()" in u_norm):
        return 10, "Correct! dict.update() updates key-value pairs."

    if "identity" in c_norm and ("identity" in u_norm or "memory" in u_norm or "object identity" in u_norm):
        return 10, "Correct! The 'is' operator tests object identity."

    if "continue" in c_norm and ("continue" in u_norm or "skips" in u_norm or "next iteration" in u_norm):
        return 10, "Correct! 'continue' skips to the next loop cycle."

    if "enumerate" in c_norm or "index and value" in c_norm:
        if "index" in u_norm and ("value" in u_norm or "item" in u_norm or "tuple" in u_norm or "element" in u_norm):
            return 10, "Correct! enumerate() yields index and element pairs as tuples."

    if "d1 | d2" in c_norm:
        if "|" in user_answer or "d1 | d2" in user_answer or "update" in u_norm:
            return 10, "Correct! The | operator (or update method) merges dictionaries."

    if "list, tuple, set, dict" in c_norm:
        required = {"list", "tuple", "set", "dict"}
        found = {w for w in ["list", "tuple", "set", "dict", "dictionary"] if w in u_norm}
        if len(found) >= 4 or (len(found) == 3 and "dictionary" in found):
            return 10, "Excellent! You identified all 4 core collection data types."
        elif len(found) >= 2:
            return 7, f"Good attempt! You identified {len(found)} of the 4 types (list, tuple, set, dict)."

    return -1, ""


def _heuristic_grade(question: str, correct_answer: str, user_answer: str, is_code: bool = False) -> Tuple[int, str]:
    """Graceful local heuristic grading when AI is unreachable."""
    if not user_answer.strip():
        return 0, "No answer provided."

    u_norm = _normalize(user_answer)
    c_norm = _normalize(correct_answer)

    # Token overlap similarity
    u_tokens = set(re.findall(r'\w+', u_norm))
    c_tokens = set(re.findall(r'\w+', c_norm))

    # Substring / exact contains — require meaningful length to avoid fragment matches
    if (c_norm in u_norm or u_norm in c_norm) and len(u_tokens) >= 3:
        return 9, "Great job! Your answer matches the key requirements."

    if not c_tokens:
        return 5, "Answer recorded."

    overlap = u_tokens.intersection(c_tokens)
    ratio = len(overlap) / len(c_tokens)

    if ratio >= 0.75:
        return 9, f"Well done! Your response includes key expected terms ({', '.join(overlap)})."
    elif ratio >= 0.5:
        return 7, f"Good attempt! Shows understanding of core concepts. Expected: {correct_answer}."
    elif ratio >= 0.25:
        return 5, f"Partially correct. Consider reviewing this topic. Reference: {correct_answer}."
    else:
        return 3, f"Your answer differs from expected solution. Reference: {correct_answer}."


def _parse_json_safely(text: str) -> Dict[str, Any]:
    """Robustly parse JSON response from LLM."""
    if not text:
        raise ValueError("Empty response text")

    text = text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()

    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Regex search for JSON block
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    # Regex extraction of score and feedback fields
    score_match = re.search(r'"score"\s*:\s*(\d+)', text)
    feedback_match = re.search(r'"feedback"\s*:\s*"([^"]+)"', text)

    if score_match:
        score = int(score_match.group(1))
        feedback = feedback_match.group(1) if feedback_match else "Evaluated by AI teacher."
        return {"score": score, "feedback": feedback}

    raise ValueError(f"Could not parse JSON from text: {text[:100]}")


def _call_gemini_with_fallback(prompt: str) -> Tuple[int, str]:
    """Invoke Gemini with model fallback and error recovery."""
    client = _get_client()
    if not client:
        raise RuntimeError("No Gemini API key or client available")

    last_error = None
    for model_name in FALLBACK_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            if response and response.text:
                result = _parse_json_safely(response.text)
                score = max(0, min(10, int(result.get("score", 0))))
                feedback = result.get("feedback", "Good effort.")
                return score, feedback
        except Exception as e:
            last_error = e
            continue

    raise RuntimeError(f"All Gemini models failed. Last error: {last_error}")


def grade_short(question: str, correct_answer: str, user_answer: str) -> Tuple[int, str]:
    """Grade a short answer question using deterministic rules, Gemini AI, or heuristic fallback."""
    if not user_answer or not user_answer.strip():
        return 0, "No answer provided."

    # Tier 1: Deterministic match
    score, feedback = _exact_or_deterministic_short(question, correct_answer, user_answer)
    if score >= 0:
        return score, feedback

    # Tier 2: AI Evaluation
    prompt = f"""{TEACHER_SYSTEM}

Grade this short-answer Python question.

Question: {question}
Expected Answer: {correct_answer}
Student Answer: {user_answer}

Respond ONLY with a valid JSON object (no code fences, no extra text):
{{"score": <integer from 0 to 10>, "feedback": "<encouraging 2-sentence explanation>"}}"""

    try:
        return _call_gemini_with_fallback(prompt)
    except Exception as e:
        print(f"[Grading Short] AI evaluation fallback triggered: {e}")
        return _heuristic_grade(question, correct_answer, user_answer, is_code=False)


def grade_code(question: str, correct_answer: str, user_answer: str) -> Tuple[int, str]:
    """Grade Python code questions checking syntax AST, logic, Gemini AI, or heuristic fallback."""
    if not user_answer or not user_answer.strip():
        return 0, "No code provided."

    # Tier 1: Exact code match
    if _normalize(user_answer) == _normalize(correct_answer):
        return 10, "Flawless code! Perfectly matches standard implementation."

    # Tier 2: Check syntax validity
    syntax_error = None
    try:
        ast.parse(user_answer)
    except SyntaxError as se:
        syntax_error = f"Syntax note: Line {se.lineno}: {se.msg}"

    # Tier 3: Gemini AI Evaluation
    prompt = f"""{TEACHER_SYSTEM}

Grade this Python code submission.
Check for logical correctness, proper syntax, variable naming, and appropriate Python idioms.
Give partial credit generously for valid approaches even with minor errors.

Question: {question}
Reference Code:
{correct_answer}

Student Code:
{user_answer}

Respond ONLY with a valid JSON object (no code fences, no extra text):
{{"score": <integer from 0 to 10>, "feedback": "<constructive and encouraging feedback highlighting strengths and fixes>"}}"""

    try:
        score, feedback = _call_gemini_with_fallback(prompt)
        if syntax_error and score > 8:
            score = 7  # Cap score if syntax error was present but AI gave high score
            feedback = f"{feedback} Note: Found {syntax_error}."
        return score, feedback
    except Exception as e:
        print(f"[Grading Code] AI evaluation fallback triggered: {e}")
        score, feedback = _heuristic_grade(question, correct_answer, user_answer, is_code=True)
        if syntax_error:
            feedback = f"{feedback} ({syntax_error})"
        return score, feedback


def grade_single_question(q: Dict[str, Any], user_ans: str) -> Dict[str, Any]:
    """Grade an individual question and return full structured detail."""
    qid = q["id"]
    qtype = q.get("type", "mcq")
    correct_ans = q.get("answerKey", "")
    question_text = q.get("question", "")
    topic = q.get("topic", "General")
    explanation = q.get("explanation", "")
    difficulty = q.get("difficulty", "medium")

    if qtype == "mcq":
        user_clean = user_ans.strip().lower() if user_ans else ""
        correct_clean = correct_ans.strip().lower()
        is_correct = user_clean == correct_clean and bool(user_clean)
        score = 10 if is_correct else 0
        if is_correct:
            feedback = "Correct! Well done."
        elif not user_clean:
            feedback = f"Unanswered. The correct option is ({correct_ans})."
        else:
            feedback = f"Incorrect. You selected ({user_ans.strip().upper()}), but correct answer is ({correct_ans.upper()})."

    elif qtype == "short":
        score, feedback = grade_short(question_text, correct_ans, user_ans)
        is_correct = score >= 7

    elif qtype == "code":
        score, feedback = grade_code(question_text, correct_ans, user_ans)
        is_correct = score >= 7

    else:
        score = 0
        feedback = "Unknown question format."
        is_correct = False

    return {
        "id": qid,
        "question": question_text,
        "type": qtype,
        "topic": topic,
        "difficulty": difficulty,
        "userAnswer": user_ans,
        "correctAnswer": correct_ans,
        "options": q.get("options"),
        "score": score,
        "maxScore": 10,
        "feedback": feedback,
        "explanation": explanation,
        "isCorrect": is_correct,
    }


def grade_submission_concurrently(questions: List[Dict[str, Any]], answers: Dict[str, str], max_workers: int = 8) -> List[Dict[str, Any]]:
    """Grade all questions concurrently using a thread pool for blazing fast performance."""
    results_map = {}
    tasks = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_qid = {}
        for q in questions:
            qid_str = str(q["id"])
            user_ans = answers.get(qid_str, "")
            future = executor.submit(grade_single_question, q, user_ans)
            future_to_qid[future] = q["id"]

        for future in as_completed(future_to_qid):
            qid = future_to_qid[future]
            try:
                detail = future.result()
                results_map[qid] = detail
            except Exception as e:
                print(f"[Grading Worker] Error grading question {qid}: {e}")
                q_obj = next((item for item in questions if item["id"] == qid), {"id": qid, "type": "unknown", "question": "", "answerKey": "", "topic": ""})
                results_map[qid] = {
                    "id": qid,
                    "question": q_obj.get("question", ""),
                    "type": q_obj.get("type", "unknown"),
                    "topic": q_obj.get("topic", "General"),
                    "userAnswer": answers.get(str(qid), ""),
                    "correctAnswer": q_obj.get("answerKey", ""),
                    "score": 0,
                    "maxScore": 10,
                    "feedback": f"Grading encountered an issue: {e}",
                    "explanation": q_obj.get("explanation", ""),
                    "isCorrect": False,
                }

    # Return in original order
    ordered_details = [results_map[q["id"]] for q in questions if q["id"] in results_map]
    return ordered_details
