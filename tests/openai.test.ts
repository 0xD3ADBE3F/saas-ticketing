import { describe, it, expect, beforeAll } from "vitest";
import { ask, chatCompletion } from "@/server/services/openaiService";

describe("OpenAI Service", () => {
  beforeAll(() => {
    // Skip tests if no API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn("Skipping OpenAI tests - no API key configured");
    }
  });

  it("should answer a simple question", async () => {
    // Skip if no API key
    if (!process.env.OPENAI_API_KEY) {
      return;
    }

    const answer = await ask("What is 2 + 2?");
    expect(answer).toBeTruthy();
    expect(answer.length).toBeGreaterThan(0);
  });

  it("should handle chat completion with context", async () => {
    // Skip if no API key
    if (!process.env.OPENAI_API_KEY) {
      return;
    }

    const result = await chatCompletion({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that answers in one sentence.",
        },
        {
          role: "user",
          content: "What is TypeScript?",
        },
      ],
      temperature: 0.5,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBeTruthy();
    expect(result.usage).toBeDefined();
    expect(result.usage?.totalTokens).toBeGreaterThan(0);
  });

  it("should use custom system prompt", async () => {
    // Skip if no API key
    if (!process.env.OPENAI_API_KEY) {
      return;
    }

    const answer = await ask(
      "Tell me about Next.js",
      "You are an expert in web development. Keep answers brief."
    );

    expect(answer).toBeTruthy();
    expect(answer.length).toBeGreaterThan(0);
  });
});
