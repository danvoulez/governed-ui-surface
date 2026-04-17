# UI Lens Demo: governed visual semantics, end-to-end

UI Lens is a compact operator product demo for **governed UI edits**.

You type a vague request like:

> **“isso precisa ficar um pouco mais abaixo”**

…and UI Lens turns it into a governed, explainable, reversible semantic operation backed by canonical artifacts in `ui-canon/final-placecard/`.

## The magic moment (under 1 minute)

1. Run the app and keep the hero prompt:
   - `isso precisa ficar um pouco mais abaixo`
2. Click **Apply governed edit**.
3. Watch only `place_card.header_body_gap` move from `cozy` to `relaxed` (`16px -> 24px`).
4. In the operator console, open any stage in:
   - **Facts** mode (grouped normalized facts)
   - **Excerpt** mode (raw artifact excerpt tied to the same source)
5. Confirm trust boundary chips and verification unchanged scope.
6. Click **Execute rollback plan** and verify governed milestones:
   - requested → applied → post-verification
   - target edit id preserved
   - semantic state and px restored (`cozy`, `16px`)

## Why this is trustworthy

- Authority lives in canonical artifacts, not ad hoc class edits.
- The app and CLI share the same core normalization (`shared/pipeline-core.mjs`).
- Verification and unchanged scope are first-class trust signals.
- Rollback is governed and evidence-backed, not a blind undo.

## Canonical chain (single authority)

1. operator interpretation (`01-operator/operator-translation.yaml`)
2. canonical semantic edit (`02-canonical-edit/ui-edit.yaml`)
3. semantic IR (`03-ir/ui-ir.yaml`)
4. token resolution (`04-token-resolution/resolved-tokens.json`)
5. verification + semantic diff (`08-verification/*`)
6. immutable ledger stream (`09-ledger/events.jsonl`)
7. rollback plan + post-rollback events (`10-rollback/rollback-plan.yaml`)

## Run the interactive app

```bash
cd app
npm ci
npm run dev
```

Open the local Vite URL (usually `http://localhost:5173`).

## Run tests

```bash
cd app
npm ci
npm test
npm run build
```

Test coverage includes:
- artifact-backed stage facts and excerpts from the same normalized source
- trust boundary unchanged scope aligned with verification artifacts
- rollback target edit id + restored semantic/px state
- deterministic stage grouping and canonical artifact linkage

## Run CLI (same governed story)

From repo root:

```bash
node scripts/run-pipeline.mjs "isso precisa ficar um pouco mais abaixo"
node scripts/run-pipeline.mjs "isso precisa ficar um pouco mais abaixo" rollback
```

Both commands use the same shared pipeline core as the app.

## Repo shape

- `app/` → React + Vite operator surface
- `shared/pipeline-core.mjs` → shared parser/normalization and governed pipeline model
- `scripts/run-pipeline.mjs` → CLI summary using the shared core
- `ui-canon/final-placecard/` → authoritative canonical example
