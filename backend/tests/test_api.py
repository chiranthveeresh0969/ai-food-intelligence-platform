from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.api.v1.routes_recognition import get_recognizer
from app.main import app
from app.ml.mock_recognizer import MockFoodRecognizer

client = TestClient(app)


def _create_sample_png_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (120, 80), color=(240, 165, 30)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_health_endpoint() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "recognizer_provider" in body


def test_food_search_endpoint_finds_aliases() -> None:
    response = client.get("/api/v1/nutrition/foods", params={"q": "phulka"})
    assert response.status_code == 200
    body = response.json()
    assert body["total_matches"] >= 1
    assert body["foods"][0]["id"] == "chapati"


def test_calculate_nutrition_endpoint() -> None:
    payload = {
        "items": [
            {"food_name": "Idli", "quantity": 3, "unit": "piece", "quantity_source": "user_confirmed"},
            {"food_name": "Sambar", "quantity": 1, "unit": "katori", "quantity_source": "user_confirmed"},
        ]
    }
    response = client.post("/api/v1/nutrition/calculate", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["matched_count"] == 2
    assert body["totals"]["calories_kcal"] == 272.7
    assert body["totals"]["total_grams"] == 270.0


def test_recognition_endpoint_with_mock_dependency_override() -> None:
    app.dependency_overrides[get_recognizer] = lambda: MockFoodRecognizer(reason="Unit test mode")
    try:
        response = client.post(
            "/api/v1/recognition/analyze",
            files={"file": ("meal.png", _create_sample_png_bytes(), "image/png")},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["provider"] == "mock"
        assert body["fallback_used"] is True
        assert len(body["items"]) == 2
        assert body["image_metadata"]["mime_type"] == "image/jpeg"
    finally:
        app.dependency_overrides.clear()


def test_recognition_rejects_unsupported_file_type() -> None:
    response = client.post(
        "/api/v1/recognition/analyze",
        files={"file": ("notes.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 415