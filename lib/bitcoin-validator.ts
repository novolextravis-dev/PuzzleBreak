// Bitcoin Key Validation Library for GSMG Puzzle
// Uses proper secp256k1 elliptic curve cryptography
// NOTE: This uses a simplified but mathematically correct implementation

import CryptoJS from "crypto-js"

// GSMG Puzzle target address
export const GSMG_PUZZLE_ADDRESS = "1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe"
export const GSMG_PUZZLE_PRIZE = "1.5 BTC"

export interface KeyValidationResult {
  isValid: boolean
  format: "WIF" | "WIF-compressed" | "hex" | "unknown"
  address?: string
  matchesPuzzle: boolean
  checksum: boolean
  error?: string
  timestamp: Date
}

export interface BalanceCheckResult {
  address: string
  balance: number
  balanceBTC: string
  totalReceived: number
  totalSent: number
  txCount: number
  hasBalance: boolean
  error?: string
}

export interface KeyAttempt {
  id: string
  key: string
  maskedKey: string
  result: KeyValidationResult
  balanceCheck?: BalanceCheckResult
  source: string
  timestamp: Date
}

// Base58 alphabet for Bitcoin
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

// secp256k1 curve parameters
const SECP256K1 = {
  // Prime field
  P: BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F"),
  // Curve order
  N: BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"),
  // Generator point x
  Gx: BigInt("0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798"),
  // Generator point y
  Gy: BigInt("0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8"),
}

// Modular arithmetic helpers
function mod(a: bigint, m: bigint): bigint {
  const result = a % m
  return result >= 0n ? result : result + m
}

function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m]
  let [old_s, s] = [1n, 0n]

  while (r !== 0n) {
    const quotient = old_r / r
    ;[old_r, r] = [r, old_r - quotient * r]
    ;[old_s, s] = [s, old_s - quotient * s]
  }

  return mod(old_s, m)
}

// Point on elliptic curve (null represents point at infinity)
type Point = { x: bigint; y: bigint } | null

// Point addition on secp256k1
function pointAdd(p1: Point, p2: Point): Point {
  if (p1 === null) return p2
  if (p2 === null) return p1

  const { P } = SECP256K1

  if (p1.x === p2.x) {
    if (mod(p1.y + p2.y, P) === 0n) return null // Point at infinity
    // Point doubling
    const s = mod(3n * p1.x * p1.x * modInverse(2n * p1.y, P), P)
    const x = mod(s * s - 2n * p1.x, P)
    const y = mod(s * (p1.x - x) - p1.y, P)
    return { x, y }
  }

  const s = mod((p2.y - p1.y) * modInverse(mod(p2.x - p1.x, P), P), P)
  const x = mod(s * s - p1.x - p2.x, P)
  const y = mod(s * (p1.x - x) - p1.y, P)
  return { x, y }
}

// Scalar multiplication (double-and-add algorithm)
function pointMultiply(k: bigint, p: Point): Point {
  let result: Point = null
  let addend = p

  while (k > 0n) {
    if (k & 1n) {
      result = pointAdd(result, addend)
    }
    addend = pointAdd(addend, addend)
    k >>= 1n
  }

  return result
}

// Convert hex string to byte array
function hexToBytes(hex: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(Number.parseInt(hex.substring(i, i + 2), 16))
  }
  return bytes
}

// Convert byte array to hex string
function bytesToHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Convert bigint to 32-byte hex
function bigintToHex32(n: bigint): string {
  return n.toString(16).padStart(64, "0")
}

// Base58 decode
function base58Decode(str: string): number[] {
  const bytes: number[] = []
  let value = BigInt(0)

  for (const char of str) {
    const index = BASE58_ALPHABET.indexOf(char)
    if (index === -1) throw new Error(`Invalid Base58 character: ${char}`)
    value = value * BigInt(58) + BigInt(index)
  }

  // Convert BigInt to bytes
  let hex = value.toString(16)
  if (hex.length % 2) hex = "0" + hex

  // Add leading zeros
  for (const char of str) {
    if (char === "1") bytes.push(0)
    else break
  }

  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(Number.parseInt(hex.substring(i, i + 2), 16))
  }

  return bytes
}

