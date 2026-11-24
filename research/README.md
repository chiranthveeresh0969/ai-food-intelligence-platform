# ML Research Laboratory (`research/`)

This workspace is strictly isolated from the production FastAPI backend (`backend/`) and React frontend (`frontend/`).

## Rules for This Directory
1. **Separate dependencies:** Heavy training libraries (`torch`, `torchvision`, `ultralytics`, `jupyter`) live in a dedicated research environment—never inside `backend/pyproject.toml` unless required for production inference.
2. **Never commit raw datasets or model weights:** `research/datasets/`, `research/checkpoints/`, and weight files (`*.pt`, `*.pth`, `*.onnx`, `*.h5`) are ignored in `.gitignore`.
3. **Reproducible experiments:** Each research track lives on its own `research/*` branch and documents metrics, datasets, and limitations following `docs/research_roadmap.md`.
4. **Promotion to production:** Only quantitatively validated models are promoted by implementing a new `FoodRecognizer` adapter inside `backend/app/ml/`.