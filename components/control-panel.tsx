"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Play, Square, RotateCcw, Clock, Zap, Activity, Cpu, Sparkles, Infinity, Star } from "lucide-react"
import { AVAILABLE_MODELS } from "@/lib/ai-client"

interface ControlPanelProps {
  isRunning: boolean
  startTime?: Date
  model: string
  onModelChange: (model: string) => void
  continuousMode: boolean
  onContinuousModeChange: (enabled: boolean) => void
  onStart: () => void
  onStop: () => void
  onReset: () => void
  totalTokens: number
  apiCalls: number
  iterationCount: number
}

export function ControlPanel({
  isRunning,
  startTime,
  model,
  onModelChange,
  continuousMode,
  onContinuousModeChange,
  onStart,
  onStop,
  onReset,
  totalTokens,
  apiCalls,
  iterationCount,
}: ControlPanelProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000))
      }, 1000)
    } else if (!isRunning) {
      setElapsedTime(0)
    }
    return () => clearInterval(interval)
  }, [isRunning, startTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === model)

  return (
    <Card className="border-primary/30 bg-card/80 backdrop-blur ring-1 ring-primary/20">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Zap className="h-4 w-4 text-primary" />
            Control Panel
          </CardTitle>
          {isRunning && (
            <Badge className="bg-primary/20 text-primary font-mono animate-pulse">
              <Activity className="mr-1 h-3 w-3" />
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <Clock className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
            <span className="font-mono text-sm font-medium">{formatTime(elapsedTime)}</span>
            <p className="text-[10px] text-muted-foreground">Runtime</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <Cpu className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
            <span className="font-mono text-sm font-medium">{apiCalls}</span>
            <p className="text-[10px] text-muted-foreground">API Calls</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <Activity className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
            <span className="font-mono text-sm font-medium">{totalTokens}</span>
            <p className="text-[10px] text-muted-foreground">Tokens</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <Infinity className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
            <span className="font-mono text-sm font-medium">{iterationCount}</span>
            <p className="text-[10px] text-muted-foreground">Iterations</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <Infinity className="h-4 w-4 text-primary" />
            <div>
              <Label htmlFor="continuous-mode" className="text-xs font-medium">
                Continuous Mode
              </Label>
              <p className="text-[10px] text-muted-foreground">Run until puzzle is solved</p>
            </div>
          </div>
          <Switch
            id="continuous-mode"
            checked={continuousMode}
            onCheckedChange={onContinuousModeChange}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs font-medium">
            <Sparkles className="h-3 w-3" />
            AI Model (Vercel AI Gateway)
          </Label>
          <Select value={model} onValueChange={onModelChange} disabled={isRunning}>
            <SelectTrigger className="h-9 text-xs bg-background/50">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="font-medium flex items-center gap-1">
                        {m.name}
                        {m.recommended && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                      </span>
                      <span className="text-muted-foreground text-[10px]">{m.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedModel && (
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">{selectedModel.provider} - No API key required</p>
              {selectedModel.recommended && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-500/50 text-amber-500">
                  <Star className="h-2 w-2 mr-0.5 fill-amber-500" />
                  Recommended
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={onStart} className="flex-1 gap-2 bg-primary hover:bg-primary/90">
              <Play className="h-4 w-4" />
              {continuousMode ? "Launch Autonomous Loop" : "Launch Agents"}
            </Button>
          ) : (
            <Button onClick={onStop} variant="destructive" className="flex-1 gap-2">
              <Square className="h-4 w-4" />
              Terminate
            </Button>
          )}
          <Button
            onClick={onReset}
            variant="outline"
            size="icon"
            disabled={isRunning}
            className="h-9 w-9 bg-transparent"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {continuousMode && (
          <p className="text-[10px] text-center text-amber-500/80">
            Agents will run continuously until puzzle key is found or manually stopped
          </p>
        )}
      </CardContent>
    </Card>
  )
}
