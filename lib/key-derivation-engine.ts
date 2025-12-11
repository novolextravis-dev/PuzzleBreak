// Systematic Key Derivation Engine for GSMG Puzzle
// Implements all requested derivation methods: permutations, XOR chains, PBKDF2, BIP39

import CryptoJS from "crypto-js"

export interface DerivationResult {
  key: string
  method: string
  inputs: string[]
  iteration: number
  timestamp: Date
}

export interface DerivationProgress {
  totalAttempts: number
  currentAttempt: number
  currentMethod: string
  keysGenerated: string[]
  matchFound: boolean
  matchingKey?: DerivationResult
}

// All known tokens from the puzzle
const ABBA_TOKENS = [
  "matrixsumlist",
  "enter",
  "lastwordsbeforearchichoice",
  "thispassword",
  "yourlastcommand",
  "secondanswer",
]

const PUZZLE_PASSWORDS = [
  "theseedisplanted",
  "theflowerblossomsthroughwhatseemstobeaconcretesurface",
  "causality",
  "jacquefrescogiveitjustonesecondheisenbergsuncertaintyprinciple",
  "THEMATRIXHASYOU",
  "choiceisanillusioncreatedbetweenthosewithpowerandthosewithout",
]

const KNOWN_HASHES = [
  "eb3efb5151e6255994711fe8f2264427ceeebf88109e1d7fad5b0a8b6d07e5bf", // causality
  "1a57c572caf3cf722e41f5f9cf99ffacff06728a43032dd44c481c77d2ec30d5", // seven part
  "250f37726d6862939f723edc4f993fde9d33c6004aab4f2203d9ee489d61ce4c", // jacque fresco
  "89727c598b9cd1cf8873f27cb7057f050645ddb6a7a157a110239ac0152f6a32", // salphaseion access
]

const BEAUFORT_KEY = "THEMATRIXHASYOU"

const BIP39_WORDLIST_SUBSET = [
  "seed",
  "plant",
  "choice",
  "matrix",
  "illusion",
  "causality",
  "flower",
  "blossom",
  "concrete",
  "surface",
  "power",
  "without",
  "warning",
  "logic",
  "crypto",
  "puzzle",
  "bitcoin",
  "hash",
  "key",
  "secret",
  "hidden",
  "truth",
  "neo",
  "morpheus",
  "oracle",
  "trinity",
  "agent",
  "smith",
  "zion",
  "machine",
]

// SHA256 helper
function sha256(input: string): string {
  return CryptoJS.SHA256(input).toString()
}

// Double SHA256 (Bitcoin style)
function doubleSha256(input: string): string {
  const first = CryptoJS.SHA256(input)
  return CryptoJS.SHA256(first).toString()
}

// XOR two hex strings
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

// PBKDF2 derivation
function pbkdf2Derive(password: string, salt: string, iterations = 2048): string {
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: iterations,
    hasher: CryptoJS.algo.SHA256,
  })
  return key.toString()
}

// Beaufort cipher for potential key transformation
function beaufortTransform(text: string, key: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let result = ""
  let keyIndex = 0
  const upperText = text.toUpperCase()
  const upperKey = key.toUpperCase()

  for (let i = 0; i < upperText.length; i++) {
    const char = upperText[i]
    if (alphabet.includes(char)) {
      const keyChar = upperKey[keyIndex % upperKey.length]
      const textIndex = alphabet.indexOf(char)
      const keyCharIndex = alphabet.indexOf(keyChar)
      const resultIndex = (keyCharIndex - textIndex + 26) % 26
      result += alphabet[resultIndex]
      keyIndex++
    } else {
      result += char
    }
  }
  return result
}

// Generate all permutations of an array
function* permutations<T>(inputArr: T[], len?: number): Generator<T[]> {
  // Clone array to avoid mutating input
  const arr = [...inputArr]
  const size = len ?? arr.length

  if (size === 1) {
    yield arr.slice()
    return
  }

  for (let i = 0; i < size; i++) {
    yield* permutations(arr, size - 1)
    if (size % 2 === 0) {
      ;[arr[i], arr[size - 1]] = [arr[size - 1], arr[i]]
    } else {
      ;[arr[0], arr[size - 1]] = [arr[size - 1], arr[0]]
    }
  }
}

