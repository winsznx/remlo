/**
 * lib/reputation/sas-bridge.ts
 *
 * sas-lib targets @solana/kit (web3.js v2) — Remlo's runtime is on
 * @solana/web3.js v1 (Anchor, Privy server-wallet signing path). This
 * file is the only translation layer between the two.
 *
 * Pattern:
 *   1. Build SAS instructions with sas-lib (returns v2 `IInstruction`).
 *   2. Convert each v2 instruction to a v1 `TransactionInstruction` here.
 *   3. Compose into a v1 `Transaction`, send to Privy for signing,
 *      broadcast via the existing v1 `Connection`.
 *
 * The v2 IInstruction shape (`programAddress`, `accounts[].address`,
 * `accounts[].role`, `data`) is byte-identical to v1's
 * `TransactionInstruction` shape — only the wrapping types differ.
 */
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import type { AccountMeta, Address, Instruction } from '@solana/kit'

// AccountRole bit layout (from @solana/instructions roles.d.ts):
//   READONLY = 0  · isWritable=false · isSigner=false
//   WRITABLE = 1  · isWritable=true  · isSigner=false
//   READONLY_SIGNER = 2 · isWritable=false · isSigner=true
//   WRITABLE_SIGNER = 3 · isWritable=true  · isSigner=true
const ROLE_WRITABLE_BIT = 0b01
const ROLE_SIGNER_BIT = 0b10

function roleToFlags(role: number): { isWritable: boolean; isSigner: boolean } {
  return {
    isWritable: (role & ROLE_WRITABLE_BIT) !== 0,
    isSigner: (role & ROLE_SIGNER_BIT) !== 0,
  }
}

export function v2InstructionToV1(ix: Instruction): TransactionInstruction {
  const keys = (ix.accounts ?? []).map((acc: AccountMeta) => {
    const flags = roleToFlags(acc.role as unknown as number)
    return {
      pubkey: new PublicKey(acc.address as unknown as string),
      isSigner: flags.isSigner,
      isWritable: flags.isWritable,
    }
  })
  return new TransactionInstruction({
    programId: new PublicKey(ix.programAddress as unknown as string),
    keys,
    data: Buffer.from(ix.data ?? new Uint8Array()),
  })
}

/** Helper to wrap a v1 PublicKey into a v2 Address string for sas-lib. */
export function publicKeyToAddress(pk: PublicKey): Address {
  return pk.toBase58() as unknown as Address
}
