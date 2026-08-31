import sys
import os
import json
import uuid
import time
import csv
import io
from typing import Dict, Any, List, Optional
from threading import Lock

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException, Query, Response, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

app = FastAPI(title="Python Exam API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vercel = in-memory, local = filesystem
IS_VERCEL = os.getenv("VERCEL") == "1" or not os.access(os.path.dirname(os.path.abspath(__file__)), os.W_OK)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
QUESTIONS_FILE = os.path.join(BASE_DIR, "questions.json")

_memory_sessions: Dict[str, Dict[str, Any]] = {}
_memory_results: Dict[str, Dict[str, Any]] = {}
_lock = Lock()

if not IS_VERCEL:
    SESSIONS_DIR = os.path.join(BASE_DIR, "sessions")
    RESULTS_DIR = os.path.join(BASE_DIR, "results")
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    os.makedirs(RESULTS_DIR, exist_ok=True)


def get_admin_password() -> str:
    return os.getenv("ADMIN_PASSWORD", "admin123")


def verify_admin(
    x_admin_password: Optional[str] = Header(None),
    password: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    admin_pass = get_admin_password()
    token = x_admin_password or password
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
    if not token or token != admin_pass:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


def get_questions_data() -> Dict[str, Any]:
    with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------- STORAGE ABSTRACTION ----------

def load_session(session_id: str) -> Optional[Dict[str, Any]]:
    if IS_VERCEL:
        return _memory_sessions.get(session_id)
    path = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return None


def save_session(session_id: str, data: Dict[str, Any]):
    if IS_VERCEL:
        _memory_sessions[session_id] = data
        return
    path = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    temp_path = f"{path}.tmp"
    with _lock:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        if os.path.exists(path):
            os.remove(path)
        os.rename(temp_path, path)


def save_result(session_id: str, result: Dict[str, Any]):
    if IS_VERCEL:
        _memory_results[session_id] = result
        return
    result_path = os.path.join(RESULTS_DIR, f"{session_id}.json")
    temp_path = f"{result_path}.tmp"
    with _lock:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        if os.path.exists(result_path):
            os.remove(result_path)
        os.rename(temp_path, result_path)


def load_result(session_id: str) -> Optional[Dict[str, Any]]:
    if IS_VERCEL:
        return _memory_results.get(session_id)
    result_path = os.path.join(RESULTS_DIR, f"{session_id}.json")
    if not os.path.exists(result_path):
        return None
    try:
        with open(result_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return None


def list_all_results() -> List[Dict[str, Any]]:
    if IS_VERCEL:
        return list(_memory_results.values())
    results = []
    for filename in os.listdir(RESULTS_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(RESULTS_DIR, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    results.append(json.load(f))
            except Exception:
                pass
    return results


# ---------- GRADING ----------

def grade_single_question(q: Dict[str, Any], user_ans: str) -> Dict[str, Any]:
    qid = q["id"]
    qtype = q.get("type", "mcq")
    correct_ans = q.get("answerKey", "")
    question_text = q.get("question", "")
    topic = q.get("topic", "General")
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
    elif qtype in ("short", "code"):
        try:
            from evaluate import grade_short, grade_code
            if qtype == "short":
                score, feedback = grade_short(question_text, correct_ans, user_ans)
            else:
                score, feedback = grade_code(question_text, correct_ans, user_ans)
        except Exception as e:
            score, feedback = _heuristic_grade(correct_ans, user_ans)
            feedback = f"{feedback} (AI unavailable: {e})"
        is_correct = score >= 7
    else:
        score = 0
        feedback = "Unknown question format."
        is_correct = False

    return {
        "id": qid, "question": question_text, "type": qtype, "topic": topic,
        "difficulty": difficulty, "userAnswer": user_ans, "correctAnswer": correct_ans,
        "options": q.get("options"), "score": score, "maxScore": 10,
        "feedback": feedback, "isCorrect": is_correct,
    }


def _heuristic_grade(correct_answer: str, user_answer: str):
    u = user_answer.strip().lower() if user_answer else ""
    c = correct_answer.strip().lower()
    if not u:
        return 0, "No answer provided."
    if u == c or u in c or c in u:
        return 9, "Great job!"
    u_tokens = set(u.split())
    c_tokens = set(c.split())
    overlap = u_tokens & c_tokens
    ratio = len(overlap) / len(c_tokens) if c_tokens else 0
    if ratio >= 0.75:
        return 9, "Well done!"
    elif ratio >= 0.5:
        return 7, "Good attempt!"
    elif ratio >= 0.25:
        return 5, "Partially correct."
    return 3, f"Reference: {correct_answer}"


def auto_submit(session_id: str) -> Optional[Dict[str, Any]]:
    session = load_session(session_id)
    if not session:
        return None

    existing = load_result(session_id)
    if session.get("submitted") and existing:
        return existing

    session["submitted"] = True
    session["submittedAtTime"] = time.time()
    save_session(session_id, session)

    questions_data = get_questions_data()
    questions = questions_data["questions"]
    answers = session.get("answers", {})

    details = [grade_single_question(q, answers.get(str(q["id"]), "")) for q in questions]

    total_score = sum(d["score"] for d in details)
    max_possible = len(questions) * 10
    total = len(questions)
    avg_score = round((total_score / max_possible) * 100, 1) if max_possible > 0 else 0
    correct_count = sum(1 for d in details if d["isCorrect"])

    topics_map = {}
    for d in details:
        top = d["topic"]
        if top not in topics_map:
            topics_map[top] = {"total": 0, "correct": 0, "score": 0, "maxScore": 0}
        topics_map[top]["total"] += 1
        topics_map[top]["score"] += d["score"]
        topics_map[top]["maxScore"] += d["maxScore"]
        if d["isCorrect"]:
            topics_map[top]["correct"] += 1

    topic_breakdown = []
    for top, stats in topics_map.items():
        pct = round((stats["score"] / stats["maxScore"]) * 100, 1) if stats["maxScore"] > 0 else 0
        topic_breakdown.append({
            "topic": top, "totalQuestions": stats["total"],
            "correctQuestions": stats["correct"], "score": stats["score"],
            "maxScore": stats["maxScore"], "percentage": pct,
        })

    started_at = session.get("startedAt", time.time())
    time_taken_sec = max(0, int(session["submittedAtTime"] - started_at))

    grade = (
        "A+" if avg_score >= 90 else "A" if avg_score >= 80 else
        "B" if avg_score >= 70 else "C" if avg_score >= 60 else
        "D" if avg_score >= 50 else "F"
    )

    result = {
        "session_id": session_id,
        "studentName": session["studentName"],
        "score": avg_score, "grade": grade,
        "correct": correct_count, "total": total,
        "totalScore": total_score, "maxPossible": max_possible,
        "timeTakenSeconds": time_taken_sec,
        "submittedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(session["submittedAtTime"])),
        "topicBreakdown": topic_breakdown,
        "details": details,
    }

    save_result(session_id, result)
    return result


# ---------- PUBLIC ENDPOINTS ----------

@app.get("/api/questions")
def get_questions():
    data = get_questions_data()
    duration_ms = data.get("duration_minutes", 60) * 60 * 1000
    safe = [{"id": q["id"], "topic": q["topic"], "type": q["type"],
             "difficulty": q.get("difficulty", "medium"), "question": q["question"],
             "options": q.get("options")} for q in data["questions"]]
    return {"title": data.get("test_title", "Python Exam"), "questions": safe,
            "total": len(safe), "durationMs": duration_ms}


class StartRequest(BaseModel):
    studentName: str


@app.post("/api/start-test")
def start_test(req: StartRequest):
    name = req.studentName.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Student name is required")
    data = get_questions_data()
    duration_ms = data.get("duration_minutes", 60) * 60 * 1000
    session_id = str(uuid.uuid4())
    session = {
        "sessionId": session_id, "studentName": name,
        "startedAt": time.time(), "durationMs": duration_ms,
        "submitted": False, "answers": {}, "flags": {},
    }
    save_session(session_id, session)
    return {"sessionId": session_id, "durationMs": duration_ms,
            "studentName": name, "startedAt": session["startedAt"]}


@app.get("/api/session/{session_id}")
def get_session(session_id: str):
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    elapsed = (time.time() - session["startedAt"]) * 1000
    remaining = max(0, session["durationMs"] - elapsed)
    if remaining <= 0 and not session["submitted"]:
        auto_submit(session_id)
        session = load_session(session_id)
    return {
        "sessionId": session_id, "studentName": session["studentName"],
        "submitted": session.get("submitted", False),
        "remainingMs": remaining, "answers": session.get("answers", {}),
    }


class AnswerRequest(BaseModel):
    sessionId: str
    questionId: int
    answer: str
    flagged: Optional[bool] = None


@app.post("/api/save-answer")
def save_answer(req: AnswerRequest):
    session = load_session(req.sessionId)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("submitted"):
        raise HTTPException(status_code=400, detail="Test already submitted")
    elapsed = (time.time() - session["startedAt"]) * 1000
    if elapsed >= session["durationMs"]:
        auto_submit(req.sessionId)
        return {"error": "Time expired", "submitted": True}
    session.setdefault("answers", {})[str(req.questionId)] = req.answer
    if req.flagged is not None:
        session.setdefault("flags", {})[str(req.questionId)] = req.flagged
    save_session(req.sessionId, session)
    return {"ok": True}


class SubmitRequest(BaseModel):
    sessionId: str


@app.post("/api/submit-test")
def submit_test(req: SubmitRequest):
    session = load_session(req.sessionId)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    result = auto_submit(req.sessionId)
    return {"ok": True, "message": "Exam submitted successfully", "result": result}


@app.get("/api/result/{session_id}")
def get_student_result(session_id: str):
    existing = load_result(session_id)
    if existing:
        return existing
    session = load_session(session_id)
    if session and session.get("submitted"):
        res = auto_submit(session_id)
        if res:
            return res
    raise HTTPException(status_code=404, detail="Result not found")


# ---------- ADMIN ENDPOINTS ----------

class AdminLoginRequest(BaseModel):
    password: str


@app.post("/api/admin/login")
def admin_login(req: AdminLoginRequest):
    if req.password == get_admin_password():
        return {"ok": True, "token": get_admin_password()}
    raise HTTPException(status_code=401, detail="Invalid password")


@app.get("/api/admin/results", dependencies=[Depends(verify_admin)])
def get_all_results():
    all_results = list_all_results()
    summary = []
    for r in all_results:
        summary.append({
            "session_id": r.get("session_id", ""),
            "studentName": r.get("studentName", "Unknown"),
            "score": r.get("score", 0),
            "grade": r.get("grade", "-"),
            "correct": r.get("correct", 0),
            "total": r.get("total", 0),
            "totalScore": r.get("totalScore", 0),
            "maxPossible": r.get("maxPossible", 0),
            "timeTakenSeconds": r.get("timeTakenSeconds", 0),
            "submittedAt": r.get("submittedAt", ""),
        })
    summary.sort(key=lambda x: x.get("submittedAt", ""), reverse=True)
    return {"results": summary, "totalCount": len(summary)}


@app.get("/api/admin/result/{session_id}", dependencies=[Depends(verify_admin)])
def get_admin_result(session_id: str):
    result = load_result(session_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result
