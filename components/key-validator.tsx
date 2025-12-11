"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Wallet,
  Search,
  Trash2,
  Bitcoin,
  Copy,
  ExternalLink,
} from "lucide-react"
import {
  validatePrivateKey,
  checkAddressBalance,
  maskPrivateKey,
  generateKeyAttemptId,
  extractPotentialKeys,
  GSMG_PUZZLE_ADDRESS,
  GSMG_PUZZLE_PRIZE,
  type KeyAttempt,
  type BalanceCheckResult,
} from "@/lib/bitcoin-validator"

interface KeyValidatorProps {
  onKeyValidated?: (attempt: KeyAttempt) => void
  externalKeys?: string[]
}

export function KeyValidator({ onKeyValidated, externalKeys = [] }: KeyValidatorProps) {
  const [inputKey, setInputKey] = useState("")
  const [attempts, setAttempts] = useState<KeyAttempt[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [puzzleBalance, setPuzzleBalance] = useState<BalanceCheckResult | null>(null)
  const [isCheckingPuzzle, setIsCheckingPuzzle] = useState(false)
  const [processedExternalKeys, setProcessedExternalKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    const processNewKeys = async () => {
      const newKeys = externalKeys.filter((key) => !processedExternalKeys.has(key))

      if (newKeys.length === 0) return

      for (const key of newKeys) {
        const result = validatePrivateKey(key)
        const attempt: KeyAttempt = {
          id: generateKeyAttemptId(),
          key,
          maskedKey: maskPrivateKey(key),
          result,
          source: "Agent Discovery",
          timestamp: new Date(),
        }

        if (result.isValid && result.address) {
          attempt.balanceCheck = await checkAddressBalance(result.address)
        }

        setAttempts((prev) => [attempt, ...prev])
        onKeyValidated?.(attempt)
        setProcessedExternalKeys((prev) => new Set([...prev, key]))
      }
    }

    processNewKeys()
  }, [externalKeys, processedExternalKeys, onKeyValidated])

  const handleValidate = async () => {
    if (!inputKey.trim()) return

    setIsValidating(true)
    try {
      const keys = extractPotentialKeys(inputKey) || [inputKey.trim()]

      for (const key of keys) {
        const result = validatePrivateKey(key)
        const attempt: KeyAttempt = {
          id: generateKeyAttemptId(),
          key,
          maskedKey: maskPrivateKey(key),
          result,
          source: "Manual Input",
          timestamp: new Date(),
        }

        if (result.isValid && result.address) {
          attempt.balanceCheck = await checkAddressBalance(result.address)
        }

        setAttempts((prev) => [attempt, ...prev])
        onKeyValidated?.(attempt)
      }

      setInputKey("")
    } catch (error) {
      console.error("[v0] Key validation error:", error)
    } finally {
      setIsValidating(false)
    }
  }

  const checkPuzzleBalance = async () => {
    setIsCheckingPuzzle(true)
    try {
      const balance = await checkAddressBalance(GSMG_PUZZLE_ADDRESS)
      setPuzzleBalance(balance)
    } catch (error) {
      console.error("[v0] Balance check error:", error)
    } finally {
      setIsCheckingPuzzle(false)
    }
  }

  const clearAttempts = () => {
    setAttempts([])
    setProcessedExternalKeys(new Set())
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error("[v0] Copy failed:", error)
    }
  }

  const getStatusBadge = (attempt: KeyAttempt) => {
    if (attempt.result.matchesPuzzle) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          PUZZLE MATCH
        </Badge>
      )
    }
    if (attempt.result.isValid) {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Valid Key
        </Badge>
      )
    }
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
        <XCircle className="h-3 w-3" />
        Invalid
      </Badge>
    )
  }

  const validCount = attempts.filter((a) => a.result.isValid).length
  const puzzleMatches = attempts.filter((a) => a.result.matchesPuzzle).length

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Key className="h-4 w-4 text-amber-400" />
            Manual Key Validator
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {validCount}/{attempts.length} valid
            </Badge>
            {puzzleMatches > 0 && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
                {puzzleMatches} MATCH!
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Puzzle Wallet Status */}
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bitcoin className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">Target Puzzle Wallet</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
              onClick={checkPuzzleBalance}
              disabled={isCheckingPuzzle}
            >
              {isCheckingPuzzle ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              <span className="ml-1">Check Balance</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-[10px] text-muted-foreground font-mono flex-1 truncate">{GSMG_PUZZLE_ADDRESS}</code>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => copyToClipboard(GSMG_PUZZLE_ADDRESS)}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <a
              href={`https://www.blockchain.com/btc/address/${GSMG_PUZZLE_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {puzzleBalance && (
            <div className="mt-2 pt-2 border-t border-amber-500/20 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Balance:</span>
                <span className="ml-1 font-mono text-amber-400">{puzzleBalance.balanceBTC} BTC</span>
              </div>
              <div>
                <span className="text-muted-foreground">Transactions:</span>
                <span className="ml-1 font-mono">{puzzleBalance.txCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Prize:</span>
                <span className="ml-1 font-mono text-green-400">{GSMG_PUZZLE_PRIZE}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className={`ml-1 font-mono ${puzzleBalance.hasBalance ? "text-green-400" : "text-red-400"}`}>
                  {puzzleBalance.hasBalance ? "ACTIVE" : "EMPTY"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Enter a private key to validate:</label>
          <div className="flex gap-2">
            <Input
              placeholder="WIF (5..., K..., L...) or 64-char hex..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleValidate()}
              className="font-mono text-xs h-9 bg-background/50"
            />
            <Button size="sm" onClick={handleValidate} disabled={isValidating || !inputKey.trim()} className="h-9 px-4">
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-1" />
                  Validate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Validation History ({attempts.length})</span>
          {attempts.length > 0 && (
            <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={clearAttempts}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {attempts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
                <Wallet className="h-6 w-6 mb-2" />
                <p className="text-xs">No keys validated yet</p>
                <p className="text-[10px]">Enter a key above or wait for agent discoveries</p>
              </div>
            ) : (
              attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className={`rounded-lg border p-2 space-y-1.5 ${
                    attempt.result.matchesPuzzle
                      ? "bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20"
                      : attempt.result.isValid
                        ? "bg-blue-500/5 border-blue-500/20"
                        : "bg-red-500/5 border-red-500/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {getStatusBadge(attempt)}
                    <span className="text-[10px] text-muted-foreground">{attempt.timestamp.toLocaleTimeString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <code className="text-[10px] font-mono text-foreground/80 flex-1">{attempt.maskedKey}</code>
                    <Badge variant="outline" className="text-[10px]">
                      {attempt.result.format}
                    </Badge>
                  </div>

                  {attempt.result.isValid && attempt.result.address && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-muted-foreground">Address:</span>
                      <code className="font-mono text-foreground/70 truncate">{attempt.result.address}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0"
                        onClick={() => copyToClipboard(attempt.result.address!)}
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  )}

                  {attempt.balanceCheck && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-muted-foreground">Balance:</span>
                      <span
                        className={`font-mono ${attempt.balanceCheck.hasBalance ? "text-green-400" : "text-muted-foreground"}`}
                      >
                        {attempt.balanceCheck.balanceBTC} BTC
                      </span>
                      {attempt.balanceCheck.hasBalance && (
                        <Badge className="bg-green-500/20 text-green-400 text-[9px] px-1">HAS FUNDS!</Badge>
                      )}
                    </div>
                  )}

                  {attempt.result.error && (
                    <div className="flex items-start gap-1 text-[10px] text-red-400">
                      <AlertTriangle className="h-3 w-3 flex-none mt-0.5" />
                      <span>{attempt.result.error}</span>
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground">Source: {attempt.source}</div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
