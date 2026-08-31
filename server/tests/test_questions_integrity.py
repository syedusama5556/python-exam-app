import pytest
import json
import os

QUESTIONS_FILE = os.path.join(os.path.dirname(__file__), "..", "questions.json")


def test_questions_file_exists_and_valid_json():
    assert os.path.exists(QUESTIONS_FILE)
    with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "questions" in data
    assert "duration_minutes" in data
    assert len(data["questions"]) > 0


def test_questions_schema_integrity():
    with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    questions = data["questions"]
    seen_ids = set()

    for q in questions:
        # ID checks
        assert "id" in q
        assert isinstance(q["id"], int)
        assert q["id"] not in seen_ids, f"Duplicate question ID: {q['id']}"
        seen_ids.add(q["id"])

        # Required fields
        assert "topic" in q and q["topic"].strip(), f"Missing topic in Q{q['id']}"
        assert "type" in q and q["type"] in ["mcq", "short", "code"], f"Invalid type in Q{q['id']}: {q.get('type')}"
        assert "question" in q and q["question"].strip(), f"Missing question text in Q{q['id']}"
        assert "answerKey" in q and q["answerKey"].strip(), f"Missing answerKey in Q{q['id']}"
        assert "explanation" in q and q["explanation"].strip(), f"Missing explanation in Q{q['id']}"

        # MCQ specifics
        if q["type"] == "mcq":
            assert "options" in q, f"MCQ Q{q['id']} missing options"
            options = q["options"]
            assert isinstance(options, dict)
            assert len(options) >= 2, f"MCQ Q{q['id']} options must have at least 2 choices"
            assert q["answerKey"].lower() in options, f"MCQ Q{q['id']} answerKey '{q['answerKey']}' not in options {list(options.keys())}"


def test_q55_answer_key_corrected():
    with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    q55 = next((q for q in data["questions"] if q["id"] == 55), None)
    assert q55 is not None
    # nums = [1, 2, 3]; nums.append([4, 5]) -> len(nums) is 4 (option 'c')
    assert q55["answerKey"] == "c"
    assert q55["options"]["c"] == "4"
