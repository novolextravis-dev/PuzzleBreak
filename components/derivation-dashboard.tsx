"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Play,
  Square,
  Zap,
  Key,
  Hash,
  Shuffle,
  Lock,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
  Trophy,
} from "lucide-react"
import { KeyDerivationEngine, type DerivationResult, type DerivationProgress } from "@/lib/key-derivation-engine"
import { validatePrivateKey, GSMG_PUZZLE_ADDRESS } from "@/lib/bitcoin-validator"

interface DerivationDashboardProps {
  onKeyFound?: (key: string, method: string) => void
  onValidKeyFound?: (key: string, address: string, matchesPuzzle: boolean) => void
  onRunningChange?: (running: boolean) => void
}

export function DerivationDashboard({ onKeyFound, onValidKeyFound, onRunningChange }: DerivationDashboardProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [continuousMode, setContinuousMode] = useState(false)
  const [progress, setProgress] = useState<DerivationProgress | null>(null)
  const [results, setResults] = useState<DerivationResult[]>([])
  const [validatedKeys, setValidatedKeys] = useState<
    Map<string, { valid: boolean; address?: string; matchesPuzzle: boolean }>
  >(new Map())
  const [stats, setStats] = useState({ totalKeys: 0, uniqueKeys: 0, byMethod: {} as Record<string, number> })
  const [matchFound, setMatchFound] = useState<{ key: string; address: string } | null>(null)
  const [cycle, setCycle] = useState(0)
  const engineRef = useRef<KeyDerivationEngine | null>(null)
  const shouldContinueRef = useRef(false)
  const [currentMethod, setCurrentMethod] = useState("")

  useEffect(() => {
    onRunningChange?.(isRunning)
  }, [isRunning, onRunningChange])

  const handleProgress = (p: DerivationProgress) => {
    setProgress(p)
    setCurrentMethod(p.currentMethod)
  }

  const startDerivation = async () => {
    if (isRunning) return

    setIsRunning(true)
    shouldContinueRef.current = true
    setResults([])
    setValidatedKeys(new Map())
    setMatchFound(null)
    let currentCycle = 0

    do {
      currentCycle++
      setCycle(currentCycle)

      const engine = new KeyDerivationEngine(handleProgress)
      engineRef.current = engine

      const newValidated = new Map<string, { valid: boolean; address?: string; matchesPuzzle: boolean }>()

      try {
        for await (const result of engine.runAllDerivations()) {
          if (!shouldContinueRef.current) break

          setResults((prev) => [...prev.slice(-200), result])

          const validation = validatePrivateKey(result.key)
          newValidated.set(result.key, {
            valid: validation.isValid,
            address: validation.address,
            matchesPuzzle: validation.matchesPuzzle,
          })
          setValidatedKeys(new Map(newValidated))

          onKeyFound?.(result.key, result.method)

          if (validation.isValid && validation.address) {
            onValidKeyFound?.(result.key, validation.address, validation.matchesPuzzle)
          }

          if (validation.matchesPuzzle) {
            setMatchFound({ key: result.key, address: validation.address || "" })
            shouldContinueRef.current = false
            setIsRunning(false)
            return
          }

          if (newValidated.size % 50 === 0) {
            setStats(engine.getStats())
          }
        }
      } catch (error) {
        console.warn("Derivation error:", error)
      } finally {
        setStats(engine.getStats())
      }

      if (continuousMode && shouldContinueRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } while (continuousMode && shouldContinueRef.current && !matchFound)

    setIsRunning(false)
  }

  const stopDerivation = () => {
    shouldContinueRef.current = false
    engineRef.current?.stop()
    setIsRunning(false)
  }

  useEffect(() => {
    if (continuousMode && !isRunning && !matchFound) {
      startDerivation()
    }
  }, [continuousMode])

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
  }

  const methodIcons: Record<string, typeof Key> = {
    ABBA: Shuffle,
    XOR: Zap,
    PBKDF2: Lock,
    BIP39: Key,
    Beaufort: Hash,
    Direct: Hash,
    Matrix: Zap,
  }

  const getMethodIcon = (method: string) => {
    for (const [prefix, Icon] of Object.entries(methodIcons)) {
      if (method.startsWith(prefix)) return Icon
    }
    return Key
  }

  return (
    <Card className="border-cyan-500/30 bg-black/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Key Derivation Engine
            {cycle > 0 && (
              <Badge variant="outline" className="ml-2 text-xs border-cyan-500/50">
                Cycle {cycle}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="continuous-derivation"
                checked={continuousMode}
                onCheckedChange={setContinuousMode}
                disabled={isRunning && !continuousMode}
                className="scale-75"
              />
              <Label htmlFor="continuous-derivation" className="text-xs text-gray-400">
                Continuous
              </Label>
            </div>
            {isRunning ? (
              <Button variant="destructive" size="sm" onClick={stopDerivation} className="gap-1">
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={startDerivation}
                className="gap-1 bg-cyan-600 hover:bg-cyan-500"
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match Found Banner */}
        {matchFound && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 animate-pulse">
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              <Trophy className="h-5 w-5" />
              PUZZLE MATCH FOUND!
            </div>
            <div className="text-xs mt-2 space-y-1">
              <div>Address: {matchFound.address}</div>
              <code className="text-[10px] bg-background/50 rounded px-1 py-0.5 block mt-1 break-all">
                {matchFound.key}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 bg-transparent"
                onClick={() => copyKey(matchFound.key)}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Key
              </Button>
            </div>
          </div>
        )}

        {/* Progress Section */}
        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Current Method:</span>
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                {currentMethod}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Keys Generated:</span>
              <span className="text-cyan-400 font-mono">{progress.totalAttempts.toLocaleString()}</span>
            </div>
            {isRunning && (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-cyan-400 animate-spin" />
                <span className="text-xs text-gray-400">
                  {continuousMode ? "Running continuously..." : "Generating keys..."}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <div className="text-lg font-mono text-cyan-400">{stats.totalKeys}</div>
            <div className="text-xs text-gray-500">Total Keys</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <div className="text-lg font-mono text-green-400">{stats.uniqueKeys}</div>
            <div className="text-xs text-gray-500">Unique</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <div className="text-lg font-mono text-yellow-400">
              {[...validatedKeys.values()].filter((v) => v.valid).length}
            </div>
            <div className="text-xs text-gray-500">Valid Format</div>
          </div>
        </div>

        {/* Method Breakdown */}
        {Object.keys(stats.byMethod).length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-gray-400 mb-2">Methods Used:</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.byMethod)
                .slice(0, 8)
                .map(([method, count]) => (
                  <Badge key={method} variant="secondary" className="text-xs bg-gray-800 text-gray-300">
                    {method.split("-")[0]}: {count}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Recent Keys */}
        <div className="space-y-2">
          <div className="text-xs text-gray-400">Recent Derivations:</div>
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {results
                .slice(-20)
                .reverse()
                .map((result, i) => {
                  const validation = validatedKeys.get(result.key)
                  const MethodIcon = getMethodIcon(result.method)

                  return (
                    <div
                      key={`${result.key}-${i}`}
                      className={`flex items-center gap-2 p-2 rounded text-xs font-mono ${
                        validation?.matchesPuzzle ? "bg-green-500/20 border border-green-500" : "bg-gray-900/50"
                      }`}
                    >
                      <MethodIcon className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                      <span className="text-gray-500 w-8">#{result.iteration}</span>
                      <span className="text-gray-300 truncate flex-1">
                        {result.key.substring(0, 16)}...{result.key.substring(56)}
                      </span>
                      {validation?.valid ? (
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      ) : (
                        <XCircle className="h-3 w-3 text-gray-600" />
                      )}
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyKey(result.key)}>
                        <Copy className="h-3 w-3 text-gray-400" />
                      </Button>
                    </div>
                  )
                })}
            </div>
          </ScrollArea>
        </div>

        {/* Target Address Reminder */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
          <div className="text-xs text-yellow-400 flex items-center gap-2">
            <Key className="h-3 w-3" />
            Target: {GSMG_PUZZLE_ADDRESS}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
