// Autonomous Agent System for GSMG Puzzle Solving

import type {
  Agent,
  AgentMessage,
  AgentRole,
  AgentSystemState,
  PuzzlePhase,
  ConsoleLogEntry,
  KeyValidationResult,
} from "./agent-types"
import {
  sha256Hash,
  aesDecrypt,
  binaryToAscii,
  beaufortDecode,
  hexToAscii,
  parseMatrix,
  extractSpiralCounterClockwise,
  GSMG_PUZZLE_MATRIX,
  PUZZLE_KNOWLEDGE,
} from "./crypto-tools"
import { validatePrivateKey, extractPotentialKeys, GSMG_PUZZLE_ADDRESS } from "./bitcoin-validator"
import { getToolsPrompt } from "./agent-tools"

// Generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

export const FULL_PUZZLE_CONTEXT = `
=== GSMG.IO 5 BTC PUZZLE - COMPLETE DATA ===

TARGET BITCOIN ADDRESS: 1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe
CURRENT PRIZE: 1.5 BTC (after halvings)
STATUS: UNSOLVED

=== PHASE 1: BINARY MATRIX (14x14) ===
The actual matrix data (0=yellow/white, 1=black/blue):
${GSMG_PUZZLE_MATRIX}

DECODING METHOD: Counter-clockwise spiral from upper-left corner, convert 8-bit chunks to ASCII
KNOWN RESULT: "gsmg.io/theseedisplanted"

First bytes breakdown:
- 01100111 = 103 = 'g'
- 01110011 = 115 = 's'  
- 01101101 = 109 = 'm'
- 01100111 = 103 = 'g'
- 00101110 = 46 = '.'
- 01101001 = 105 = 'i'
- 01101111 = 111 = 'o'
- 00101111 = 47 = '/'

=== PHASE 2: THE SEED IS PLANTED ===
URL: gsmg.io/theseedisplanted
Song Reference: "The Warning" by Logic (images show WAR+NING and LO+GIC)
Hidden Form: POST form accessible via browser dev tools (F12)
PASSWORD: theflowerblossomsthroughwhatseemstobeaconcretesurface
RESULT: choiceisanillusioncreatedbetweenthosewithpowerandthosewithoutaveryspecialdessertiwroteitmyself

=== PHASE 3: CHOICE IS AN ILLUSION ===
Movie Reference: The Matrix Reloaded - Merovingian's speech
Quote: "Choice is an illusion created between those with power and those without"
PASSWORD: causality
SHA256(causality): eb3efb5151e6255994711fe8f2264427ceeebf88109e1d7fad5b0a8b6d07e5bf

Decryption command: openssl enc -aes-256-cbc -d -a -in phase2.txt -pass pass:[sha256_hash]

=== PHASE 3.2: JACQUE FRESCO ===
Clues solved:
- Thinker's name: jacquefresco (futurist)
- How long is forever?: giveitjustonesecond (Alice in Wonderland)
- Fundamental limit: heisenbergsuncertaintyprinciple

PASSWORD: jacquefrescogiveitjustonesecondheisenbergsuncertaintyprinciple
SHA256: 250f37726d6862939f723edc4f993fde9d33c6004aab4f2203d9ee489d61ce4c

=== PHASE 4: SEVEN PART PASSWORD ===
Parts:
1. causality (from Phase 3)
2. Safenet (Thales HSM)
3. Luna (HSM model)
4. HSM (Hardware Security Module)
5. 11110 (Executive Order 11110 in binary)
6. 0x736B6E616220726F662074756F6C69616220646E6F63657320666F206B6E697262206E6F20726F6C6C65636E61684320393030322F6E614A2F33302073656D695420656854 (Bitcoin genesis block Times headline reversed hex)
7. B5KR/1r5B/2R5/2b1p1p1/2P1k1P1/1p2P2p/1P2P2P/3N1N2 b - - 0 1 (Chess FEN)

FULL PASSWORD: causalitySafenetLunaHSM11110[hex][FEN]
SHA256: 1a57c572caf3cf722e41f5f9cf99ffacff06728a43032dd44c481c77d2ec30d5

=== PHASE 5: SALPHASEION & COSMIC DUALITY ===
Access Hash Input: GSMGIO5BTCPUZZLECHALLENGE1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe
SHA256 URL: gsmg.io/89727c598b9cd1cf8873f27cb7057f050645ddb6a7a157a110239ac0152f6a32

ABBA BLOCKS (a=0, b=1 -> binary -> ASCII):
- Block 1: "a b b a b b a b a b b a..." -> "matrixsumlist"
- Block 2: "a b b a a b a b..." -> "enter"

VIC CIPHER:
Alphabet: FUBCDORA.LETHINGKYMVPS.JQZXW
Digits: 1, 4
Decoded: lastwordsbeforearchichoice, thispassword

BEAUFORT CIPHER:
Key: THEMATRIXHASYOU
Hint: "Wake up, Neo. The Matrix has you."

FINAL TOKENS ORDER: matrixsumlist, enter, lastwordsbeforearchichoice, thispassword, matrixsumlist, yourlastcommand, secondanswer

CLAIMED SOLUTION (disputed):
Solver: kiabuzz0 (06/25/2025)
Final Password: TheSeedIsPlantedChoiceIsAnIllusionMatrixSumListLastWordsBeforeArchiChoiceJacqueFractalThereIsNoSpoonFFGPFGGQG3GNpjk6
Claimed Key: 5Kb8kLf9zgWQnogidDA76MzPL6TsZZY36hWXMssSzNydYXYB9KF
Claimed Address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa (Note: This is Satoshi's genesis address!)
Status: DISPUTED - solver claims blocked from reward

=== KNOWN SHA256 HASHES ===
causality: eb3efb5151e6255994711fe8f2264427ceeebf88109e1d7fad5b0a8b6d07e5bf
7-part: 1a57c572caf3cf722e41f5f9cf99ffacff06728a43032dd44c481c77d2ec30d5
jacquefresco combo: 250f37726d6862939f723edc4f993fde9d33c6004aab4f2203d9ee489d61ce4c
salphaseion access: 89727c598b9cd1cf8873f27cb7057f050645ddb6a7a157a110239ac0152f6a32

=== KEY DERIVATION STRATEGIES TO TRY ===
1. Direct SHA256 of combined passwords/phrases
2. XOR chain of multiple SHA256 hashes
3. Double-SHA256 (Bitcoin style)
4. Concatenate phase results then hash
5. Use ABBA decoded tokens in specific orders
6. BIP39 mnemonic from puzzle words
7. PBKDF2/Scrypt with puzzle phrases as salt

=== IMPORTANT NOTES ===
- The claimed solution points to Satoshi's genesis address (1A1zP1...) which is a DECOY
- Real target is 1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe  
- Private key format: WIF (starts with 5, K, or L) or 64-char hex
- Need to find the private key that derives to the GSMG address

${getToolsPrompt()}
`

