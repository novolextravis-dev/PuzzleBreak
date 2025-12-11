"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Play, Square, CheckCircle2, XCircle, Trophy, Key } from "lucide-react"
import { sha256Hash, xorHexStrings } from "@/lib/crypto-tools"
import { validatePrivateKey, GSMG_PUZZLE_ADDRESS } from "@/lib/bitcoin-validator"
import { PASSWORD_CANDIDATES, ALL_TOKENS, XOR_CHAIN_TOKENS, GSMG_PUZZLE_KNOWLEDGE } from "@/lib/puzzle-knowledge"
import CryptoJS from "crypto-js"

interface TestResult {
  input: string
  method: string
  derivedKey: string
  address: string | null
  matchesPuzzle: boolean
  timestamp: Date
}

interface SolutionTesterProps {
  onMatchFound?: (key: string, address: string) => void
  onRunningChange?: (running: boolean) => void
}

export function SolutionTester({ onMatchFound, onRunningChange }: SolutionTesterProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [continuousMode, setContinuousMode] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [progress, setProgress] = useState(0)
  const [currentTest, setCurrentTest] = useState("")
  const [matchFound, setMatchFound] = useState<TestResult | null>(null)
  const [cycle, setCycle] = useState(0)
  const shouldContinueRef = useRef(false)

  useEffect(() => {
    onRunningChange?.(isRunning)
  }, [isRunning, onRunningChange])

  const testKey = useCallback(
    (key: string, input: string, method: string): TestResult => {
      const validation = validatePrivateKey(key)
      const result: TestResult = {
        input: input.length > 40 ? input.slice(0, 37) + "..." : input,
        method,
        derivedKey: key,
        address: validation.address || null,
        matchesPuzzle: validation.matchesPuzzle,
        timestamp: new Date(),
      }

      if (validation.matchesPuzzle && onMatchFound && validation.address) {
        onMatchFound(key, validation.address)
        setMatchFound(result)
      }

      return result
    },
    [onMatchFound],
  )

  const runAllTests = useCallback(async () => {
    if (isRunning) return

    setIsRunning(true)
    shouldContinueRef.current = true
    setResults([])
    setProgress(0)
    setMatchFound(null)
    let currentCycle = 0

    do {
      currentCycle++
      setCycle(currentCycle)

      const allTests: Array<{ input: string; key: string; method: string }> = []

      // Test passwords
      if (Array.isArray(PASSWORD_CANDIDATES)) {
        PASSWORD_CANDIDATES.forEach((pw, idx) => {
          if (pw) {
            const cycleVar = currentCycle > 1 ? `_c${currentCycle}` : ""
            allTests.push({ input: pw, key: sha256Hash(pw + cycleVar), method: "SHA256" })
            allTests.push({ input: pw, key: sha256Hash(sha256Hash(pw) + cycleVar), method: "2xSHA256" })
          }
        })
      }

      // Test tokens
      if (Array.isArray(ALL_TOKENS)) {
        ALL_TOKENS.forEach((token) => {
          if (token) allTests.push({ input: token, key: sha256Hash(token), method: "Token" })
        })
      }

      // XOR chains
      if (Array.isArray(XOR_CHAIN_TOKENS) && XOR_CHAIN_TOKENS.length > 0) {
        try {
          const rotated = [...XOR_CHAIN_TOKENS]
          for (let r = 0; r < currentCycle % XOR_CHAIN_TOKENS.length; r++) {
            rotated.push(rotated.shift()!)
          }
          let xorResult = sha256Hash(rotated[0] || "")
          for (let i = 1; i < rotated.length; i++) {
            if (rotated[i]) xorResult = xorHexStrings(xorResult, sha256Hash(rotated[i]))
          }
          allTests.push({ input: `XOR#${currentCycle}`, key: xorResult, method: "XOR" })
        } catch (e) {}
      }

      // Known hashes
      if (GSMG_PUZZLE_KNOWLEDGE?.knownHashes) {
        Object.entries(GSMG_PUZZLE_KNOWLEDGE.knownHashes).forEach(([name, hash]) => {
          if (hash && typeof hash === "string") {
            allTests.push({ input: name, key: hash, method: "Hash" })
          }
        })
      }

      // PBKDF2
      const salts = ["gsmg.io", GSMG_PUZZLE_ADDRESS]
      const iterations = [2048, 4096, 10000][currentCycle % 3]
      ;(PASSWORD_CANDIDATES || []).slice(0, 3).forEach((pw) => {
        if (pw) {
          salts.forEach((salt) => {
            try {
              const key = CryptoJS.PBKDF2(pw, salt, {
                keySize: 256 / 32,
                iterations,
                hasher: CryptoJS.algo.SHA256,
              }).toString()
              allTests.push({ input: `${pw.slice(0, 15)}@${iterations}`, key, method: "PBKDF2" })
            } catch (e) {}
          })
        }
      })

      // Claimed WIF
      const claimedWIF = GSMG_PUZZLE_KNOWLEDGE?.claimedSolutions?.kaibuzz0?.claimedKey
      if (claimedWIF) {
        allTests.push({ input: "Claimed WIF", key: claimedWIF, method: "WIF" })
      }

      // Run tests
      for (let i = 0; i < allTests.length && shouldContinueRef.current; i++) {
        const test = allTests[i]
        if (!test) continue

        setCurrentTest(`${test.method}: ${test.input}`)
        setProgress(Math.round((i / allTests.length) * 100))

        const result = testKey(test.key, test.input, test.method)
        setResults((prev) => [...prev.slice(-150), result])

        if (result.matchesPuzzle) {
          shouldContinueRef.current = false
          setIsRunning(false)
          return
        }

        await new Promise((resolve) => setTimeout(resolve, 3))
      }

      setProgress(100)
      if (continuousMode && shouldContinueRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    } while (continuousMode && shouldContinueRef.current && !matchFound)

    setIsRunning(false)
    setCurrentTest("")
  }, [testKey, continuousMode, isRunning, matchFound])

  const stopTests = useCallback(() => {
    shouldContinueRef.current = false
    setIsRunning(false)
  }, [])

  useEffect(() => {
    if (continuousMode && !isRunning && !matchFound) {
      runAllTests()
    }
  }, [continuousMode])

  const matches = results.filter((r) => r.matchesPuzzle)
  const validKeys = results.filter((r) => r.address !== null)

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-purple-400" />
            Solution Tester
            {cycle > 0 && (
              <Badge variant="outline" className="text-[10px] h-4">
                #{cycle}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Switch
                id="continuous-tester"
                checked={continuousMode}
                onCheckedChange={setContinuousMode}
                disabled={isRunning && !continuousMode}
                className="scale-75"
              />
              <Label htmlFor="continuous-tester" className="text-[10px] text-muted-foreground">
                Auto
              </Label>
            </div>
            {isRunning ? (
              <Button size="sm" variant="destructive" className="h-6 text-[10px] px-2" onClick={stopTests}>
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
            ) : (
              <Button size="sm" variant="default" className="h-6 text-[10px] px-2" onClick={runAllTests}>
                <Play className="h-3 w-3 mr-1" />
                Test
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {matchFound && (
          <div className="rounded bg-green-500/10 border border-green-500/30 p-2 animate-pulse">
            <div className="flex items-center gap-1.5 text-green-400 text-xs font-semibold">
              <Trophy className="h-3.5 w-3.5" />
              MATCH FOUND!
            </div>
            <code className="text-[9px] bg-background/50 rounded px-1 block mt-1 break-all">
              {matchFound.derivedKey}
            </code>
          </div>
        )}

        {isRunning && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground truncate flex-1 mr-2">{currentTest}</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}

        <div className="flex gap-1.5 text-[10px] flex-wrap">
          <Badge variant="outline" className="font-mono h-4 px-1.5">
            {results.length} tested
          </Badge>
          <Badge variant="outline" className="font-mono h-4 px-1.5 bg-blue-500/10 text-blue-400 border-blue-500/30">
            {validKeys.length} valid
          </Badge>
          {matches.length > 0 && (
            <Badge className="font-mono h-4 px-1.5 bg-green-500/20 text-green-400 border-green-500/30">
              {matches.length} MATCH
            </Badge>
          )}
        </div>

        <ScrollArea className="h-32">
          <div className="space-y-0.5">
            {results
              .slice(-15)
              .reverse()
              .map((result, i) => (
                <div
                  key={i}
                  className={`text-[9px] rounded px-1.5 py-0.5 flex items-center gap-1.5 ${
                    result.matchesPuzzle
                      ? "bg-green-500/10 border border-green-500/30"
                      : result.address
                        ? "bg-blue-500/5 border border-blue-500/20"
                        : "bg-muted/20"
                  }`}
                >
                  {result.matchesPuzzle ? (
                    <Trophy className="h-2.5 w-2.5 text-green-400 flex-shrink-0" />
                  ) : result.address ? (
                    <CheckCircle2 className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-2.5 w-2.5 text-muted-foreground/50 flex-shrink-0" />
                  )}
                  <span className="text-muted-foreground w-10">{result.method}</span>
                  <span className="truncate flex-1">{result.input}</span>
                </div>
              ))}
          </div>
        </ScrollArea>

        {results.length === 0 && !isRunning && (
          <div className="text-center py-4 text-muted-foreground text-[10px]">
            <Key className="h-6 w-6 mx-auto mb-1.5 opacity-30" />
            <p>Click "Test" or enable "Auto" to start</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
