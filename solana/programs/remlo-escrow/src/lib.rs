//! Remlo multi-agent escrow program.
//!
//! Three-party coordination primitive:
//!   - Requester: posts an escrow with rubric, worker identity, and USDC bounty
//!   - Worker: submits a deliverable (content hash stored on-chain, URI off-chain)
//!   - Validator: off-chain Claude judge reads the deliverable, signs a verdict
//!     via the program's validator_authority (Remlo's Privy server wallet)
//!
//! State machine:
//!   Posted ──submit_deliverable──> Delivered ──post_verdict──> Validated
//!   Validated ──settle──> Settled (worker receives USDC)
//!   Validated ──refund──> RejectedRefunded (requester receives USDC, minus fee TODO)
//!   Posted | Delivered ──refund(Expired)──> ExpiredRefunded (after expires_at)
//!
//! Funds custody: the escrow PDA owns a USDC ATA. The token_program CPI moves
//! USDC between requester/worker ATAs and this PDA-owned ATA. The validator_authority
//! can post verdicts and trigger settle/refund but CANNOT drain funds to an
//! arbitrary address — destinations are constrained by the program to the
//! requester or worker recorded at initialize.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// Placeholder program ID. Replace with the real one after `anchor build` +
// `anchor deploy --provider.cluster devnet`. The operator will update this
// value and `solana/Anchor.toml` with the deployed address.
declare_id!("2CY3JQfkXpyTT8QBiHfKnashxGJ37ctDvqcgi7ggWiAA");

pub const ESCROW_SEED: &[u8] = b"escrow";
pub const VAULT_SEED: &[u8] = b"vault";

/// Maximum permitted escrow amount in USDC base units (6 decimals).
/// 100 USDC = 100_000_000 base units. Matches the off-chain cap from the Ship 2 prompt.
pub const MAX_ESCROW_BASE_UNITS: u64 = 100_000_000;

/// Minimum expiry duration in seconds (1 hour).
pub const MIN_EXPIRY_SECONDS: i64 = 60 * 60;
/// Maximum expiry duration in seconds (7 days).
pub const MAX_EXPIRY_SECONDS: i64 = 60 * 60 * 24 * 7;

#[program]
pub mod remlo_escrow {
    use super::*;

    /// Creates a new escrow PDA, derives a vault ATA owned by the PDA, and
    /// transfers `args.amount` USDC from the requester's ATA into the vault.
    pub fn initialize_escrow(ctx: Context<InitializeEscrow>, args: InitializeEscrowArgs) -> Result<()> {
        require!(args.amount > 0, EscrowError::AmountMustBePositive);
        require!(
            args.amount <= MAX_ESCROW_BASE_UNITS,
            EscrowError::AmountAboveCap
        );

        let now = Clock::get()?.unix_timestamp;
        let duration = args.expires_at - now;
        require!(duration >= MIN_EXPIRY_SECONDS, EscrowError::ExpiryTooSoon);
        require!(duration <= MAX_EXPIRY_SECONDS, EscrowError::ExpiryTooFar);

        let escrow = &mut ctx.accounts.escrow;
        escrow.requester = ctx.accounts.requester.key();
        escrow.worker = args.worker;
        escrow.validator_authority = args.validator_authority;
        escrow.mint = ctx.accounts.mint.key();
        escrow.amount = args.amount;
        escrow.rubric_hash = args.rubric_hash;
        escrow.deliverable_uri_hash = [0u8; 32];
        escrow.deliverable_content_hash = [0u8; 32];
        escrow.has_deliverable = false;
        escrow.created_at = now;
        escrow.expires_at = args.expires_at;
        escrow.status = EscrowStatus::Posted;
        escrow.verdict = VerdictState::Pending;
        escrow.confidence_bps = 0;
        escrow.nonce = args.nonce;
        escrow.bump = ctx.bumps.escrow;

        // CPI: transfer USDC from requester ATA to vault ATA
        let cpi_accounts = Transfer {
            from: ctx.accounts.requester_ata.to_account_info(),
            to: ctx.accounts.vault_ata.to_account_info(),
            authority: ctx.accounts.requester.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, args.amount)?;

        emit!(EscrowPosted {
            escrow: escrow.key(),
            requester: escrow.requester,
            worker: escrow.worker,
            amount: escrow.amount,
            expires_at: escrow.expires_at,
        });

        Ok(())
    }

