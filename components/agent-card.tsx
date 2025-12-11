"use client"

import { useEffect, useRef } from "react"
import type { Agent, AgentMessage } from "@/lib/agent-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Brain,
  Lock,
  Search,
  BookOpen,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  Wrench,
  MessageSquare,
  HelpCircle,
} from "lucide-react"

const roleConfig = {
  orchestrator: {
    icon: Brain,
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    borderColor: "border-violet-400/30",
  },
  cryptographer: {
    icon: Lock,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/30",
  },
  analyst: {
    icon: Search,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    borderColor: "border-cyan-400/30",
  },
  researcher: {
    icon: BookOpen,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/30",
  },
  validator: {
    icon: ShieldCheck,
    color: "text-teal-400",
    bgColor: "bg-teal-400/10",
    borderColor: "border-teal-400/30",
  },
}

const defaultRoleConfig = {
  icon: HelpCircle,
  color: "text-gray-400",
  bgColor: "bg-gray-400/10",
  borderColor: "border-gray-400/30",
}

const statusConfig = {
  idle: { label: "IDLE", color: "bg-muted text-muted-foreground", pulse: false },
  thinking: { label: "THINKING", color: "bg-amber-500/20 text-amber-400", pulse: true },
  working: { label: "WORKING", color: "bg-blue-500/20 text-blue-400", pulse: true },
  success: { label: "DONE", color: "bg-emerald-500/20 text-emerald-400", pulse: false },
  error: { label: "ERROR", color: "bg-red-500/20 text-red-400", pulse: false },
  waiting: { label: "WAIT", color: "bg-muted text-muted-foreground", pulse: false },
}

const defaultStatusConfig = { label: "UNKNOWN", color: "bg-muted text-muted-foreground", pulse: false }

const messageTypeConfig = {
  thought: { border: "border-l-amber-400", bg: "bg-amber-400/5", icon: Brain },
  action: { border: "border-l-blue-400", bg: "bg-blue-400/5", icon: Sparkles },
  result: { border: "border-l-emerald-400", bg: "bg-emerald-400/5", icon: ShieldCheck },
  error: { border: "border-l-red-400", bg: "bg-red-400/5", icon: AlertCircle },
  discovery: { border: "border-l-violet-400", bg: "bg-violet-400/5", icon: Search },
  tool_call: { border: "border-l-cyan-400", bg: "bg-cyan-400/5", icon: Wrench },
  agent_message: { border: "border-l-pink-400", bg: "bg-pink-400/5", icon: MessageSquare },
}

const defaultMessageConfig = { border: "border-l-gray-400", bg: "bg-gray-400/5", icon: HelpCircle }

interface AgentCardProps {
  agent: Agent
  streamingContent?: string
}

export function AgentCard({ agent, streamingContent }: AgentCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const messageHistory = agent?.messageHistory
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messageHistory, streamingContent])

  if (!agent || !agent.role) {
    return (
      <Card className="flex h-full flex-col overflow-hidden border border-red-400/30 bg-card/60">
        <CardHeader className="flex-none border-b border-border/50 pb-2 pt-3 px-3 bg-red-400/10">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">Invalid Agent</span>
          </div>
        </CardHeader>
      </Card>
    )
  }

  const role = roleConfig[agent.role as keyof typeof roleConfig] || defaultRoleConfig
  const status = statusConfig[agent.status as keyof typeof statusConfig] || defaultStatusConfig
  const Icon = role.icon
  const recentMessages = agent.messageHistory?.slice(-6) || []

  return (
    <Card className={`flex h-full flex-col overflow-hidden border ${role.borderColor} bg-card/60 backdrop-blur-sm`}>
      <CardHeader className={`flex-none border-b border-border/50 pb-2 pt-3 px-3 ${role.bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${role.bgColor} ring-1 ring-inset ring-white/10`}
            >
              <Icon className={`h-4 w-4 ${role.color}`} />
            </div>
            <div>
              <CardTitle className={`text-sm font-bold tracking-wide ${role.color}`}>
                {agent.name || "Unknown"}
              </CardTitle>
              <p className="text-xs capitalize text-muted-foreground">{agent.role}</p>
            </div>
          </div>
          <Badge
            className={`${status.color} font-mono text-xs ${status.pulse ? "animate-pulse" : ""}`}
            variant="secondary"
          >
            {agent.status === "thinking" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            {agent.status === "working" && <Sparkles className="mr-1 h-3 w-3" />}
            {status.label}
          </Badge>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          {agent.currentTask ? (
            <span className="text-muted-foreground truncate max-w-[200px]">Task: {agent.currentTask}</span>
          ) : (
            <span className="text-muted-foreground/50">No active task</span>
          )}
          <span className="font-mono text-muted-foreground">{agent.tasksCompleted || 0} tasks</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[180px]">
          <div ref={scrollRef} className="space-y-1.5 p-2">
            {recentMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {streamingContent && (
              <div className="rounded border-l-2 border-l-blue-400 bg-blue-400/5 p-2 font-mono text-xs">
                <div className="mb-1 flex items-center gap-1.5 text-blue-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="font-medium">Processing...</span>
                </div>
                <p className="whitespace-pre-wrap text-foreground/80 leading-relaxed">
                  {streamingContent}
                  <span className="animate-pulse text-primary">_</span>
                </p>
              </div>
            )}
            {recentMessages.length === 0 && !streamingContent && (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/50">
                <Clock className="h-5 w-5 mb-1" />
                <p className="text-xs">Awaiting instructions...</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function MessageBubble({ message }: { message: AgentMessage }) {
  if (!message || !message.type) {
    return null
  }

  const config = messageTypeConfig[message.type as keyof typeof messageTypeConfig] || defaultMessageConfig
  const Icon = config.icon

  return (
    <div className={`rounded border-l-2 ${config.border} ${config.bg} p-2 text-xs`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1 font-medium text-foreground/70">
          <Icon className="h-3 w-3" />
          {message.type.replace("_", " ")}
        </span>
        <span className="font-mono text-muted-foreground text-[10px]">
          {message.timestamp?.toLocaleTimeString?.("en-US", { hour12: false }) || ""}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{message.content || ""}</p>
    </div>
  )
}