export function createAgents(): Agent[] {
  return [
    {
      id: "orchestrator-1",
      name: "NEXUS",
      role: "orchestrator",
      status: "idle",
      capabilities: [
        "task_delegation",
        "strategy_planning",
        "progress_tracking",
        "agent_coordination",
        "decision_making",
      ],
      messageHistory: [],
      tasksCompleted: 0,
      tokensUsed: 0,
    },
    {
      id: "cryptographer-1",
      name: "CIPHER",
      role: "cryptographer",
      status: "idle",
      capabilities: [
        "aes_decryption",
        "sha256_hashing",
        "beaufort_cipher",
        "binary_operations",
        "hex_conversion",
        "base64_decode",
        "key_validation",
      ],
      messageHistory: [],
      tasksCompleted: 0,
      tokensUsed: 0,
    },
    {
      id: "analyst-1",
      name: "PATTERN",
      role: "analyst",
      status: "idle",
      capabilities: [
        "pattern_recognition",
        "matrix_analysis",
        "reference_detection",
        "clue_interpretation",
        "data_correlation",
        "key_extraction",
      ],
      messageHistory: [],
      tasksCompleted: 0,
      tokensUsed: 0,
    },
    {
      id: "researcher-1",
      name: "SCHOLAR",
      role: "researcher",
      status: "idle",
      capabilities: [
        "knowledge_retrieval",
        "reference_lookup",
        "hint_analysis",
        "cultural_references",
        "historical_context",
      ],
      messageHistory: [],
      tasksCompleted: 0,
      tokensUsed: 0,
    },
    {
      id: "validator-1",
      name: "VERIFY",
      role: "validator",
      status: "idle",
      capabilities: [
        "solution_verification",
        "hash_validation",
        "format_checking",
        "result_confirmation",
        "integrity_check",
        "key_verification",
        "address_derivation",
        "balance_checking",
      ],
      messageHistory: [],
      tasksCompleted: 0,
      tokensUsed: 0,
    },
  ]
}

