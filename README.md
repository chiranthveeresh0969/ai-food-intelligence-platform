Markdown# AI Food Intelligence Platform

A modular, full-stack AI nutrition analysis platform that identifies food items from meal photographs, guides human-in-the-loop verification and portion input, computes deterministic calories and macronutrients from verified food composition data, and persists meal history.

> **Engineering Principle:** Food classification is **not** nutritional estimation. A vision model identifying dishes in an RGB image cannot measure exact weight, cooking oil, or hidden ingredients. This platform strictly decouples **visual recognition** from **deterministic nutrition math**.

---

## End-to-End Pipeline

```text
Image Upload ─► Pillow Validation & Resize ─► FoodRecognizer (Gemini + Fallback)
     ─► User Verification & Portion Input (g / katori / piece / bowl)
     ─► Deterministic Nutrition Engine (USDA + ICMR-NIN IFCT)
     ─► Macro Dashboard & Persistent SQLite Meal Log (SQLModel ORM)
Implemented (MVP v0.1) vs. Planned RoadmapCapabilityStatusDetailsImage validation & normalizationImplementedStreamed 10 MB cap, MIME/binary verification, EXIF rotation fix, RGB JPEG downscaling (<= 1024px).Multi-food vision recognitionImplementedSwappable FoodRecognizer interface backed by Google Gemini (gemini-4-hydrogen with automatic 429/503 fallback to gemini-3.5-flash-lite and offline MockFoodRecognizer).Human-in-the-loop verificationImplementedConfidence indicators, editable food names backed by live DB autocomplete, manual add/remove, and explicit distinction between visual estimates and user-confirmed portions.Deterministic nutrition engineImplementedCurated 45-food Indian & international dataset (USDA FoodData Central + ICMR-NIN IFCT 2017 references), alias resolution (roti/phulka -> Chapati), household units, and zero-fabrication handling for unmatched items.Interactive results dashboardImplementedEditorial dark React + TypeScript + Tailwind CSS UI with total energy, protein/carb/fat/fiber cards, Atwater macro-split donut chart (Recharts), and per-item data provenance.Persistent meal historyImplementedSQLModel relational ORM (meal_logs + meal_log_items) on SQLite with server-side nutrition recalculation, daily totals, and delete support.Automated backend test suiteImplemented10 pytest unit and HTTP integration tests using dependency overrides and isolated in-memory SQLite.Custom CNN / ViT / YOLO modelsPlannedFine-tuned food classification & multi-food detection in research/ (research/food-classification, feature/food-detection).Segmentation & portion estimationPlannedInstance segmentation, plate reference scaling, and monocular depth regression (feature/portion-estimation).PostgreSQL + Alembic + AuthPlannedMulti-user profiles, dietary goals, and PostgreSQL migration (feature/user-authentication).Grounded AI Nutrition AssistantPlannedTool-calling / RAG assistant consuming structured DB records rather than hallucinating numbers (feature/nutrition-assistant).Tech StackBackend: Python 3.12 (uv), FastAPI, Pydantic v2, pydantic-settings, Pillow, SQLModel (SQLAlchemy), google-genai, pytest, httpxFrontend: React, TypeScript, Vite, Tailwind CSS v4, Lucide React, RechartsDatabase: SQLite (MVP via SQLModel ORM — designed for direct PostgreSQL migration)Repository StructurePlaintextAI-Food-Intelligence/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Versioned FastAPI routers (health, images, recognition, nutrition, meals)
│   │   ├── core/            # Typed pydantic-settings configuration
│   │   ├── db/              # SQLModel ORM tables and database session management
│   │   ├── ml/              # Pluggable FoodRecognizer interface, Gemini & Mock adapters, factory
│   │   ├── nutrition/       # NutritionProvider interface, USDA/IFCT seed data, deterministic calculator
│   │   ├── schemas/         # Pydantic request/response contracts
│   │   ├── services/        # Pure Pillow image validation and preprocessing
│   │   └── main.py          # FastAPI app entrypoint with lifespan & CORS
│   ├── scripts/             # Standalone verification utilities (verify_gemini.py)
│   └── tests/               # Unit and API integration tests (pytest)
├── frontend/
│   └── src/
│       ├── components/      # UploadPanel, VerificationPanel, NutritionDashboard, MealHistoryPanel
│       ├── services/        # Typed HTTP API client
│       └── types/           # TypeScript interfaces mirroring FastAPI schemas
├── docs/                    # System architecture and ML research roadmap
└── research/                # Isolated directory for future datasets, training & evaluation experiments
Local Setup & Running the ApplicationPrerequisitesPython 3.12+ and uvNode.js 18+ and npmA Google AI Studio API key (optional — the app runs offline in mock mode without one)1. Backend SetupBashcd backend
cp .env.example .env
# Open backend/.env and set GEMINI_API_KEY (or set FOOD_RECOGNIZER_PROVIDER=mock)
uv sync
uv run fastapi dev app/main.py
API base URL: http://127.0.0.1:8000/api/v1Interactive Swagger UI: http://127.0.0.1:8000/docs2. Frontend Setup (New Terminal)Bashcd frontend
cp .env.example .env
npm install
npm run dev
Web application: http://localhost:51733. Run Automated Tests & Production Build CheckBash# Backend tests (10 unit + integration tests, zero external API calls)
cd backend
uv run python -m pytest -v

# Frontend type-check and production bundle
cd frontend
npx tsc --noEmit
npm run build
Core API EndpointsMethodEndpointPurposeGET/api/v1/healthService status and active non-sensitive model/provider configurationPOST/api/v1/images/validateValidates MIME/binary integrity and returns resized JPEG metadataPOST/api/v1/recognition/analyzePreprocesses uploaded image and returns structured multi-food predictionsGET/api/v1/nutrition/foods?q=Searches curated USDA/IFCT food catalog by name, alias, or cuisinePOST/api/v1/nutrition/calculateDeterministically computes item & meal calories, macros, and Atwater splitPOST/api/v1/mealsServer-side recalculation and persistence of a verified meal logGET/api/v1/mealsLists recent saved meals and today's aggregated calorie/macro summaryDELETE/api/v1/meals/{meal_id}Deletes a saved meal log and cascades to its child itemsKnown Limitations (Honest Scope)RGB images cannot measure exact weight: Visual gram estimates returned by the vision model are starting points only; exact accuracy requires weighing or user confirmation.Curated MVP nutrition catalog (45 foods): Foods outside the seed catalog are transparently flagged as UNMATCHED (0 kcal) rather than fabricating nutrition values. Expanding the catalog via full IFCT/USDA ingestion is planned.Recipe & oil variance: Restaurant and home-cooked Indian dishes vary significantly in ghee, oil, and cream content compared to standard per-100g reference compositions.No custom trained vision model yet: MVP v0.1 uses Gemini multimodal inference behind a swappable FoodRecognizer interface. Custom CNN/ViT/YOLO training is tracked in docs/research_roadmap.md.Additional DocumentationSystem Architecture & Database SchemaMachine Learning Research Roadmap