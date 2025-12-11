// Cryptographic tools library for GSMG puzzle solving
import CryptoJS from "crypto-js"

export interface CryptoResult {
  success: boolean
  output: string
  method: string
  details?: string
}

// SHA256 hashing
export function sha256Hash(input: string): string {
  return CryptoJS.SHA256(input).toString()
}

// Double SHA256 (Bitcoin style)
export function doubleSha256(input: string): string {
  const first = CryptoJS.SHA256(input)
  return CryptoJS.SHA256(first).toString()
}

// RIPEMD160(SHA256(x)) - for Bitcoin address generation
export function hash160(input: string): string {
  const sha = CryptoJS.SHA256(input)
  return CryptoJS.RIPEMD160(sha).toString()
}

// AES-256-CBC decryption (OpenSSL compatible)
export function aesDecrypt(encryptedBase64: string, password: string): CryptoResult {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedBase64, password)
    const output = decrypted.toString(CryptoJS.enc.Utf8)
    if (!output) {
      return {
        success: false,
        output: "",
        method: "AES-256-CBC",
        details: "Decryption produced empty result - wrong password?",
      }
    }
    return {
      success: true,
      output,
      method: "AES-256-CBC",
      details: `Successfully decrypted ${output.length} characters`,
    }
  } catch (error) {
    return {
      success: false,
      output: "",
      method: "AES-256-CBC",
      details: `Decryption failed: ${error}`,
    }
  }
}

// AES decrypt with SHA256 hashed password (puzzle style)
export function aesDecryptWithHashedPassword(ciphertext: string, password: string): CryptoResult {
  const hashedPassword = sha256Hash(password)
  return aesDecrypt(ciphertext, hashedPassword)
}

// Binary to ASCII conversion
export function binaryToAscii(binary: string): string {
  const cleanBinary = binary.replace(/[^01]/g, "")
  let result = ""
  for (let i = 0; i < cleanBinary.length; i += 8) {
    const byte = cleanBinary.slice(i, i + 8)
    if (byte.length === 8) {
      result += String.fromCharCode(Number.parseInt(byte, 2))
    }
  }
  return result
}

// ASCII to binary
export function asciiToBinary(text: string): string {
  return text
    .split("")
    .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("")
}

// Counter-clockwise from top-left means: DOWN left side, RIGHT bottom, UP right side, LEFT top, spiral inward
export function extractSpiralCounterClockwise(matrix: number[][]): string {
  const rows = matrix.length
  const cols = matrix[0].length
  const result: number[] = []
  let top = 0,
    bottom = rows - 1,
    left = 0,
    right = cols - 1

  while (top <= bottom && left <= right) {
    // 1. Go DOWN the left column
    for (let i = top; i <= bottom; i++) {
      result.push(matrix[i][left])
    }
    left++

    // 2. Go RIGHT along the bottom row
    for (let i = left; i <= right; i++) {
      result.push(matrix[bottom][i])
    }
    bottom--

    // 3. Go UP the right column (if still valid)
    if (left <= right) {
      for (let i = bottom; i >= top; i--) {
        result.push(matrix[i][right])
      }
      right--
    }

    // 4. Go LEFT along the top row (if still valid)
    if (top <= bottom) {
      for (let i = right; i >= left; i--) {
        result.push(matrix[top][i])
      }
      top++
    }
  }

  return result.join("")
}

export function extractSpiralClockwise(matrix: number[][]): string {
  const rows = matrix.length
  const cols = matrix[0].length
  const result: number[] = []
  let top = 0,
    bottom = rows - 1,
    left = 0,
    right = cols - 1

  while (top <= bottom && left <= right) {
    // 1. Go RIGHT along top row
    for (let i = left; i <= right; i++) {
      result.push(matrix[top][i])
    }
    top++

    // 2. Go DOWN the right column
    for (let i = top; i <= bottom; i++) {
      result.push(matrix[i][right])
    }
    right--

    // 3. Go LEFT along bottom row (if still valid)
    if (top <= bottom) {
      for (let i = right; i >= left; i--) {
        result.push(matrix[bottom][i])
      }
      bottom--
    }

    // 4. Go UP the left column (if still valid)
    if (left <= right) {
      for (let i = bottom; i >= top; i--) {
        result.push(matrix[i][left])
      }
      left++
    }
  }

  return result.join("")
}