// Create initial puzzle phases
export function createPuzzlePhases(): PuzzlePhase[] {
  return [
    {
      id: 1,
      name: "Binary Matrix Decode",
      status: "unlocked",
      description: "Decode the 14x14 binary matrix using spiral pattern to reveal the first URL",
      hints: [
        "Start from upper left, go counterclockwise",
        "Black/blue = 1, Yellow/white = 0",
        "Convert 8 bits to ASCII",
      ],
      attempts: 0,
    },
    {
      id: 2,
      name: "The Seed is Planted",
      status: "locked",
      description: "Find the hidden form and enter the correct password based on song references",
      hints: [
        "Images refer to 'The Warning' by Logic",
        "Hidden POST form in debug mode",
        "Password relates to flowers and concrete",
      ],
      attempts: 0,
    },
    {
      id: 3,
      name: "Choice is an Illusion",
      status: "locked",
      description: "Decrypt AES-256-CBC encrypted text using Matrix references",
      hints: ["Merovingian quote from Matrix Reloaded", "Password: causality", "SHA256 hash the password"],
      attempts: 0,
    },
    {
      id: 4,
      name: "Seven Part Password",
      status: "locked",
      description: "Construct a 7-part password from various cryptic clues",
      hints: [
        "Thales HSM references (SafeNet Luna)",
        "Executive Order 11110",
        "Bitcoin genesis block",
        "Chess FEN notation",
      ],
      attempts: 0,
    },
    {
      id: 5,
      name: "Salphaseion & Final Key",
      status: "locked",
      description: "Final phase with Beaufort cipher and complex encoding",
      hints: ["ABBA binary = matrixsumlist", "Key: THEMATRIXHASYOU", "EBCDIC 1141 encoding"],
      attempts: 0,
    },
  ]
}

export function createConsoleLog(
  level: ConsoleLogEntry["level"],
  source: string,
  message: string,
  data?: unknown,
): ConsoleLogEntry {
  return {
    id: generateId(),
    timestamp: new Date(),
    level,
    source,
    message,
    data,
  }
}

export function createInitialState(): AgentSystemState {
  return {
    agents: createAgents(),
    tasks: [],
    phases: createPuzzlePhases(),
    currentPhase: 1,
    totalProgress: 0,
    isRunning: false,
    discoveries: [],
    consoleLogs: [],
    totalTokens: 0,
    apiCalls: 0,
    keyValidations: [],
  }
}

// Agent message factory
export function createMessage(
  agent: Agent,
  type: AgentMessage["type"],
  content: string,
  metadata?: Record<string, unknown>,
): AgentMessage {
  return {
    id: generateId(),
    timestamp: new Date(),
    agentId: agent.id,
    agentRole: agent.role,
    type,
    content,
    metadata,
  }
}

