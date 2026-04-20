# lib/idl/

Committed IDL snapshots for the Remlo Anchor programs. The 2.2 TypeScript
bindings import from here, not from `solana/target/idl/` (which is gitignored
and regenerated on every `anchor build`).

## Post-deploy handoff

After Phase 2.1 (`anchor build` + `anchor deploy`):

```bash
cp solana/target/idl/remlo_escrow.json lib/idl/remlo_escrow.json
cp solana/target/types/remlo_escrow.ts lib/idl/remlo_escrow.types.ts
git add lib/idl/
git commit -m "chore(escrow): commit deployed IDL for TS bindings"
```

Regenerate intentionally whenever the program's Rust source changes. Do not let
the IDL drift silently — 2.2's routes build against the committed snapshot.
