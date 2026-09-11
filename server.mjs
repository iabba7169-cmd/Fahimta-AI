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
app.use(express.json({ limit: "12mb" }));

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

  const images = Array.isArray(request.body?.images)
    ? request.body.images
        .filter(
          (item) => typeof item === "string" && item.length > 0
        )
        .slice(0, 10)
    : [];

  if (!message && images.length === 0) {
    return response.status(400).json({
      error: "A message or image is required."
    });
  }

  if (message.length > 8000) {
    return response.status(400).json({
      error: "The message is too long."
    });
  }

  try {
    const content = [];

    if (message) {
      content.push({
        type: "input_text",
        text: message
      });
    } else {
      content.push({
        type: "input_text",
        text: "Please analyze the uploaded image(s) and answer helpfully."
      });
    }

    for (const base64Image of images) {
      content.push({
        type: "input_image",
        image_url: `data:image/jpeg;base64,${base64Image}`
      });
    }

    const result = await client.responses.create({
      model,
      store: false,

      instructions:
        "You are Fahimta AI, a helpful, friendly learning assistant. " +
        "Answer clearly and accurately. " +
        "If the user writes Hausa, answer in Hausa. " +
        "If the user writes English, answer in English. " +
        "For another language, answer in that language when possible. " +
        "When images are provided, use them as visual context and explain what you can see carefully.",

      input: [
        {
          role: "user",
          content
        }
      ]
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
      reply
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
// =========================
// IMAGE GENERATION
// =========================
app.post("/api/image", async (request, response) => {
  try {
    const { prompt } = request.body;

    if (!prompt || typeof prompt !== "string") {
      return response.status(400).json({
        error: "Prompt is required."
      });
    }

    const result = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      prompt: prompt,
      size: "1024x1024"
    });

    return response.json({
      image: result.data?.[0]?.b64_json || null
    });
  } catch (error) {
    console.error("Image generation error:", error);

    return response.status(500).json({
      error: error?.message || "Image generation failed."
    });
  }
});
app.post("/api/video", async (request, response) => {
  try {
    const { prompt } = request.body;

    if (!prompt || typeof prompt !== "string") {
      return response.status(400).json({
        error: "Prompt is required."
      });
    }

    return response.status(501).json({
      error: "Video generation provider is not configured yet.",
      prompt
    });

  } catch (error) {
    console.error("Video generation error:", error);

    return response.status(500).json({
      error: error?.message || "Video generation failed."
    });
  }
});

app.use((_request, response) => {
  response.status(404).json({
    error: "Not found."
  });
});

app.listen(port, host, () => {
  console.log(
    `Fahimta AI backend listening on ${host}:${port}`
  );

  console.log(`OpenAI model: ${model}`);
});