    /// Worker submits a deliverable. Updates status to Delivered.
    /// Anyone can call this but the signer must match the worker recorded at initialize.
    pub fn submit_deliverable(
        ctx: Context<SubmitDeliverable>,
        uri_hash: [u8; 32],
        content_hash: [u8; 32],
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Posted, EscrowError::InvalidStatus);

        let now = Clock::get()?.unix_timestamp;
        require!(now < escrow.expires_at, EscrowError::Expired);

        require!(
            ctx.accounts.worker.key() == escrow.worker,
            EscrowError::WorkerMismatch
        );

        escrow.deliverable_uri_hash = uri_hash;
        escrow.deliverable_content_hash = content_hash;
        escrow.has_deliverable = true;
        escrow.status = EscrowStatus::Delivered;

        emit!(DeliverableSubmitted {
            escrow: escrow.key(),
            worker: escrow.worker,
            uri_hash,
            content_hash,
        });

        Ok(())
    }

    /// Validator (off-chain Claude judge, signing via Remlo's Privy server wallet
    /// whose pubkey equals escrow.validator_authority) writes a verdict on-chain.
    /// Does NOT move funds — settle/refund are separate instructions that
    /// require an existing verdict.
    pub fn post_verdict(ctx: Context<PostVerdict>, verdict: VerdictState, confidence_bps: u16) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Delivered, EscrowError::InvalidStatus);
        require!(
            matches!(verdict, VerdictState::Approved | VerdictState::Rejected),
            EscrowError::InvalidVerdict
        );
        require!(confidence_bps <= 10_000, EscrowError::InvalidConfidence);
        require!(
            ctx.accounts.validator_authority.key() == escrow.validator_authority,
            EscrowError::ValidatorMismatch
        );

        escrow.verdict = verdict;
        escrow.confidence_bps = confidence_bps;
        escrow.status = EscrowStatus::Validated;

        emit!(VerdictPosted {
            escrow: escrow.key(),
            verdict,
            confidence_bps,
        });

        Ok(())
    }

    /// On an approved verdict, transfer the vault balance to the worker's USDC ATA.
    ///
    /// PERMISSIONLESS. Anyone can trigger settlement once the on-chain verdict
    /// is Approved and status is Validated. Those invariants could only have
    /// been set by `post_verdict` signed by `validator_authority`, so the
    /// settlement outcome is already determined — any caller just cranks it.
    /// This preserves the trust property that the worker can claim their own
    /// settlement if Remlo's server is offline, symmetric with the permissionless
    /// expiry refund path.
    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Validated, EscrowError::InvalidStatus);
        require!(escrow.verdict == VerdictState::Approved, EscrowError::NotApproved);
        require!(
            ctx.accounts.worker_ata.owner == escrow.worker,
            EscrowError::WorkerMismatch
        );

        let escrow_key = escrow.key();
        let bump = escrow.bump;
        let seeds: &[&[u8]] = &[ESCROW_SEED, escrow.requester.as_ref(), &escrow.nonce.to_le_bytes(), &[bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_ata.to_account_info(),
            to: ctx.accounts.worker_ata.to_account_info(),
            authority: escrow.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, escrow.amount)?;

        escrow.status = EscrowStatus::Settled;

        emit!(EscrowSettled {
            escrow: escrow_key,
            worker: escrow.worker,
            amount: escrow.amount,
        });

        Ok(())
    }

    /// Refund path. PERMISSIONLESS for both reasons — the on-chain state
    /// determines the outcome; any caller just cranks it.
    ///
    ///   (a) Rejected: escrow must be Validated with verdict Rejected. Those
    ///       invariants could only have been set by the validator_authority
    ///       via post_verdict, so the refund outcome is already determined.
    ///   (b) Expired: escrow must be Posted or Delivered and past expires_at.
    ///
    /// Matches the permissionless property of the `settle` instruction —
    /// requester can recover their own funds if Remlo's server is offline.
    pub fn refund(ctx: Context<Refund>, reason: RefundReason) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let now = Clock::get()?.unix_timestamp;

        match reason {
            RefundReason::Rejected => {
                require!(escrow.status == EscrowStatus::Validated, EscrowError::InvalidStatus);
                require!(escrow.verdict == VerdictState::Rejected, EscrowError::NotRejected);
            }
            RefundReason::Expired => {
                require!(
                    escrow.status == EscrowStatus::Posted || escrow.status == EscrowStatus::Delivered,
                    EscrowError::InvalidStatus
                );
                require!(now >= escrow.expires_at, EscrowError::NotYetExpired);
            }
        }

        require!(
            ctx.accounts.requester_ata.owner == escrow.requester,
            EscrowError::RequesterMismatch
        );

        let escrow_key = escrow.key();
        let bump = escrow.bump;
        let seeds: &[&[u8]] = &[ESCROW_SEED, escrow.requester.as_ref(), &escrow.nonce.to_le_bytes(), &[bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_ata.to_account_info(),
            to: ctx.accounts.requester_ata.to_account_info(),
            authority: escrow.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, escrow.amount)?;

        escrow.status = match reason {
            RefundReason::Rejected => EscrowStatus::RejectedRefunded,
            RefundReason::Expired => EscrowStatus::ExpiredRefunded,
        };

        emit!(EscrowRefunded {
            escrow: escrow_key,
            requester: escrow.requester,
            amount: escrow.amount,
            reason,
        });

        Ok(())
    }
}

