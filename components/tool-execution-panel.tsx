"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Wrench, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react"

interface ToolExecution {
  id: string
  name: string
  params: Record<string, string>
  status: "running" | "success" | "error"
  result?: string
  executionTime?: number
}

export function ToolExecutionPanel({ executions }: { executions?: ToolExecution[] }) {
  const safeExecutions = executions || []

  if (safeExecutions.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-2 border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Wrench className="h-4 w-4 text-orange-400" />
            Tool Executions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            No tool executions yet. Start the agents to see tool activity.
          </p>
        </CardContent>
      </Card>
    )
  }

  const running = safeExecutions.filter((e) => e.status === "running").length
  const successful = safeExecutions.filter((e) => e.status === "success").length
  const failed = safeExecutions.filter((e) => e.status === "error").length

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Wrench className="h-4 w-4 text-orange-400" />
            Tool Executions
          </CardTitle>
          <div className="flex items-center gap-2">
            {running > 0 && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                {running} running
              </Badge>
            )}
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
              {successful} done
            </Badge>
            {failed > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                {failed} failed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[150px]">
          <div className="space-y-1">
            {safeExecutions
              .slice(-20)
              .reverse()
              .map((exec) => (
                <div
                  key={exec.id}
                  className={`text-[10px] rounded px-2 py-1.5 flex items-center gap-2 ${
                    exec.status === "running"
                      ? "bg-yellow-500/10 border border-yellow-500/30"
                      : exec.status === "success"
                        ? "bg-green-500/5 border border-green-500/20"
                        : "bg-red-500/5 border border-red-500/20"
                  }`}
                >
                  {exec.status === "running" ? (
                    <Loader2 className="h-3 w-3 text-yellow-400 animate-spin flex-shrink-0" />
                  ) : exec.status === "success" ? (
                    <CheckCircle2 className="h-3 w-3 text-green-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
                  )}
                  <span className="font-mono text-foreground font-medium">{exec.name}</span>
                  <span className="text-muted-foreground truncate flex-1">
                    {Object.entries(exec.params || {})
                      .slice(0, 2)
                      .map(([k, v]) => `${k}=${String(v).slice(0, 20)}`)
                      .join(", ")}
                  </span>
                  {exec.executionTime !== undefined && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {exec.executionTime.toFixed(0)}ms
                    </span>
                  )}
                </div>
              ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
