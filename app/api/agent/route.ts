// API route for agent streaming responses using Vercel AI SDK with AI Gateway

import { streamText } from "ai"
import { AGENT_PROMPTS } from "@/lib/agent-system"
import type { AgentRole } from "@/lib/agent-types"
import { executeTool, type ToolResult } from "@/lib/agent-tools"

export const maxDuration = 120

export async function POST(request: Request) {
  const { prompt, agentRole, model = "anthropic/claude-sonnet-4", systemPrompt, toolResults } = await request.json()

  console.log(`[v0] API POST - Agent: ${agentRole}, Model: ${model}, ToolResults: ${toolResults?.length || 0}`)

  const finalSystemPrompt = systemPrompt || AGENT_PROMPTS[agentRole as AgentRole] || AGENT_PROMPTS.orchestrator

  let finalPrompt = prompt
  if (toolResults && Array.isArray(toolResults) && toolResults.length > 0) {
    // Don't duplicate tool results if they're already in the prompt
    if (!prompt.includes("=== TOOL EXECUTION RESULTS ===")) {
      finalPrompt += "\n\n=== PREVIOUS TOOL RESULTS (for reference) ===\n"
      for (const result of toolResults) {
        finalPrompt += `**${result.tool}** (${result.success ? "SUCCESS" : "FAILED"}):\n`
        finalPrompt += `${JSON.stringify(result.result, null, 2)}\n`
        if (result.keysFound && result.keysFound.length > 0) {
          finalPrompt += `Keys to test: ${result.keysFound.slice(0, 10).join(", ")}${result.keysFound.length > 10 ? "..." : ""}\n`
        }
        finalPrompt += "\n"
      }
      finalPrompt +=
        "Analyze these results and continue. If potential keys were found, TEST THEM with validate_bitcoin_key tool.\n"
    }
  }

  try {
    const result = streamText({
      model: model,
      system: finalSystemPrompt,
      prompt: finalPrompt,
      maxTokens: 4096,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error("[v0] AI SDK Error:", error)
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error occurred" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { toolCalls } = await request.json()

    console.log(`[v0] API PUT - Executing ${toolCalls?.length || 0} tools`)

    if (!toolCalls || !Array.isArray(toolCalls)) {
      return Response.json({ error: "Invalid tool calls" }, { status: 400 })
    }

    const results: ToolResult[] = []
    for (const call of toolCalls) {
      console.log(`[v0] Executing tool: ${call.tool}`)
      const result = await executeTool(call.tool, call.params || {})
      console.log(`[v0] Tool ${call.tool} result: success=${result.success}`)
      results.push(result)
    }

    return Response.json({ results })
  } catch (error) {
    console.error("[v0] Tool execution error:", error)
    return Response.json({ error: error instanceof Error ? error.message : "Tool execution failed" }, { status: 500 })
  }
}
