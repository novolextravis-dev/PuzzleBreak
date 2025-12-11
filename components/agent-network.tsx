"use client"

import { useEffect, useRef } from "react"
import type { Agent } from "@/lib/agent-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Network } from "lucide-react"

interface AgentNetworkProps {
  agents: Agent[]
  activeConnections?: Array<{ from: string; to: string }>
}

const AGENT_POSITIONS: Record<string, { x: number; y: number }> = {
  orchestrator: { x: 150, y: 50 },
  cryptographer: { x: 50, y: 130 },
  analyst: { x: 250, y: 130 },
  researcher: { x: 80, y: 220 },
  validator: { x: 220, y: 220 },
}

const AGENT_COLORS: Record<string, string> = {
  orchestrator: "#a78bfa",
  cryptographer: "#34d399",
  analyst: "#22d3ee",
  researcher: "#fbbf24",
  validator: "#2dd4bf",
}

export function AgentNetwork({ agents, activeConnections = [] }: AgentNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = 300 * dpr
    canvas.height = 270 * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, 300, 270)

    // Draw connections (lines between agents)
    const connections = [
      ["orchestrator", "cryptographer"],
      ["orchestrator", "analyst"],
      ["orchestrator", "researcher"],
      ["orchestrator", "validator"],
      ["cryptographer", "validator"],
      ["analyst", "researcher"],
    ]

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
    ctx.lineWidth = 1

    connections.forEach(([from, to]) => {
      const fromPos = AGENT_POSITIONS[from]
      const toPos = AGENT_POSITIONS[to]
      ctx.beginPath()
      ctx.moveTo(fromPos.x, fromPos.y)
      ctx.lineTo(toPos.x, toPos.y)
      ctx.stroke()
    })

    // Draw active connections with animation
    activeConnections.forEach(({ from, to }) => {
      const fromAgent = agents.find((a) => a.role === from)
      const toAgent = agents.find((a) => a.role === to)
      if (!fromAgent || !toAgent) return

      const fromPos = AGENT_POSITIONS[from]
      const toPos = AGENT_POSITIONS[to]

      const gradient = ctx.createLinearGradient(fromPos.x, fromPos.y, toPos.x, toPos.y)
      gradient.addColorStop(0, AGENT_COLORS[from])
      gradient.addColorStop(1, AGENT_COLORS[to])

      ctx.strokeStyle = gradient
      ctx.lineWidth = 2
      ctx.shadowBlur = 10
      ctx.shadowColor = AGENT_COLORS[from]

      ctx.beginPath()
      ctx.moveTo(fromPos.x, fromPos.y)
      ctx.lineTo(toPos.x, toPos.y)
      ctx.stroke()

      ctx.shadowBlur = 0
    })

    // Draw agent nodes
    agents.forEach((agent) => {
      const pos = AGENT_POSITIONS[agent.role]
      const color = AGENT_COLORS[agent.role]
      const isActive = agent.status === "working" || agent.status === "thinking"

      // Outer glow for active agents
      if (isActive) {
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 24, 0, Math.PI * 2)
        ctx.fillStyle = `${color}33`
        ctx.fill()
      }

      // Node circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2)
      ctx.fillStyle = isActive ? color : `${color}66`
      ctx.fill()

      // Inner circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
      ctx.fillStyle = isActive ? "#fff" : `${color}`
      ctx.fill()

      // Agent label
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
      ctx.font = "10px monospace"
      ctx.textAlign = "center"
      ctx.fillText(agent.name, pos.x, pos.y + 30)

      // Status indicator
      if (agent.status !== "idle") {
        ctx.fillStyle = color
        ctx.font = "8px monospace"
        ctx.fillText(agent.status.toUpperCase(), pos.x, pos.y + 40)
      }
    })
  }, [agents, activeConnections])

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="border-b border-border/50 py-2 px-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Network className="h-4 w-4 text-primary" />
          Agent Network
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <canvas ref={canvasRef} width={300} height={270} className="w-full" style={{ maxHeight: "270px" }} />
      </CardContent>
    </Card>
  )
}
