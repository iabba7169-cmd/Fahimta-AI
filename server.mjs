import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set. Add it to the server environment before starting.");
}

const app = express();
const client = new OpenAI({ apiKey });
const port = Number(process.env.PORT ?? 3000);
const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

app.use(express.json({ limit: "32kb" }));

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/chat", async (request, response) => {
  const message = typeof request.body?.message === "string" ? request.body.message.trim() : "";
  if (!message) {
    return response.status(400).json({ error: "A message is required." });
  }
  if (message.length > 8000) {
    return response.status(400).json({ error: "The message is too long." });
  }

  try {
    const completion = await client.responses.create({
      model,
      store: false,
      instructions:
        "You are Fahimta AI, a helpful learning assistant. Answer clearly and kindly. " +
        "Use Hausa when the user writes Hausa; otherwise use the user's language.",
      input: message
    });

    const reply = completion.output_text?.trim();
    if (!reply) {
      throw new Error("The model returned no text.");
    }
    return response.json({ reply });
  } catch (error) {
    console.error("OpenAI request failed:", error);
    return response.status(502).json({ error: "The AI service is temporarily unavailable." });
  }
});

app.get("/", (_request, response) => {
  response.json({
    message: "Fahimta AI is running!",
    status: "online"
  });
});

app.use((_request, response) => {
  response.status(404).json({ error: "Not found." });
});

app.listen(port, () => {
  console.log(`Fahimta AI backend is listening on port ${port}.`);
});
