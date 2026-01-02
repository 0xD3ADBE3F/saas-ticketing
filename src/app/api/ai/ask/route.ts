import { NextResponse } from "next/server";
import { ask, chatCompletion, type ChatMessage } from "@/server/services/openaiService";
import { getUser } from "@/server/lib/supabase";

// =============================================================================
// OpenAI API Route - Example
// =============================================================================
// Demonstrates how to use the OpenAI service (requires authentication)
// =============================================================================

/**
 * POST /api/ai/ask
 * Simple single-turn question answering
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Niet ingelogd" },
        { status: 401 }
      );
    }

    const { question, systemPrompt } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required and must be a string" },
        { status: 400 }
      );
    }

    // Simple ask
    const answer = await ask(question, systemPrompt);

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("AI ask error:", error);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai/ask
 * Multi-turn conversation with chat completion
 */
export async function PUT(request: Request) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Niet ingelogd" },
        { status: 401 }
      );
    }

    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Multi-turn chat
    const result = await chatCompletion({
      messages: messages as ChatMessage[],
      temperature: 0.7,
    });

    return NextResponse.json({
      message: result.message,
      usage: result.usage,
    });
  } catch (error) {
    console.error("AI chat completion error:", error);
    return NextResponse.json(
      { error: "Failed to process chat completion" },
      { status: 500 }
    );
  }
}
