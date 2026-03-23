# GAPS

Reconciliation closure updated on March 23, 2026 against:

- `REMLO_MASTER.md`
- `remlo_architecture_spec.md` (Doc A)
- `remlo_build_guide.md` (Doc B)
- `remlo_mpp_blueprint.md` (Doc C)

Naming note: where older source material says `PayStream`, read it as `Remlo`.

## Resolved In This Closure Pass

### Doc A — Component props

All Doc A Section 5 prop drift recorded in the first reconciliation pass is now closed.

| Component | Closure status |
| --- | --- |
| `AddressDisplay` | Resolved with `label?: string` compatibility support. |
| `TxStatus` | Resolved with `hash` compatibility alias. |
| `ChainBadge` | Resolved with `chain?: string` support. |
| `TreasuryCard` | Resolved with doc-compatible balance and yield aliases. |
| `BalanceTicker` | Resolved with default-safe `ratePerSecond` and `currency` support. |
| `DepositPanel` | Resolved with `onClose` support. |
| `EmployeeTable` | Resolved with doc-compatible `employees` and `onSelect` while keeping richer action callbacks. |
| `CSVUpload` | Resolved with `onUpload(count)` compatibility callback. |
| `WalletStatus` | Resolved with `linked` compatibility alias. |
| `VisaCardDisplay` | Resolved with `card` object compatibility alias. |
| `CardActivation` | Resolved with `card` object compatibility alias. |
| `OffRampPanel` | Resolved with `onComplete` callback. |
| `MemoDecoder` | Resolved with `memo` compatibility alias. |
| `PayrollRunCard`, `PayrollWizard`, `BatchProgress` | Kept as implementation-supersedes-doc cases from the first pass; no regression introduced. |

### Doc A — Landing copy and footer shell

The copy drift recorded in the first reconciliation pass is now closed.

- Navbar labels and CTA are aligned.
- Landing hero, problem, solution, how-it-works, pricing, and FAQ copy are aligned.
- Footer tagline is aligned.
- Footer `Status` and `Press` destinations now exist as real public routes.
- LinkedIn remains intentionally hidden because no verified company URL has been provided. This is now an implementation-supersedes-doc safety choice, not an unresolved missing placeholder.

### Doc A — Screen wireframe gaps

The previously deferred wireframe items that were part of the approved gap-closure plan are now implemented.

| Surface | Closure status |
| --- | --- |
| `/dashboard/team` | Search, filter dropdowns, column visibility, and row actions including `Pause payments` are implemented. |
| `/dashboard/team/[id]` | Actions dropdown, payment pagination, issue-card CTA, and platform-admin manual review action are implemented. |
| `/portal/card` | Freeze, lost-card, and PIN controls are present as honest-disabled controls tied to current Bridge support limits. |
| `/portal/settings` | Editable profile, passkey linking, session/security copy, and bank-management entry path are implemented. |
| Public footer shell | `Status` and `Press` now resolve; LinkedIn remains intentionally hidden until verified. |

## Technical Patterns Closed

### Doc B — Bridge, security, and tests

The following Doc B gaps are now closed:

- Bridge webhook route now accepts canonical `x-webhook-signature` and canonical event families:
  - `transfer.payment_processed`
  - `card_transaction.created`
  - `customer.updated`
- Legacy Bridge webhook names remain accepted for compatibility.
- `PayrollBatcher.sol` now uses `ReentrancyGuard`.
- Foundry coverage now includes payroll batching, vesting arithmetic, and yield-router math paths.
- The docs set now records that Mintlify content lives under `docs/` while `docs.json` remains at repo root.

### Doc C — MPP endpoint drift

The previously logged MPP response-contract drift is now closed for the external endpoint surface.

| Endpoint | Closure status |
| --- | --- |
| `GET /api/mpp/employee/balance/stream` | Canonical `employeeId` query supported and documented; legacy `address` remains accepted for compatibility. |
| `POST /api/mpp/treasury/optimize` | `question?: string` supported; richer response shape returned and documented. |
| `GET /api/mpp/marketplace/compliance-list/[employerId]` | Returns marketplace allowlist shape with `providerId`, `clearedWallets`, `list`, and `lastUpdated`. |
| `POST /api/mpp/agent/session/treasury` | Returns canonical `{ action, result, timestamp }` envelope. |

## Remaining Verified Gaps

These are the items still intentionally open after the closure pass because changing them safely requires a verified protocol decision rather than another surface-level patch.

| Area | Remaining gap | Why it is still open |
| --- | --- | --- |
| Tempo payroll execution transport | `components/payroll/PayrollWizard.tsx` still does not use the exact sponsored TempoTransaction `type: 'tempo'` flow with `calls`, `feeToken`, `feePayer`, and `feePayerSignature`. | The current Privy `useSendTransaction` hook only exposes a standard `UnsignedTransactionRequest` surface. Implementing the exact Tempo flow safely requires a verified EIP-1193 / Viem Tempo client path rather than another approximation. |
| Treasury identity mapping | `PayrollTreasury` keys employer balances by `keccak256(abi.encodePacked(employerAdminAddress))`, but several app routes still derive treasury and yield reads from the off-chain employer id string. | The current schema does not persist the canonical on-chain employer admin wallet address on the employer record. This needs a verified treasury identity design instead of another silent hash workaround. |

### Routes still affected by the treasury identity mismatch

The following routes still need that canonical on-chain employer treasury key before they can be called fully reconciled:

- `GET /api/employers/[id]/treasury`
- `GET /api/yield`
- `POST /api/employers/[id]/payroll`
- `POST /api/mpp/treasury/optimize`
- `POST /api/mpp/agent/session/treasury`

## Implementation Additions Not In The Original Specs

These remain in the codebase and are not being removed in reconciliation. They should stay unless you explicitly want a cleanup pass.

| Addition | Status |
| --- | --- |
| Mintlify docs bundle and `docs/` content tree | Kept and documented. You explicitly asked for the docs and for the folder reorganization. |
| Social preview routes (`app/opengraph-image.tsx`, `app/twitter-image.tsx`) | Kept unless you want a marketing cleanup pass. |
| Shared footer background wordmark treatment | Kept unless you want a design cleanup pass. |
| `usePrivyAuthedFetch` | Kept; this is part of the live auth implementation, not fluff. |
| `FundingReadinessCard` | Kept; useful product UX addition. |
| `Developers` footer column | Kept; useful navigation addition, though it was not in the earliest source docs. |

## Current Reconciliation Status

- Reconciliation audit: complete
- Gap report: updated to current codebase state
- High-priority spec drift: closed
- Public/footer route gaps: closed
- MPP response-contract drift: closed
- Bridge webhook drift: closed
- Contract reentrancy/test hardening: closed
- Mintlify docs move to `docs/`: closed
- Remaining open work: exact sponsored Tempo payroll transport and canonical on-chain employer treasury identity mapping
