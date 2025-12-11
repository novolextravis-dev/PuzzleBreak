"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bitcoin, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { GSMG_PUZZLE_ADDRESS } from "@/lib/bitcoin-validator"

interface BlockchainData {
  balance: number
  totalReceived: number
  totalSent: number
  txCount: number
  lastUpdated: Date
  error?: string
}

export function BlockchainMonitor() {
  const [data, setData] = useState<BlockchainData | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchBalance = useCallback(async () => {
    setLoading(true)
    try {
      // Using blockchain.info API
      const response = await fetch(`https://blockchain.info/balance?active=${GSMG_PUZZLE_ADDRESS}&cors=true`)

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      const result = await response.json()
      const addressData = result[GSMG_PUZZLE_ADDRESS]

      setData({
        balance: addressData.final_balance / 100000000, // Convert satoshis to BTC
        totalReceived: addressData.total_received / 100000000,
        totalSent: addressData.total_sent || 0,
        txCount: addressData.n_tx,
        lastUpdated: new Date(),
      })
    } catch (error) {
      setData((prev) => ({
        ...(prev || { balance: 0, totalReceived: 0, totalSent: 0, txCount: 0, lastUpdated: new Date() }),
        error: `Failed to fetch: ${error instanceof Error ? error.message : "Unknown error"}`,
        lastUpdated: new Date(),
      }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchBalance, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [autoRefresh, fetchBalance])

  const formatBTC = (btc: number) => btc.toFixed(8)

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Bitcoin className="h-4 w-4 text-amber-400" />
            Puzzle Wallet Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={fetchBalance} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              className="h-6 text-[10px] px-2"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Auto: ON" : "Auto: OFF"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Address */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Address:</span>
          <code className="font-mono text-foreground/80 truncate flex-1">{GSMG_PUZZLE_ADDRESS}</code>
          <a
            href={`https://www.blockchain.com/btc/address/${GSMG_PUZZLE_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Balance Display */}
        {data && (
          <>
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-center">
              <div className="text-2xl font-bold text-amber-400 font-mono">{formatBTC(data.balance)} BTC</div>
              <div className="text-xs text-muted-foreground mt-1">Current Prize Balance</div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-muted/30 p-2">
                <div className="text-muted-foreground">Total Received</div>
                <div className="font-mono font-medium">{formatBTC(data.totalReceived)} BTC</div>
              </div>
              <div className="rounded bg-muted/30 p-2">
                <div className="text-muted-foreground">Transactions</div>
                <div className="font-mono font-medium">{data.txCount}</div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Updated: {data.lastUpdated.toLocaleTimeString()}
              </div>
              {data.balance > 0 ? (
                <Badge variant="outline" className="text-[10px] h-5 bg-green-500/10 text-green-400 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Prize Available
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-5 bg-red-500/10 text-red-400 border-red-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Empty / Claimed
                </Badge>
              )}
            </div>

            {data.error && <div className="text-[10px] text-red-400 bg-red-500/10 rounded p-2">{data.error}</div>}
          </>
        )}

        {!data && loading && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading blockchain data...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