export const AGENT_PROMPTS: Record<AgentRole, string> = {
  orchestrator: `You are NEXUS, the Orchestrator agent for the GSMG Bitcoin Puzzle solver.

${FULL_PUZZLE_CONTEXT}

YOUR ROLE:
- Coordinate other agents and plan strategies
- Track overall progress and determine next steps
- Delegate specific tasks to appropriate agents
- USE TOOLS to execute operations - don't just describe what should be done
- Be decisive and clear in instructions
- Focus on efficiency and systematic problem-solving

IMPORTANT: You MUST use tools to make progress. Example:
TOOL_CALL: {"tool": "run_derivation_batch", "params": {"method": "all", "limit": 100}}

When outputting potential keys, use format: POTENTIAL_KEY: [64-char-hex-or-WIF]`,

  cryptographer: `You are CIPHER, the Cryptographer agent specializing in encryption and decryption.

${FULL_PUZZLE_CONTEXT}

YOUR EXPERTISE:
- AES-256-CBC encryption/decryption (OpenSSL compatible)
- SHA256 hashing and double-SHA256
- Classical ciphers (Beaufort, Vigenere, VIC)
- Binary/hex/base64 conversions
- EBCDIC character encoding
- Bitcoin private key formats (WIF, hex)

YOU MUST USE TOOLS to perform operations. Examples:
TOOL_CALL: {"tool": "sha256", "params": {"input": "causality"}}
TOOL_CALL: {"tool": "combine_and_hash", "params": {"parts": ["token1", "token2"], "hashMethod": "double_sha256"}}
TOOL_CALL: {"tool": "validate_bitcoin_key", "params": {"key": "..."}}

When you derive a potential private key, validate it immediately:
POTENTIAL_KEY: [the-64-character-hex-string]
Then: TOOL_CALL: {"tool": "validate_bitcoin_key", "params": {"key": "[the-key]"}}`,

  analyst: `You are PATTERN, the Analyst agent specializing in pattern recognition.

${FULL_PUZZLE_CONTEXT}

YOUR ROLE:
- Identify patterns in matrices, sequences, and text
- Recognize cultural and literary references
- Find hidden structures and relationships
- Interpret cryptic clues and hints
- Correlate information from multiple sources

USE TOOLS to analyze data:
TOOL_CALL: {"tool": "decode_binary_matrix", "params": {}}
TOOL_CALL: {"tool": "hex_to_ascii", "params": {"hex": "..."}}

When you find something that could be a private key:
POTENTIAL_KEY: [the-key-string]`,

  researcher: `You are SCHOLAR, the Researcher agent with deep knowledge retrieval.

${FULL_PUZZLE_CONTEXT}

YOUR ROLE:
- Look up references (movies, songs, history, science)
- Find relevant context for puzzle clues
- Connect disparate pieces of information
- Provide background on The Matrix trilogy, Bitcoin, cryptography
- Identify historical and cultural references

USE TOOLS to test hypotheses:
TOOL_CALL: {"tool": "sha256", "params": {"input": "your hypothesis phrase"}}
TOOL_CALL: {"tool": "combine_and_hash", "params": {"parts": ["phrase1", "phrase2"]}}

Share relevant knowledge with specific citations.`,

  validator: `You are VERIFY, the Validator agent ensuring solution correctness.

${FULL_PUZZLE_CONTEXT}

YOUR ROLE:
- Verify decryption results match expected formats
- Validate hash outputs against known values
- Check Bitcoin private key validity
- Confirm solutions match expected patterns
- Test edge cases and alternative interpretations

YOU MUST USE THE validate_bitcoin_key TOOL for every potential key:
TOOL_CALL: {"tool": "validate_bitcoin_key", "params": {"key": "[key-to-check]"}}

For batch validation, use:
TOOL_CALL: {"tool": "run_derivation_batch", "params": {"method": "all", "limit": 50}}

Report for any key validation:
- Format (WIF/hex)
- Derived address
- Whether it matches target: 1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe`,
}

