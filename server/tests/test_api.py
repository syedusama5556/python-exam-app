import pytest
import sys
import os
import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app, get_admin_password


@pytest.fixture
def anyio_backend():
    return 'asyncio'


@pytest.mark.anyio
async def test_get_questions_endpoint():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.get("/api/questions")
        assert response.status_code == 200
        data = response.json()
        assert "questions" in data
        assert data["total"] > 0
        first_q = data["questions"][0]
        assert "answerKey" not in first_q
        assert "id" in first_q
        assert "question" in first_q


@pytest.mark.anyio
async def test_start_test_and_session_flow():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        # 1. Start test
        start_resp = await client.post("/api/start-test", json={"studentName": "Alex Tester"})
        assert start_resp.status_code == 200
        start_data = start_resp.json()
        assert "sessionId" in start_data
        session_id = start_data["sessionId"]
        assert start_data["studentName"] == "Alex Tester"

        # 2. Get active session
        session_resp = await client.get(f"/api/session/{session_id}")
        assert session_resp.status_code == 200
        session_data = session_resp.json()
        assert session_data["sessionId"] == session_id
        assert session_data["studentName"] == "Alex Tester"
        assert session_data["submitted"] is False
        assert session_data["remainingMs"] > 0

        # 3. Save an answer
        save_resp = await client.post(
            "/api/save-answer",
            json={"sessionId": session_id, "questionId": 1, "answer": "b", "flagged": True},
        )
        assert save_resp.status_code == 200
        assert save_resp.json()["ok"] is True

        # 4. Sync multiple answers
        sync_resp = await client.post(
            "/api/sync-answers",
            json={
                "sessionId": session_id,
                "answers": {"1": "b", "2": "print('Hello, World!')", "3": "a"},
                "flags": {"1": True, "2": False},
            },
        )
        assert sync_resp.status_code == 200
        assert sync_resp.json()["ok"] is True

        # 5. Check session state has synced answers
        check_resp = await client.get(f"/api/session/{session_id}")
        check_session = check_resp.json()
        assert check_session["answers"]["1"] == "b"
        assert check_session["answers"]["2"] == "print('Hello, World!')"

        # 6. Submit test
        submit_resp = await client.post("/api/submit-test", json={"sessionId": session_id})
        assert submit_resp.status_code == 200
        submit_data = submit_resp.json()
        assert submit_data["ok"] is True
        assert "result" in submit_data
        assert submit_data["result"]["studentName"] == "Alex Tester"

        # 7. Fetch student result scorecard
        result_resp = await client.get(f"/api/result/{session_id}")
        assert result_resp.status_code == 200
        result_data = result_resp.json()
        assert result_data["session_id"] == session_id
        assert "score" in result_data
        assert "topicBreakdown" in result_data


@pytest.mark.anyio
async def test_admin_endpoints_and_authentication():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        admin_pass = get_admin_password()

        # 1. Attempt unauthenticated access -> 401 Unauthorized
        unauth_resp = await client.get("/api/admin/results")
        assert unauth_resp.status_code == 401

        # 2. Login endpoint test with invalid password
        bad_login = await client.post("/api/admin/login", json={"password": "wrongpassword"})
        assert bad_login.status_code == 401

        # 3. Login endpoint test with correct password
        good_login = await client.post("/api/admin/login", json={"password": admin_pass})
        assert good_login.status_code == 200
        assert good_login.json()["ok"] is True
        token = good_login.json()["token"]

        headers = {"x-admin-password": token}

        # 4. Get all results with header
        res_list = await client.get("/api/admin/results", headers=headers)
        assert res_list.status_code == 200
        assert "results" in res_list.json()

        # 5. Get analytics with header
        analytics = await client.get("/api/admin/analytics", headers=headers)
        assert analytics.status_code == 200
        data = analytics.json()
        assert "totalCandidates" in data
        assert "averageScore" in data
        assert "passRate" in data

        # 6. Export CSV with query parameter
        csv_resp = await client.get(f"/api/admin/export?format=csv&password={admin_pass}")
        assert csv_resp.status_code == 200
        assert "text/csv" in csv_resp.headers["content-type"]

        # 7. Export JSON with header
        json_resp = await client.get("/api/admin/export?format=json", headers=headers)
        assert json_resp.status_code == 200
        assert "application/json" in json_resp.headers["content-type"]
