"use client"

import { Badge } from "@/components/ui/badge"
import { Brain, Zap, Clock, Target, TrendingUp } from "lucide-react"

interface StatsBarProps {
  totalTokens: number
  apiCalls: number
  elapsedTime: number
  phasesCompleted: number
  totalPhases: number
  discoveryCount: number
}

export function StatsBar({
  totalTokens,
  apiCalls,
  elapsedTime,
  phasesCompleted,
  totalPhases,
  discoveryCount,
}: StatsBarProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex items-center gap-3 overflow-x-auto py-1">
      <Badge variant="outline" className="gap-1.5 font-mono text-xs whitespace-nowrap">
        <Clock className="h-3 w-3 text-muted-foreground" />
        {formatTime(elapsedTime)}
      </Badge>
      <Badge variant="outline" className="gap-1.5 font-mono text-xs whitespace-nowrap">
        <Brain className="h-3 w-3 text-violet-400" />
        {totalTokens.toLocaleString()} tokens
      </Badge>
      <Badge variant="outline" className="gap-1.5 font-mono text-xs whitespace-nowrap">
        <Zap className="h-3 w-3 text-amber-400" />
        {apiCalls} calls
      </Badge>
      <Badge variant="outline" className="gap-1.5 font-mono text-xs whitespace-nowrap">
        <Target className="h-3 w-3 text-emerald-400" />
        {phasesCompleted}/{totalPhases} phases
      </Badge>
      <Badge variant="outline" className="gap-1.5 font-mono text-xs whitespace-nowrap">
        <TrendingUp className="h-3 w-3 text-cyan-400" />
        {discoveryCount} discoveries
      </Badge>
    </div>
  )
}
