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

app.use(express.json({ limit: "12mb" }));

app.get("/", (_request, response) => {
  response.status(200).send("Fahimta AI backend is running.");
});

app.get("/health", (_request, response) => {
  response.status(200).json({ ok: true, service: "Fahimta-AI", model });
});

function shouldUseWebSearch(message) {
  const text = String(message || "").toLowerCase();
  const signals = [
    "bincika", "binciki", "bincike", "nemo min", "duba min",
    "tabbatar", "gaskiya ne", "latest", "current", "today",
    "yanzu", "a yanzu", "a yau", "sabbin labarai", "labarai na yau",
    "search", "find", "verify", "check online", "farashin yanzu",
    "halin yanzu"
  ];
  return signals.some((signal) => text.includes(signal));
}

function extractCitations(result) {
  const citations = [];
  for (const outputItem of result.output || []) {
    for (const contentItem of outputItem.content || []) {
      for (const annotation of contentItem.annotations || []) {
        if (annotation.type === "url_citation" && annotation.url) {
          citations.push({
            title: annotation.title || annotation.url,
            url: annotation.url
          });
        }
      }
    }
  }
  const unique = [];
  const seen = new Set();
  for (const citation of citations) {
    if (!seen.has(citation.url)) {
      seen.add(citation.url);
      unique.push(citation);
    }
  }
  return unique.slice(0, 20);
}

app.post("/api/chat", async (request, response) => {
  try {
    const { message, images } = request.body;

    if (!message || typeof message !== "string") {
      return response.status(400).json({ error: "Message is required." });
    }

    const useWebSearch = shouldUseWebSearch(message);

    const content = [{ type: "input_text", text: message }];

    if (Array.isArray(images)) {
      for (const imageBase64 of images.slice(0, 10)) {
        if (typeof imageBase64 !== "string" || !imageBase64) continue;
        content.push({
          type: "input_image",
          image_url: `data:image/jpeg;base64,${imageBase64}`
        });
      }
    }

    const result = await client.responses.create({
      model,
      store: false,
      tools: [{ type: "web_search" }],
      tool_choice: useWebSearch ? "required" : "auto",
      instructions:
        "You are Fahimta AI, a helpful, friendly educational assistant. " +
        "Answer in the same language as the user. If the user writes Hausa, answer in Hausa. " +
        "Be clear, accurate, and practical. " +
        "When the user asks you to search, verify information, find current information, " +
        "or asks about recent events, use web search before answering. " +
        "When web search is used, base current factual claims on retrieved sources. " +
        "Do not pretend that you searched if you did not. " +
        "If information is uncertain or unavailable, say so clearly.",
      input: [{ role: "user", content }]
    });

    return response.status(200).json({
      reply: result.output_text || "Ban samu amsa daga AI ba.",
      citations: extractCitations(result)
    });
  } catch (error) {
    console.error("CHAT ERROR:", error);
    return response.status(500).json({
      error: "Chat request failed.",
      details: error?.message || String(error)
    });
  }
});

app.post("/api/image", async (request, response) => {
  try {
    const { prompt } = request.body;
    if (!prompt || typeof prompt !== "string") {
      return response.status(400).json({ error: "Prompt is required." });
    }

    const result = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      prompt,
      size: "1024x1024"
    });

    const image = result.data?.[0]?.b64_json;
    if (!image) {
      return response.status(502).json({ error: "Image generation returned no image." });
    }

    return response.status(200).json({ image });
  } catch (error) {
    console.error("IMAGE ERROR:", error);
    return response.status(500).json({
      error: "Image generation failed.",
      details: error?.message || String(error)
    });
  }
});

app.post("/api/video", async (request, response) => {
  try {
    const { prompt } = request.body;
    if (!prompt || typeof prompt !== "string") {
      return response.status(400).json({ error: "Prompt is required." });
    }

    return response.status(501).json({
      error: "Video generation provider is not configured yet."
    });
  } catch (error) {
    console.error("VIDEO ERROR:", error);
    return response.status(500).json({
      error: "Video generation failed.",
      details: error?.message || String(error)
    });
  }
});

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found." });
});

app.listen(port, host, () => {
  console.log(`Fahimta AI backend listening on ${host}:${port}`);
});
