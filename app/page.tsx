"use client"

import { useState, useEffect, useCallback } from "react"
import { useAgentSystem } from "@/hooks/use-agent-system"
import { AgentCard } from "@/components/agent-card"
import { PhaseProgress } from "@/components/phase-progress"
import { DiscoveryFeed } from "@/components/discovery-feed"
import { ControlPanel } from "@/components/control-panel"
import { PuzzleInfo } from "@/components/puzzle-info"
import { SystemConsole } from "@/components/system-console"
import { ToolExecutionPanel } from "@/components/tool-execution-panel"
import { MatrixVisualization } from "@/components/matrix-visualization"
import { AgentNetwork } from "@/components/agent-network"
import { StatsBar } from "@/components/stats-bar"
import { FoundKeysWindow } from "@/components/found-keys-window"
import { KeyValidator } from "@/components/key-validator"
import { AIRequestsLog } from "@/components/ai-requests-log"
import { DerivationDashboard } from "@/components/derivation-dashboard"
import { BlockchainMonitor } from "@/components/blockchain-monitor"
import { SolutionTester } from "@/components/solution-tester"
import { WinnerDisplay } from "@/components/winner-display"
import { ErrorBoundary } from "@/components/error-boundary"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Shield,
  Network,
  Terminal,
  Grid3X3,
  Wrench,
  GitBranch,
  Key,
  Trophy,
  Zap,
  Search,
  MessageSquarePlus,
  Cpu,
  FlaskConical,
  Activity,
} from "lucide-react"
import { GSMG_PUZZLE_ADDRESS, GSMG_PUZZLE_PRIZE } from "@/lib/bitcoin-validator"
import {
  saveFoundKeys,
  loadFoundKeys,
  saveIterationCount,
  loadIterationCount,
  loadLastSession,
} from "@/lib/progress-persistence"

interface WinningKey {
  key: string
  address: string
  method: string
  timestamp: Date
  iteration?: number
}

