// Solana-specific constants — separate from lib/constants.ts (Tempo)

// Cluster
export const SOLANA_CLUSTER: 'devnet' | 'mainnet-beta' = 'devnet' // switch to 'mainnet-beta' for traction push
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'

// USDC on Solana
// Circle's devnet USDC — matches their mainnet USDC faucet pattern and is what
// https://faucet.circle.com issues. Switched from the older community mint
// Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr (2026-04-20).
export const SOLANA_USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' // Circle devnet USDC
export const SOLANA_USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Circle mainnet USDC
export const SOLANA_USDC_DECIMALS = 6

// x402 facilitator (CDP)
export const X402_FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402'
// CAIP-2 identifiers
export const SOLANA_CAIP2_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
export const SOLANA_CAIP2_DEVNET = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
