/**
 * lib/llm-input-sanitizer.ts — defensive decoder for user-supplied text
 * destined for an LLM judge.
 *
 * Why this exists: in May 2026 a single autonomous bot lost 3B tokens to
 * a prompt injection attack on Base. The pattern is consistent across the
 * incidents we've reviewed: the attacker hides instructions inside text
 * the agent reads (a tweet body, a delivery proof URL, a memo), encoded so
 * the LLM's safety filter doesn't recognize the override. Common encodings:
 * morse, base64, leetspeak, ROT13, hidden zero-width characters, and
 * right-to-left override marks that visually swap "approve" and "reject".
 *
 * `sanitizeUserText` decodes the most common encodings, compares the
 * decoded form to the input, and reports whether the differences look
 * "suspicious" — i.e. the decoded form contains payment / verdict /
 * permission words that the original didn't. The caller decides what to
 * do (in escrow: park for human review; in compliance: re-screen with
 * decoded form).
 *
 * NOT a complete defence — encoding is one of many vectors. This is gate
 * 5 of Remlo's six-gate defence model. If this file misses a vector,
 * caps + identity + reputation + sanctions + emergency-pause still apply.
 */

const TRIGGER_WORDS = [
  // verdict and approval flips
  'approve',
  'accept',
  'release',
  'settle',
  'reject',
  'refund',
  'cancel',
  'overturn',
  'override',
  // payment instructions
  'transfer',
  'send',
  'withdraw',
  'pay',
  'wire',
  'forward',
  // permission and identity
  'admin',
  'sudo',
  'root',
  'bypass',
  'disregard',
  'ignore',
  // exfil markers
  'private key',
  'seed phrase',
  'mnemonic',
  'secret',
] as const

const MORSE_TABLE: Record<string, string> = {
  '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E',
  '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J',
  '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O',
  '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
  '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y',
  '--..': 'Z', '-----': '0', '.----': '1', '..---': '2', '...--': '3',
  '....-': '4', '.....': '5', '-....': '6', '--...': '7', '---..': '8',
  '----.': '9',
}

// Hidden / zero-width characters and bidi overrides that visually mask
// the actual characters from a human reviewer.
const HIDDEN_CHAR_REGEX = /[​-‏‪-‮⁠-⁯﻿]/g

// Leetspeak substitution — rough decoder for the common ones.
const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
  '!': 'i', '@': 'a', '$': 's', '+': 't',
}

function decodeMorse(input: string): string | null {
  // Heuristic: only attempt if the input looks like morse — heavy
  // dot/dash density with whitespace separators.
  const tokens = input.trim().split(/[\s\/]+/)
  if (tokens.length < 2) return null
  const morseFraction = tokens.filter((t) => /^[.\-]+$/.test(t)).length / tokens.length
  if (morseFraction < 0.7) return null
  let out = ''
  for (const token of tokens) {
    if (token === '/') {
      out += ' '
      continue
    }
    const ch = MORSE_TABLE[token]
    if (!ch) continue
    out += ch
  }
  return out.trim() || null
}

function decodeBase64Tokens(input: string): string {
  // Find base64-looking tokens and decode them. We only flag tokens
  // ≥16 chars to avoid false positives on short hex / random ID strings.
  return input.replace(/[A-Za-z0-9+/]{16,}={0,2}/g, (token) => {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8')
      // Reject decoded payloads that are mostly non-printable (binary noise).
      const printable = decoded.replace(/[^\x20-\x7E]/g, '').length / decoded.length
      if (printable < 0.8) return token
      return `${token} «decoded:${decoded}»`
    } catch {
      return token
    }
  })
}

function decodeRot13(input: string): string {
  return input.replace(/[A-Za-z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base)
  })
}

function decodeLeet(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((c) => LEET_MAP[c] ?? c)
    .join('')
}

function stripHiddenChars(input: string): { stripped: string; removed: number } {
  const stripped = input.replace(HIDDEN_CHAR_REGEX, '')
  return { stripped, removed: input.length - stripped.length }
}

function containsTrigger(text: string): string | null {
  const lower = text.toLowerCase()
  for (const word of TRIGGER_WORDS) {
    if (lower.includes(word)) return word
  }
  return null
}

export interface SanitizeResult {
  /** The input text with hidden characters stripped. Safe to render. */
  cleaned: string
  /** True if any decoded form contains trigger words the original did not. */
  suspicious: boolean
  /** Human-readable reasons we flagged. Empty array if not suspicious. */
  reasons: string[]
  /** Decoded forms we tried, for logging / human review. */
  decodings: { method: string; output: string; trigger?: string }[]
}

/**
 * Run every decoder we know against `input` and surface anything that
 * smells like a hidden instruction. The caller decides what to do.
 *
 * Defaults are conservative: we'd rather flag a benign tweet that
 * happens to contain "approve" in base64 than miss a real injection.
 * Downstream paths should use the `cleaned` output (hidden chars
 * stripped) when a human reviewer needs to see the text.
 */
export function sanitizeUserText(input: string): SanitizeResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { cleaned: input, suspicious: false, reasons: [], decodings: [] }
  }

  const reasons: string[] = []
  const decodings: SanitizeResult['decodings'] = []

  // Strip hidden characters first. If we removed any, that's already
  // suspicious enough to flag.
  const { stripped, removed } = stripHiddenChars(input)
  if (removed > 0) {
    reasons.push(`removed ${removed} hidden character(s) (zero-width or RTL override)`)
  }

  const originalTrigger = containsTrigger(stripped)

  // Try each decoder. Flag if a decoded form contains trigger words
  // that the original (post-strip) did not.
  const morse = decodeMorse(stripped)
  if (morse) {
    const trigger = containsTrigger(morse)
    decodings.push({ method: 'morse', output: morse, trigger: trigger ?? undefined })
    if (trigger && trigger !== originalTrigger) {
      reasons.push(`morse decoded form contains "${trigger}"`)
    }
  }

  const base64Annotated = decodeBase64Tokens(stripped)
  if (base64Annotated !== stripped) {
    const trigger = containsTrigger(base64Annotated)
    decodings.push({
      method: 'base64',
      output: base64Annotated,
      trigger: trigger ?? undefined,
    })
    if (trigger && trigger !== originalTrigger) {
      reasons.push(`base64-decoded form contains "${trigger}"`)
    }
  }

  const rot = decodeRot13(stripped)
  // ROT13 only flags if the rot version has triggers AND the rot version
  // is overwhelmingly alpha (otherwise it's just gibberish).
  if (rot.length === stripped.length && /^[A-Za-z\s.,!?'"-]+$/.test(stripped)) {
    const trigger = containsTrigger(rot)
    if (trigger && trigger !== originalTrigger) {
      decodings.push({ method: 'rot13', output: rot, trigger })
      reasons.push(`ROT13-decoded form contains "${trigger}"`)
    }
  }

  const leet = decodeLeet(stripped)
  if (leet !== stripped.toLowerCase()) {
    const trigger = containsTrigger(leet)
    if (trigger && trigger !== originalTrigger) {
      decodings.push({ method: 'leet', output: leet, trigger })
      reasons.push(`leetspeak-decoded form contains "${trigger}"`)
    }
  }

  return {
    cleaned: stripped,
    suspicious: reasons.length > 0,
    reasons,
    decodings,
  }
}
