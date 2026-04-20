/**
 * lib/validators/registry.ts
 *
 * Resolves which validators vote on an escrow. Employer-configured validators
 * come from `escrow_validator_configs`; if none are active for an employer,
 * we fall back to the platform default (single Claude validator bound to the
 * Privy Solana server wallet).
 *
 * Trust-model note: the Privy Solana server wallet is BOTH the default Claude
 * validator's `validator_address` AND the on-chain `post_verdict` signer.
 * Application-layer consensus, on-chain atomic settlement. A future on-chain
 * voting program (e.g. Squads-style multi-sig) replaces the finalizer cleanly —
 * the application primitives (validator_votes, escrow_validator_configs, the
 * consensus engine) map 1:1.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export type ValidatorType = 'llm_claude' | 'llm_gpt4' | 'human' | 'oracle'

export interface RegisteredValidator {
  validatorId: string
  validatorAddress: string
  validatorType: ValidatorType
  weight: number
}

/** The platform default — single Claude validator using the Privy Solana wallet. */
export function getDefaultValidator(): RegisteredValidator {
  const walletId = process.env.PRIVY_SOLANA_AGENT_WALLET_ID
  const walletAddress = process.env.PRIVY_SOLANA_AGENT_WALLET_ADDRESS
  if (!walletId || !walletAddress) {
    throw new Error(
      'Cannot build default validator: PRIVY_SOLANA_AGENT_WALLET_ID / PRIVY_SOLANA_AGENT_WALLET_ADDRESS not set.',
    )
  }
  return {
    validatorId: walletId,
    validatorAddress: walletAddress,
    validatorType: 'llm_claude',
    weight: 1,
  }
}

/**
 * Returns the active validators for an employer. Falls back to the platform
 * default if the employer has no configured validators. Order is not
 * significant — consensus evaluates on content, not order.
 */
export async function getValidatorsForEscrow(
  employerId: string,
  supabase: SupabaseClient<Database>,
): Promise<RegisteredValidator[]> {
  const { data } = await supabase
    .from('escrow_validator_configs')
    .select('validator_id, validator_address, validator_type, weight')
    .eq('employer_id', employerId)
    .eq('active', true)

  if (!data || data.length === 0) {
    return [getDefaultValidator()]
  }

  return data.map((row) => ({
    validatorId: row.validator_id,
    validatorAddress: row.validator_address,
    validatorType: row.validator_type,
    weight: row.weight ?? 1,
  }))
}
