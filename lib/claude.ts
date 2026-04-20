/**
 * lib/claude.ts — single source of truth for the Anthropic client.
 *
 * Three callers (escrow validator, payroll agent, yield agent) need the same
 * model, timeout, retry, and key-resolution behavior. Centralizing here means
 * model bumps, timeout tuning, and future telemetry happen in one place.
 */
import Anthropic from '@anthropic-ai/sdk'

export const CLAUDE_MODEL = 'claude-sonnet-4-6'
export const CLAUDE_TIMEOUT_MS = 30_000
export const CLAUDE_MAX_RETRIES = 1

export function getAnthropicApiKey(): string | undefined {
  return process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
}

/**
 * Returns a configured Anthropic SDK client, or null when no API key is
 * present. Callers must handle the null case (deterministic fallback,
 * auto-reject, etc. — policy is per-caller).
 */
export function getAnthropicClient(): Anthropic | null {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) return null
  return new Anthropic({
    apiKey,
    timeout: CLAUDE_TIMEOUT_MS,
    maxRetries: CLAUDE_MAX_RETRIES,
  })
}

export function extractTextContent(
  content: Anthropic.Messages.ContentBlock[],
): string {
  return content
    .filter((b) => b.type === 'text')
    .map((b) => ('text' in b ? b.text : ''))
    .join('')
}