function SystemStatus({
  agentsRunning,
  derivationRunning,
  testerRunning,
  keysFound,
  matchFound,
}: {
  agentsRunning: boolean
  derivationRunning: boolean
  testerRunning: boolean
  keysFound: number
  matchFound: boolean
}) {
  const processes = [
    { name: "Agents", running: agentsRunning, icon: Network },
    { name: "Derivation", running: derivationRunning, icon: Cpu },
    { name: "Tester", running: testerRunning, icon: FlaskConical },
  ]

  const activeCount = processes.filter((p) => p.running).length

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-xs font-medium flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          System Status
          {matchFound && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-auto">
              <Trophy className="h-3 w-3 mr-1" />
              MATCH!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {processes.map((proc) => {
            const Icon = proc.icon
            return (
              <Badge
                key={proc.name}
                variant="outline"
                className={`text-[10px] gap-1 ${
                  proc.running ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${proc.running ? "bg-primary animate-pulse" : "bg-muted"}`}
                />
                <Icon className="h-2.5 w-2.5" />
                {proc.name}
              </Badge>
            )
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
          <span>{activeCount}/3 active</span>
          <span className="flex items-center gap-1">
            <Key className="h-3 w-3" />
            {keysFound} keys
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function GSMGPuzzleSolver() {
  const [manualValidatorKeys, setManualValidatorKeys] = useState<string[]>([])
  const [restoredSession, setRestoredSession] = useState<{
    keysCount: number
    iterations: number
    lastSession: Date | null
  } | null>(null)
  const [winningKey, setWinningKey] = useState<WinningKey | null>(null)
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [iterationCount, setIterationCount] = useState<number>(0)
  const [derivationRunning, setDerivationRunning] = useState(false)
  const [testerRunning, setTesterRunning] = useState(false)
  const [mounted, setMounted] = useState(false)

  const handleAgentPuzzleSolved = useCallback(
    (key: string, address: string, method: string) => {
      console.log("[v0] PUZZLE SOLVED BY AGENT SYSTEM!", key)
      const winner: WinningKey = {
        key,
        address,
        method: `Agent System: ${method}`,
        timestamp: new Date(),
        iteration: iterationCount,
      }
      setWinningKey(winner)
      setShowWinnerModal(true)
      if (typeof window !== "undefined") {
        localStorage.setItem("gsmg_winning_key", JSON.stringify(winner))
      }
    },
    [iterationCount],
  )

  const {
    state,
    agents = [],
    foundKeys = [],
    phaseStatuses = [],
    aiRequests = [],
    consoleLogs = [],
    discoveries = [],
    streamingContent = {},
    isRunning = false,
    continuousMode = true,
    setContinuousMode,
    runAutonomousLoop,
    stopSystem,
    resetSystem,
    addFoundKey,
    clearFoundKeys,
    clearConsoleLogs,
    acknowledgeAIRequest,
    implementAIRequest,
    rejectAIRequest,
    puzzleSolved,
    addConsoleLog,
    model: hookModel,
    setModel: hookSetModel,
  } = useAgentSystem({ onPuzzleSolved: handleAgentPuzzleSolved })

  const model = hookModel || "anthropic/claude-sonnet-4"
  const setModel = hookSetModel || (() => {})

  const safeFoundKeys = foundKeys || []
  const safeAgents = agents || []
  const safeConsoleLogs = consoleLogs || []
  const safePhaseStatuses = phaseStatuses || []
  const safeAiRequests = aiRequests || []
  const safeDiscoveries = discoveries || []

  useEffect(() => {
    const match = safeFoundKeys.find((k) => k?.validation?.matchesPuzzle)
    if (match && !winningKey) {
      const winner: WinningKey = {
        key: match.key,
        address: match.validation?.address || GSMG_PUZZLE_ADDRESS,
        method: match.derivationMethod || match.source,
        timestamp: match.timestamp,
        iteration: match.iteration,
      }
      setWinningKey(winner)
      setShowWinnerModal(true)
      if (typeof window !== "undefined") {
        localStorage.setItem("gsmg_winning_key", JSON.stringify(winner))
      }
    }
  }, [safeFoundKeys, winningKey])

  useEffect(() => {
    setMounted(true)
    const lastSession = loadLastSession()
    const savedKeys = loadFoundKeys()
    const savedIterations = loadIterationCount()
    if (savedKeys.length > 0 || savedIterations > 0) {
      setRestoredSession({
        keysCount: savedKeys.length,
        iterations: savedIterations,
        lastSession,
      })
    }
    if (typeof window !== "undefined") {
      const savedWinner = localStorage.getItem("gsmg_winning_key")
      if (savedWinner) {
        try {
          const parsed = JSON.parse(savedWinner)
          parsed.timestamp = new Date(parsed.timestamp)
          setWinningKey(parsed)
        } catch (e) {
          console.error("Failed to parse saved winning key:", e)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (mounted && safeFoundKeys.length > 0) {
      saveFoundKeys(safeFoundKeys)
    }
  }, [safeFoundKeys, mounted])

  useEffect(() => {
    if (mounted && state?.iterationCount > 0) {
      saveIterationCount(state.iterationCount)
      setIterationCount(state.iterationCount)
    }
  }, [state?.iterationCount, mounted])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (state?.isRunning && state?.startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - state.startTime!.getTime()) / 1000))
      }, 1000)
    } else if (!state?.isRunning) {
      setElapsedTime(0)
    }
    return () => clearInterval(interval)
  }, [state?.isRunning, state?.startTime])

  useEffect(() => {
    const newKeys = safeFoundKeys.map((k) => k?.key).filter((k) => k && !manualValidatorKeys.includes(k)) as string[]
    if (newKeys.length > 0) {
      setManualValidatorKeys((prev) => [...prev, ...newKeys])
    }
  }, [safeFoundKeys, manualValidatorKeys])

  const handleDerivedKeyFound = useCallback(
    (key: string, method: string) => {
      if (addFoundKey) {
        addFoundKey(key, `Derivation Engine: ${method}`, state?.iterationCount || 0)
      }
      addConsoleLog?.("info", "DERIVATION", `Testing key from ${method}`)
    },
    [addFoundKey, addConsoleLog],
  )

  const handleValidDerivedKey = useCallback(
    (key: string, address: string, matchesPuzzle: boolean) => {
      if (matchesPuzzle) {
        addConsoleLog?.("success", "DERIVATION", `CORRECT! Puzzle match found: ${address}`)
        const winner: WinningKey = {
          key,
          address,
          method: "Derivation Engine",
          timestamp: new Date(),
          iteration: state?.iterationCount || 0,
        }
        setWinningKey(winner)
        setShowWinnerModal(true)
        if (typeof window !== "undefined") {
          localStorage.setItem("gsmg_winning_key", JSON.stringify(winner))
        }
      } else {
        addConsoleLog?.("debug", "DERIVATION", `INCORRECT for target | ${address?.substring(0, 20)}...`)
      }
    },
    [state?.iterationCount, addConsoleLog],
  )

  const handleSolutionTesterMatch = useCallback(
    (key: string, address: string) => {
      if (addFoundKey) {
        addFoundKey(key, `Solution Tester: Direct match`)
      }
      addConsoleLog?.("success", "TESTER", `CORRECT! Puzzle match found: ${address}`)
      const winner: WinningKey = {
        key,
        address,
        method: "Solution Tester",
        timestamp: new Date(),
      }
      setWinningKey(winner)
      setShowWinnerModal(true)
      if (typeof window !== "undefined") {
        localStorage.setItem("gsmg_winning_key", JSON.stringify(winner))
      }
    },
    [addFoundKey, addConsoleLog],
  )

  const [elapsedTime, setElapsedTime] = useState(0)

  const phasesCompleted = safePhaseStatuses.filter((p) => p?.status === "solved").length
  const totalProgress =
    safePhaseStatuses.length > 0 ? Math.round((phasesCompleted / safePhaseStatuses.length) * 100) : 0

  if (!mounted) return null

  const activeAgents = safeAgents.filter((a) => a?.status !== "idle").length
  const validKeys = safeFoundKeys.filter((k) => k?.validation?.isValid).length
  const puzzleMatches = safeFoundKeys.filter((k) => k?.validation?.matchesPuzzle).length
  const pendingRequests = safeAiRequests.filter((r) => r?.status === "pending").length

  const activeConnections: Array<{ from: string; to: string }> = []
  const workingAgents = safeAgents.filter((a) => a?.status === "working" || a?.status === "thinking")
  workingAgents.forEach((agent) => {
    if (agent?.role !== "orchestrator") {
      activeConnections.push({ from: "orchestrator", to: agent.role })
    }
  })

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <WinnerDisplay
          winningKey={showWinnerModal ? winningKey : null}
          onClose={() => setShowWinnerModal(false)}
          puzzleAddress={GSMG_PUZZLE_ADDRESS}
          prizeAmount={GSMG_PUZZLE_PRIZE}
        />

        {(puzzleSolved || winningKey) && (
          <div
            className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-green-600 via-green-500 to-green-600 text-white py-3 px-4 text-center shadow-lg cursor-pointer hover:from-green-500 hover:via-green-400 hover:to-green-500 transition-colors"
            onClick={() => setShowWinnerModal(true)}
          >
            <div className="flex items-center justify-center gap-3 animate-pulse">
              <Trophy className="h-5 w-5" />
              <span className="font-bold">PUZZLE SOLVED! Click to view winning key</span>
              <Trophy className="h-5 w-5" />
            </div>
          </div>
        )}

        {restoredSession && !isRunning && !winningKey && (
          <div className="bg-blue-500/10 border-b border-blue-500/30 py-2 px-4 text-center text-sm">
            <span className="text-blue-400">
              Previous session restored: {restoredSession.keysCount} keys, {restoredSession.iterations} iterations
            </span>
          </div>
        )}

        {/* Header */}
        <header
          className={`sticky ${puzzleSolved || winningKey ? "top-12" : "top-0"} z-50 border-b border-border/50 bg-background/95 backdrop-blur-xl`}
        >
          <div className="mx-auto max-w-[1800px] px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h1 className="font-semibold tracking-tight text-foreground flex items-center gap-2 text-sm">
                    GSMG Puzzle Solver
                    <Badge variant="outline" className="text-[10px] h-4">
                      v2.7
                    </Badge>
                  </h1>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Autonomous Multi-Agent System
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 font-mono text-[10px] h-5">
                  <Network className="h-3 w-3" />
                  {activeAgents}/5
                </Badge>
                {(state?.iterationCount || 0) > 0 && (
                  <Badge variant="outline" className="font-mono text-[10px] h-5">
                    #{state?.iterationCount}
                  </Badge>
                )}
                {safeFoundKeys.length > 0 && (
                  <Badge
                    variant={puzzleMatches > 0 ? "default" : "outline"}
                    className={`gap-1 font-mono text-[10px] h-5 ${
                      puzzleMatches > 0 ? "bg-green-500/20 text-green-400 border-green-500/30 animate-pulse" : ""
                    }`}
                  >
                    <Key className="h-3 w-3" />
                    {validKeys}/{safeFoundKeys.length}
                  </Badge>
                )}
                {winningKey && (
                  <Badge
                    className="gap-1 font-mono text-[10px] h-5 bg-amber-500/20 text-amber-400 border-amber-500/30 cursor-pointer"
                    onClick={() => setShowWinnerModal(true)}
                  >
                    <Trophy className="h-3 w-3" />
                    Winner
                  </Badge>
                )}
                <Badge
                  variant={isRunning ? "default" : "secondary"}
                  className={`gap-1 text-[10px] h-5 ${isRunning ? "bg-primary/20 text-primary animate-pulse" : ""}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? "bg-primary" : "bg-muted-foreground"}`} />
                  {isRunning ? "RUNNING" : "STANDBY"}
                </Badge>
              </div>
            </div>
            {isRunning && (
              <div className="mt-2 border-t border-border/30 pt-2">
                <StatsBar
                  totalTokens={state?.totalTokens || 0}
                  apiCalls={state?.apiCalls || 0}
                  elapsedTime={elapsedTime}
                  phasesCompleted={phasesCompleted}
                  totalPhases={state?.phases?.length || 5}
                  discoveryCount={safeDiscoveries.length}
                />
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-[1800px] px-4 py-3">
          <div className="grid gap-3 xl:grid-cols-[1fr,340px]">
            {/* Left Column */}
            <div className="space-y-3">
              {/* Agent Grid */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-xs font-medium text-muted-foreground">Agent Network</h2>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {safeAgents.reduce((sum, a) => sum + (a?.tasksCompleted || 0), 0)} tasks
                  </span>
                </div>
                <ErrorBoundary>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {safeAgents.map((agent) =>
                      agent ? (
                        <AgentCard key={agent.id} agent={agent} streamingContent={streamingContent?.[agent.id] || ""} />
                      ) : null,
                    )}
                  </div>
                </ErrorBoundary>
              </div>

              {/* Tabs - Reorganized */}
              <Tabs defaultValue="console" className="w-full">
                <TabsList className="h-7 bg-muted/50 flex-wrap gap-0.5">
                  <TabsTrigger value="console" className="text-[10px] gap-1 h-5 px-2">
                    <Terminal className="h-3 w-3" />
                    Console
                  </TabsTrigger>
                  <TabsTrigger value="solve" className="text-[10px] gap-1 h-5 px-2">
                    <Zap className="h-3 w-3" />
                    Solve
                  </TabsTrigger>
                  <TabsTrigger value="network" className="text-[10px] gap-1 h-5 px-2">
                    <GitBranch className="h-3 w-3" />
                    Network
                  </TabsTrigger>
                  <TabsTrigger value="matrix" className="text-[10px] gap-1 h-5 px-2">
                    <Grid3X3 className="h-3 w-3" />
                    Matrix
                  </TabsTrigger>
                  <TabsTrigger value="tools" className="text-[10px] gap-1 h-5 px-2">
                    <Wrench className="h-3 w-3" />
                    Tools
                  </TabsTrigger>
                  <TabsTrigger value="validator" className="text-[10px] gap-1 h-5 px-2">
                    <Search className="h-3 w-3" />
                    Validate
                  </TabsTrigger>
                  {pendingRequests > 0 && (
                    <TabsTrigger value="requests" className="text-[10px] gap-1 h-5 px-2 relative">
                      <MessageSquarePlus className="h-3 w-3" />
                      AI
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-500 text-[8px] flex items-center justify-center text-black font-bold">
                        {pendingRequests}
                      </span>
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="console" className="mt-2">
                  <ErrorBoundary>
                    <SystemConsole logs={safeConsoleLogs} maxHeight="280px" onClear={clearConsoleLogs} />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="solve" className="mt-2">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <ErrorBoundary>
                      <DerivationDashboard
                        onKeyFound={handleDerivedKeyFound}
                        onValidKeyFound={handleValidDerivedKey}
                        onRunningChange={setDerivationRunning}
                      />
                    </ErrorBoundary>
                    <ErrorBoundary>
                      <SolutionTester onMatchFound={handleSolutionTesterMatch} onRunningChange={setTesterRunning} />
                    </ErrorBoundary>
                  </div>
                </TabsContent>

                <TabsContent value="network" className="mt-2">
                  <ErrorBoundary>
                    <AgentNetwork agents={safeAgents} activeConnections={activeConnections} />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="matrix" className="mt-2">
                  <ErrorBoundary>
                    <MatrixVisualization showSpiral={state?.currentPhase === 1 && isRunning} />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="tools" className="mt-2">
                  <ErrorBoundary>
                    <ToolExecutionPanel executions={state?.toolExecutions || []} />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="validator" className="mt-2">
                  <ErrorBoundary>
                    <KeyValidator
                      externalKeys={manualValidatorKeys}
                      onKeyValidated={(attempt) => {
                        if (attempt.result.matchesPuzzle && attempt.result.address) {
                          const winner: WinningKey = {
                            key: attempt.key,
                            address: attempt.result.address,
                            method: "Manual Validation",
                            timestamp: new Date(),
                          }
                          setWinningKey(winner)
                          setShowWinnerModal(true)
                          if (typeof window !== "undefined") {
                            localStorage.setItem("gsmg_winning_key", JSON.stringify(winner))
                          }
                        }
                      }}
                    />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="requests" className="mt-2">
                  <ErrorBoundary>
                    <AIRequestsLog
                      requests={safeAiRequests}
                      onAcknowledge={acknowledgeAIRequest}
                      onImplement={implementAIRequest}
                      onReject={rejectAIRequest}
                    />
                  </ErrorBoundary>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-3">
              <SystemStatus
                agentsRunning={isRunning}
                derivationRunning={derivationRunning}
                testerRunning={testerRunning}
                keysFound={safeFoundKeys.length}
                matchFound={puzzleMatches > 0}
              />

              <ControlPanel
                isRunning={isRunning}
                startTime={state?.startTime}
                onStart={() => runAutonomousLoop()}
                onStop={stopSystem}
                onReset={() => resetSystem?.()}
                model={model}
                onModelChange={setModel}
                continuousMode={continuousMode}
                onContinuousModeChange={(enabled) => setContinuousMode?.(enabled)}
                totalTokens={state?.totalTokens || 0}
                apiCalls={state?.apiCalls || 0}
                iterationCount={state?.iterationCount || iterationCount}
              />

              <PhaseProgress
                phases={safePhaseStatuses}
                currentPhase={state?.currentPhase || 1}
                totalProgress={totalProgress}
              />

              <BlockchainMonitor />

              <PuzzleInfo />

              <FoundKeysWindow
                keys={safeFoundKeys}
                onClearKeys={clearFoundKeys}
                onKeySelect={(key) => {
                  setManualValidatorKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))
                }}
              />

              <DiscoveryFeed discoveries={safeDiscoveries} />
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
