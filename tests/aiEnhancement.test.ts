import { describe, it, expect, beforeAll } from "vitest";

describe("AI Enhance Description API", () => {
  beforeAll(() => {
    // Skip tests if no API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn("Skipping AI enhancement tests - no API key configured");
    }
  });

  it("should enhance a basic event description", async () => {
    // Skip if no API key
    if (!process.env.OPENAI_API_KEY) {
      return;
    }

    const response = await fetch("http://localhost:3000/api/ai/enhance-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "We gaan een feestje geven met muziek en drank.",
        eventTitle: "Zomerfeest 2026",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.enhancedDescription).toBeTruthy();
    expect(data.enhancedDescription.length).toBeGreaterThan(0);
    expect(data.enhancedLength).toBeLessThanOrEqual(2000);
  });

  it("should reject descriptions that are too short", async () => {
    const response = await fetch("http://localhost:3000/api/ai/enhance-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Test",
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("at least 10 characters");
  });

  it("should require description field", async () => {
    const response = await fetch("http://localhost:3000/api/ai/enhance-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("required");
  });
});