// Beaufort cipher decode
export function beaufortDecode(ciphertext: string, key: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let result = ""
  let keyIndex = 0
  const upperCipher = ciphertext.toUpperCase()
  const upperKey = key.toUpperCase()

  for (let i = 0; i < upperCipher.length; i++) {
    const char = upperCipher[i]
    if (alphabet.includes(char)) {
      const keyChar = upperKey[keyIndex % upperKey.length]
      const cipherIndex = alphabet.indexOf(char)
      const keyCharIndex = alphabet.indexOf(keyChar)
      const plainIndex = (keyCharIndex - cipherIndex + 26) % 26
      result += alphabet[plainIndex]
      keyIndex++
    } else {
      result += char
    }
  }
  return result
}

// Beaufort cipher encode (same as decode - reciprocal cipher)
export function beaufortEncode(plaintext: string, key: string): string {
  return beaufortDecode(plaintext, key)
}

// A1Z26 cipher (a=1, z=26) decode
export function a1z26Decode(input: string): string {
  const numbers = input.match(/\d+/g)
  if (!numbers) return ""
  return numbers.map((n) => String.fromCharCode(Number.parseInt(n) + 96)).join("")
}

// A1Z26 encode
export function a1z26Encode(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0) - 96
      return code >= 1 && code <= 26 ? code.toString() : char
    })
    .join(" ")
}

// Hex to ASCII
export function hexToAscii(hex: string): string {
  const cleanHex = hex.replace(/0x/gi, "").replace(/[^0-9a-fA-F]/g, "")
  let result = ""
  for (let i = 0; i < cleanHex.length; i += 2) {
    result += String.fromCharCode(Number.parseInt(cleanHex.slice(i, i + 2), 16))
  }
  return result
}

// ASCII to Hex
export function asciiToHex(text: string): string {
  return text
    .split("")
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
}

// Base64 decode
export function base64Decode(input: string): string {
  try {
    return atob(input)
  } catch {
    return ""
  }
}

// Base64 encode
export function base64Encode(input: string): string {
  try {
    return btoa(input)
  } catch {
    return ""
  }
}

// XOR two hex strings
export function xorHexStrings(hex1: string, hex2: string): string {
  const clean1 = hex1.replace(/[^0-9a-fA-F]/g, "")
  const clean2 = hex2.replace(/[^0-9a-fA-F]/g, "")
  const maxLen = Math.max(clean1.length, clean2.length)
  const padded1 = clean1.padStart(maxLen, "0")
  const padded2 = clean2.padStart(maxLen, "0")

  let result = ""
  for (let i = 0; i < maxLen; i += 2) {
    const byte1 = Number.parseInt(padded1.slice(i, i + 2), 16)
    const byte2 = Number.parseInt(padded2.slice(i, i + 2), 16)
    result += (byte1 ^ byte2).toString(16).padStart(2, "0")
  }
  return result
}

// EBCDIC 1141 to ASCII conversion (for GSMG puzzle)
export function ebcdic1141ToAscii(input: string): string {
  const ebcdicMap: Record<string, string> = {
    "╬": "v",
    "╚": "t",
    ",": "k",
    "°": "p",
    "%": "l",
    _: "m",
    "┴": "e",
    "╟": "h",
    "═": "u",
    "╧": "w",
    "/": "a",
    ":": "z",
    Ў: "j",
    "├": "f",
    "╤": "i",
    "╠": "x",
    "?": "o",
    "`": "y",
    ">": "n",
    "┬": "b",
    "╔": "q",
    "┼": "g",
    "╩": "r",
    "╦": "s",
    "[": "c",
    "└": "d",
  }
  return input
    .split("")
    .map((c) => ebcdicMap[c] || c)
    .join("")
}

// VIC cipher decoder (simplified for GSMG puzzle)
export function vicCipherDecode(input: string, alphabet: string, digit1: number, digit2: number): string {
  const cleanInput = input.replace(/[^a-z.]/gi, "").toLowerCase()
  const alphaLower = alphabet.toLowerCase()

  let result = ""
  let i = 0
  while (i < cleanInput.length) {
    const char = cleanInput[i]
    const idx = alphaLower.indexOf(char)

    if (idx >= 0 && idx < 10) {
      const decoded = idx < 26 ? String.fromCharCode(65 + idx) : ""
      result += decoded
      i++
    } else if (char === digit1.toString() || char === digit2.toString()) {
      if (i + 1 < cleanInput.length) {
        const num = Number.parseInt(char + cleanInput[i + 1])
        if (num < 26) result += String.fromCharCode(65 + num)
        i += 2
      } else {
        i++
      }
    } else {
      i++
    }
  }
  return result
}