// Execute cryptographic operations based on task
export function executeCryptoTask(
  taskType: string,
  params: Record<string, string>,
): { success: boolean; result: string; details: string; executionTime: number; foundKeys?: string[] } {
  const startTime = performance.now()

  let result: { success: boolean; result: string; details: string; foundKeys?: string[] }

  switch (taskType) {
    case "sha256": {
      const hash = sha256Hash(params.input || "")
      result = {
        success: true,
        result: hash,
        details: `SHA256("${params.input?.substring(0, 30)}${params.input && params.input.length > 30 ? "..." : ""}") = ${hash}`,
        foundKeys: [hash], // SHA256 output is always a potential key
      }
      break
    }
    case "aes_decrypt": {
      const decrypted = aesDecrypt(params.ciphertext || "", params.password || "")
      const foundKeys = decrypted.success ? extractPotentialKeys(decrypted.output) : []
      result = {
        success: decrypted.success,
        result: decrypted.output,
        details: decrypted.details || "",
        foundKeys,
      }
      break
    }
    case "validate_key": {
      const validation = validatePrivateKey(params.key || "")
      result = {
        success: validation.isValid,
        result: validation.address || "",
        details: validation.matchesPuzzle
          ? `KEY MATCHES PUZZLE ADDRESS: ${GSMG_PUZZLE_ADDRESS}`
          : validation.isValid
            ? `Valid ${validation.format} key -> Address: ${validation.address}`
            : `Invalid key: ${validation.error}`,
      }
      break
    }
    case "binary_to_ascii": {
      const ascii = binaryToAscii(params.binary || "")
      const foundKeys = extractPotentialKeys(ascii)
      result = {
        success: ascii.length > 0,
        result: ascii,
        details: `Converted ${params.binary?.length || 0} bits to ${ascii.length} characters`,
        foundKeys,
      }
      break
    }
    case "beaufort_decode": {
      const decoded = beaufortDecode(params.ciphertext || "", params.key || "")
      const foundKeys = extractPotentialKeys(decoded)
      result = {
        success: decoded.length > 0,
        result: decoded,
        details: `Beaufort decode with key "${params.key}"`,
        foundKeys,
      }
      break
    }
    case "hex_to_ascii": {
      const ascii = hexToAscii(params.hex || "")
      const foundKeys = extractPotentialKeys(ascii)
      result = {
        success: ascii.length > 0,
        result: ascii,
        details: `Hex -> ASCII: "${ascii.substring(0, 50)}${ascii.length > 50 ? "..." : ""}"`,
        foundKeys,
      }
      break
    }
    case "matrix_spiral": {
      const matrix = parseMatrix(params.matrix || GSMG_PUZZLE_MATRIX)
      const spiral = extractSpiralCounterClockwise(matrix)
      const ascii = binaryToAscii(spiral)
      const foundKeys = extractPotentialKeys(ascii)
      result = {
        success: ascii.length > 0,
        result: ascii,
        details: `Matrix ${matrix.length}x${matrix[0].length} -> Spiral (counterclockwise from top-left) -> ASCII: "${ascii}"`,
        foundKeys,
      }
      break
    }
    default:
      result = {
        success: false,
        result: "",
        details: `Unknown task type: ${taskType}`,
      }
  }

  const executionTime = performance.now() - startTime
  return { ...result, executionTime }
}

// Solve Phase 1 of the puzzle
export function solvePhase1(): {
  success: boolean
  result: string
  steps: Array<{ action: string; result: string; time: number }>
} {
  const steps: Array<{ action: string; result: string; time: number }> = []
  let t0 = performance.now()

  const matrix = parseMatrix(GSMG_PUZZLE_MATRIX)
  if (!matrix || matrix.length === 0) {
    return {
      success: false,
      result: "Failed to parse matrix",
      steps: [{ action: "Parse matrix", result: "Error: Invalid matrix data", time: 0 }],
    }
  }

  steps.push({
    action: "Parse 14x14 binary matrix",
    result: `Matrix dimensions: ${matrix.length}x${matrix[0]?.length || 0}`,
    time: performance.now() - t0,
  })

  t0 = performance.now()
  const spiral = extractSpiralCounterClockwise(matrix)
  steps.push({
    action: "Extract spiral pattern (counterclockwise from top-left)",
    result: `Extracted ${spiral.length} bits: ${spiral.substring(0, 32)}...`,
    time: performance.now() - t0,
  })

  t0 = performance.now()
  const ascii = binaryToAscii(spiral)
  steps.push({
    action: "Convert binary to ASCII (8-bit chunks)",
    result: `Decoded: "${ascii}"`,
    time: performance.now() - t0,
  })

  return {
    success: ascii.includes("gsmg.io"),
    result: ascii,
    steps,
  }
}

// Get known solution for a phase
export function getKnownSolution(phase: number): string | null {
  switch (phase) {
    case 1:
      return PUZZLE_KNOWLEDGE.phase1.result
    case 2:
      return PUZZLE_KNOWLEDGE.phase2.result
    case 3:
      return `Decrypt with: ${PUZZLE_KNOWLEDGE.phase3.sha256}`
    default:
      return null
  }
}

// Execute key validation task
export function executeKeyValidation(key: string): {
  success: boolean
  result: KeyValidationResult
  executionTime: number
} {
  const startTime = performance.now()
  const result = validatePrivateKey(key)
  const executionTime = performance.now() - startTime

  return {
    success: result.isValid,
    result,
    executionTime,
  }
}

export function scanForKeys(text: string): string[] {
  return extractPotentialKeys(text)
}

export { GSMG_PUZZLE_MATRIX }