// ─── Instruction accounts ────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct InitializeEscrowArgs {
    pub nonce: u64,
    pub amount: u64,
    pub worker: Pubkey,
    pub validator_authority: Pubkey,
    pub rubric_hash: [u8; 32],
    pub expires_at: i64,
}

#[derive(Accounts)]
#[instruction(args: InitializeEscrowArgs)]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub requester: Signer<'info>,

    #[account(
        init,
        payer = requester,
        space = 8 + Escrow::SIZE,
        seeds = [ESCROW_SEED, requester.key().as_ref(), &args.nonce.to_le_bytes()],
        bump,
    )]
    pub escrow: Account<'info, Escrow>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = requester,
    )]
    pub requester_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = requester,
        associated_token::mint = mint,
        associated_token::authority = escrow,
    )]
    pub vault_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SubmitDeliverable<'info> {
    pub worker: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.requester.as_ref(), &escrow.nonce.to_le_bytes()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,
}

#[derive(Accounts)]
pub struct PostVerdict<'info> {
    pub validator_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.requester.as_ref(), &escrow.nonce.to_le_bytes()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,
}

#[derive(Accounts)]
pub struct Settle<'info> {
    /// Any signer can call settle once the escrow is in Validated state with
    /// an Approved verdict. The signer pays the rent for worker_ata if it is
    /// being init-if-needed created on this call.
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.requester.as_ref(), &escrow.nonce.to_le_bytes()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow,
    )]
    pub vault_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = worker,
    )]
    pub worker_ata: Account<'info, TokenAccount>,

    /// CHECK: constrained in instruction logic — must equal escrow.worker
    pub worker: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    /// Any signer can call refund when the on-chain state permits (Rejected
    /// verdict or Expired clock). The signer pays the rent for requester_ata
    /// if it is being init-if-needed created on this call.
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.requester.as_ref(), &escrow.nonce.to_le_bytes()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow,
    )]
    pub vault_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = requester,
    )]
    pub requester_ata: Account<'info, TokenAccount>,

    /// CHECK: constrained in instruction logic — must equal escrow.requester
    pub requester: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// ─── Account state ───────────────────────────────────────────────────────────

