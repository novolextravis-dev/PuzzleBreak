"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Sparkles } from "lucide-react"

interface DiscoveryFeedProps {
  discoveries?: string[]
}

export function DiscoveryFeed({ discoveries }: DiscoveryFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const safeDiscoveries = discoveries || []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [safeDiscoveries])

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Discoveries
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {safeDiscoveries.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[180px]">
          <div ref={scrollRef} className="p-2 space-y-1.5">
            {safeDiscoveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
                <Sparkles className="h-6 w-6 mb-2" />
                <p className="text-xs">Start agents to discover clues</p>
              </div>
            ) : (
              safeDiscoveries.map((discovery, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded-md bg-amber-400/5 border border-amber-400/20 p-2"
                >
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-amber-400/20 text-[10px] font-bold text-amber-400">
                    {index + 1}
                  </span>
                  <span className="text-xs text-foreground/90 leading-relaxed">{discovery}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
