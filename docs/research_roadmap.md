# Machine Learning Research Roadmap

> **Transparency Statement:** MVP v0.1 uses pretrained multimodal inference (Google Gemini) behind a swappable `FoodRecognizer` interface. **No custom deep learning models have been trained yet.** Every experiment documented below represents planned research to be executed on dedicated `research/*` Git branches under `research/`.

---

## 1. Research Tracks & Planned Git Branches

| Track | Branch | Problem Statement | Candidate Architectures |
| :--- | :--- | :--- | :--- |
| **Track 1: Single-Dish Classification** | `research/food-classification` | Establish reproducible vision baselines on standardized food benchmarks and Indian dishes. | ResNet-50, EfficientNet-B0/B3, MobileNetV3, ViT-B/16 (transfer learning & fine-tuning) |
| **Track 2: Indian Cuisine Domain Adaptation** | `research/indian-food-dataset` | Close the accuracy gap on visually similar Indian dishes (e.g., gravies, dals, flatbreads). | Fine-tuned EfficientNet / ConvNeXt with class-balanced sampling & color/lighting augmentations |
| **Track 3: Multi-Food Detection & Segmentation** | `feature/food-detection`, `feature/food-segmentation` | Localize multiple overlapping items on a single thali or plate and isolate per-item pixel masks. | YOLOv8 / YOLOv11 (detection), Mask R-CNN / YOLOv8-Seg / SAM2-assisted masks |
| **Track 4: Image-Based Portion & Volume Estimation** | `feature/portion-estimation` | Estimate approximate food volume/mass from RGB + geometric references (plate diameter) or depth cues. | Monocular depth estimation (Depth Anything / MiDaS) + pixel-area & regression heads |
| **Track 5: Inference Optimization** | `research/model-compression` | Reduce inference latency and memory footprint for low-cost server or edge deployment. | ONNX Runtime export, FP16/INT8 post-training quantization, MobileNet/YOLO-nano distillation |

---

## 2. Candidate Datasets, Limitations & Licensing Checks

Every dataset must undergo a license and label-quality review before downloading or training:

| Dataset | Task Fit | Labels & Scope | Key Limitations | Licensing Note |
| :--- | :--- | :--- | :--- | :--- |
| **Food-101** | Classification | 101,000 images across 101 categories (mostly Western/global dishes). | Training split intentionally contains noisy labels and mixed lighting; very limited Indian dish coverage; single-label only. | Verify ETH Zurich academic/research terms before commercial reuse. |
| **UECFOOD-100 / UECFOOD-256** | Multi-food detection | Bounding boxes for Japanese/Asian dishes; supports multi-item plates. | Heavy regional skew toward Japanese cuisine; bounding boxes do not provide gram weights. | Non-commercial academic research license (check UEC Tokyo terms). |
| **Nutrition5k** | Portion & nutrition regression | Overhead RGB + depth images paired with measured dish weights and macro ground truth. | Cafeteria-style American dishes; requires depth/overhead camera assumptions that rarely hold for casual smartphone photos. | Apache-2.0 / research release by Google Research — verify dataset terms upon access. |
| **Indian Food Datasets (e.g., Indian Food Images / Kaggle curated splits)** | Indian cuisine classification | Common Indian dishes (dosa, idli, biryani, paneer curries, samosa, chapati). | Small per-class counts, web-scraped label noise, heavy visual overlap between curries/gravies. | Check individual dataset license (CC-BY, CC0, or academic-only) and manually audit validation splits before reporting metrics. |

---

## 3. Quantitative Evaluation Standards

No model replaces or augments production inference until quantitatively benchmarked against a documented baseline:

* **Image Classification:** Top-1 & Top-5 Accuracy, Macro/Weighted Precision, Recall, F1-score, Per-Class Confusion Matrix (specifically inspecting visually confusable Indian curries/breads), and Expected Calibration Error (ECE) for confidence scores.
* **Object Detection & Segmentation:** $\text{mAP}@0.5$, $\text{mAP}@0.5:0.95$, Precision/Recall curves, Mask IoU (segmentation), and p50/p95 inference latency (ms/image on CPU and GPU).
* **Portion / Nutrition Regression:** Mean Absolute Error ($\text{MAE}$ in grams / kcal), Root Mean Squared Error ($\text{RMSE}$), and Mean Absolute Percentage Error ($\text{MAPE}$ / relative error), always reported alongside baseline mean-portion predictors.

---

## 4. Mandatory Experiment Report Template

Every meaningful experiment committed under `research/experiments/<experiment-name>/report.md` must record:

1. **Research Objective** — Hypothesis being tested.
2. **Dataset Description** — Source, version, license, class distribution, and train/val/test split strategy (no data leakage).
3. **Preprocessing & Augmentation** — Resolution, normalization, and augmentation pipeline.
4. **Model Architecture** — Backbone, head modifications, parameter count.
5. **Training Configuration** — Optimizer, learning rate schedule, batch size, epochs, hardware, random seed.
6. **Evaluation Metrics** — Quantitative test-set metrics and confusion analysis.
7. **Results & Error Analysis** — Representative failure cases (e.g., misclassified dishes).
8. **Limitations & Conclusions** — Whether the model is ready for production adapter integration under `backend/app/ml/`.