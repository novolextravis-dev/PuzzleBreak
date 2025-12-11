"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type {
  AgentSystemState,
  Agent,
  AgentMessage,
  ConsoleLogEntry,
  KeyValidationResult,
  AIRequest,
} from "@/lib/agent-types"
import {
  createInitialState,
  createMessage,
  createConsoleLog,
  scanForKeys,
  executeKeyValidation,
  createAgents,
} from "@/lib/agent-system"
import { GSMG_PUZZLE_ADDRESS, maskPrivateKey } from "@/lib/bitcoin-validator"
import { GSMG_PUZZLE_KNOWLEDGE, ALL_TOKENS } from "@/lib/puzzle-knowledge"
import { xorHexStrings, sha256Hash } from "@/lib/crypto-tools"
import { parseToolCalls, type ToolResult } from "@/lib/agent-tools"

interface FoundKey {
  key: string
  maskedKey: string
  validation: KeyValidationResult
  source: string
  iteration?: number
  timestamp: Date
  derivationMethod?: string
}

interface UseAgentSystemOptions {
  onPuzzleSolved?: (key: string, address: string, method: string) => void
}

const MAX_TESTED_KEYS = 50000
const MAX_FOUND_KEYS = 1000

interface ExtendedAgentSystemState extends AgentSystemState {
  model: string
}

