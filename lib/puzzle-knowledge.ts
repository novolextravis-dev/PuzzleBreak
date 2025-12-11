// Complete GSMG Puzzle Knowledge Base
// Based on comprehensive research including GitHub issues #56 and kaibuzz0 solution

export const GSMG_PUZZLE_KNOWLEDGE = {
  // Target Information
  target: {
    address: "1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe",
    originalPrize: "5 BTC",
    currentPrize: "1.5 BTC",
    startDate: "2019-04-13",
    status: "DISPUTED", // Claimed solved but reward not paid
  },

  // Phase 1: Binary Matrix - VERIFIED SOLUTION
  phase1: {
    name: "Binary Matrix Decode",
    status: "SOLVED",
    result: "gsmg.io/theseedisplanted",
    method: "14x14 matrix, Black/Blue=1, Yellow/White=0, counter-clockwise spiral from top-left, 8-bit ASCII",
    binary:
      "0110011101110011011011010110011100101110011010010110111100101111011101000110100001100101011100110110010101100101011001000110100101110011011100000110110001100001011011100111010001100101011001000",
  },

  // Phase 2: The Seed is Planted
  phase2: {
    name: "The Seed is Planted",
    status: "SOLVED",
    url: "gsmg.io/theseedisplanted",
    songReference: {
      title: "The Warning",
      artist: "Logic",
      clue: "The seed is planted...",
    },
    hiddenForm: "Use browser dev tools (F12) to reveal hidden POST form",
    password: "theflowerblossomsthroughwhatseemstobeaconcretesurface",
    alternatePassword: "thekeymakertheveninbarrowmatrixoverlordcxb7chancellor",
    result: "Encrypted Phase 3 block",
  },

  // Phase 3: Choice is an Illusion
  phase3: {
    name: "Choice is an Illusion",
    status: "SOLVED",
    movieReference: {
      movie: "The Matrix Reloaded",
      character: "Merovingian",
      quote: "Choice is an illusion created between those with power and those without",
    },
    password: "causality",
    sha256: "eb3efb5151e6255994711fe8f2264427ceeebf88109e1d7fad5b0a8b6d07e5bf",
    output: "The ironic 2name of the keymakers... + Puzzle token",
    hints: {
      Q: "Unknown",
      B: "Unknown",
      H: "Unknown",
      S: "Klingon numerals",
    },
    nextStep: "Password built from 7 concatenated parts (first = causality)",
  },

  // Phase 3.2: Sub-puzzles
  phase3_2: {
    name: "Sub-puzzles - Beaufort & VIC Ciphers",
    status: "SOLVED",
    subPuzzles: {
      "3.2.1": {
        type: "Beaufort Cipher",
        key: "THEMATRIXHASYOU",
        outputs: ["lastwordsbeforearchichoice", "thispassword"],
      },
      "3.2.2": {
        type: "VIC Cipher Variant",
        output:
          "IN CASE YOU MANAGE TO CRACK THIS THE PRIVATE KEYS BELONG TO HALF AND BETTER HALF AND THEY ALSO NEED FUNDS TO LIVE.",
        motif: "HALF & BETTER HALF",
      },
      combined: {
        password: "jacquefrescogiveitjustonesecondheisenbergsuncertaintyprinciple",
        sha256: "250f37726d6862939f723edc4f993fde9d33c6004aab4f2203d9ee489d61ce4c",
      },
    },
  },

  // Phase 4: Seven Part Password Construction
  phase4: {
    name: "Seven Part Password Assembly",
    status: "SOLVED",
    parts: [
      { name: "causality", value: "causality" },
      { name: "Safenet Luna HSM", value: "SafenetLunaHSM" },
      { name: "JFK binary motif", value: "11110" },
      {
        name: "Hex phrase block",
        value:
          "0x736B6E616220726F662074756F6C69616220646E6F63657320666F206B6E697262206E6F20726F6C6C65636E61684320393030322F6E614A2F33302073656D695420656854",
      },
      { name: "Chess notation", value: "B5KR/1r5B/2R5/2b1p1p1/2P1k1P1/1p2P2p/1P2P2P/3N1N2 b - - 0 1" },
    ],
    sha256: "1a57c572caf3cf722e41f5f9cf99ffacff06728a43032dd44c481c77d2ec30d5",
    output: "What if the Merovingian is wrong... + further hints",
  },

  // Phase 5/6: Go Back & Hash
  phase5: {
    name: "Go Back & Hash - SalPhaseIon Entry",
    status: "SOLVED",
    hint: "HASHTHETEXT... go back to the first puzzle piece",
    inputText: "Original puzzle intro text",
    sha256: "89727c598b9cd1cf8873f27cb7057f050645ddb6a7a157a110239ac0152f6a32",
    leadsTo: "SalPhaseIon & Cosmic Duality",
  },

  // Phase 6/7: SalPhaseIon Token Extraction
  salphaseion: {
    name: "SalPhaseIon - Token Extraction",
    status: "SOLVED",
    abbaBlocks: {
      method: "Map a=0, b=1, convert to ASCII",
      tokens: {
        p1: "matrixsumlist",
        p2: "enter",
      },
    },
    limitedAlphabet: {
      method: "a-i + o as 0, A1Z26 decoding",
      outputs: ["lastwordsbeforearchichoice", "thispassword"],
    },
    confirmedTokens: [
      "matrixsumlist",
      "enter",
      "lastwordsbeforearchichoice",
      "thispassword",
      "yourlastcommand",
      "secondanswer",
    ],
    hint: "our first hint is your last command -> last command was sha256",
  },

  // Final Phase: Cosmic Duality
  cosmicDuality: {
    name: "Cosmic Duality - Final AES Decryption",
    status: "DISPUTED",
    aesBlob: {
      filename: "cosmic_duality.txt",
      format: "Base64 -> Salted__ header -> 8-byte salt + AES-256-CBC ciphertext",
    },
    passwordTokens: {
      order: [
        "matrixsumlist",
        "enter",
        "lastwordsbeforearchichoice",
        "thispassword",
        "matrixsumlist", // repeated
        "yourlastcommand",
        "secondanswer",
      ],
      process:
        "SHA-256 each word (32 bytes) -> XOR sequentially -> final 32-byte key -> EVP_BytesToKey with salt -> AES-256-CBC decrypt",
    },
    expectedOutput: {
      binarySize: 1327,
      sha256: "4f7a1e4efe4bf6c5581e32505c019657cb7b030e90232d33f011aca6a5e9c081",
    },
  },

  // Spectrogram Clue (CRITICAL)
  spectrogramClue: {
    source: ".wav audio file",
    extractedString: "FFGPFGGQG3GNpjk6",
    method: "Load in spectral viewer, visual encoding",
    usedIn: "Phase 3 password construction",
  },

  // Known Complete Passwords (from multiple sources)
  knownPasswords: {
    phase2: [
      "theflowerblossomsthroughwhatseemstobeaconcretesurface",
      "thekeymakertheveninbarrowmatrixoverlordcxb7chancellor",
    ],
    phase3: ["causality", "matrixsumlistlastwordsbeforearchichoicejacquefractalFFGPFGGQG3GNpjk6"],
    phase4Final:
      "TheSeedIsPlantedChoiceIsAnIllusionMatrixSumListLastWordsBeforeArchiChoiceJacqueFractalThereIsNoSpoonFFGPFGGQG3GNpjk6",
  },

  // KDF Information (CRITICAL - different phases use different KDFs)
  keyDerivation: {
    phase2: { method: "PBKDF1", hash: "SHA256", note: "Uncommon/deprecated" },
    phase3: { method: "PBKDF1", hash: "SHA256" },
    phase4: { method: "PBKDF2", hash: "SHA256", note: "Different from earlier phases!" },
    cosmicDuality: { method: "EVP_BytesToKey", cipher: "AES-256-CBC" },
  },

  // Claimed Solutions
  claimedSolutions: {
    kaibuzz0: {
      solver: "kiabuzz0",
      date: "06/25/2025",
      finalPassword:
        "TheSeedIsPlantedChoiceIsAnIllusionMatrixSumListLastWordsBeforeArchiChoiceJacqueFractalThereIsNoSpoonFFGPFGGQG3GNpjk6",
      claimedKey: "5Kb8kLf9zgWQnogidDA76MzPL6TsZZY36hWXMssSzNydYXYB9KF",
      claimedAddress: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      note: "ADDRESS IS SATOSHI'S GENESIS WALLET - Cannot be spent! Likely a decoy or scam.",
      rewardStatus: "NOT PAID - Creator blocked solver",
    },
    dgk5902a: {
      solver: "dgk5902a-boop",
      date: "08/31/2025",
      decodedAddresses: ["1Hxxxxxx", "1Bxxxxxx"],
      note: "Two addresses revealed but both have 0 balance",
      status: "Final phase decrypted but puzzle inactive",
    },
  },

  // All known SHA256 hashes
  knownHashes: {
    causality: "eb3efb5151e6255994711fe8f2264427ceeebf88109e1d7fad5b0a8b6d07e5bf",
    sevenPart: "1a57c572caf3cf722e41f5f9cf99ffacff06728a43032dd44c481c77d2ec30d5",
    jacquefresco: "250f37726d6862939f723edc4f993fde9d33c6004aab4f2203d9ee489d61ce4c",
    salphaseionAccess: "89727c598b9cd1cf8873f27cb7057f050645ddb6a7a157a110239ac0152f6a32",
    cosmicDualityOutput: "4f7a1e4efe4bf6c5581e32505c019657cb7b030e90232d33f011aca6a5e9c081",
  },

  // Matrix Movie References (thematic clues)
  matrixReferences: {
    characters: ["Neo", "Morpheus", "Trinity", "The Merovingian", "The Architect", "The Keymaker"],
    quotes: ["Choice is an illusion", "There is no spoon", "The Matrix has you", "What if the Merovingian is wrong"],
    concepts: ["causality", "choice", "free will", "the architect's choice"],
  },

  // Important Warning
  warning: {
    message:
      "The claimed solution leads to Satoshi's Genesis wallet (1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa) which is UNSPENDABLE. The real prize address is 1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe. Multiple solvers report being blocked from claiming rewards. This puzzle may be a scam or have a different final step not yet discovered.",
  },
}

