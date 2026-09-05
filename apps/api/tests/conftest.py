import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


TEST_DB = Path(__file__).with_name("riskhub-test.db")
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["RISKHUB_DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["RISKHUB_JWT_SECRET"] = "test-secret-key"
os.environ["RISKHUB_ENVIRONMENT"] = "test"
os.environ["RISKHUB_STORAGE_DIR"] = str(Path(__file__).with_name("storage-test"))

from riskhub.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client
    if TEST_DB.exists():
        TEST_DB.unlink()


def login_headers(client: TestClient, username: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"username": username, "password": "RiskHub123!"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin_headers(client):
    return login_headers(client, "admin")


@pytest.fixture(scope="session")
def remediator_headers(client):
    return login_headers(client, "remediator")


@pytest.fixture(scope="session")
def verifier_headers(client):
    return login_headers(client, "verifier")

