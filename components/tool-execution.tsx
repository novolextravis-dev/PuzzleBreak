"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface ToolExecution {
  id: string
  name: string
  params: Record<string, string>
  status: "running" | "success" | "error"
  result?: string
  executionTime?: number
}

interface ToolExecutionPanelProps {
  executions: ToolExecution[]
}

export function ToolExecutionPanel({ executions }: ToolExecutionPanelProps) {
  const recentExecutions = executions.slice(-5)

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="border-b border-border/50 py-2 px-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Wrench className="h-4 w-4 text-accent" />
          Tool Executions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-2">
        {recentExecutions.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">No tools executed yet</div>
        ) : (
          recentExecutions.map((exec) => (
            <div key={exec.id} className="rounded-md border border-border/50 bg-background/50 p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {exec.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-blue-400" />}
                  {exec.status === "success" && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  {exec.status === "error" && <XCircle className="h-3 w-3 text-red-400" />}
                  <span className="font-mono text-xs font-medium">{exec.name}</span>
                </div>
                {exec.executionTime !== undefined && (
                  <Badge variant="outline" className="text-xs font-mono gap-1">
                    <Clock className="h-2 w-2" />
                    {exec.executionTime.toFixed(2)}ms
                  </Badge>
                )}
              </div>
              {exec.result && (
                <div className="mt-1 rounded bg-muted/50 p-1.5 font-mono text-xs text-muted-foreground break-all">
                  {exec.result.length > 100 ? `${exec.result.substring(0, 100)}...` : exec.result}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
