import sys

from app.core.config import get_settings
from google import genai
from google.genai import errors, types


def test_model(client: genai.Client, model_name: str) -> str:
    """Send a minimal prompt to verify connectivity with a specific Gemini model."""
    response = client.models.generate_content(
        model=model_name,
        contents="Reply with exactly three words: Gemini connection active.",
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level="LOW"),
        ),
    )
    return (response.text or "").strip()


def main() -> int:
    settings = get_settings()

    if settings.gemini_api_key is None:
        print("ERROR: GEMINI_API_KEY is not set in backend/.env")
        return 1

    raw_key = settings.gemini_api_key.get_secret_value().strip()
    if not raw_key or raw_key == "your_gemini_api_key_here":
        print("ERROR: Replace the placeholder GEMINI_API_KEY in backend/.env with your real key.")
        return 1

    print(
        f"Loaded config  | env={settings.app_env} "
        f"| primary={settings.gemini_model} "
        f"| fallback={settings.gemini_fallback_model}"
    )
    print(f"Masked key     | {settings.gemini_api_key}")

    client = genai.Client(api_key=raw_key)
    models_to_try = [settings.gemini_model, settings.gemini_fallback_model]

    for model_name in models_to_try:
        try:
            print(f"Testing model  | {model_name} ...")
            reply = test_model(client, model_name)
            print(f"Response       | {reply}")
            print(f"SUCCESS: Verified Gemini API key using '{model_name}'.")
            return 0
        except errors.APIError as exc:
            if exc.code in (429, 503):
                print(f"WARN: '{model_name}' unavailable (HTTP {exc.code}). Trying fallback...")
                continue
            print(f"ERROR: Non-retryable Gemini API error (HTTP {exc.code}): {exc.message}")
            return 1

    print("ERROR: Both primary and fallback Gemini models are temporarily unavailable.")
    return 1


if __name__ == "__main__":
    sys.exit(main())