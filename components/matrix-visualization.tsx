"use client"

import { GSMG_PUZZLE_MATRIX, parseMatrix } from "@/lib/crypto-tools"

interface MatrixVisualizationProps {
  highlightedCells?: number[]
  showSpiral?: boolean
}

export function MatrixVisualization({ highlightedCells = [], showSpiral }: MatrixVisualizationProps) {
  const matrix = parseMatrix(GSMG_PUZZLE_MATRIX)

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">14x14 Binary Matrix</span>
        {showSpiral && <span className="text-xs text-primary">Spiral decode active</span>}
      </div>
      <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(14, 1fr)` }}>
        {matrix.flat().map((cell, index) => {
          const isHighlighted = highlightedCells.includes(index)
          return (
            <div
              key={index}
              className={`
                aspect-square flex items-center justify-center text-[8px] font-mono rounded-sm transition-all
                ${cell === 1 ? "bg-primary/80 text-primary-foreground" : "bg-muted/30 text-muted-foreground"}
                ${isHighlighted ? "ring-1 ring-accent scale-110" : ""}
              `}
            >
              {cell}
            </div>
          )
        })}
      </div>
    </div>
  )
}
