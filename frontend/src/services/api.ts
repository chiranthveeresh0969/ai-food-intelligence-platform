import type {
  FoodSearchResponse,
  HealthResponse,
  MealCalculationRequest,
  MealCalculationResponse,
  MealHistoryResponse,
  MealLogCreateRequest,
  MealLogRead,
  RecognitionResult,
} from "../types/api";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  let message = `Request failed with status ${response.status}`;
  try {
    const errorBody = await response.json();
    if (typeof errorBody?.detail === "string") {
      message = errorBody.detail;
    } else if (Array.isArray(errorBody?.detail) && errorBody.detail[0]?.msg) {
      message = errorBody.detail[0].msg;
    }
  } catch {
    // Keep fallback message when body is not JSON
  }
  return message;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return (await response.json()) as T;
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return handleResponse<HealthResponse>(response);
}

export async function analyzeFoodImage(file: File): Promise<RecognitionResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/recognition/analyze`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<RecognitionResult>(response);
}

export async function searchFoods(
  query: string,
  limit = 20,
): Promise<FoodSearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/nutrition/foods?${params.toString()}`);
  return handleResponse<FoodSearchResponse>(response);
}

export async function calculateMealNutrition(
  payload: MealCalculationRequest,
): Promise<MealCalculationResponse> {
  const response = await fetch(`${API_BASE_URL}/nutrition/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<MealCalculationResponse>(response);
}

export async function createMealLog(
  payload: MealLogCreateRequest,
): Promise<MealLogRead> {
  const response = await fetch(`${API_BASE_URL}/meals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<MealLogRead>(response);
}

export async function listMealLogs(limit = 20): Promise<MealHistoryResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/meals?${params.toString()}`);
  return handleResponse<MealHistoryResponse>(response);
}

export async function deleteMealLog(mealId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/meals/${mealId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
}