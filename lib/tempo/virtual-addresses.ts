/**
 * lib/tempo/virtual-addresses.ts — TIP-1022 virtual-address derivation +
 * registry interactions.
 *
 * Tempo's TIP-1022 (T3 upgrade) lets a single master wallet derive
 * trillions of "virtual addresses" that route inbound TIP-20 transfers
 * back to the master. The format:
 *
 *   0x | masterId(4 bytes) | VIRTUAL_MAGIC(10 bytes) | userTag(6 bytes)
 *
 * - The master wallet registers a `masterId` once (proof-of-work — the
 *   keccak256 of `(msg.sender || salt)` must start with 4 zero bytes,
 *   ~2^32 iterations).
 * - Anyone with the masterId can derive virtual addresses offchain by
 *   composing them as bytes.
 * - When a TIP-20 transfer targets a virtual address, the precompile
 *   resolves to the master and credits the master. `Transfer` events fire
 *   twice: sender→virtual, virtual→master.
 *
 * Use case for Remlo: per-employer master = treasury wallet. Per-employee
 * userTag = `keccak256(employerId, employeeId)[:6]`. The employee gets a
 * deterministic deposit address that funds the employer treasury with
 * automatic per-employee attribution via the onchain event log.
 *
 * IMPORTANT: virtual addresses are TIP-20-only. Sending NFT, LP, or any
 * non-TIP-20 token to a virtual address is unrecoverable. Surface a hard
 * warning whenever Remlo UI displays one.
 */

import { keccak256, concat, getAddress, toHex, isAddress, type Address } from 'viem'
import { TEMPO_SYSTEM_CONTRACTS, VIRTUAL_ADDRESS_MAGIC } from '@/lib/tempo/system-contracts'

const MAGIC_BYTES = VIRTUAL_ADDRESS_MAGIC // '0xFDFDFDFDFDFDFDFDFDFD' (10 bytes)
const MASTER_ID_LENGTH = 4
const USER_TAG_LENGTH = 6

/**
 * Register a master wallet on the TIP-1022 Address Registry. The master
 * wallet must hold a salt such that `keccak256(masterAddr || salt)` starts
 * with 4 zero bytes — see `findValidSalt()`. The first 4 bytes of that
 * keccak become the masterId.
 *
 * This module exposes the math; the actual on-chain registration call
 * (Address Registry `registerVirtualMaster(salt)`) is performed by
 * whichever wallet client signs the tx. Today that's the Remlo agent
 * wallet on behalf of each employer.
 */

/**
 * Compute the masterId that would be assigned for a given (master, salt)
 * pair. Returns null if the keccak doesn't start with 4 zero bytes (and
 * therefore doesn't satisfy the registry's PoW constraint).
 */
export function computeMasterId(masterAddress: Address, salt: `0x${string}`): `0x${string}` | null {
  const hash = keccak256(concat([masterAddress, salt]))
  // First 4 bytes must be zero.
  if (
    hash[2] !== '0' ||
    hash[3] !== '0' ||
    hash[4] !== '0' ||
    hash[5] !== '0' ||
    hash[6] !== '0' ||
    hash[7] !== '0' ||
    hash[8] !== '0' ||
    hash[9] !== '0'
  ) {
    return null
  }
  // Next 4 bytes (= bytes 4..7 of the hash) become the masterId.
  return `0x${hash.slice(10, 18)}` as `0x${string}`
}

/**
 * Search for a salt that produces a valid masterId. Server-side use only —
 * the loop is CPU-bound (~2^32 iterations expected, but probabilistic).
 *
 * Returns `{ salt, masterId }` on success or null if `maxAttempts` is
 * exhausted. Caller handles retries with a fresh nonce range.
 */
export function findValidSalt(
  masterAddress: Address,
  options: { startNonce?: bigint; maxAttempts?: number } = {},
): { salt: `0x${string}`; masterId: `0x${string}`; iterations: number } | null {
  const max = options.maxAttempts ?? 50_000_000
  let nonce = options.startNonce ?? 0n
  for (let i = 0; i < max; i++) {
    const salt = toHex(nonce, { size: 32 }) as `0x${string}`
    const masterId = computeMasterId(masterAddress, salt)
    if (masterId) {
      return { salt, masterId, iterations: i + 1 }
    }
    nonce += 1n
  }
  return null
}

/**
 * Compose a virtual address from a 4-byte masterId and a 6-byte userTag.
 *
 * Both inputs must be hex with the exact byte length. Returns a checksummed
 * 20-byte address.
 */
export function deriveVirtualAddress(
  masterId: `0x${string}`,
  userTag: `0x${string}`,
): Address {
  const masterBytes = stripHex(masterId)
  const tagBytes = stripHex(userTag)
  if (masterBytes.length !== MASTER_ID_LENGTH * 2) {
    throw new Error(`masterId must be ${MASTER_ID_LENGTH} bytes`)
  }
  if (tagBytes.length !== USER_TAG_LENGTH * 2) {
    throw new Error(`userTag must be ${USER_TAG_LENGTH} bytes`)
  }
  const magic = stripHex(MAGIC_BYTES)
  const composed = `0x${masterBytes}${magic}${tagBytes}`
  return getAddress(composed)
}

/**
 * Decompose a virtual address into its components. Returns null when the
 * address doesn't carry the magic bytes (i.e. it's a regular address).
 */
export function decodeVirtualAddress(
  address: Address,
): { masterId: `0x${string}`; userTag: `0x${string}` } | null {
  if (!isAddress(address)) return null
  const bytes = stripHex(address).toLowerCase()
  const magic = stripHex(MAGIC_BYTES).toLowerCase()
  // bytes 4..14 (8 hex chars 8..28) must equal magic.
  if (bytes.slice(8, 28) !== magic) return null
  return {
    masterId: `0x${bytes.slice(0, 8)}` as `0x${string}`,
    userTag: `0x${bytes.slice(28, 40)}` as `0x${string}`,
  }
}

export function isVirtualAddress(address: Address): boolean {
  return decodeVirtualAddress(address) !== null
}

/**
 * Derive a per-employee userTag from (employerId, employeeId). Stable —
 * the same inputs always produce the same tag. Implemented as the first
 * 6 bytes of `keccak256(employerId || ":" || employeeId)`.
 */
export function deriveUserTag(employerId: string, employeeId: string): `0x${string}` {
  const composite = `${employerId}:${employeeId}`
  const hash = keccak256(toHex(composite))
  return `0x${stripHex(hash).slice(0, USER_TAG_LENGTH * 2)}` as `0x${string}`
}

/**
 * Convenience: compute the virtual deposit address for a given employer
 * (whose masterId is known) and a given employee.
 */
export function deriveEmployeeDepositAddress(args: {
  masterId: `0x${string}`
  employerId: string
  employeeId: string
}): Address {
  return deriveVirtualAddress(args.masterId, deriveUserTag(args.employerId, args.employeeId))
}

export const TEMPO_ADDRESS_REGISTRY = TEMPO_SYSTEM_CONTRACTS.addressRegistry

function stripHex(value: string): string {
  return value.startsWith('0x') ? value.slice(2) : value
}
