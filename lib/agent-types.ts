// Agent types and interfaces

export type AgentRole = "orchestrator" | "cryptographer" | "analyst" | "researcher" | "validator"

export type AgentStatus = "idle" | "thinking" | "working" | "success" | "error" | "waiting"

export type TaskPriority = "critical" | "high" | "medium" | "low"

export interface AgentMessage {
  id: string
  timestamp: Date
  agentId: string
  agentRole: AgentRole
  type: "thought" | "action" | "result" | "error" | "discovery" | "tool_call" | "agent_message"
  content: string
  metadata?: Record<string, unknown>
  targetAgent?: string
  toolName?: string
  toolResult?: string
}

export interface AgentTask {
  id: string
  name: string
  description: string
  priority: TaskPriority
  status: "pending" | "in-progress" | "completed" | "failed"
  assignedAgent?: string
  result?: string
  startedAt?: Date
  completedAt?: Date
  subtasks?: AgentTask[]
}

export interface Agent {
  id: string
  name: string
  role: AgentRole
  status: AgentStatus
  currentTask?: string
  capabilities: string[]
  messageHistory: AgentMessage[]
  tasksCompleted: number
  tokensUsed: number
}

export interface PuzzlePhase {
  id: number
  name: string
  status: "locked" | "unlocked" | "solving" | "solved"
  description: string
  hints: string[]
  solution?: string
  attempts: number
  startedAt?: Date
  solvedAt?: Date
}

export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, string>
  execute: (params: Record<string, string>) => Promise<{ success: boolean; result: string }>
}

export interface ConsoleLogEntry {
  id: string
  timestamp: Date
  level: "info" | "warn" | "error" | "success" | "debug"
  source: string
  message: string
  data?: unknown
}

export interface KeyValidationResult {
  isValid: boolean
  matchesPuzzle: boolean
  address?: string
  format: string
  error?: string
}

export interface KeyValidation {
  key: string
  isValid: boolean
  matchesPuzzle: boolean
  address?: string
  format: string
  timestamp: Date
}

export interface AgentSystemState {
  agents: Agent[]
  tasks: AgentTask[]
  phases: PuzzlePhase[]
  currentPhase: number
  totalProgress: number
  isRunning: boolean
  startTime?: Date
  discoveries: string[]
  consoleLogs: ConsoleLogEntry[]
  totalTokens: number
  apiCalls: number
  keyValidations: KeyValidation[]
}

export interface HuggingFaceConfig {
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

export interface StreamChunk {
  type: "text" | "tool_call" | "thinking" | "done" | "error"
  content: string
  agentId?: string
}

export interface AIRequest {
  id: string
  timestamp: Date
  agentId: string
  agentRole: AgentRole
  agentName: string
  type: "feature" | "tool" | "data" | "bug_report" | "optimization" // simplified types
  priority: "critical" | "high" | "medium" | "low"
  title: string
  description: string
  suggestedCode?: string
  status: "pending" | "acknowledged" | "implemented" | "rejected"
  context?: string
}
