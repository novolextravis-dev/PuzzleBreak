"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Key,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Bitcoin,
  Trophy,
  Maximize2,
  Clock,
  Hash,
  Wallet,
} from "lucide-react"
import type { KeyValidationResult } from "@/lib/agent-types"

export interface FoundKey {
  key: string
  maskedKey: string
  validation: KeyValidationResult
  source: string
  iteration?: number
  timestamp: Date
  derivationMethod?: string
}

interface FoundKeysWindowProps {
  keys: FoundKey[]
  puzzleAddress: string
  onClearKeys?: () => void
}

export function FoundKeysWindow({ keys, puzzleAddress, onClearKeys }: FoundKeysWindowProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const validKeys = keys.filter((k) => k.validation.isValid)
  const puzzleMatches = keys.filter((k) => k.validation.matchesPuzzle)
  const invalidKeys = keys.filter((k) => !k.validation.isValid)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const maskKey = (key: string): string => {
    if (key.length <= 12) return key
    return `${key.slice(0, 6)}...${key.slice(-6)}`
  }

  const KeyCard = ({ foundKey, highlight }: { foundKey: FoundKey; highlight: boolean }) => (
    <div
      className={`rounded-lg border p-3 space-y-2 transition-all ${
        foundKey.validation.matchesPuzzle
          ? "bg-green-500/10 border-green-500/50 ring-1 ring-green-500/30"
          : foundKey.validation.isValid
            ? "bg-blue-500/5 border-blue-500/30"
            : "bg-muted/30 border-border/50"
      } ${highlight ? "animate-pulse" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {foundKey.validation.matchesPuzzle ? (
            <Trophy className="h-4 w-4 text-green-400" />
          ) : foundKey.validation.isValid ? (
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <Badge
            variant={foundKey.validation.matchesPuzzle ? "default" : "outline"}
            className={
              foundKey.validation.matchesPuzzle
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : foundKey.validation.isValid
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : ""
            }
          >
            {foundKey.validation.matchesPuzzle
              ? "PUZZLE MATCH!"
              : foundKey.validation.isValid
                ? `Valid ${foundKey.validation.format}`
                : "Invalid"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(foundKey.key)}>
            <Copy className="h-3 w-3" />
          </Button>
          {foundKey.validation.address && (
            <a
              href={`https://www.blockchain.com/btc/address/${foundKey.validation.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Key Display */}
      <div className="font-mono text-xs bg-background/50 rounded px-2 py-1.5">
        <code className="text-foreground/80 break-all">
          {expandedKey === foundKey.key ? foundKey.key : maskKey(foundKey.key)}
        </code>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 ml-2 text-[10px] px-1"
          onClick={() => setExpandedKey(expandedKey === foundKey.key ? null : foundKey.key)}
        >
          {expandedKey === foundKey.key ? "Hide" : "Show"}
        </Button>
      </div>

      {/* Address */}
      {foundKey.validation.address && (
        <div className="flex items-center gap-2 text-xs">
          <Wallet className="h-3 w-3 text-muted-foreground" />
          <code className="font-mono text-foreground/70 truncate">{foundKey.validation.address}</code>
        </div>
      )}

      {/* Metadata */}
      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {foundKey.timestamp.toLocaleTimeString()}
        </span>
        {foundKey.iteration && (
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            Iteration {foundKey.iteration}
          </span>
        )}
        {foundKey.derivationMethod && (
          <Badge variant="outline" className="text-[10px] h-4">
            {foundKey.derivationMethod}
          </Badge>
        )}
      </div>

      {/* Source */}
      <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-1.5">
        Source: {foundKey.source}
      </div>
    </div>
  )

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Key className="h-4 w-4 text-amber-400" />
            Found Keys
            {puzzleMatches.length > 0 && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse ml-2">
                <Trophy className="h-3 w-3 mr-1" />
                MATCH FOUND!
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {validKeys.length} valid / {keys.length} total
            </Badge>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-amber-400" />
                    All Discovered Keys ({keys.length})
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-3">
                    {puzzleMatches.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2">
                          <Trophy className="h-4 w-4" />
                          Puzzle Matches ({puzzleMatches.length})
                        </h3>
                        {puzzleMatches.map((k, i) => (
                          <KeyCard key={`match-${i}`} foundKey={k} highlight />
                        ))}
                      </div>
                    )}
                    {validKeys.filter((k) => !k.validation.matchesPuzzle).length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-blue-400">
                          Valid Keys ({validKeys.filter((k) => !k.validation.matchesPuzzle).length})
                        </h3>
                        {validKeys
                          .filter((k) => !k.validation.matchesPuzzle)
                          .map((k, i) => (
                            <KeyCard key={`valid-${i}`} foundKey={k} highlight={false} />
                          ))}
                      </div>
                    )}
                    {invalidKeys.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-muted-foreground">
                          Invalid Attempts ({invalidKeys.length})
                        </h3>
                        {invalidKeys.map((k, i) => (
                          <KeyCard key={`invalid-${i}`} foundKey={k} highlight={false} />
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {/* Target Address */}
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-2 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Bitcoin className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] font-medium text-amber-400">Target Address</span>
          </div>
          <code className="text-[10px] text-muted-foreground font-mono">{puzzleAddress}</code>
        </div>

        {/* Keys List */}
        <ScrollArea className="h-[240px]">
          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
              <Key className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm">No keys discovered yet</p>
              <p className="text-[10px]">Agents will automatically validate found keys</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Show puzzle matches first */}
              {puzzleMatches.map((k, i) => (
                <KeyCard key={`match-${i}`} foundKey={k} highlight />
              ))}
              {/* Then valid keys */}
              {validKeys
                .filter((k) => !k.validation.matchesPuzzle)
                .slice(0, 5)
                .map((k, i) => (
                  <KeyCard key={`valid-${i}`} foundKey={k} highlight={false} />
                ))}
              {/* Show count if more */}
              {validKeys.filter((k) => !k.validation.matchesPuzzle).length > 5 && (
                <div className="text-center text-xs text-muted-foreground py-2">
                  + {validKeys.filter((k) => !k.validation.matchesPuzzle).length - 5} more valid keys
                </div>
              )}
              {/* Recent invalid attempts */}
              {invalidKeys.slice(0, 3).map((k, i) => (
                <KeyCard key={`invalid-${i}`} foundKey={k} highlight={false} />
              ))}
              {invalidKeys.length > 3 && (
                <div className="text-center text-xs text-muted-foreground py-2">
                  + {invalidKeys.length - 3} more invalid attempts
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        {keys.length > 0 && onClearKeys && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-7 text-xs text-muted-foreground"
              onClick={onClearKeys}
            >
              Clear History
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
