"use client"

import { useEffect, useRef, useState } from "react"
import type { ConsoleLogEntry } from "@/lib/agent-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Terminal, AlertCircle, CheckCircle2, Info, Bug, Trash2, Pause, Play } from "lucide-react"

const levelConfig = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-l-blue-400" },
  warn: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-l-amber-400" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10", border: "border-l-red-400" },
  success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-l-emerald-400" },
  debug: { icon: Bug, color: "text-muted-foreground", bg: "bg-muted/50", border: "border-l-muted-foreground" },
}

interface SystemConsoleProps {
  logs?: ConsoleLogEntry[]
  maxHeight?: string
  onClear?: () => void
}

export function SystemConsole({ logs, maxHeight = "300px", onClear }: SystemConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const safeLogs = logs || []

  useEffect(() => {
    if (scrollRef.current && autoScroll) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [safeLogs, autoScroll])

  const filteredLogs = filter ? safeLogs.filter((log) => log.level === filter || log.source === filter) : safeLogs

  const levelCounts = {
    info: safeLogs.filter((l) => l.level === "info").length,
    warn: safeLogs.filter((l) => l.level === "warn").length,
    error: safeLogs.filter((l) => l.level === "error").length,
    success: safeLogs.filter((l) => l.level === "success").length,
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="border-b border-border/50 py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Terminal className="h-4 w-4 text-primary" />
            System Console
          </CardTitle>
          <div className="flex items-center gap-2">
            {levelCounts.error > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] text-red-400 border-red-400/30 cursor-pointer"
                onClick={() => setFilter(filter === "error" ? null : "error")}
              >
                {levelCounts.error} errors
              </Badge>
            )}
            {levelCounts.warn > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] text-amber-400 border-amber-400/30 cursor-pointer"
                onClick={() => setFilter(filter === "warn" ? null : "warn")}
              >
                {levelCounts.warn} warns
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs">
              {filteredLogs.length} / {safeLogs.length}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? "Pause auto-scroll" : "Resume auto-scroll"}
            >
              {autoScroll ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            {onClear && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear} title="Clear console">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        {filter && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Filtering by: {filter}</span>
            <Button variant="ghost" size="sm" className="h-4 px-1 text-[10px]" onClick={() => setFilter(null)}>
              Clear
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ height: maxHeight }} className="p-2">
          <div ref={scrollRef} className="space-y-1 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Terminal className="h-8 w-8 mb-2 opacity-30" />
                <span>{safeLogs.length === 0 ? "Waiting for system activity..." : "No matching logs"}</span>
                <span className="text-[10px] mt-1">Click "Launch Agents" to begin</span>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const config = levelConfig[log.level] || levelConfig.info
                const Icon = config.icon
                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 rounded px-2 py-1.5 ${config.bg} border-l-2 ${config.border}`}
                  >
                    <Icon className={`h-3 w-3 mt-0.5 flex-none ${config.color}`} />
                    <span className="text-muted-foreground flex-none w-16 tabular-nums">
                      {log.timestamp?.toLocaleTimeString?.("en-US", { hour12: false }) || "--:--:--"}
                    </span>
                    <span
                      className={`flex-none w-20 font-medium ${config.color} cursor-pointer hover:underline`}
                      onClick={() => setFilter(filter === log.source ? null : log.source)}
                    >
                      [{log.source || "SYSTEM"}]
                    </span>
                    <span className="text-foreground/90 break-all leading-relaxed">{log.message || ""}</span>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
