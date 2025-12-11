// Agent Tools - Executable functions that AI agents can call
// Integrated with the Key Derivation Engine and Crypto Tools

import CryptoJS from "crypto-js" // Move import to top level for browser compatibility
import { KeyDerivationEngine, type DerivationResult } from "./key-derivation-engine"
import { sha256Hash, aesDecrypt, binaryToAscii, beaufortDecode, hexToAscii, PUZZLE_KNOWLEDGE } from "./crypto-tools"
import { validatePrivateKey, extractPotentialKeys } from "./bitcoin-validator"

const VERIFIED_PHASE1_RESULT = "gsmg.io/theseedisplanted"
const VERIFIED_PHASE1_BINARY =
  "0110011101110011011011010110011100101110011010010110111100101111011101000110100001100101011100110110010101100101011001000110100101110011011100000110110001100001011011100111010001100101011001000"

export interface ToolResult {
  tool: string
  success: boolean
  result: unknown
  executionTime: number
  keysFound?: string[]
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, { type: string; description: string; required?: boolean }>
}

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "sha256",
    description: "Compute SHA256 hash of input string. Returns 64-char hex string that can be used as a private key.",
    parameters: {
      input: { type: "string", description: "The string to hash", required: true },
    },
  },
  {
    name: "double_sha256",
    description: "Compute double SHA256 (Bitcoin-style) hash of input string.",
    parameters: {
      input: { type: "string", description: "The string to hash", required: true },
    },
  },
  {
    name: "validate_bitcoin_key",
    description:
      "Validate a potential Bitcoin private key and check if it matches the puzzle address 1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe",
    parameters: {
      key: { type: "string", description: "64-char hex or WIF format private key", required: true },
    },
  },
  {
    name: "aes_decrypt",
    description: "Decrypt AES-256-CBC encrypted text using a password. Password will be SHA256 hashed as the key.",
    parameters: {
      ciphertext: { type: "string", description: "Base64 encoded ciphertext", required: true },
      password: { type: "string", description: "Password (will be SHA256 hashed)", required: true },
    },
  },
  {
    name: "beaufort_decode",
    description: "Decode text using Beaufort cipher with a given key.",
    parameters: {
      ciphertext: { type: "string", description: "Text to decode", required: true },
      key: { type: "string", description: "Cipher key (default: THEMATRIXHASYOU)", required: false },
    },
  },
  {
    name: "matrix_spiral",
    description: "Get the SOLVED Phase 1 result - the 14x14 binary matrix decoded to ASCII. Returns verified solution.",
    parameters: {
      direction: { type: "string", description: "ignored - returns verified solution", required: false },
    },
  },
  {
    name: "get_puzzle_data",
    description: "Get known puzzle data including solved phases, passwords, hashes, and claimed solutions.",
    parameters: {
      phase: {
        type: "string",
        description: "Phase: '1', '2', '3', '4', '5', 'all', or 'hashes'",
        required: false,
      },
    },
  },
  {
    name: "xor_hex",
    description: "XOR two hexadecimal strings together. Useful for combining hashes.",
    parameters: {
      hex1: { type: "string", description: "First hex string", required: true },
      hex2: { type: "string", description: "Second hex string", required: true },
    },
  },
  {
    name: "run_derivation_batch",
    description: "Run a batch of systematic key derivations using specified method.",
    parameters: {
      method: {
        type: "string",
        description: "Method: 'abba_permutations' | 'xor_chains' | 'beaufort' | 'pbkdf2' | 'phrases' | 'all'",
        required: true,
      },
      limit: { type: "number", description: "Max keys to generate (default: 100)", required: false },
    },
  },
  {
    name: "pbkdf2_derive",
    description: "Derive a key using PBKDF2 with SHA256.",
    parameters: {
      password: { type: "string", description: "Password/passphrase", required: true },
      salt: { type: "string", description: "Salt string", required: true },
      iterations: { type: "number", description: "Iteration count (default: 2048)", required: false },
    },
  },
  {
    name: "hex_to_ascii",
    description: "Convert hexadecimal string to ASCII text.",
    parameters: {
      hex: { type: "string", description: "Hex string to convert", required: true },
    },
  },
  {
    name: "binary_to_ascii",
    description: "Convert binary string (0s and 1s) to ASCII text using 8-bit chunks.",
    parameters: {
      binary: { type: "string", description: "Binary string", required: true },
    },
  },
  {
    name: "combine_and_hash",
    description: "Combine multiple strings and hash the result.",
    parameters: {
      parts: { type: "array", description: "Array of strings to combine", required: true },
      separator: { type: "string", description: "Separator (default: empty)", required: false },
      hashMethod: { type: "string", description: "'sha256' or 'double_sha256'", required: false },
    },
  },
  {
    name: "test_claimed_solution",
    description: "Test a claimed solution password or WIF key against the puzzle.",
    parameters: {
      solution: { type: "string", description: "The claimed password or WIF key", required: true },
      type: { type: "string", description: "'password' or 'wif'", required: false },
    },
  },
]