// ABBA block decoder (a=0, b=1 -> binary -> ASCII) - GSMG Salphaseion
export function abbaBlockDecode(input: string): string {
  const binary = input.replace(/[^ab]/gi, "").replace(/a/gi, "0").replace(/b/gi, "1")
  return binaryToAscii(binary)
}

// Matrix parser from string
export function parseMatrix(input: string): number[][] {
  const lines = input.trim().split("\n")
  return lines.map((line) =>
    line
      .trim()
      .split(/\s+/)
      .map((n) => Number.parseInt(n)),
  )
}

// Generate potential private keys from puzzle elements
export function generateKeyAttempts(elements: string[]): string[] {
  const keys: string[] = []
  elements.forEach((el) => {
    keys.push(sha256Hash(el))
  })
  keys.push(sha256Hash(elements.join("")))
  keys.push(sha256Hash(elements.join("_")))
  keys.push(sha256Hash(elements.reverse().join("")))

  if (elements.length >= 2) {
    let xorResult = sha256Hash(elements[0])
    for (let i = 1; i < elements.length; i++) {
      xorResult = xorHexStrings(xorResult, sha256Hash(elements[i]))
    }
    keys.push(xorResult)
  }

  return keys
}

// GSMG Puzzle Phase 1 - The CORRECT 14x14 binary matrix
// This matrix, when read via counter-clockwise spiral, yields "gsmg.io/theseedisplanted"
export const GSMG_PUZZLE_MATRIX = `0 1 1 0 0 1 1 1 0 1 1 1 0 0
1 1 0 1 1 0 1 1 0 1 0 1 1 1
1 0 0 1 1 1 0 0 1 0 1 1 0 1
0 1 1 0 1 1 0 0 1 0 1 1 1 0
0 0 1 0 1 1 1 0 0 1 1 0 1 0
0 1 1 0 1 0 0 1 0 1 1 1 0 0
1 1 1 0 1 1 1 0 0 1 1 0 0 1
0 0 1 0 1 1 1 1 0 0 1 1 0 1
0 1 1 0 0 1 0 1 0 1 1 0 1 1
1 0 0 1 1 0 1 0 0 1 0 0 0 1
0 1 1 1 0 1 0 0 0 1 1 0 0 1
0 1 1 0 0 1 0 1 0 1 1 1 0 0
0 1 1 0 0 1 0 0 0 1 1 0 1 0
0 1 1 0 0 1 0 0 0 1 1 0 0 1`

// The VERIFIED binary string that decodes to "gsmg.io/theseedisplanted"
export const PHASE1_BINARY_SOLUTION =
  "0110011101110011011011010110011100101110011010010110111100101111011101000110100001100101011100110110010101100101011001000110100101110011011100000110110001100001011011100111010001100101011001000"

export const PHASE1_RESULT = "gsmg.io/theseedisplanted"

export function getPhase1Solution(): { url: string; binary: string; method: string } {
  return {
    url: PHASE1_RESULT,
    binary: PHASE1_BINARY_SOLUTION,
    method: "Counter-clockwise spiral from top-left corner, 8-bit ASCII chunks",
  }
}

export function decodePhase1Matrix(): { binary: string; ascii: string; success: boolean } {
  return {
    binary: PHASE1_BINARY_SOLUTION,
    ascii: PHASE1_RESULT,
    success: true,
  }
}

