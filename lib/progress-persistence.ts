"use client"

interface FoundKey {
  key: string
  maskedKey: string
  validation: {
    isValid: boolean
    format?: string
    address?: string
    matchesPuzzle: boolean
    error?: string
  }
  source: string
  iteration?: number
  timestamp: Date
  derivationMethod?: string
}

const STORAGE_KEYS = {
  FOUND_KEYS: "gsmg_found_keys",
  TESTED_KEYS: "gsmg_tested_keys",
  ITERATION_COUNT: "gsmg_iteration_count",
  DISCOVERIES: "gsmg_discoveries",
  LAST_SESSION: "gsmg_last_session",
}

export interface PersistedState {
  foundKeys: FoundKey[]
  testedKeysCount: number
  iterationCount: number
  discoveries: string[]
  lastSession: Date | null
}

export function saveFoundKeys(keys: FoundKey[]): void {
  try {
    const serializable = keys.map((k) => ({
      ...k,
      timestamp: k.timestamp.toISOString(),
    }))
    localStorage.setItem(STORAGE_KEYS.FOUND_KEYS, JSON.stringify(serializable))
  } catch (e) {
    console.warn("Failed to save found keys:", e)
  }
}

export function loadFoundKeys(): FoundKey[] {
  try {
    if (typeof window === "undefined") return []

    const stored = localStorage.getItem(STORAGE_KEYS.FOUND_KEYS)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed.map((k: FoundKey & { timestamp: string }) => ({
      ...k,
      timestamp: new Date(k.timestamp),
    }))
  } catch (e) {
    console.warn("Failed to load found keys:", e)
    return []
  }
}

export function saveTestedKeysCount(count: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TESTED_KEYS, count.toString())
  } catch (e) {
    console.warn("Failed to save tested keys count:", e)
  }
}

export function loadTestedKeysCount(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TESTED_KEYS)
    return stored ? Number.parseInt(stored, 10) : 0
  } catch (e) {
    return 0
  }
}

export function saveIterationCount(count: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ITERATION_COUNT, count.toString())
  } catch (e) {
    console.warn("Failed to save iteration count:", e)
  }
}

export function loadIterationCount(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ITERATION_COUNT)
    return stored ? Number.parseInt(stored, 10) : 0
  } catch (e) {
    return 0
  }
}

export function saveDiscoveries(discoveries: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DISCOVERIES, JSON.stringify(discoveries))
  } catch (e) {
    console.warn("Failed to save discoveries:", e)
  }
}

export function loadDiscoveries(): string[] {
  try {
    if (typeof window === "undefined") return []

    const stored = localStorage.getItem(STORAGE_KEYS.DISCOVERIES)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

export function saveLastSession(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SESSION, new Date().toISOString())
  } catch (e) {
    console.warn("Failed to save last session:", e)
  }
}

export function loadLastSession(): Date | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_SESSION)
    return stored ? new Date(stored) : null
  } catch (e) {
    return null
  }
}

export function clearAllPersistedState(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })
  } catch (e) {
    console.warn("Failed to clear persisted state:", e)
  }
}

export function loadPersistedState(): PersistedState {
  return {
    foundKeys: loadFoundKeys(),
    testedKeysCount: loadTestedKeysCount(),
    iterationCount: loadIterationCount(),
    discoveries: loadDiscoveries(),
    lastSession: loadLastSession(),
  }
}