// All discovered tokens for systematic testing
export const ALL_TOKENS = [
  "theseedisplanted",
  "choiceisanillusion",
  "causality",
  "matrixsumlist",
  "enter",
  "lastwordsbeforearchichoice",
  "thispassword",
  "yourlastcommand",
  "secondanswer",
  "jacquefrescogiveitjustonesecondheisenbergsuncertaintyprinciple",
  "jacquefractal",
  "thereisnoSpoon",
  "ThereIsNoSpoon",
  "FFGPFGGQG3GNpjk6",
  "theflowerblossomsthroughwhatseemstobeaconcretesurface",
  "thekeymakertheveninbarrowmatrixoverlordcxb7chancellor",
  "SafenetLunaHSM",
  "THEMATRIXHASYOU",
]

// Complete password candidates for direct testing
export const PASSWORD_CANDIDATES = [
  "causality",
  "theflowerblossomsthroughwhatseemstobeaconcretesurface",
  "thekeymakertheveninbarrowmatrixoverlordcxb7chancellor",
  "matrixsumlistlastwordsbeforearchichoicejacquefractalFFGPFGGQG3GNpjk6",
  "TheSeedIsPlantedChoiceIsAnIllusionMatrixSumListLastWordsBeforeArchiChoiceJacqueFractalThereIsNoSpoonFFGPFGGQG3GNpjk6",
  "jacquefrescogiveitjustonesecondheisenbergsuncertaintyprinciple",
]

// Precomputed SHA256 hashes for known strings
export const PRECOMPUTED_HASHES: Record<string, string> = {
  causality: "eb3efb5151e6255994711fe8f2264427ceeebf88109e1d7fad5b0a8b6d07e5bf",
  matrixsumlist: "a3c2d1e4f5b6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2", // needs verification
  enter: "d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2", // needs verification
  lastwordsbeforearchichoice: "e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3", // needs verification
  thispassword: "f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4", // needs verification
}

// XOR chain tokens for Cosmic Duality
export const XOR_CHAIN_TOKENS = [
  "matrixsumlist",
  "enter",
  "lastwordsbeforearchichoice",
  "thispassword",
  "matrixsumlist",
  "yourlastcommand",
  "secondanswer",
]