// Generate all combinations of size k from array
function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) {
    yield []
    return
  }
  if (arr.length < k) return

  const [first, ...rest] = arr
  for (const combo of combinations(rest, k - 1)) {
    yield [first, ...combo]
  }
  yield* combinations(rest, k)
}

// Main derivation engine class
export class KeyDerivationEngine {
  private results: DerivationResult[] = []
  private iteration = 0
  private onProgress?: (progress: DerivationProgress) => void
  private shouldStop = false

  constructor(onProgress?: (progress: DerivationProgress) => void) {
    this.onProgress = onProgress
  }

  stop() {
    this.shouldStop = true
  }

  private addResult(key: string, method: string, inputs: string[]) {
    // Only add valid 64-char hex keys
    if (!/^[0-9a-f]{64}$/i.test(key)) return

    this.iteration++
    const result: DerivationResult = {
      key: key.toLowerCase(),
      method,
      inputs,
      iteration: this.iteration,
      timestamp: new Date(),
    }
    this.results.push(result)

    this.onProgress?.({
      totalAttempts: this.iteration,
      currentAttempt: this.iteration,
      currentMethod: method,
      keysGenerated: this.results.map((r) => r.key),
      matchFound: false,
    })

    return result
  }

  // Method 1: All permutations of ABBA tokens concatenated and hashed
  *generateABBAPermutations(): Generator<DerivationResult> {
    // Test different subset sizes
    for (let size = 2; size <= Math.min(ABBA_TOKENS.length, 7); size++) {
      for (const combo of combinations([...ABBA_TOKENS], size)) {
        if (this.shouldStop) return

        for (const perm of permutations([...combo])) {
          if (this.shouldStop) return

          // Direct concatenation + SHA256
          const concat = perm.join("")
          const key = sha256(concat)
          const result = this.addResult(key, `ABBA-Permutation-SHA256(${size})`, perm)
          if (result) yield result

          // With separators
          const withSeparator = perm.join("_")
          const key2 = sha256(withSeparator)
          const result2 = this.addResult(key2, `ABBA-Permutation-SHA256-Underscore(${size})`, perm)
          if (result2) yield result2

          // Double SHA256
          const key3 = doubleSha256(concat)
          const result3 = this.addResult(key3, `ABBA-Permutation-DoubleSHA256(${size})`, perm)
          if (result3) yield result3
        }
      }
    }
  }

  // Method 2: XOR chains of known hashes in different orders
  *generateXORChains(): Generator<DerivationResult> {
    // All permutations of known hashes XORed together
    for (const perm of permutations([...KNOWN_HASHES])) {
      if (this.shouldStop) return

      let xorResult = perm[0]
      for (let i = 1; i < perm.length; i++) {
        xorResult = xorHex(xorResult, perm[i])
      }
      const result = this.addResult(xorResult, "XOR-Chain-KnownHashes", perm)
      if (result) yield result

      // Also try SHA256 of the XOR result
      const key2 = sha256(xorResult)
      const result2 = this.addResult(key2, "XOR-Chain-KnownHashes-SHA256", perm)
      if (result2) yield result2
    }

    // XOR combinations of 2-3 hashes
    for (let size = 2; size <= 3; size++) {
      for (const combo of combinations([...KNOWN_HASHES], size)) {
        if (this.shouldStop) return

        let xorResult = combo[0]
        for (let i = 1; i < combo.length; i++) {
          xorResult = xorHex(xorResult, combo[i])
        }
        const result = this.addResult(xorResult, `XOR-Combo(${size})`, combo)
        if (result) yield result
      }
    }
  }

