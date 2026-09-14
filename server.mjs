import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
const port = Number(process.env.PORT || 3000);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-5-mini";
const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const MAX_PROMPT_LENGTH = 4_000;
const MAX_HISTORY_MESSAGES = 12;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = Number(process.env.MAX_REQUESTS_PER_MINUTE || 20);
const visits = new Map();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use((request, response, next) => {
  const origin = request.get("origin");
  if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    return response.status(403).json({ error: "This origin is not allowed." });
  }
  if (origin) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (request.method === "OPTIONS") return response.sendStatus(204);
  return next();
});

app.use((request, response, next) => {
  const ip = request.ip || "unknown";
  const now = Date.now();
  const current = visits.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now >= current.resetAt) {
    current.count = 0;
    current.resetAt = now + WINDOW_MS;
  }
  current.count += 1;
  visits.set(ip, current);
  if (current.count > MAX_REQUESTS_PER_WINDOW) {
    return response.status(429).json({ error: "Too many requests. Please try again shortly." });
  }
  return next();
});

function requiredText(value, field = "prompt") {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${field} is required.`);
    error.status = 400;
    throw error;
  }
  const text = value.trim();
  if (text.length > MAX_PROMPT_LENGTH) {
    const error = new Error(`${field} is too long.`);
    error.status = 400;
    throw error;
  }
  return text;
}

function cleanHistory(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .slice(-MAX_HISTORY_MESSAGES)
    .filter((item) => item && ["user", "assistant"].includes(item.role))
    .map((item) => ({ role: item.role, content: requiredText(item.content, "message") }));
}

function openAIError(error, response, fallback) {
  console.error(error);
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const safeMessage = status >= 500 ? fallback : (error?.message || fallback);
  return response.status(status).json({ error: safeMessage });
}

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "Fahimta AI",
    chat: "ready",
    image: "ready",
    video: "not_configured"
  });
});

app.post("/api/chat", async (request, response) => {
  try {
    const message = requiredText(request.body?.message ?? request.body?.prompt, "message");
    const history = cleanHistory(request.body?.messages);
    const result = await openai.responses.create({
      model: chatModel,
      instructions: "You are Fahimta AI. Reply helpfully and clearly. Prefer Hausa when the user writes Hausa.",
      input: [...history, { role: "user", content: message }],
      max_output_tokens: 700
    });
    const reply = result.output_text || "Ban samu amsa ba. Ka sake gwadawa.";
    // Aliases avoid breaking older Android builds while they migrate to `reply`.
    return response.json({ reply, answer: reply, response: reply });
  } catch (error) {
    return openAIError(error, response, "Chat request failed.");
  }
});

app.post("/api/image", async (request, response) => {
  try {
    const prompt = requiredText(request.body?.prompt);
    const allowedSizes = new Set(["1024x1024", "1024x1536", "1536x1024"]);
    const size = allowedSizes.has(request.body?.size) ? request.body.size : "1024x1024";
    const result = await openai.images.generate({
      model: imageModel,
      prompt,
      size
    });
    const imageBase64 = result.data?.[0]?.b64_json;
    if (!imageBase64) throw new Error("Image service returned no image data.");
    // Keep both names so existing Android code that expects `image` still works.
    return response.json({ image: imageBase64, imageBase64, mimeType: "image/png" });
  } catch (error) {
    return openAIError(error, response, "Image generation failed.");
  }
});

app.post("/api/video", (_request, response) => {
  return response.status(501).json({
    error: "Video generation is not configured yet.",
    code: "VIDEO_PROVIDER_NOT_CONFIGURED"
  });
});

app.get("/api/video/status", (_request, response) => {
  return response.status(501).json({
    status: "not_configured",
    code: "VIDEO_PROVIDER_NOT_CONFIGURED"
  });
});

app.use((_request, response) => response.status(404).json({ error: "Not found." }));

app.listen(port, "0.0.0.0", () => {
  console.log(`Fahimta AI backend is listening on port ${port}`);
});