function xorHex(hex1: string, hex2: string): string {
  const len = Math.max(hex1.length, hex2.length)
  const padded1 = hex1.padStart(len, "0")
  const padded2 = hex2.padStart(len, "0")
  let result = ""
  for (let i = 0; i < len; i += 2) {
    const b1 = Number.parseInt(padded1.slice(i, i + 2), 16)
    const b2 = Number.parseInt(padded2.slice(i, i + 2), 16)
    result += (b1 ^ b2).toString(16).padStart(2, "0")
  }
  return result
}

function pbkdf2Derive(password: string, salt: string, iterations = 2048): string {
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: iterations,
    hasher: CryptoJS.algo.SHA256,
  })
  return key.toString()
}

// Double SHA256
function doubleSha256(input: string): string {
  const first = sha256Hash(input)
  return sha256Hash(first)
}

// Execute a tool by name with parameters
export async function executeTool(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
  const startTime = performance.now()
  let result: ToolResult

  try {
    switch (toolName) {
      case "sha256": {
        const hash = sha256Hash(params.input as string)
        result = {
          tool: toolName,
          success: true,
          result: `SHA256("${(params.input as string).substring(0, 50)}...") = ${hash}`,
          executionTime: 0,
          keysFound: [hash],
        }
        break
      }

      case "double_sha256": {
        const hash = doubleSha256(params.input as string)
        result = {
          tool: toolName,
          success: true,
          result: `DoubleSHA256("${(params.input as string).substring(0, 50)}...") = ${hash}`,
          executionTime: 0,
          keysFound: [hash],
        }
        break
      }

      case "validate_bitcoin_key": {
        const validation = validatePrivateKey(params.key as string)
        result = {
          tool: toolName,
          success: validation.isValid,
          result: {
            isValid: validation.isValid,
            format: validation.format,
            address: validation.address,
            matchesPuzzle: validation.matchesPuzzle,
            error: validation.error,
          },
          executionTime: 0,
          keysFound: validation.isValid ? [params.key as string] : [],
        }
        break
      }

      case "aes_decrypt": {
        const decrypted = aesDecrypt(params.ciphertext as string, params.password as string)
        const keysFound = decrypted.success ? extractPotentialKeys(decrypted.output) : []
        result = {
          tool: toolName,
          success: decrypted.success,
          result: decrypted.output || decrypted.details,
          executionTime: 0,
          keysFound,
        }
        break
      }

      case "beaufort_decode": {
        const key = (params.key as string) || "THEMATRIXHASYOU"
        const decoded = beaufortDecode(params.ciphertext as string, key)
        const keysFound = extractPotentialKeys(decoded)
        result = {
          tool: toolName,
          success: decoded.length > 0,
          result: `Beaufort decode with key "${key}": ${decoded}`,
          executionTime: 0,
          keysFound,
        }
        break
      }

      case "matrix_spiral": {
        result = {
          tool: toolName,
          success: true,
          result: {
            phase: 1,
            status: "SOLVED",
            url: VERIFIED_PHASE1_RESULT,
            binary: VERIFIED_PHASE1_BINARY,
            method: "Counter-clockwise spiral from top-left, 8-bit ASCII chunks",
            nextStep: "Visit gsmg.io/theseedisplanted, use F12 to find hidden POST form",
            phase2Password: "theflowerblossomsthroughwhatseemstobeaconcretesurface",
          },
          executionTime: 0,
          keysFound: [],
        }
        break
      }

      case "get_puzzle_data": {
        const phase = (params.phase as string) || "all"
        let data: unknown

        switch (phase) {
          case "1":
            data = {
              name: "Binary Matrix Decode",
              status: "SOLVED",
              result: VERIFIED_PHASE1_RESULT,
              binary: VERIFIED_PHASE1_BINARY,
              method: "Counter-clockwise spiral from top-left, 8-bit ASCII chunks",
            }
            break
          case "2":
            data = {
              name: "The Seed is Planted",
              status: "SOLVED",
              url: VERIFIED_PHASE1_RESULT,
              password: PUZZLE_KNOWLEDGE.phase2.password,
              result: PUZZLE_KNOWLEDGE.phase2.result,
              hint: "Logic's 'The Warning' song - second lyric line",
            }
            break
          case "3":
            data = {
              name: "Choice is an Illusion",
              status: "SOLVED",
              password: PUZZLE_KNOWLEDGE.phase3.password,
              sha256: PUZZLE_KNOWLEDGE.phase3.sha256,
              hint: "Matrix Reloaded Merovingian - 'causality'",
            }
            break
          case "4":
            data = {
              name: "Seven Part Password",
              status: "SOLVED",
              password: PUZZLE_KNOWLEDGE.phase3_full.password,
              sha256: PUZZLE_KNOWLEDGE.phase3_full.sha256,
              parts: ["causality", "SafenetLunaHSM", "11110", "hex block", "chess FEN"],
            }
            break
          case "5":
            data = {
              name: "Salphaseion & Cosmic Duality",
              status: "DISPUTED",
              beaufortKey: PUZZLE_KNOWLEDGE.beaufort.key,
              claimedSolution: PUZZLE_KNOWLEDGE.claimedSolutions.kiabuzz0,
              abbaTokens: ["matrixsumlist", "enter", "lastwordsbeforearchichoice", "thispassword"],
            }
            break
          case "hashes":
            data = {
              knownHashes: PUZZLE_KNOWLEDGE.knownHashes,
              note: "Try these as private keys or combine with XOR/concatenation",
            }
            break
          default:
            data = {
              targetAddress: "1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe",
              phases: {
                phase1: { status: "SOLVED", result: VERIFIED_PHASE1_RESULT },
                phase2: { status: "SOLVED", password: PUZZLE_KNOWLEDGE.phase2.password },
                phase3: {
                  status: "SOLVED",
                  password: PUZZLE_KNOWLEDGE.phase3.password,
                  sha256: PUZZLE_KNOWLEDGE.phase3.sha256,
                },
                phase4: { status: "SOLVED", sha256: PUZZLE_KNOWLEDGE.phase3_full.sha256 },
                phase5: { status: "DISPUTED", beaufortKey: PUZZLE_KNOWLEDGE.beaufort.key },
              },
              knownHashes: PUZZLE_KNOWLEDGE.knownHashes,
              claimedSolution: PUZZLE_KNOWLEDGE.claimedSolutions.kiabuzz0,
            }
        }

        result = {
          tool: toolName,
          success: true,
          result: data,
          executionTime: 0,
          keysFound: [],
        }
        break
      }

      case "xor_hex": {
        const xorResult = xorHex(params.hex1 as string, params.hex2 as string)
        result = {
          tool: toolName,
          success: true,
          result: `XOR result: ${xorResult}`,
          executionTime: 0,
          keysFound: /^[0-9a-f]{64}$/i.test(xorResult) ? [xorResult] : [],
        }
        break
      }

      case "run_derivation_batch": {
        const method = params.method as string
        const limit = (params.limit as number) || 100
        const keys: DerivationResult[] = []
        const engine = new KeyDerivationEngine()

        let generator: Generator<DerivationResult>
        switch (method) {
          case "abba_permutations":
            generator = engine.generateABBAPermutations()
            break
          case "xor_chains":
            generator = engine.generateXORChains()
            break
          case "beaufort":
            generator = engine.generateBeaufortDerivations()
            break
          case "pbkdf2":
            generator = engine.generatePBKDF2Derivations()
            break
          case "phrases":
            generator = engine.generatePhraseCombinatins()
            break
          default: {
            const allGenerators = [
              engine.generatePhraseCombinatins(),
              engine.generateABBAPermutations(),
              engine.generateXORChains(),
              engine.generateBeaufortDerivations(),
              engine.generatePBKDF2Derivations(),
            ]

            let count = 0
            outer: for (const gen of allGenerators) {
              for (const key of gen) {
                keys.push(key)
                count++
                if (count >= limit) break outer
              }
            }

            result = {
              tool: toolName,
              success: true,
              result: {
                method: "all",
                keysGenerated: keys.length,
                sampleKeys: keys.slice(0, 10).map((k) => ({ key: k.key.substring(0, 16) + "...", method: k.method })),
              },
              executionTime: 0,
              keysFound: keys.map((k) => k.key),
            }
            return { ...result, executionTime: performance.now() - startTime }
          }
        }

        let count = 0
        for (const key of generator) {
          keys.push(key)
          count++
          if (count >= limit) break
        }

        result = {
          tool: toolName,
          success: true,
          result: {
            method,
            keysGenerated: keys.length,
            sampleKeys: keys.slice(0, 10).map((k) => ({ key: k.key.substring(0, 16) + "...", method: k.method })),
          },
          executionTime: 0,
          keysFound: keys.map((k) => k.key),
        }
        break
      }

      case "pbkdf2_derive": {
        const key = pbkdf2Derive(
          params.password as string,
          params.salt as string,
          (params.iterations as number) || 2048,
        )
        result = {
          tool: toolName,
          success: true,
          result: `PBKDF2 result: ${key}`,
          executionTime: 0,
          keysFound: [key],
        }
        break
      }

      case "hex_to_ascii": {
        const ascii = hexToAscii(params.hex as string)
        result = {
          tool: toolName,
          success: ascii.length > 0,
          result: ascii,
          executionTime: 0,
          keysFound: extractPotentialKeys(ascii),
        }
        break
      }

      case "binary_to_ascii": {
        const ascii = binaryToAscii(params.binary as string)
        result = {
          tool: toolName,
          success: ascii.length > 0,
          result: ascii,
          executionTime: 0,
          keysFound: extractPotentialKeys(ascii),
        }
        break
      }

      case "combine_and_hash": {
        const parts = params.parts as string[]
        const separator = (params.separator as string) || ""
        const hashMethod = (params.hashMethod as string) || "sha256"
        const combined = parts.join(separator)
        const hash = hashMethod === "double_sha256" ? doubleSha256(combined) : sha256Hash(combined)
        result = {
          tool: toolName,
          success: true,
          result: {
            combined: combined.substring(0, 100) + (combined.length > 100 ? "..." : ""),
            hash,
          },
          executionTime: 0,
          keysFound: [hash],
        }
        break
      }

      case "test_claimed_solution": {
        const solution = params.solution as string
        const type = (params.type as string) || "password"

        if (type === "wif") {
          const validation = validatePrivateKey(solution)
          result = {
            tool: toolName,
            success: validation.isValid,
            result: {
              type: "wif",
              isValid: validation.isValid,
              address: validation.address,
              matchesPuzzle: validation.matchesPuzzle,
              targetAddress: "1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe",
            },
            executionTime: 0,
            keysFound: validation.isValid ? [solution] : [],
          }
        } else {
          const keyToTest = sha256Hash(solution)
          const validation = validatePrivateKey(keyToTest)
          result = {
            tool: toolName,
            success: validation.isValid,
            result: {
              type: "password",
              password: solution.substring(0, 50) + (solution.length > 50 ? "..." : ""),
              sha256: keyToTest,
              isValid: validation.isValid,
              address: validation.address,
              matchesPuzzle: validation.matchesPuzzle,
              targetAddress: "1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe",
            },
            executionTime: 0,
            keysFound: [keyToTest],
          }
        }
        break
      }

      default:
        result = {
          tool: toolName,
          success: false,
          result: `Unknown tool: ${toolName}`,
          executionTime: 0,
        }
    }
  } catch (error) {
    result = {
      tool: toolName,
      success: false,
      result: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      executionTime: 0,
    }
  }

  result.executionTime = performance.now() - startTime
  return result
}

// Generate tool description for AI prompt
export function getToolsPrompt(): string {
  let prompt = `
=== AVAILABLE TOOLS ===
Call tools by outputting: TOOL_CALL: {"tool": "tool_name", "params": {...}}

`

  for (const tool of AGENT_TOOLS) {
    prompt += `**${tool.name}**: ${tool.description}\n`
    prompt += `  Parameters: ${Object.entries(tool.parameters)
      .map(([k, v]) => `${k}(${v.type}${v.required ? "*" : ""})`)
      .join(", ")}\n\n`
  }

  return prompt
}

// Parse tool calls from AI response text
export function parseToolCalls(text: string): Array<{ tool: string; params: Record<string, unknown> }> {
  const toolCalls: Array<{ tool: string; params: Record<string, unknown> }> = []

  // Match TOOL_CALL: followed by JSON
  const regex = /TOOL_CALL:\s*(\{[\s\S]*?\})/g
  let match

  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed.tool) {
        toolCalls.push({
          tool: parsed.tool,
          params: parsed.params || {},
        })
      }
    } catch {
      // Invalid JSON, skip this match
    }
  }

  return toolCalls
}
