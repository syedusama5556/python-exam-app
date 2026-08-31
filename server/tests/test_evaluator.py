import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from evaluate import (
    _exact_or_deterministic_short,
    _heuristic_grade,
    _parse_json_safely,
    grade_single_question,
    grade_submission_concurrently,
    grade_short,
    grade_code,
)


def test_deterministic_short_matching():
    # Exact and synonym matches
    score, feedback = _exact_or_deterministic_short("Naming convention?", "snake_case", "snake_case")
    assert score == 10

    score, _ = _exact_or_deterministic_short("Naming convention?", "snake_case", "SNAKE_CASE")
    assert score == 10

    score, _ = _exact_or_deterministic_short("Naming convention?", "snake_case", "snake case")
    assert score == 10

    score, _ = _exact_or_deterministic_short("Modulo operator?", "%", "%")
    assert score == 10

    score, _ = _exact_or_deterministic_short("Modulo operator?", "%", "modulo")
    assert score == 10

    score, _ = _exact_or_deterministic_short("Collections?", "list, tuple, set, dict", "list, tuple, set, dict")
    assert score == 10


def test_empty_answer_evaluation():
    score, feedback = _exact_or_deterministic_short("Any question", "answer", "")
    assert score == 0
    assert "No answer" in feedback

    q = {"id": 1, "type": "mcq", "question": "What is Python?", "answerKey": "a", "topic": "Basics"}
    res = grade_single_question(q, "")
    assert res["score"] == 0
    assert res["isCorrect"] is False


def test_mcq_grading():
    q = {
        "id": 1,
        "type": "mcq",
        "question": "What does print() do?",
        "options": {"a": "Input", "b": "Output", "c": "Save", "d": "Import"},
        "answerKey": "b",
        "topic": "Basics",
        "difficulty": "easy",
        "explanation": "Outputs to console",
    }

    # Correct
    res_correct = grade_single_question(q, "b")
    assert res_correct["score"] == 10
    assert res_correct["isCorrect"] is True
    assert "Correct" in res_correct["feedback"]

    # Incorrect
    res_wrong = grade_single_question(q, "a")
    assert res_wrong["score"] == 0
    assert res_wrong["isCorrect"] is False
    assert "Incorrect" in res_wrong["feedback"]


def test_heuristic_fallback_grader():
    score, feedback = _heuristic_grade(
        question="What is a set?",
        correct_answer="collection of unique unordered elements",
        user_answer="unordered unique elements",
        is_code=False,
    )
    assert score >= 7
    assert len(feedback) > 0


def test_json_parser_robustness():
    # Clean JSON
    res1 = _parse_json_safely('{"score": 9, "feedback": "Great job!"}')
    assert res1["score"] == 9
    assert res1["feedback"] == "Great job!"

    # Markdown fenced JSON
    res2 = _parse_json_safely('```json\n{"score": 8, "feedback": "Well done."}\n```')
    assert res2["score"] == 8

    # Unclean LLM text with embedded JSON
    res3 = _parse_json_safely('Here is the grading result:\n{"score": 10, "feedback": "Perfect code."}\nHope this helps!')
    assert res3["score"] == 10

    # Unclean text with regex fallback
    res4 = _parse_json_safely('Score assigned: "score": 7, "feedback": "Good attempt"')
    assert res4["score"] == 7


def test_concurrent_grading_execution():
    questions = [
        {"id": 1, "type": "mcq", "question": "Q1", "answerKey": "b", "topic": "Basics"},
        {"id": 2, "type": "short", "question": "Q2", "answerKey": "snake_case", "topic": "Variables"},
        {"id": 3, "type": "mcq", "question": "Q3", "answerKey": "a", "topic": "Basics"},
    ]
    answers = {
        "1": "b",
        "2": "snake_case",
        "3": "c",  # wrong
    }

    details = grade_submission_concurrently(questions, answers, max_workers=4)
    assert len(details) == 3
    assert details[0]["id"] == 1
    assert details[0]["score"] == 10
    assert details[1]["id"] == 2
    assert details[1]["score"] == 10
    assert details[2]["id"] == 3
    assert details[2]["score"] == 0