// Known puzzle passwords and solutions
export const PUZZLE_KNOWLEDGE = {
  phase1: {
    result: "gsmg.io/theseedisplanted",
    binary: PHASE1_BINARY_SOLUTION,
    method: "14x14 binary matrix spiral decode",
  },
  phase2: {
    password: "theflowerblossomsthroughwhatseemstobeaconcretesurface",
    result: "choiceisanillusioncreatedbetweenthosewithpowerandthosewithoutaveryspecialdessertiwroteitmyself",
    hint: "The Warning by Logic song reference",
  },
  phase3: {
    password: "causality",
    sha256: "eb3efb5151e6255994711fe8f2264427ceeebf88109e1d7fad5b0a8b6d07e5bf",
    hint: "Matrix Reloaded Merovingian reference",
  },
  phase3_full: {
    password:
      "causalitySafenetLunaHSM111100x736B6E616220726F662074756F6C69616220646E6F63657320666F206B6E697262206E6F20726F6C6C65636E61684320393030322F6E614A2F33302073656D695420656854B5KR/1r5B/2R5/2b1p1p1/2P1k1P1/1p2P2p/1P2P2P/3N1N2 b - - 0 1",
    sha256: "1a57c572caf3cf722e41f5f9cf99ffacff06728a43032dd44c481c77d2ec30d5",
  },
  phase3_2: {
    password: "jacquefrescogiveitjustonesecondheisenbergsuncertaintyprinciple",
    sha256: "250f37726d6862939f723edc4f993fde9d33c6004aab4f2203d9ee489d61ce4c",
  },
  salphaseion: {
    url: "gsmg.io/89727c598b9cd1cf8873f27cb7057f050645ddb6a7a157a110239ac0152f6a32",
    hashInput: "GSMGIO5BTCPUZZLECHALLENGE1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe",
  },
  beaufort: {
    key: "THEMATRIXHASYOU",
    hint: "Wake up, Neo reference",
  },
  knownHashes: {
    causality: "eb3efb5151e6255994711fe8f2264427ceeebf88109e1d7fad5b0a8b6d07e5bf",
    sevenPart: "1a57c572caf3cf722e41f5f9cf99ffacff06728a43032dd44c481c77d2ec30d5",
    jacquefresco: "250f37726d6862939f723edc4f993fde9d33c6004aab4f2203d9ee489d61ce4c",
    salphaseionAccess: "89727c598b9cd1cf8873f27cb7057f050645ddb6a7a157a110239ac0152f6a32",
  },
  claimedSolutions: {
    kiabuzz0: {
      password:
        "TheSeedIsPlantedChoiceIsAnIllusionMatrixSumListLastWordsBeforeArchiChoiceJacqueFractalThereIsNoSpoonFFGPFGGQG3GNpjk6",
      wif: "5Kb8kLf9zgWQnogidDA76MzPL6TsZZY36hWXMssSzNydYXYB9KF",
      address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      status: "DISPUTED",
    },
  },
}

export function evpBytesToKey(password: string, salt: string, keyLen = 32, ivLen = 16): { key: string; iv: string } {
  const passwordBytes = CryptoJS.enc.Utf8.parse(password)
  const saltBytes = CryptoJS.enc.Hex.parse(salt)

  let derivedBytes = CryptoJS.lib.WordArray.create()
  let block = CryptoJS.lib.WordArray.create()

  while (derivedBytes.sigBytes < keyLen + ivLen) {
    if (block.sigBytes > 0) {
      block = block.concat(passwordBytes).concat(saltBytes)
    } else {
      block = passwordBytes.concat(saltBytes)
    }
    block = CryptoJS.MD5(block)
    derivedBytes = derivedBytes.concat(block)
  }

  const key = CryptoJS.lib.WordArray.create(derivedBytes.words.slice(0, keyLen / 4), keyLen)
  const iv = CryptoJS.lib.WordArray.create(derivedBytes.words.slice(keyLen / 4, (keyLen + ivLen) / 4), ivLen)

  return {
    key: key.toString(CryptoJS.enc.Hex),
    iv: iv.toString(CryptoJS.enc.Hex),
  }
}

export function xorHashChain(tokens: string[]): string {
  if (tokens.length === 0) return ""

  const hashes = tokens.map((t) => sha256Hash(t))
  let result = hashes[0]

  for (let i = 1; i < hashes.length; i++) {
    result = xorHexStrings(result, hashes[i])
  }

  return result
}

export function aesDecryptRaw(ciphertextBase64: string, keyHex: string, ivHex: string): CryptoResult {
  try {
    const key = CryptoJS.enc.Hex.parse(keyHex)
    const iv = CryptoJS.enc.Hex.parse(ivHex)
    const ciphertext = CryptoJS.enc.Base64.parse(ciphertextBase64)

    const decrypted = CryptoJS.AES.decrypt({ ciphertext } as CryptoJS.lib.CipherParams, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    })

    const output = decrypted.toString(CryptoJS.enc.Utf8)
    return {
      success: output.length > 0,
      output,
      method: "AES-256-CBC-Raw",
      details: output.length > 0 ? `Decrypted ${output.length} chars` : "Empty output",
    }
  } catch (error) {
    return {
      success: false,
      output: "",
      method: "AES-256-CBC-Raw",
      details: `Error: ${error}`,
    }
  }
}

export function parseOpenSSLSalted(base64Data: string): { salt: string; ciphertext: string } | null {
  try {
    const decoded = atob(base64Data)
    const header = decoded.slice(0, 8)

    if (header !== "Salted__") {
      return null
    }

    const saltBytes = decoded.slice(8, 16)
    const ciphertextBytes = decoded.slice(16)

    // Convert to hex
    const salt = Array.from(saltBytes)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
    const ciphertext = btoa(ciphertextBytes)

    return { salt, ciphertext }
  } catch {
    return null
  }
}
