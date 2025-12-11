"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageSquarePlus,
  Wrench,
  Database,
  Bug,
  Zap,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Clock,
  Copy,
  CheckCheck,
} from "lucide-react"
import type { AIRequest } from "@/lib/agent-types"

interface AIRequestsLogProps {
  requests: AIRequest[]
  onAcknowledge?: (requestId: string) => void
  onReject?: (requestId: string) => void
  onImplemented?: (requestId: string) => void
}

const typeIcons = {
  feature_request: MessageSquarePlus,
  tool_request: Wrench,
  data_request: Database,
  bug_report: Bug,
  optimization: Zap,
}

const typeLabels = {
  feature_request: "Feature Request",
  tool_request: "Tool Request",
  data_request: "Data Request",
  bug_report: "Bug Report",
  optimization: "Optimization",
}

const priorityColors = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
}

const statusColors = {
  pending: "bg-yellow-500/20 text-yellow-400",
  acknowledged: "bg-blue-500/20 text-blue-400",
  implemented: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
}

const agentColors: Record<string, string> = {
  orchestrator: "text-purple-400",
  cryptographer: "text-cyan-400",
  analyst: "text-green-400",
  researcher: "text-yellow-400",
  validator: "text-orange-400",
}

export function AIRequestsLog({ requests, onAcknowledge, onReject, onImplemented }: AIRequestsLogProps) {
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set())
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const toggleExpanded = (id: string) => {
    setExpandedRequests((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
            AI Requests to User
          </div>
          {pendingCount > 0 && (
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse">
              {pendingCount} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <MessageSquarePlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No requests from agents yet</p>
            <p className="mt-1 opacity-70">Agents will request improvements as they work</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-2">
              {requests.map((request) => {
                const Icon = typeIcons[request.type]
                const isExpanded = expandedRequests.has(request.id)

                return (
                  <div
                    key={request.id}
                    className={`border rounded-lg p-3 transition-all ${
                      request.status === "pending"
                        ? "border-yellow-500/30 bg-yellow-500/5"
                        : "border-border/50 bg-background/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="mt-0.5">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{request.title}</span>
                            <Badge variant="outline" className={`text-[10px] h-4 ${priorityColors[request.priority]}`}>
                              {request.priority}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] h-4 ${statusColors[request.status]}`}>
                              {request.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span className={agentColors[request.agentRole]}>{request.agentName}</span>
                            <span>•</span>
                            <span>{typeLabels[request.type]}</span>
                            <span>•</span>
                            <span>{request.timestamp.toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleExpanded(request.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-3">
                        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                          {request.description}
                        </div>

                        {request.context && (
                          <div className="text-[10px] text-muted-foreground">
                            <span className="font-medium">Context:</span> {request.context}
                          </div>
                        )}

                        {request.suggestedCode && (
                          <div className="relative">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-medium text-muted-foreground">Suggested Code:</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-2 text-[10px]"
                                onClick={() => copyCode(request.suggestedCode!, request.id)}
                              >
                                {copiedCode === request.id ? (
                                  <>
                                    <CheckCheck className="h-3 w-3 mr-1" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </>
                                )}
                              </Button>
                            </div>
                            <pre className="text-[10px] bg-black/50 rounded p-2 overflow-x-auto font-mono">
                              <code>{request.suggestedCode}</code>
                            </pre>
                          </div>
                        )}

                        {request.status === "pending" && (
                          <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs flex-1 bg-green-500/10 hover:bg-green-500/20 border-green-500/30"
                              onClick={() => onImplemented?.(request.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark Implemented
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs flex-1 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30"
                              onClick={() => onAcknowledge?.(request.id)}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Acknowledge
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs bg-red-500/10 hover:bg-red-500/20 border-red-500/30"
                              onClick={() => onReject?.(request.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
