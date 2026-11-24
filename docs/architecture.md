# System Architecture

## 1. Architectural Goals

The AI Food Intelligence Platform is designed so that an MVP built under a tight deadline can evolve into a full ML research and nutrition product **without rewriting existing layers**:

1. **Strict Separation of Vision vs. Nutrition Math:** Vision models predict *food identities* and *rough visual serving hints*; deterministic Python code computes all calories and macros from provenance-tagged per-100g records.
2. **Replaceable Subsystems (Strategy Pattern):** Both the vision engine (`FoodRecognizer`) and nutrition database (`NutritionProvider`) sit behind abstract Python interfaces.
3. **Zero Silent Fabrication:** Unmatched dishes return `matched=False` with `0 kcal` and explicit warnings rather than invented numbers.
4. **Server-Side Authority:** Persisted meal logs (`POST /api/v1/meals`) recalculate nutrition on the server from raw food inputs rather than trusting client-computed calorie totals.

---

## 2. Layered Component Diagram

```text
┌──────────────────────────────────────────────────────────┐
│                React + TypeScript Frontend               │
│  UploadPanel │ VerificationPanel │ NutritionDashboard    │
│                     MealHistoryPanel                     │
└──────────────────────────┬───────────────────────────────┘
                           │ Typed REST (JSON / Multipart)
                           ▼
┌──────────────────────────────────────────────────────────┐
│            FastAPI HTTP Layer (app/api/v1/)              │
│   health │ images │ recognition │ nutrition │ meals      │
└───────┬──────────────────┬───────────────────────┬───────┘
        │                  │                       │
        ▼                  ▼                       ▼
┌───────────────┐  ┌──────────────────┐   ┌────────────────┐
│ Image Service │  │ FoodRecognizer   │   │ Nutrition      │
│ (Pillow RGB   │  │ Interface (ABC)  │   │ Calculator +   │
│ normalize &   │  ├──────────────────┤   │ Provider (ABC) │
│ size limits)  │  │ • Gemini Adapter │   ├────────────────┤
└───────────────┘  │ • Mock Fallback  │   │ • Local JSON   │
                   │ • [Future] Torch │   │ • [Future] PG  │
                   └──────────────────┘   └───────┬────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────┐
                                        │ SQLModel ORM     │
                                        │ meal_logs        │
                                        │ meal_log_items   │
                                        │ (SQLite -> PG)   │
                                        └──────────────────┘
3. Subsystem Contracts & ExtensibilityA. Vision Recognition (backend/app/ml/)Interface: FoodRecognizer.recognize(image: ProcessedImage) -> RecognitionResultCurrent Implementations:GeminiFoodRecognizer: Sends normalized JPEG bytes to gemini-4-hydrogen using structured Pydantic JSON output (response_schema), with automatic retry/fallback to gemini-3.5-flash-lite on transient 429/503 responses.ResilientFoodRecognizer: Wraps any primary recognizer so complete network/API outages degrade transparently to MockFoodRecognizer with explicit user warnings.Future Drop-In Path: Implementing PyTorchFoodRecognizer (EfficientNet/ViT) or YoloFoodDetector requires adding one class implementing FoodRecognizer and registering it in app/ml/factory.py—zero changes to API routes, nutrition logic, or React components.B. Image Preprocessing (backend/app/services/image_processing.py)Streams upload chunks up to a hard 10 MB cap before decoding.Rejects non-image MIME types (415) and corrupted binaries (400).Applies ImageOps.exif_transpose() to fix mobile camera rotation, converts to RGB, and scales the longest edge to <= 1024px JPEG (~85–90% payload reduction).C. Nutrition Engine (backend/app/nutrition/)Interface: NutritionProvider (get_by_id, match_food, search).Matching Hierarchy: exact_id -> exact_name -> alias -> controlled token/phrase fuzzy (>= 0.50 threshold) -> unmatched.Numerical Accuracy: Sums unrounded per-item values before rounding totals once at the end to prevent cumulative rounding drift. Macro calorie splits apply Atwater factors ($4\text{ kcal/g}$ protein, $4\text{ kcal/g}$ carbs, $9\text{ kcal/g}$ fat).4. Database Schema (SQLModel ORM)Current persistence uses SQLite (food_intelligence.db) via SQLModel (backend/app/db/models.py). Migrating to PostgreSQL requires updating DATABASE_URL and adding Alembic migrations without rewriting table models.meal_logsColumnTypeNotesidINTEGER (PK)Auto-increment primary keymeal_nameVARCHAR(120)User-provided or auto-suggested labelmeal_typeVARCHAR(20)breakfast, lunch, dinner, snacklogged_atDATETIME (UTC, indexed)Creation timestamptotal_calories_kcalFLOATServer-computed deterministic totaltotal_protein_g / total_carbs_g / total_fat_g / total_fiber_gFLOATAggregated meal macrostotal_gramsFLOATTotal resolved weight of matched itemscontains_visual_estimatesBOOLEANFlags whether any portion remained unconfirmedprovider_used / model_usedVARCHAR (nullable)Provenance of vision model usedmeal_log_itemsColumnTypeNotesidINTEGER (PK)Auto-increment primary keymeal_idINTEGER (FK -> meal_logs.id, indexed)One-to-many with cascade deletefood_id / food_nameVARCHARMatched canonical DB ID and namequantity / unit / resolved_gramsFLOAT / VARCHAROriginal household unit and resolved gram weightquantity_sourceVARCHAR(30)visual_estimate or user_confirmedcalories_kcal / protein_g / carbs_g / fat_g / fiber_gFLOATDeterministic item breakdowndata_sourceVARCHAR(120)Reference provenance (USDA FoodData Central, ICMR-NIN IFCT 2017)5. Security & Secret HygieneAPI keys are stored exclusively in backend/.env (ignored by Git) and typed with Pydantic SecretStr so credentials are masked (**********) in logs.Frontend environment variables (frontend/.env) contain only the public API base URL (VITE_API_BASE_URL).CORS is restricted to explicit local origins rather than wildcard "*".