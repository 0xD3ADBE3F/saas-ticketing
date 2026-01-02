import OpenAI from "openai";

// =============================================================================
// OpenAI Service
// =============================================================================
// Handles AI-powered interactions using OpenAI's API
// =============================================================================

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionInput = {
  messages: ChatMessage[];
  model?: string; // Default: gpt-4-turbo-preview
  temperature?: number; // 0-2, default: 0.7
  maxTokens?: number;
  organizationId?: string; // For logging/tracking purposes
};

export type ChatCompletionResult = {
  success: boolean;
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

/**
 * Send a chat completion request to OpenAI
 *
 * @param input - Chat completion parameters
 * @returns AI-generated response
 */
export async function chatCompletion(
  input: ChatCompletionInput
): Promise<ChatCompletionResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: input.model || "gpt-4o-mini",
      messages: input.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens,
    });

    const message = completion.choices[0]?.message?.content || "";

    return {
      success: true,
      message,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  } catch (error) {
    console.error("OpenAI chat completion error:", error);
    throw new Error(
      `Failed to generate AI response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Simple ask function for single-turn questions
 *
 * @param question - The question to ask
 * @param systemPrompt - Optional system prompt to set context
 * @returns AI-generated answer
 */
export async function ask(
  question: string,
  systemPrompt?: string
): Promise<string> {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  messages.push({
    role: "user",
    content: question,
  });

  const result = await chatCompletion({ messages });
  return result.message;
}

/**
 * Generate embeddings for text (useful for semantic search)
 *
 * @param text - Text to generate embeddings for
 * @param model - Embedding model (default: text-embedding-3-small)
 * @returns Embedding vector
 */
export async function generateEmbedding(
  text: string,
  model: string = "text-embedding-3-small"
): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model,
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("OpenAI embedding error:", error);
    throw new Error(
      `Failed to generate embedding: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Stream chat completion (for real-time responses)
 *
 * @param input - Chat completion parameters
 * @returns Async generator that yields response chunks
 */
export async function* streamChatCompletion(
  input: ChatCompletionInput
): AsyncGenerator<string, void, unknown> {
  try {
    const stream = await openai.chat.completions.create({
      model: input.model || "gpt-4-turbo-preview",
      messages: input.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error("OpenAI streaming error:", error);
    throw new Error(
      `Failed to stream AI response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