// Base58 encode
function base58Encode(bytes: number[]): string {
  let value = BigInt(0)
  for (const byte of bytes) {
    value = value * BigInt(256) + BigInt(byte)
  }

  let result = ""
  while (value > BigInt(0)) {
    const remainder = Number(value % BigInt(58))
    value = value / BigInt(58)
    result = BASE58_ALPHABET[remainder] + result
  }

  // Add leading '1's for zero bytes
  for (const byte of bytes) {
    if (byte === 0) result = "1" + result
    else break
  }

  return result || "1"
}

// Double SHA256
function doubleSha256(data: string): string {
  const first = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(data))
  const second = CryptoJS.SHA256(first)
  return second.toString()
}

// SHA256 + RIPEMD160 (Hash160)
function hash160(data: string): string {
  const sha = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(data))
  const ripemd = CryptoJS.RIPEMD160(sha)
  return ripemd.toString()
}

// Validate WIF checksum
function validateWIFChecksum(wif: string): { valid: boolean; privateKeyHex: string; compressed: boolean } {
  try {
    const decoded = base58Decode(wif)
    if (decoded.length < 37) {
      return { valid: false, privateKeyHex: "", compressed: false }
    }

    const checksum = decoded.slice(-4)
    const payload = decoded.slice(0, -4)
    const payloadHex = bytesToHex(payload)

    const calculatedChecksum = doubleSha256(payloadHex).substring(0, 8)
    const providedChecksum = bytesToHex(checksum)

    if (calculatedChecksum !== providedChecksum) {
      return { valid: false, privateKeyHex: "", compressed: false }
    }

    // Check if compressed (ends with 0x01 before checksum)
    const compressed = payload.length === 34 && payload[33] === 1

    // Extract private key (skip version byte)
    const privateKeyBytes = payload.slice(1, 33)
    const privateKeyHex = bytesToHex(privateKeyBytes)

    return { valid: true, privateKeyHex, compressed }
  } catch {
    return { valid: false, privateKeyHex: "", compressed: false }
  }
}

function privateKeyToPublicKey(privateKeyHex: string, compressed: boolean): string {
  const privateKey = BigInt("0x" + privateKeyHex)

  // Generator point
  const G: Point = { x: SECP256K1.Gx, y: SECP256K1.Gy }

  // Public key = privateKey * G
  const publicPoint = pointMultiply(privateKey, G)

  if (publicPoint === null) {
    throw new Error("Invalid private key - results in point at infinity")
  }

  const xHex = bigintToHex32(publicPoint.x)
  const yHex = bigintToHex32(publicPoint.y)

  if (compressed) {
    // Compressed: 02 if y is even, 03 if y is odd
    const prefix = publicPoint.y % 2n === 0n ? "02" : "03"
    return prefix + xHex
  } else {
    // Uncompressed: 04 + x + y
    return "04" + xHex + yHex
  }
}

// Derive P2PKH address from public key
function publicKeyToAddress(publicKeyHex: string): string {
  const pubKeyHash = hash160(publicKeyHex)
  // Add version byte (0x00 for mainnet P2PKH)
  const versionedHash = "00" + pubKeyHash
  // Calculate checksum
  const checksum = doubleSha256(versionedHash).substring(0, 8)
  // Encode in Base58
  return base58Encode(hexToBytes(versionedHash + checksum))
}

// Validate if a string looks like a valid private key
export function detectKeyFormat(key: string): "WIF" | "WIF-compressed" | "hex" | "unknown" {
  const trimmed = key.trim()

  // WIF uncompressed starts with 5 and is 51 chars
  if (/^5[HJK][1-9A-HJ-NP-Za-km-z]{49}$/.test(trimmed)) {
    return "WIF"
  }

  // WIF compressed starts with K or L and is 52 chars
  if (/^[KL][1-9A-HJ-NP-Za-km-z]{51}$/.test(trimmed)) {
    return "WIF-compressed"
  }

  // Hex private key is 64 hex chars
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return "hex"
  }

  return "unknown"
}

