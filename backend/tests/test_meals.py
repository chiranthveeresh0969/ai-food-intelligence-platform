from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.db.session import get_session
from app.main import app


def _make_isolated_client() -> tuple[TestClient, object]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def override_session() -> Generator[Session, None, None]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    return TestClient(app), engine


def test_create_list_and_delete_meal_log() -> None:
    client, _ = _make_isolated_client()
    try:
        create_res = client.post(
            "/api/v1/meals",
            json={
                "meal_name": "South Indian Breakfast",
                "meal_type": "breakfast",
                "provider_used": "gemini",
                "model_used": "gemini-3.5-flash-lite",
                "items": [
                    {"food_name": "Idli", "quantity": 3, "unit": "piece", "quantity_source": "user_confirmed"},
                    {"food_name": "Sambar", "quantity": 1, "unit": "katori", "quantity_source": "user_confirmed"},
                ],
            },
        )
        assert create_res.status_code == 201
        created = create_res.json()
        assert created["meal_name"] == "South Indian Breakfast"
        assert created["total_calories_kcal"] == 272.7
        assert len(created["items"]) == 2

        list_res = client.get("/api/v1/meals")
        assert list_res.status_code == 200
        history = list_res.json()
        assert history["total_meals"] == 1
        assert history["daily_summary"]["meals_logged_today"] == 1
        assert history["daily_summary"]["calories_kcal"] == 272.7

        delete_res = client.delete(f"/api/v1/meals/{created['id']}")
        assert delete_res.status_code == 204

        after_delete = client.get("/api/v1/meals").json()
        assert after_delete["total_meals"] == 0
    finally:
        app.dependency_overrides.clear()


def test_create_meal_rejects_all_unmatched_items() -> None:
    client, _ = _make_isolated_client()
    try:
        response = client.post(
            "/api/v1/meals",
            json={
                "meal_name": "Unknown Plate",
                "meal_type": "snack",
                "items": [
                    {"food_name": "Nonexistent Dish XYZ", "quantity": 1, "unit": "serving", "quantity_source": "user_confirmed"},
                ],
            },
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()