export function useAgentSystem(options?: UseAgentSystemOptions) {
  const [state, setState] = useState<ExtendedAgentSystemState>(() => ({
    ...createInitialState(),
    model: "anthropic/claude-sonnet-4",
  }))
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({})
  const [toolExecutions, setToolExecutions] = useState<
    Array<{
      id: string
      name: string
      params: Record<string, string>
      status: "running" | "success" | "error"
      result?: string
      executionTime?: number
    }>
  >([])
  const [foundKeys, setFoundKeys] = useState<FoundKey[]>([])
  const [continuousMode, setContinuousMode] = useState(true)
  const [iterationCount, setIterationCount] = useState(0)
  const [puzzleSolved, setPuzzleSolved] = useState(false)
  const [aiRequests, setAiRequests] = useState<AIRequest[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const shouldContinueRef = useRef(true)
  const testedKeysRef = useRef<Set<string>>(new Set())
  const toolExecutionLockRef = useRef<boolean>(false)
  const agentsRef = useRef<Agent[]>(createAgents())
  const iterationRef = useRef(0)

  useEffect(() => {
    if (state.agents && state.agents.length > 0) {
      agentsRef.current = state.agents
    }
  }, [state.agents])

  useEffect(() => {
    iterationRef.current = iterationCount
  }, [iterationCount])

  const addConsoleLog = useCallback(
    (level: ConsoleLogEntry["level"], source: string, message: string, data?: unknown) => {
      const log = createConsoleLog(level, source, message, data)
      setState((prev) => ({
        ...prev,
        consoleLogs: [...prev.consoleLogs.slice(-200), log],
      }))
    },
    [],
  )

  const clearConsoleLogs = useCallback(() => {
    setState((prev) => ({
      ...prev,
      consoleLogs: [],
    }))
  }, [])

  useEffect(() => {
    if (testedKeysRef.current.size > MAX_TESTED_KEYS) {
      const keysArray = Array.from(testedKeysRef.current)
      const newKeys = new Set(keysArray.slice(-MAX_TESTED_KEYS / 2))
      testedKeysRef.current = newKeys
      addConsoleLog("info", "SYSTEM", `Cleaned up tested keys cache: ${keysArray.length} -> ${newKeys.size}`)
    }
  }, [foundKeys.length, addConsoleLog])

  const addAIRequest = useCallback(
    (
      agent: Agent,
      type: AIRequest["type"],
      priority: AIRequest["priority"],
      title: string,
      description: string,
      suggestedCode?: string,
      context?: string,
    ) => {
      const request: AIRequest = {
        id: Math.random().toString(36).substring(2, 15),
        timestamp: new Date(),
        agentId: agent.id,
        agentRole: agent.role,
        agentName: agent.name,
        type,
        priority,
        title,
        description,
        suggestedCode,
        status: "pending",
        context,
      }
      setAiRequests((prev) => [request, ...prev])
      addConsoleLog("warn", agent.name, `REQUEST: ${title}`)
      return request
    },
    [addConsoleLog],
  )

  const acknowledgeRequest = useCallback((requestId: string) => {
    setAiRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "acknowledged" } : r)))
  }, [])

  const rejectRequest = useCallback((requestId: string) => {
    setAiRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "rejected" } : r)))
  }, [])

  const markRequestImplemented = useCallback((requestId: string) => {
    setAiRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "implemented" } : r)))
  }, [])

  const addMessage = useCallback(
    (agent: Agent, type: AgentMessage["type"], content: string) => {
      const message = createMessage(agent, type, content)
      setState((prev) => ({
        ...prev,
        agents: prev.agents.map((a) =>
          a.id === agent.id ? { ...a, messageHistory: [...a.messageHistory.slice(-30), message] } : a,
        ),
      }))
      addConsoleLog("info", agent.name, content.substring(0, 150) + (content.length > 150 ? "..." : ""))
      return message
    },
    [addConsoleLog],
  )

  const updateAgentStatus = useCallback((agentId: string, status: Agent["status"], task?: string) => {
    setState((prev) => ({
      ...prev,
      agents: prev.agents.map((a) => (a.id === agentId ? { ...a, status, currentTask: task } : a)),
    }))
  }, [])

  const incrementAgentTasks = useCallback((agentId: string) => {
    setState((prev) => ({
      ...prev,
      agents: prev.agents.map((a) => (a.id === agentId ? { ...a, tasksCompleted: a.tasksCompleted + 1 } : a)),
    }))
  }, [])

  const addDiscovery = useCallback(
    (discovery: string) => {
      setState((prev) => ({
        ...prev,
        discoveries: [...prev.discoveries, discovery],
      }))
      addConsoleLog("success", "SYSTEM", `Discovery: ${discovery}`)
    },
    [addConsoleLog],
  )

  const updatePhaseStatus = useCallback(
    (phaseId: number, status: "locked" | "unlocked" | "solving" | "solved", solution?: string) => {
      setState((prev) => ({
        ...prev,
        phases: prev.phases.map((p) => {
          if (p.id === phaseId) {
            return {
              ...p,
              status,
              solution,
              startedAt: status === "solving" && !p.startedAt ? new Date() : p.startedAt,
              solvedAt: status === "solved" ? new Date() : p.solvedAt,
            }
          }
          if (p.id === phaseId + 1 && status === "solved") {
            return { ...p, status: "unlocked" }
          }
          return p
        }),
        currentPhase: status === "solved" ? Math.min(phaseId + 1, 5) : prev.currentPhase,
      }))
      if (status === "solved" && solution) {
        addConsoleLog("success", "SYSTEM", `Phase ${phaseId} solved: ${solution.substring(0, 50)}...`)
      }
    },
    [addConsoleLog],
  )

  const validateAndAddKey = useCallback(
    (key: string, source: string, derivationMethod?: string): FoundKey | null => {
      if (testedKeysRef.current.has(key)) {
        return null
      }
      testedKeysRef.current.add(key)

      const { result: validation } = executeKeyValidation(key)

      // Enhanced logging for validation results
      if (validation.isValid) {
        const foundKey: FoundKey = {
          key,
          maskedKey: maskPrivateKey(key),
          validation,
          source,
          iteration: iterationRef.current,
          timestamp: new Date(),
          derivationMethod,
        }

        setFoundKeys((prev) => {
          const newKeys = [foundKey, ...prev]
          return newKeys.slice(0, MAX_FOUND_KEYS)
        })

        if (validation.matchesPuzzle) {
          // WINNING KEY - Log prominently
          addConsoleLog("success", "VALIDATOR", `PUZZLE SOLVED! Winning key found from ${source}`)
          addConsoleLog("success", "VALIDATOR", `Key: ${maskPrivateKey(key)}`)
          addConsoleLog("success", "VALIDATOR", `Address: ${validation.address}`)
          addConsoleLog("success", "VALIDATOR", `Target: ${GSMG_PUZZLE_ADDRESS}`)
          addDiscovery(`WINNING KEY FOUND via ${source}: ${maskPrivateKey(key)}`)
          setPuzzleSolved(true)
          shouldContinueRef.current = false

          if (options?.onPuzzleSolved && validation.address) {
            options.onPuzzleSolved(key, validation.address, source)
          }
        } else {
          // Valid key but not the puzzle - log as incorrect for target
          addConsoleLog(
            "info",
            "VALIDATOR",
            `INCORRECT for target | ${source} | ${maskPrivateKey(key)} -> ${validation.address?.substring(0, 16)}...`,
          )
        }

        return foundKey
      } else {
        // Invalid key format - log as error
        addConsoleLog("debug", "VALIDATOR", `Invalid key format from ${source}: ${validation.error || "unknown error"}`)
      }

      return null
    },
    [addConsoleLog, addDiscovery, options],
  )

  const clearFoundKeys = useCallback(() => {
    setFoundKeys([])
    testedKeysRef.current.clear()
    addConsoleLog("info", "SYSTEM", "Cleared all found keys and tested keys cache")
  }, [addConsoleLog])

  const executeToolsViaAPI = useCallback(
    async (toolCalls: Array<{ tool: string; params: Record<string, unknown> }>) => {
      if (toolExecutionLockRef.current) {
        addConsoleLog("warn", "TOOLS", "Tool execution already in progress, skipping...")
        return []
      }
      toolExecutionLockRef.current = true

      try {
        const executions = toolCalls.map((call) => ({
          id: Math.random().toString(36).substring(2, 9),
          name: call.tool,
          params: call.params as Record<string, string>,
          status: "running" as const,
        }))

        setToolExecutions((prev) => [...prev, ...executions])

        const response = await fetch("/api/agent", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolCalls }),
        })

        if (!response.ok) {
          throw new Error(`Tool execution failed: ${response.status}`)
        }

        const { results } = (await response.json()) as { results: ToolResult[] }

        setToolExecutions((prev) =>
          prev.map((exec) => {
            const result = results.find((_, i) => executions[i]?.id === exec.id)
            if (result) {
              return {
                ...exec,
                status: result.success ? ("success" as const) : ("error" as const),
                result: JSON.stringify(result.result).substring(0, 200),
                executionTime: result.executionTime,
              }
            }
            return exec
          }),
        )

        for (const result of results) {
          if (result.keysFound && Array.isArray(result.keysFound) && result.keysFound.length > 0) {
            addConsoleLog("info", "VALIDATOR", `Validating ${result.keysFound.length} key(s) from tool: ${result.tool}`)
            for (const key of result.keysFound) {
              if (typeof key === "string" && key.length >= 64) {
                validateAndAddKey(key, `${result.tool}`, result.tool)
              }
            }
          }
        }

        return results
      } catch (error) {
        addConsoleLog("error", "TOOLS", `Tool execution error: ${error}`)
        return []
      } finally {
        toolExecutionLockRef.current = false
      }
    },
    [addConsoleLog, validateAndAddKey],
  )

  const streamAgentResponse = useCallback(
    async (agent: Agent, prompt: string, systemPrompt?: string, toolResults?: ToolResult[]) => {
      updateAgentStatus(
        agent.id,
        "working",
        toolResults?.length ? `Processing ${toolResults.length} tool result(s)...` : "Processing...",
      )
      setStreamingContent((prev) => ({ ...prev, [agent.id]: "" }))

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            agentRole: agent.role,
            model: state.model,
            systemPrompt,
            toolResults,
          }),
          signal: abortControllerRef.current?.signal,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API error: ${response.status} - ${errorText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response body")

        const decoder = new TextDecoder()
        let fullContent = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          fullContent += chunk

          setStreamingContent((prev) => ({
            ...prev,
            [agent.id]: fullContent,
          }))
        }

        const toolCalls = parseToolCalls(fullContent)

        if (toolCalls.length > 0) {
          addConsoleLog(
            "info",
            agent.name,
            `Executing ${toolCalls.length} tool(s): ${toolCalls.map((t) => t.tool).join(", ")}`,
          )

          const results = await executeToolsViaAPI(toolCalls)

          for (const result of results) {
            // Log tool result
            addConsoleLog(
              result.success ? "info" : "warn",
              agent.name,
              `Tool ${result.tool}: ${typeof result.result === "string" ? result.result.substring(0, 100) : JSON.stringify(result.result).substring(0, 100)}...`,
            )

            if (result.keysFound && Array.isArray(result.keysFound) && result.keysFound.length > 0) {
              addConsoleLog(
                "info",
                "VALIDATOR",
                `Validating ${result.keysFound.length} key(s) from tool: ${result.tool}`,
              )
              for (const key of result.keysFound) {
                if (typeof key === "string" && key.length >= 64) {
                  validateAndAddKey(key, `${agent.name}/${result.tool}`, result.tool)
                }
              }
            }
          }

          const toolIterations = (toolResults?.length || 0) + results.length

          if (toolIterations < 10) {
            const continuationPrompt = `${prompt}

=== TOOL EXECUTION RESULTS ===
${results
  .map(
    (r) => `
**${r.tool}** (${r.success ? "SUCCESS" : "FAILED"}):
${typeof r.result === "string" ? r.result.substring(0, 100) : JSON.stringify(r.result).substring(0, 100)}
${r.keysFound?.length ? `Keys discovered: ${r.keysFound.slice(0, 5).join(", ")}${r.keysFound.length > 5 ? "..." : ""}` : ""}
`,
  )
  .join("\n")}

Continue your analysis using these results. Test any discovered keys with validate_bitcoin_key.`

            addConsoleLog("info", agent.name, `Continuing with ${results.length} tool result(s)...`)
            return streamAgentResponse(agent, continuationPrompt, systemPrompt, [...(toolResults || []), ...results])
          } else {
            addConsoleLog("warn", agent.name, `Max tool iterations (10) reached, stopping tool loop`)
          }
        }

        const potentialKeys = scanForKeys(fullContent)
        for (const key of potentialKeys) {
          validateAndAddKey(key, agent.name, "AI Response Scan")
        }

        const keyMarkerRegex = /POTENTIAL_KEY:\s*([A-Fa-f0-9]{64}|[5KL][1-9A-HJ-NP-Za-km-z]{50,51})/g
        let keyMatch
        while ((keyMatch = keyMarkerRegex.exec(fullContent)) !== null) {
          validateAndAddKey(keyMatch[1], agent.name, "Explicit Key Marker")
        }

        const requestRegex = /AI_REQUEST:\s*(\{[\s\S]*?\})/g
        let reqMatch
        while ((reqMatch = requestRegex.exec(fullContent)) !== null) {
          try {
            const req = JSON.parse(reqMatch[1])
            if (req.title && req.description) {
              addAIRequest(
                agent,
                req.type || "feature",
                req.priority || "medium",
                req.title,
                req.description,
                req.suggestedCode,
                req.context,
              )
            }
          } catch {
            // Invalid JSON, skip
          }
        }

        addMessage(agent, "result", fullContent)
        incrementAgentTasks(agent.id)
        updateAgentStatus(agent.id, "idle")

        setState((prev) => ({
          ...prev,
          apiCalls: prev.apiCalls + 1,
          totalTokens: prev.totalTokens + Math.floor(fullContent.length / 4),
        }))

        return fullContent
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          addConsoleLog("warn", agent.name, "Request aborted")
        } else {
          addConsoleLog("error", agent.name, `Error: ${error}`)
        }
        updateAgentStatus(agent.id, "error")
        return null
      }
    },
    [
      state.model,
      updateAgentStatus,
      addMessage,
      incrementAgentTasks,
      validateAndAddKey,
      executeToolsViaAPI,
      addConsoleLog,
      addAIRequest,
    ],
  )

  const generateIterationKeys = useCallback((iteration: number): string[] => {
    const keys: string[] = []
    const iterSalt = `${iteration}-${Date.now()}`

    const knownHashes = GSMG_PUZZLE_KNOWLEDGE.knownHashes || {}
    const hashes = Object.values(knownHashes).filter((h): h is string => typeof h === "string" && h.length === 64)

    const knownPasswordsObj = GSMG_PUZZLE_KNOWLEDGE.knownPasswords || {}
    const passwords: string[] = []

    if (Array.isArray(knownPasswordsObj.phase2)) {
      passwords.push(...knownPasswordsObj.phase2)
    }
    if (Array.isArray(knownPasswordsObj.phase3)) {
      passwords.push(...knownPasswordsObj.phase3)
    }
    if (typeof knownPasswordsObj.phase4Final === "string") {
      passwords.push(knownPasswordsObj.phase4Final)
    }

    if (hashes.length >= 2) {
      const idx1 = iteration % hashes.length
      const idx2 = (iteration + 1) % hashes.length
      if (hashes[idx1] && hashes[idx2]) {
        keys.push(xorHexStrings(hashes[idx1], hashes[idx2]))
      }
    }

    if (passwords.length > 0) {
      const pwIdx = iteration % passwords.length
      if (passwords[pwIdx]) {
        keys.push(sha256Hash(passwords[pwIdx] + iterSalt))
      }
    }

    if (hashes.length > 0) {
      keys.push(sha256Hash(hashes.join("") + iterSalt))
    }

    const base = sha256Hash(`iteration${iteration}`)
    keys.push(sha256Hash(base))

    if (ALL_TOKENS && ALL_TOKENS.length > 0) {
      const tokenIdx = iteration % ALL_TOKENS.length
      const tokenSlice = ALL_TOKENS.slice(0, Math.min(tokenIdx + 2, ALL_TOKENS.length))
      keys.push(sha256Hash(tokenSlice.join("") + iterSalt))
    }

    return keys.filter((k) => k && typeof k === "string" && k.length === 64)
  }, [])

  const runAutonomousLoop = useCallback(async () => {
    if (state.isRunning) return

    setState((prev) => ({ ...prev, isRunning: true, startTime: new Date() }))
    shouldContinueRef.current = true
    abortControllerRef.current = new AbortController()

    updatePhaseStatus(1, "solved", GSMG_PUZZLE_KNOWLEDGE.phase1?.result || "gsmg.io/theseedisplanted")
    updatePhaseStatus(2, "solved", GSMG_PUZZLE_KNOWLEDGE.phase2?.result || "choiceisanillusion...")
    updatePhaseStatus(3, "solved", GSMG_PUZZLE_KNOWLEDGE.phase3?.sha256 || "eb3efb5151e6...")
    if (GSMG_PUZZLE_KNOWLEDGE.phase4?.sha256) {
      updatePhaseStatus(4, "solved", GSMG_PUZZLE_KNOWLEDGE.phase4.sha256)
    }
    updatePhaseStatus(5, "solving")

    addConsoleLog("info", "SYSTEM", "Phases 1-4 are known solutions. Focusing on Phase 5: Cosmic Duality...")
    addConsoleLog("info", "SYSTEM", "Starting autonomous puzzle solving...")

    let iteration = iterationRef.current

    while (shouldContinueRef.current && !puzzleSolved) {
      iteration++
      setIterationCount(iteration)
      iterationRef.current = iteration

      try {
        const iterKeys = generateIterationKeys(iteration)
        for (const key of iterKeys) {
          validateAndAddKey(key, "Iteration Generator", `Iteration ${iteration}`)
        }

        const agents = agentsRef.current

        if (!agents || agents.length === 0) {
          addConsoleLog("error", "SYSTEM", "No agents available - agents array is empty")
          await new Promise((resolve) => setTimeout(resolve, 1000))
          continue
        }

        const agentIndex = iteration % agents.length
        const agent = agents[agentIndex]

        if (!agent) {
          addConsoleLog("error", "SYSTEM", `Agent at index ${agentIndex} is undefined`)
          continue
        }

        const xorTokens = GSMG_PUZZLE_KNOWLEDGE.cosmicDuality?.xorChainTokens || []
        const knownPasswords = Object.values(GSMG_PUZZLE_KNOWLEDGE.knownPasswords || {})
          .flat()
          .slice(0, 3)

        const prompts = [
          `Iteration ${iteration}: PHASE 5 - Cosmic Duality. We need to decrypt the AES-256-CBC blob. Use the 7 XOR chain tokens: ${xorTokens.join(", ")}. SHA256 each, XOR together, use with EVP_BytesToKey. Target: ${GSMG_PUZZLE_ADDRESS}`,
          `Iteration ${iteration}: PHASE 5 - Try different token orderings for XOR chain. Use run_derivation_batch with method "xor_chains". The final key decrypts cosmic_duality.txt to reveal the private key.`,
          `Iteration ${iteration}: PHASE 5 - Combine all known passwords: ${knownPasswords.join(", ")}. Hash combinations and test as private keys.`,
          `Iteration ${iteration}: PHASE 5 - Test claimed solution passwords. Use get_puzzle_data tool to see all claimed solutions, then validate each one.`,
          `Iteration ${iteration}: PHASE 5 - Use EVP_BytesToKey derivation with salt from cosmic_duality blob. The password might be a token combination.`,
        ]

        const promptIndex = iteration % prompts.length
        await streamAgentResponse(agent, prompts[promptIndex])
      } catch (error) {
        addConsoleLog(
          "error",
          "SYSTEM",
          `Iteration ${iteration} error: ${error instanceof Error ? error.message : String(error)}`,
        )
      }

      await new Promise((resolve) => setTimeout(resolve, 300))

      if (!continuousMode) {
        shouldContinueRef.current = false
      }
    }

    setState((prev) => ({ ...prev, isRunning: false }))
    addConsoleLog("info", "SYSTEM", `Autonomous loop ended after ${iteration} iterations`)
  }, [
    state.isRunning,
    puzzleSolved,
    continuousMode,
    streamAgentResponse,
    updatePhaseStatus,
    addConsoleLog,
    generateIterationKeys,
    validateAndAddKey,
  ])

  const stopSystem = useCallback(() => {
    shouldContinueRef.current = false
    abortControllerRef.current?.abort()
    setState((prev) => ({
      ...prev,
      isRunning: false,
      agents: prev.agents.map((a) => ({ ...a, status: "idle" as const, currentTask: undefined })),
    }))
    addConsoleLog("warn", "SYSTEM", "System stopped by user")
  }, [addConsoleLog])

  const resetSystem = useCallback(() => {
    stopSystem()
    setState((prev) => ({ ...createInitialState(), model: prev.model }))
    setStreamingContent({})
    setToolExecutions([])
    setFoundKeys([])
    setIterationCount(0)
    iterationRef.current = 0
    setPuzzleSolved(false)
    setAiRequests([])
    testedKeysRef.current.clear()
    addConsoleLog("info", "SYSTEM", "System reset complete")
  }, [stopSystem, addConsoleLog])

  const clearTestedKeys = useCallback(() => {
    testedKeysRef.current.clear()
    addConsoleLog("info", "SYSTEM", "Tested keys cache cleared")
  }, [addConsoleLog])

  const setModel = useCallback((model: string) => {
    setState((prev) => ({ ...prev, model }))
  }, [])

  const startAgents = runAutonomousLoop
  const stopAgents = stopSystem

  return {
    state,
    streamingContent,
    toolExecutions,
    foundKeys,
    continuousMode,
    setContinuousMode,
    iterationCount,
    puzzleSolved,
    aiRequests,
    agents: state.agents || [],
    consoleLogs: state.consoleLogs || [],
    phaseStatuses: state.phases || [],
    discoveries: state.discoveries || [],
    isRunning: state.isRunning,
    model: state.model,
    setModel,
    acknowledgeRequest,
    rejectRequest,
    markRequestImplemented,
    acknowledgeAIRequest: acknowledgeRequest,
    implementAIRequest: markRequestImplemented,
    rejectAIRequest: rejectRequest,
    runAutonomousLoop,
    stopSystem,
    resetSystem,
    clearTestedKeys,
    clearFoundKeys,
    clearConsoleLogs,
    addFoundKey: validateAndAddKey,
    updatePhaseStatus,
    addConsoleLog,
    addDiscovery,
    startAgents,
    stopAgents,
  }
}