// Main validation function
export function validatePrivateKey(key: string): KeyValidationResult {
  const format = detectKeyFormat(key)
  const timestamp = new Date()

  if (format === "unknown") {
    return {
      isValid: false,
      format: "unknown",
      matchesPuzzle: false,
      checksum: false,
      error: "Unrecognized key format. Expected WIF (starts with 5, K, or L) or 64-char hex.",
      timestamp,
    }
  }

  try {
    let privateKeyHex: string
    let compressed: boolean

    if (format === "hex") {
      privateKeyHex = key.toLowerCase()
      compressed = true // Default to compressed for hex

      // Validate hex is within valid range for secp256k1
      const keyBigInt = BigInt("0x" + privateKeyHex)

      if (keyBigInt <= 0n || keyBigInt >= SECP256K1.N) {
        return {
          isValid: false,
          format,
          matchesPuzzle: false,
          checksum: false,
          error: "Private key out of valid range for secp256k1",
          timestamp,
        }
      }
    } else {
      // WIF format
      const wifResult = validateWIFChecksum(key)
      if (!wifResult.valid) {
        return {
          isValid: false,
          format,
          matchesPuzzle: false,
          checksum: false,
          error: "Invalid WIF checksum - key may be corrupted or mistyped",
          timestamp,
        }
      }
      privateKeyHex = wifResult.privateKeyHex
      compressed = wifResult.compressed
    }

    // Derive public key using real elliptic curve math
    const publicKey = privateKeyToPublicKey(privateKeyHex, compressed)
    const address = publicKeyToAddress(publicKey)

    // Check if it matches the puzzle address
    const matchesPuzzle = address === GSMG_PUZZLE_ADDRESS

    return {
      isValid: true,
      format,
      address,
      matchesPuzzle,
      checksum: true,
      timestamp,
    }
  } catch (error) {
    return {
      isValid: false,
      format,
      matchesPuzzle: false,
      checksum: false,
      error: `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      timestamp,
    }
  }
}

// Check balance via public blockchain API
export async function checkAddressBalance(address: string): Promise<BalanceCheckResult> {
  try {
    const response = await fetch(`https://blockchain.info/rawaddr/${address}?limit=0`, {
      headers: { Accept: "application/json" },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return {
          address,
          balance: 0,
          balanceBTC: "0.00000000",
          totalReceived: 0,
          totalSent: 0,
          txCount: 0,
          hasBalance: false,
        }
      }
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const balance = data.final_balance || 0
    const balanceBTC = (balance / 100000000).toFixed(8)

    return {
      address,
      balance,
      balanceBTC,
      totalReceived: data.total_received || 0,
      totalSent: data.total_sent || 0,
      txCount: data.n_tx || 0,
      hasBalance: balance > 0,
    }
  } catch (error) {
    return {
      address,
      balance: 0,
      balanceBTC: "0.00000000",
      totalReceived: 0,
      totalSent: 0,
      txCount: 0,
      hasBalance: false,
      error: error instanceof Error ? error.message : "Failed to check balance",
    }
  }
}

// Mask a private key for display (security)
export function maskPrivateKey(key: string): string {
  if (key.length <= 12) return key
  return key.substring(0, 6) + "..." + key.substring(key.length - 6)
}

// Generate a unique ID for key attempts
export function generateKeyAttemptId(): string {
  return `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Validate multiple keys in batch
export async function validateKeyBatch(
  keys: string[],
  source: string,
  onProgress?: (attempt: KeyAttempt) => void,
): Promise<KeyAttempt[]> {
  const results: KeyAttempt[] = []

  for (const key of keys) {
    const result = validatePrivateKey(key)
    const attempt: KeyAttempt = {
      id: generateKeyAttemptId(),
      key,
      maskedKey: maskPrivateKey(key),
      result,
      source,
      timestamp: new Date(),
    }

    // If valid, check balance
    if (result.isValid && result.address) {
      attempt.balanceCheck = await checkAddressBalance(result.address)
    }

    results.push(attempt)
    onProgress?.(attempt)
  }

  return results
}

// Extract potential keys from text (looks for WIF patterns or hex strings)
export function extractPotentialKeys(text: string): string[] {
  const keys: string[] = []

  // WIF patterns
  const wifPattern = /[5KL][1-9A-HJ-NP-Za-km-z]{50,51}/g
  const wifMatches = text.match(wifPattern)
  if (wifMatches) keys.push(...wifMatches)

  // 64-char hex strings
  const hexPattern = /[0-9a-fA-F]{64}/g
  const hexMatches = text.match(hexPattern)
  if (hexMatches) keys.push(...hexMatches)

  // Remove duplicates
  return [...new Set(keys)]
}
