"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, ExternalLink, Bitcoin, Key, PartyPopper, Sparkles } from "lucide-react"
import confetti from "canvas-confetti"

interface WinningKey {
  key: string
  address: string
  method: string
  timestamp: Date
  iteration?: number
}

interface WinnerDisplayProps {
  winningKey: WinningKey | null
  onClose: () => void
  puzzleAddress: string
  prizeAmount: string
}

export function WinnerDisplay({ winningKey, onClose, puzzleAddress, prizeAmount }: WinnerDisplayProps) {
  const [copied, setCopied] = useState<"key" | "address" | null>(null)
  const [showFull, setShowFull] = useState(false)

  useEffect(() => {
    if (winningKey) {
      // Trigger confetti
      const duration = 5000
      const end = Date.now() + duration

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#FFD700", "#FFA500", "#FF6347"],
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#FFD700", "#FFA500", "#FF6347"],
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }
      frame()
    }
  }, [winningKey])

  const copyToClipboard = async (text: string, type: "key" | "address") => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!winningKey) return null

  const maskKey = (key: string) => {
    if (showFull) return key
    return `${key.slice(0, 8)}${"*".repeat(key.length - 16)}${key.slice(-8)}`
  }

  return (
    <Dialog open={!!winningKey} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg bg-gradient-to-br from-amber-950/90 via-yellow-950/90 to-orange-950/90 border-amber-500/50">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-3 text-2xl text-amber-400">
            <PartyPopper className="h-8 w-8 animate-bounce" />
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent font-bold">
              PUZZLE SOLVED!
            </span>
            <PartyPopper className="h-8 w-8 animate-bounce" style={{ animationDelay: "0.1s" }} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prize Banner */}
          <div className="text-center py-4 rounded-lg bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Bitcoin className="h-8 w-8 text-amber-400" />
              <span className="text-4xl font-bold text-amber-400">{prizeAmount}</span>
            </div>
            <p className="text-amber-300/70 text-sm">Prize Unlocked!</p>
          </div>

          {/* Private Key Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Key className="h-4 w-4" />
              <span>Private Key</span>
              <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                {winningKey.method}
              </Badge>
            </div>
            <div className="relative">
              <div className="font-mono text-xs bg-black/50 rounded-lg p-3 border border-amber-500/30 break-all">
                <code className="text-amber-200">{maskKey(winningKey.key)}</code>
              </div>
              <div className="absolute right-2 top-2 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs text-amber-400 hover:text-amber-300"
                  onClick={() => setShowFull(!showFull)}
                >
                  {showFull ? "Hide" : "Reveal"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-amber-400 hover:text-amber-300"
                  onClick={() => copyToClipboard(winningKey.key, "key")}
                >
                  {copied === "key" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Sparkles className="h-4 w-4" />
              <span>Derived Address</span>
              {winningKey.address === puzzleAddress && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Matches Target!</Badge>
              )}
            </div>
            <div className="relative">
              <div className="font-mono text-xs bg-black/50 rounded-lg p-3 border border-green-500/30">
                <code className="text-green-300">{winningKey.address}</code>
              </div>
              <div className="absolute right-2 top-2 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                  onClick={() => copyToClipboard(winningKey.address, "address")}
                >
                  {copied === "address" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
                <a
                  href={`https://www.blockchain.com/btc/address/${winningKey.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-6 w-6 flex items-center justify-center text-green-400 hover:text-green-300"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Target Address Verification */}
          <div className="rounded-lg bg-black/30 border border-border/30 p-3">
            <div className="text-xs text-muted-foreground mb-1">Target Address</div>
            <code className="text-xs font-mono text-foreground/70">{puzzleAddress}</code>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-2 text-xs text-amber-300/70">
            <span>Found at: {winningKey.timestamp.toLocaleString()}</span>
            {winningKey.iteration && <span>| Iteration: {winningKey.iteration.toLocaleString()}</span>}
          </div>

          {/* Warning */}
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
            <strong>IMPORTANT:</strong> Transfer funds immediately to a secure wallet you control. Never share this
            private key with anyone. The key has been stored locally but should be backed up securely.
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              onClick={() => copyToClipboard(winningKey.key, "key")}
            >
              <Copy className="h-4 w-4 mr-2" />
              {copied === "key" ? "Copied!" : "Copy Private Key"}
            </Button>
            <Button variant="outline" className="border-amber-500/50 text-amber-400 bg-transparent" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
