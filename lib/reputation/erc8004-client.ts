/**
 * lib/reputation/erc8004-client.ts
 *
 * Thin viem wrapper around the ERC-8004 trustless-agents registry contracts
 * deployed to Tempo Moderato. Single import boundary for the ABIs — if the
 * upstream spec rev bumps interface shapes, this file is what changes.
 *
 * ABIs are subset-only: only the calls we actually use in Ship 3. Expand when
 * new functionality (validation writes, agent URI updates, transfers) is wired.
 */
import { createPublicClient, createWalletClient, fallback, http, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { TEMPO_RPC_URL } from '@/lib/constants'

// ─── ABI fragments ───────────────────────────────────────────────────────────

export const IdentityRegistryAbi = [
  {
    type: 'function',
    name: 'register',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const

export const ReputationRegistryAbi = [
  {
    type: 'function',
    name: 'giveFeedback',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getSummary',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddresses', type: 'address[]' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
    ],
    outputs: [
      { name: 'count', type: 'uint64' },
      { name: 'summaryValue', type: 'int128' },
      { name: 'summaryValueDecimals', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getClients',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getLastIndex',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddress', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'readFeedback',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddress', type: 'address' },
      { name: 'feedbackIndex', type: 'uint64' },
    ],
    outputs: [
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
      { name: 'timestamp', type: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'FeedbackGiven',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'clientAddress', type: 'address', indexed: true },
      { name: 'feedbackIndex', type: 'uint64', indexed: false },
      { name: 'value', type: 'int128', indexed: false },
    ],
    anonymous: false,
  },
] as const

export const ValidationRegistryAbi = [
  {
    type: 'function',
    name: 'getSummary',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'validatorAddresses', type: 'address[]' },
      { name: 'tag', type: 'string' },
    ],
    outputs: [
      { name: 'count', type: 'uint64' },
      { name: 'avgResponse', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAgentValidations',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
] as const

// ─── Chain + clients ─────────────────────────────────────────────────────────

const TEMPO_MODERATO_CHAIN = {
  id: 42431,
  name: 'Tempo Moderato',
  nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 6 },
  rpcUrls: { default: { http: [TEMPO_RPC_URL] } },
} as const

// Ship 7 Part 5A — rotate to a fallback RPC on 429/5xx so a traffic spike on
// the public `/agents` page doesn't kill request-path features. Set
// TEMPO_RPC_URL_FALLBACK to a second RPC endpoint (e.g. a paid Helius-style
// provider) and viem's `fallback` transport will rotate automatically.
function buildTempoTransport() {
  const fallbackUrl = process.env.TEMPO_RPC_URL_FALLBACK
  if (!fallbackUrl) return http(TEMPO_RPC_URL)
  return fallback([http(TEMPO_RPC_URL), http(fallbackUrl)], {
    rank: false,
    retryCount: 1,
  })
}
const tempoTransport = buildTempoTransport()

export function getTempoPublicClient() {
  return createPublicClient({ transport: tempoTransport, chain: TEMPO_MODERATO_CHAIN })
}

export function getTempoWalletClient(privateKey: Hex) {
  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    transport: tempoTransport,
    chain: TEMPO_MODERATO_CHAIN,
  })
}

// ─── Address accessors ──────────────────────────────────────────────────────

export function getIdentityRegistryAddress(): Address {
  const addr = process.env.NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY
  if (!addr) throw new Error('NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY not set')
  return addr as Address
}

export function getReputationRegistryAddress(): Address {
  const addr = process.env.NEXT_PUBLIC_ERC8004_REPUTATION_REGISTRY
  if (!addr) throw new Error('NEXT_PUBLIC_ERC8004_REPUTATION_REGISTRY not set')
  return addr as Address
}

export function getValidationRegistryAddress(): Address {
  const addr = process.env.NEXT_PUBLIC_ERC8004_VALIDATION_REGISTRY
  if (!addr) throw new Error('NEXT_PUBLIC_ERC8004_VALIDATION_REGISTRY not set')
  return addr as Address
}

export function getRemloPayrollAgentId(): bigint {
  const v = process.env.REMLO_PAYROLL_AGENT_ID
  if (!v) throw new Error('REMLO_PAYROLL_AGENT_ID not set')
  return BigInt(v)
}

export function getRemloValidatorAgentId(): bigint {
  const v = process.env.REMLO_VALIDATOR_AGENT_ID
  if (!v) throw new Error('REMLO_VALIDATOR_AGENT_ID not set')
  return BigInt(v)
}