  // Method 3: Beaufort cipher key integration
  *generateBeaufortDerivations(): Generator<DerivationResult> {
    for (const password of PUZZLE_PASSWORDS) {
      if (this.shouldStop) return

      // Beaufort transform of password, then hash
      const transformed = beaufortTransform(password, BEAUFORT_KEY)
      const key = sha256(transformed)
      const result = this.addResult(key, "Beaufort-Transform-SHA256", [password, BEAUFORT_KEY])
      if (result) yield result

      // Hash of password XOR with hash of Beaufort key
      const pwHash = sha256(password)
      const keyHash = sha256(BEAUFORT_KEY)
      const xorResult = xorHex(pwHash, keyHash)
      const result2 = this.addResult(xorResult, "Password-XOR-BeaufortKey", [password, BEAUFORT_KEY])
      if (result2) yield result2

      // Concatenate and hash
      const combined = password + BEAUFORT_KEY
      const key3 = sha256(combined)
      const result3 = this.addResult(key3, "Password+BeaufortKey-SHA256", [password, BEAUFORT_KEY])
      if (result3) yield result3
    }

    // Beaufort key with ABBA tokens
    for (const token of ABBA_TOKENS) {
      if (this.shouldStop) return

      const transformed = beaufortTransform(token, BEAUFORT_KEY)
      const key = sha256(transformed)
      const result = this.addResult(key, "ABBA-Beaufort-SHA256", [token, BEAUFORT_KEY])
      if (result) yield result
    }
  }

  // Method 4: PBKDF2 derivations with puzzle phrases as salts
  *generatePBKDF2Derivations(): Generator<DerivationResult> {
    const salts = ["gsmg.io", "1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe", "5BTCPUZZLE", "THEMATRIXHASYOU", "theseedisplanted"]

    for (const password of PUZZLE_PASSWORDS) {
      for (const salt of salts) {
        if (this.shouldStop) return

        // Standard PBKDF2
        const key = pbkdf2Derive(password, salt, 2048)
        const result = this.addResult(key, "PBKDF2-2048", [password, salt])
        if (result) yield result

        // Lower iteration count
        const key2 = pbkdf2Derive(password, salt, 1)
        const result2 = this.addResult(key2, "PBKDF2-1", [password, salt])
        if (result2) yield result2
      }
    }

    // ABBA tokens with salts
    for (const token of ABBA_TOKENS) {
      for (const salt of salts.slice(0, 2)) {
        if (this.shouldStop) return

        const key = pbkdf2Derive(token, salt, 2048)
        const result = this.addResult(key, "PBKDF2-ABBA", [token, salt])
        if (result) yield result
      }
    }
  }

  // Method 5: BIP39-style mnemonic generation from puzzle words
  *generateBIP39Style(): Generator<DerivationResult> {
    // Create seed phrases from puzzle words
    const wordSets = [
      ["seed", "plant", "choice", "matrix", "illusion", "causality"],
      ["flower", "blossom", "concrete", "surface", "power", "logic"],
      ["matrix", "neo", "morpheus", "oracle", "trinity", "zion"],
      ["seed", "matrix", "choice", "power", "truth", "key"],
      ["causality", "choice", "illusion", "power", "machine", "truth"],
    ]

    for (const words of wordSets) {
      if (this.shouldStop) return

      // Simulated BIP39 seed derivation (mnemonic -> seed -> key)
      const mnemonic = words.join(" ")
      const salt = "mnemonic" // BIP39 standard salt prefix
      const seed = pbkdf2Derive(mnemonic, salt, 2048)
      const result = this.addResult(seed, "BIP39-Style-Mnemonic", words)
      if (result) yield result

      // Also try direct SHA256
      const key2 = sha256(mnemonic)
      const result2 = this.addResult(key2, "BIP39-Direct-SHA256", words)
      if (result2) yield result2
    }

    // Permutations of the key words
    const keyWords = ["seed", "matrix", "causality", "choice", "key", "bitcoin"]
    for (const perm of permutations([...keyWords])) {
      if (this.shouldStop) return

      const mnemonic = perm.join(" ")
      const key = sha256(mnemonic)
      const result = this.addResult(key, "BIP39-KeyWord-Permutation", perm)
      if (result) yield result
    }
  }

