// AI API client with streaming support - Using Vercel AI SDK with AI Gateway

import type { StreamChunk } from "./agent-types"

export interface AIConfig {
  model: string
  maxTokens: number
  temperature: number
}

const DEFAULT_CONFIG: AIConfig = {
  model: "anthropic/claude-sonnet-4-20250514",
  maxTokens: 4096,
  temperature: 0.7,
}

export const AVAILABLE_MODELS = [
  {
    id: "anthropic/claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    description: "Best for puzzles - methodical reasoning, follows complex instructions",
    recommended: true,
    provider: "Anthropic",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "Creative problem-solving, fast pattern recognition",
    recommended: true,
    provider: "OpenAI",
  },
  {
    id: "anthropic/claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    description: "Fast iterations - good for high-volume key testing",
    recommended: false,
    provider: "Anthropic",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Fastest - lightweight tasks and quick derivations",
    recommended: false,
    provider: "OpenAI",
  },
  {
    id: "openai/o1",
    name: "OpenAI o1",
    description: "Deep reasoning - complex multi-step cryptographic analysis",
    recommended: false,
    provider: "OpenAI",
  },
]

// Streaming AI response using Vercel AI Gateway
export async function* streamAIResponse(
  prompt: string,
  systemPrompt: string,
  config: Partial<AIConfig> = {},
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        systemPrompt,
        model: finalConfig.model,
        maxTokens: finalConfig.maxTokens,
        temperature: finalConfig.temperature,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error("No response body")

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      if (text) {
        yield { type: "text", content: text }
      }
    }

    yield { type: "done", content: "" }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      yield { type: "done", content: "" }
      return
    }

    console.error("AI API Error:", error)
    yield {
      type: "error",
      content: `Error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Non-streaming version for simple queries
export async function queryAI(prompt: string, systemPrompt: string, config: Partial<AIConfig> = {}): Promise<string> {
  let result = ""
  for await (const chunk of streamAIResponse(prompt, systemPrompt, config)) {
    if (chunk.type === "text") {
      result += chunk.content
    }
  }
  return result
}
