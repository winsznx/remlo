/**
 * Simplified ambient type declarations for @lit-protocol/vincent-* packages.
 *
 * The actual packages use deeply nested generics that cause tsc OOM during
 * inference (even with skipLibCheck: true, call sites trigger the evaluation).
 * These stubs expose the exact API surface used in lib/vincent-agent.ts with
 * concrete types, preserving call-site type safety without the deep inference.
 *
 * This file must have no top-level imports to remain a global ambient file
 * and correctly override the package types.
 */

declare module '@lit-protocol/vincent-app-sdk/abilityClient' {
  export interface AbilityResponseSuccess<R> {
    success: true
    result: R
    runtimeError?: never
  }

  export interface AbilityResponseFailure {
    success: false
    result?: unknown
    runtimeError?: string
    schemaValidationError?: unknown
  }

  export type AbilityResponse<R> = AbilityResponseSuccess<R> | AbilityResponseFailure

  export interface PrecheckResult {
    deserializedUnsignedTransaction: {
      to: string
      value: string
      gasLimit: string
      data: string
      chainId: number
      nonce?: number
      maxFeePerGas?: string | null
      maxPriorityFeePerGas?: string | null
    }
  }

  export interface ExecuteResult {
    signedTransaction: string
    deserializedSignedTransaction: {
      hash: string
      from: string
      to: string
      nonce: number
      chainId: number
      value: string
      gasLimit: string
      data: string
      v: number
      r: string
      s: string
    }
  }

  export interface EvmSignerAbilityClient {
    precheck(
      params: { serializedTransaction: string },
      context: { delegatorPkpEthAddress: string; agentAddress: string; rpcUrl?: string }
    ): Promise<AbilityResponse<PrecheckResult>>

    execute(
      params: { serializedTransaction: string },
      context: { delegatorPkpEthAddress: string; agentAddress: string }
    ): Promise<AbilityResponse<ExecuteResult>>
  }

  // ethersSigner typed as object (not importing ethers to keep this file global)
  export function getVincentAbilityClient(params: {
    bundledVincentAbility: unknown
    ethersSigner: object
    debug?: boolean
    registryRpcUrl?: string
    pkpInfoRpcUrl?: string
  }): EvmSignerAbilityClient

  export function disconnectVincentAbilityClients(): Promise<void>

  export function isAbilityResponseFailure<R>(
    r: AbilityResponse<R>
  ): r is AbilityResponseFailure

  export function isAbilityResponseSuccess<R>(
    r: AbilityResponse<R>
  ): r is AbilityResponseSuccess<R>
}

declare module '@lit-protocol/vincent-ability-evm-transaction-signer' {
  export const bundledVincentAbility: unknown
}