#[account]
pub struct Escrow {
    pub requester: Pubkey,
    pub worker: Pubkey,
    pub validator_authority: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub rubric_hash: [u8; 32],
    pub deliverable_uri_hash: [u8; 32],
    pub deliverable_content_hash: [u8; 32],
    pub has_deliverable: bool,
    pub created_at: i64,
    pub expires_at: i64,
    pub status: EscrowStatus,
    pub verdict: VerdictState,
    pub confidence_bps: u16,
    pub nonce: u64,
    pub bump: u8,
}

impl Escrow {
    //   4 Pubkey × 32          = 128
    //   u64 amount              =   8
    //   3 × [u8; 32]            =  96
    //   bool has_deliverable    =   1
    //   i64 created_at          =   8
    //   i64 expires_at          =   8
    //   EscrowStatus (enum)     =   1
    //   VerdictState (enum)     =   1
    //   u16 confidence_bps      =   2
    //   u64 nonce               =   8
    //   u8 bump                 =   1
    //                            = 262
    pub const SIZE: usize = 128 + 8 + 96 + 1 + 8 + 8 + 1 + 1 + 2 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum EscrowStatus {
    Posted,
    Delivered,
    Validated,
    Settled,
    RejectedRefunded,
    ExpiredRefunded,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum VerdictState {
    Pending,
    Approved,
    Rejected,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum RefundReason {
    Rejected,
    Expired,
}

// ─── Events (for off-chain indexers) ─────────────────────────────────────────

#[event]
pub struct EscrowPosted {
    pub escrow: Pubkey,
    pub requester: Pubkey,
    pub worker: Pubkey,
    pub amount: u64,
    pub expires_at: i64,
}

#[event]
pub struct DeliverableSubmitted {
    pub escrow: Pubkey,
    pub worker: Pubkey,
    pub uri_hash: [u8; 32],
    pub content_hash: [u8; 32],
}

#[event]
pub struct VerdictPosted {
    pub escrow: Pubkey,
    pub verdict: VerdictState,
    pub confidence_bps: u16,
}

#[event]
pub struct EscrowSettled {
    pub escrow: Pubkey,
    pub worker: Pubkey,
    pub amount: u64,
}

#[event]
pub struct EscrowRefunded {
    pub escrow: Pubkey,
    pub requester: Pubkey,
    pub amount: u64,
    pub reason: RefundReason,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum EscrowError {
    #[msg("Amount must be positive")]
    AmountMustBePositive,
    #[msg("Amount exceeds maximum escrow cap (100 USDC)")]
    AmountAboveCap,
    #[msg("Expiry is too soon (minimum 1 hour)")]
    ExpiryTooSoon,
    #[msg("Expiry is too far in the future (maximum 7 days)")]
    ExpiryTooFar,
    #[msg("Escrow is not in the required status for this action")]
    InvalidStatus,
    #[msg("Escrow has already expired")]
    Expired,
    #[msg("Escrow has not yet expired")]
    NotYetExpired,
    #[msg("Signer does not match the worker recorded at initialize")]
    WorkerMismatch,
    #[msg("Requester ATA owner does not match the requester recorded at initialize")]
    RequesterMismatch,
    #[msg("Signer does not match the validator_authority recorded at initialize")]
    ValidatorMismatch,
    #[msg("Verdict must be Approved or Rejected (not Pending)")]
    InvalidVerdict,
    #[msg("Confidence must be between 0 and 10000 basis points")]
    InvalidConfidence,
    #[msg("Cannot settle: verdict was not Approved")]
    NotApproved,
    #[msg("Cannot refund as Rejected: verdict was not Rejected")]
    NotRejected,
}