  // Method 6: Direct puzzle phrase combinations
  *generatePhraseCombinatins(): Generator<DerivationResult> {
    // All passwords hashed individually
    for (const pw of PUZZLE_PASSWORDS) {
      if (this.shouldStop) return

      const key = sha256(pw)
      const result = this.addResult(key, "Direct-SHA256", [pw])
      if (result) yield result

      const key2 = doubleSha256(pw)
      const result2 = this.addResult(key2, "Direct-DoubleSHA256", [pw])
      if (result2) yield result2
    }

    // Concatenated combinations
    for (let size = 2; size <= 4; size++) {
      for (const combo of combinations([...PUZZLE_PASSWORDS], size)) {
        if (this.shouldStop) return

        const concat = combo.join("")
        const key = sha256(concat)
        const result = this.addResult(key, `Phrase-Combo-SHA256(${size})`, combo)
        if (result) yield result
      }
    }

    // Special claimed solution attempt
    const claimedPassword =
      "TheSeedIsPlantedChoiceIsAnIllusionMatrixSumListLastWordsBeforeArchiChoiceJacqueFractalThereIsNoSpoonFFGPFGGQG3GNpjk6"
    const key = sha256(claimedPassword)
    const result = this.addResult(key, "Claimed-Solution-SHA256", [claimedPassword])
    if (result) yield result

    const key2 = doubleSha256(claimedPassword)
    const result2 = this.addResult(key2, "Claimed-Solution-DoubleSHA256", [claimedPassword])
    if (result2) yield result2
  }

  // Method 7: Matrix-specific derivations (The Matrix movie references)
  *generateMatrixDerivations(): Generator<DerivationResult> {
    const matrixPhrases = [
      "ThereIsNoSpoon",
      "WakeUpNeo",
      "FollowTheWhiteRabbit",
      "TheMatrixHasYou",
      "FreeYourMind",
      "IKnowKungFu",
      "RedPillBluePill",
      "TheOne",
      "TheOracle",
      "TheArchitect",
      "Zion",
      "Nebuchadnezzar",
    ]

    for (const phrase of matrixPhrases) {
      if (this.shouldStop) return

      const key = sha256(phrase)
      const result = this.addResult(key, "Matrix-Reference-SHA256", [phrase])
      if (result) yield result

      // Combine with Beaufort key
      const combined = phrase + BEAUFORT_KEY
      const key2 = sha256(combined)
      const result2 = this.addResult(key2, "Matrix+Beaufort-SHA256", [phrase, BEAUFORT_KEY])
      if (result2) yield result2
    }

    // Combine matrix phrases with puzzle elements
    for (const phrase of matrixPhrases) {
      for (const pw of PUZZLE_PASSWORDS.slice(0, 3)) {
        if (this.shouldStop) return

        const combined = phrase + pw
        const key = sha256(combined)
        const result = this.addResult(key, "Matrix+Password-SHA256", [phrase, pw])
        if (result) yield result
      }
    }
  }

  // Run all derivation methods
  async *runAllDerivations(): AsyncGenerator<DerivationResult> {
    const generators = [
      this.generatePhraseCombinatins(),
      this.generateABBAPermutations(),
      this.generateXORChains(),
      this.generateBeaufortDerivations(),
      this.generatePBKDF2Derivations(),
      this.generateBIP39Style(),
      this.generateMatrixDerivations(),
    ]

    for (const gen of generators) {
      for (const result of gen) {
        if (this.shouldStop) return
        yield result
        // Small delay to prevent blocking
        await new Promise((resolve) => setTimeout(resolve, 1))
      }
    }
  }

  getResults(): DerivationResult[] {
    return this.results
  }

  getStats() {
    return {
      totalKeys: this.results.length,
      uniqueKeys: new Set(this.results.map((r) => r.key)).size,
      byMethod: this.results.reduce(
        (acc, r) => {
          acc[r.method] = (acc[r.method] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    }
  }
}

// Export singleton generator function for use in hooks
export function createKeyDerivationEngine(onProgress?: (progress: DerivationProgress) => void): KeyDerivationEngine {
  return new KeyDerivationEngine(onProgress)
}
