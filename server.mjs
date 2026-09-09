import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();

const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-5.5";

if (!apiKey) {
  console.error("OPENAI_API_KEY is missing.");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

app.disable("x-powered-by");

app.use(express.json({ limit: "32kb" }));

app.get("/", (_request, response) => {
  response.json({
    message: "Fahimta AI backend is running.",
    status: "online",
    service: "Fahimta AI"
  });
});

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    status: "online",
    service: "Fahimta AI"
  });
});

app.post("/api/chat", async (request, response) => {
  const message =
    typeof request.body?.message === "string"
      ? request.body.message.trim()
      : "";

  if (!message) {
    return response.status(400).json({
      error: "A message is required."
    });
  }

  if (message.length > 8000) {
    return response.status(400).json({
      error: "The message is too long."
    });
  }

  try {
    const result = await client.responses.create({
      model,
      store: false,

      instructions:
        "You are Fahimta AI, a helpful and friendly learning assistant. " +
        "Answer clearly and accurately. " +
        "If the user writes Hausa, answer in Hausa. " +
        "If the user writes English, answer in English. " +
        "For another language, answer in that language when possible.",

      input: message
    });

    const reply = result.output_text?.trim();

    if (!reply) {
      console.error("OpenAI returned no output text.", {
        status: result.status,
        responseId: result.id
      });

      return response.status(502).json({
        error: "The AI returned an empty response."
      });
    }

    return response.status(200).json({
      reply: reply
    });

  } catch (error) {
    console.error("OpenAI request failed:", {
      name: error?.name,
      message: error?.message,
      status: error?.status,
      code: error?.code,
      requestId: error?.request_id
    });

    return response.status(502).json({
      error: "The AI service is temporarily unavailable."
    });
  }
});

app.use((_request, response) => {
  response.status(404).json({
    error: "Not found."
  });
});

app.listen(port, host, () => {
  console.log(`Fahimta AI backend listening on ${host}:${port}`);
  console.log(`OpenAI model: ${model}`);
});