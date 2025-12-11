"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Bitcoin, Calendar, Target, AlertTriangle } from "lucide-react"

export function PuzzleInfo() {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2 border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Target className="h-4 w-4 text-primary" />
          GSMG.IO Puzzle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status</span>
          <Badge variant="secondary" className="bg-amber-400/20 text-amber-400 text-xs">
            <AlertTriangle className="mr-1 h-2.5 w-2.5" />
            Unsolved
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bitcoin className="h-3 w-3 text-amber-400" />
            Prize
          </span>
          <span className="font-mono text-sm font-semibold text-amber-400">1.5 BTC</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Started
          </span>
          <span className="text-xs">April 13, 2019</span>
        </div>
        <div className="rounded-md bg-muted/30 p-2">
          <p className="mb-1 text-[10px] text-muted-foreground uppercase tracking-wide">BTC Address</p>
          <code className="break-all text-[10px] font-mono text-foreground/80">1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe</code>
        </div>
        <a
          href="https://privatekeys.pw/puzzles/gsmg-puzzle"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-md bg-primary/10 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          View Original Puzzle
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  )
}
