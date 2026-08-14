import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiApiKey(): string | null {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");
  if (!apiKey || apiKey.includes("BURAYA_GEMINI") || apiKey === "your_api_key_here") {
    return null;
  }
  return apiKey;
}

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash"
].filter(Boolean) as string[];

/**
 * Executes a prompt expecting JSON response from Google Gemini API with automatic model fallback.
 */
export async function generateGeminiJson<T = any>(prompt: string): Promise<T | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.warn("[Gemini API] Geçerli bir Gemini API anahtarı bulunamadı (.env GEMINI_API_KEY).");
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text) continue;

      const parsed = JSON.parse(text);
      return parsed as T;
    } catch (err: any) {
      lastError = err;
      // If 404 model not found, try the next model candidate
      if (err?.message?.includes("404") || err?.message?.includes("not found") || err?.message?.includes("no longer available")) {
        continue;
      }
      // If it's another error (like quota or parsing), still try next or throw
      console.warn(`[Gemini API] '${modelName}' ile istek başarısız:`, err.message);
    }
  }

  if (lastError) {
    console.error("[Gemini API] Tüm model denemeleri başarısız oldu. Son hata:", lastError.message);
  }

  return null;
}

/**
 * Executes a prompt expecting plain text response from Google Gemini API.
 */
export async function generateGeminiText(prompt: string): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.warn("[Gemini API] Geçerli bir Gemini API anahtarı bulunamadı (.env GEMINI_API_KEY).");
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text) return text;
    } catch (err: any) {
      lastError = err;
      if (err?.message?.includes("404") || err?.message?.includes("not found") || err?.message?.includes("no longer available")) {
        continue;
      }
      console.warn(`[Gemini API] '${modelName}' ile istek başarısız:`, err.message);
    }
  }

  if (lastError) {
    console.error("[Gemini API] Tüm model denemeleri başarısız oldu. Son hata:", lastError.message);
  }

  return null;
}
