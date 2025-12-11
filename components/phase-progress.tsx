"use client"

import { useEffect, useState } from "react"
import type { PuzzlePhase } from "@/lib/agent-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Lock, Unlock, Loader2, CheckCircle2, ChevronRight, Timer, AlertCircle } from "lucide-react"

const statusConfig = {
  locked: {
    icon: Lock,
    color: "text-muted-foreground",
    bg: "bg-muted/30",
    badge: "bg-muted text-muted-foreground",
    ring: "ring-muted/50",
  },
  unlocked: {
    icon: Unlock,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    badge: "bg-amber-400/20 text-amber-400",
    ring: "ring-amber-400/30",
  },
  solving: {
    icon: Loader2,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    badge: "bg-blue-400/20 text-blue-400",
    ring: "ring-blue-400/30",
  },
  solved: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    badge: "bg-emerald-400/20 text-emerald-400",
    ring: "ring-emerald-400/30",
  },
}

const defaultStatusConfig = {
  icon: AlertCircle,
  color: "text-gray-400",
  bg: "bg-gray-400/10",
  badge: "bg-gray-400/20 text-gray-400",
  ring: "ring-gray-400/30",
}

interface PhaseProgressProps {
  phases?: PuzzlePhase[]
  currentPhase?: number
  totalProgress?: number
}

export function PhaseProgress({ phases, currentPhase = 1, totalProgress = 0 }: PhaseProgressProps) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const safePhases = phases || []

  if (safePhases.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold tracking-tight">Phase Progress</CardTitle>
            <Badge variant="outline" className="font-mono text-muted-foreground">
              Loading...
            </Badge>
          </div>
          <Progress value={0} className="mt-2 h-1.5 bg-muted" />
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground text-center py-4">Initializing phases...</p>
        </CardContent>
      </Card>
    )
  }

  const solvedCount = safePhases.filter((p) => p?.status === "solved").length
  const calculatedProgress = Math.round((solvedCount / safePhases.length) * 100)
  const displayProgress = Math.max(totalProgress, calculatedProgress)

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold tracking-tight">Phase Progress</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-primary">
              {solvedCount}/{safePhases.length} Phases
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {displayProgress}%
            </Badge>
          </div>
        </div>
        <Progress value={displayProgress} className="mt-2 h-1.5 bg-muted" />
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {safePhases.map((phase, index) => {
          if (!phase) return null

          const config = statusConfig[phase.status as keyof typeof statusConfig] || defaultStatusConfig
          const Icon = config.icon
          const isActive = phase.status === "solving"
          const isCurrent = phase.id === currentPhase

          const getElapsedTime = () => {
            if (phase.solvedAt && phase.startedAt) {
              return ((new Date(phase.solvedAt).getTime() - new Date(phase.startedAt).getTime()) / 1000).toFixed(1)
            }
            if (phase.startedAt && phase.status === "solving") {
              return ((now.getTime() - new Date(phase.startedAt).getTime()) / 1000).toFixed(1)
            }
            return null
          }

          const elapsed = getElapsedTime()
          const hints = phase.hints || []

          return (
            <div
              key={phase.id}
              className={`
                relative rounded-lg border p-2.5 transition-all
                ${isCurrent || isActive ? `border-primary/50 ${config.bg} ring-1 ${config.ring}` : "border-border/30 bg-background/30"}
              `}
            >
              <div className="flex items-start gap-2.5">
                <div className={`flex h-7 w-7 flex-none items-center justify-center rounded-md ${config.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${config.color} ${phase.status === "solving" ? "animate-spin" : ""}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-medium">{phase.name || `Phase ${phase.id}`}</h4>
                    <Badge className={`${config.badge} text-[10px] px-1.5 py-0`} variant="secondary">
                      {phase.status || "unknown"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {phase.description || "No description"}
                  </p>

                  {phase.solution && (
                    <div className="mt-1.5 flex items-center gap-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 font-mono text-[10px]">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-none" />
                      <span className="truncate text-emerald-300">{phase.solution}</span>
                    </div>
                  )}

                  {(phase.startedAt || elapsed) && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Timer className="h-2.5 w-2.5" />
                      {phase.solvedAt ? (
                        <span className="text-emerald-400">Solved in {elapsed}s</span>
                      ) : phase.status === "solving" ? (
                        <span className="text-blue-400 animate-pulse">Running: {elapsed}s</span>
                      ) : phase.startedAt ? (
                        <span>Started at {new Date(phase.startedAt).toLocaleTimeString()}</span>
                      ) : null}
                    </div>
                  )}

                  {phase.status === "locked" && hints.length > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <AlertCircle className="h-2.5 w-2.5" />
                      <span>{hints.length} hints available</span>
                    </div>
                  )}
                </div>
                {(isCurrent || isActive) && <ChevronRight className="h-4 w-4 flex-none animate-pulse text-primary" />}
              </div>
              {index < safePhases.length - 1 && <div className="absolute -bottom-2 left-5 h-2 w-px bg-border/50" />}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
