# Remlo DB Audit

Date: 2026-03-24

## Scope

This audit compares the repo's declared database shape in `scripts/schema.sql` and `scripts/migrations/` against:

- generated types in `lib/database.types.ts`
- application access patterns in `app/api/**`, `lib/**`, and `middleware.ts`
- current mock-to-production migration requirements for employer, employee, payroll, treasury, compliance, and MPP flows

## Executive Summary

The main problem is not one broken table. It is that the app now behaves like a real multi-role production system, but the database still has several mock-era assumptions:

- important ownership foreign keys are nullable in `scripts/schema.sql` even though the app and generated types treat them as required
- there are not enough uniqueness guarantees for "one active employer", "one active employee identity", or "one payroll item per run + employee"
- server routes rely on the service-role Supabase client, which means application logic and database constraints must carry most of the integrity burden
- public invite onboarding still depends on a browser Supabase client against RLS-protected employee data, which is not a durable public-onboarding model

The repo is at the point where we should stop treating the schema as a loose backing store and instead enforce the business invariants directly in the database.

## Findings

### Critical

1. Schema/type mismatch on required ownership foreign keys

In `scripts/schema.sql`, these columns are nullable:

- `employees.employer_id`
- `payroll_runs.employer_id`
- `payment_items.payroll_run_id`
- `payment_items.employee_id`

But `lib/database.types.ts` and the app treat all of them as required, non-null values.

Impact:

- orphan rows are possible at the schema level
- server code assumes these values always exist
- generated types can hide real production data issues

Recommendation:

- backfill any nulls
- make those columns `NOT NULL`
- keep foreign keys in place and document intended delete behavior

2. Missing uniqueness for active employer ownership

Multiple codepaths assume one active employer row per Privy DID:

- `middleware.ts`
- `lib/auth.ts`
- `lib/queries/employers.ts`
- `app/api/employers/route.ts`

But there is no DB uniqueness enforcing this on `employers.owner_user_id`.

Impact:

- role routing can become ambiguous
- employer settings/wallet sync can hit the wrong row
- `.single()` and `.maybeSingle()` assumptions can break unpredictably

Recommendation:

- add a partial unique index on active employers by owner DID

3. Missing uniqueness for active employee identity and invite lifecycle

The app assumes:

- one active employee row per `(employer_id, lower(email))`
- one active employee row per `user_id` once claimed

There is no DB uniqueness enforcing either rule.

Impact:

- duplicate invite rows for the same employee are possible
- employee claim flow can become ambiguous
- employee portal routing can break if one Privy DID is attached to multiple active employee rows

Recommendation:

- add partial unique indexes for:
  - active employees by employer + normalized email
  - active employees by `user_id` where `user_id` is not null

4. Payroll item idempotency is not enforced at the database level

The payroll preparation path inserts `payment_items` for a payroll run, but there is no unique constraint on `(payroll_run_id, employee_id)`.

Impact:

- a repeated "prepare payroll" call can create duplicate payment items for the same run
- payslip reads using `.single()` can fail
- webhooks and downstream accounting become ambiguous

Recommendation:

- add a unique index on `(payroll_run_id, employee_id)`
- optionally add request-level idempotency for payroll preparation

### High

5. Integration IDs are not protected against duplication

The app treats the following as effectively unique business identifiers, but the schema does not enforce that:

- `employees.bridge_customer_id`
- `employees.bridge_card_id`
- `employees.bridge_bank_account_id`
- `employers.bridge_customer_id`
- `employers.bridge_virtual_account_id`
- `payroll_runs.tx_hash` once populated

Impact:

- Bridge and Tempo webhook updates can affect the wrong row or multiple rows
- `.single()` reads on business identifiers can fail

Recommendation:

- add unique indexes where values are not null

6. Public invite verification is built on a browser Supabase client that does not match current RLS policy design

The public invite page reads `employees` directly in the browser, but `scripts/schema.sql` only grants select access to:

- the owning employer
- the claimed employee

There is no public invite-read policy in the schema.

Impact:

- unauthenticated invite verification is structurally brittle
- "invalid invite" can be caused by policy mismatch rather than bad tokens

Recommendation:

- move invite verification/claim to a server route using signed invite tokens
- treat current UUID-as-token behavior as transitional only

7. Status fields are stringly typed with no DB-level check constraints

Examples:

- `employees.kyc_status`
- `employees.pay_frequency`
- `payroll_runs.status`
- `payment_items.status`
- `mpp_sessions.status`
- `compliance_events.result`

Impact:

- typo or unexpected values can silently drift into production
- UI state machines have to defend against invalid values everywhere

Recommendation:

- add check constraints or enums for the currently supported values

### Medium

8. `updated_at` consistency is not enforced

Some routes set `updated_at` manually, others do not. Some tables do not even have `updated_at`.

Impact:

- operational debugging becomes harder
- "latest state" is harder to trust

Recommendation:

- standardize `updated_at` coverage where mutable business state exists
- use DB triggers if this becomes a maintenance burden

9. Payment hold state still lives in compliance events rather than a first-class field

The latest code now derives pause/resume status from `compliance_events`, which is workable, but it is still an event-log-derived state, not a persisted current-state field.

Impact:

- every current-state read depends on latest-event semantics
- auditability is good, but operational simplicity is weaker

Recommendation:

- short term: keep derived state
- medium term: decide whether `employees.payment_status` should become first-class

10. Index coverage is too light for the current app shape

High-frequency filters now include:

- employers by `owner_user_id`, `active`
- employees by `employer_id`, `active`, `created_at`
- employees by `user_id`, `active`
- employees by `employer_id`, normalized email
- compliance events by `employer_id`, `employee_id`, `created_at desc`
- payment items by `payroll_run_id`
- payment items by `employee_id`, `created_at desc`
- payroll runs by `employer_id`, `created_at desc`
- mpp sessions by `employer_id`, `status`

Recommendation:

- add explicit indexes for these patterns as part of the next migration batch

## Recommended Migration Order

### Batch 1: Integrity blockers

1. backfill null ownership foreign keys
2. set `NOT NULL` on:
   - `employees.employer_id`
   - `payroll_runs.employer_id`
   - `payment_items.payroll_run_id`
   - `payment_items.employee_id`
3. add partial unique indexes for:
   - one active employer per `owner_user_id`
   - one active employee per `(employer_id, lower(email))`
   - one active employee per `user_id` where `user_id` is not null
   - one payment item per `(payroll_run_id, employee_id)`

### Batch 2: Integration safety

1. add unique indexes for non-null Bridge/Tempo identifiers
2. add unique index for non-null `payroll_runs.tx_hash`
3. add query-supporting indexes for team, compliance, treasury, and payroll screens

### Batch 3: State hardening

1. add check constraints/enums for statuses
2. decide whether employee payment hold becomes a first-class field
3. replace UUID invite tokens with signed/expiring invite tokens and move claim verification fully server-side

## Repo Follow-ups

1. Keep `scripts/schema.sql` and `lib/database.types.ts` in sync after every migration.
2. Stop adding direct browser Supabase flows for protected business records unless the RLS model explicitly supports them.
3. Prefer API-route reads for employer and employee identity-sensitive state.
4. Run the SQL checklist in `scripts/db_audit_checks.sql` against production before applying the next migration batch.
