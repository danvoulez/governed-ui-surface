# UI Lens Demo: governed visual semantics, end-to-end

UI Lens is a **compiler for governed visual semantics**.

You type a vague request like:

> **“isso precisa ficar um pouco mais abaixo”**

…and the system performs a governed operation backed by canonical files in `ui-canon/final-placecard/`:

1. operator interpretation (`01-operator/operator-translation.yaml`)
2. canonical semantic edit (`02-canonical-edit/ui-edit.yaml`)
3. semantic IR (`03-ir/ui-ir.yaml`)
4. token resolution (`04-token-resolution/resolved-tokens.json`)
5. verification + semantic diff (`08-verification/*`)
6. immutable ledger stream (`09-ledger/events.jsonl`)
7. rollback plan and post-rollback ledger events (`10-rollback/rollback-plan.yaml`)

The key value is not “it changed CSS.”
The key value is: **it changed UI in a controlled, explainable, reversible way**.

---

## Run the interactive demo (hero flow)

```bash
cd app
npm install
npm run dev
```

Open the local URL from Vite (usually `http://localhost:5173`).

### Magic moment to try first

1. Keep the input as `isso precisa ficar um pouco mais abaixo`
2. Click **Apply governed edit**
3. Watch PlaceCard `header_body_gap` move from `cozy` to `relaxed`
4. Confirm token diff `16px -> 24px` and changed-property badge
5. Inspect artifact-backed pipeline stages with structured facts (operator/action/axis, canonical edit id, token aliases, verification checks)
6. Confirm unchanged-scope chips near preview (structure/copy/behavior/surface/density)
7. Click **Execute rollback plan** and observe rollback trace (`requested → applied → post-verification`) with `16px` restored

---

## Why this is better than editing JSX/classes directly

Direct class edits are fast but weak on governance.
This demo shows a safer path:

- NL input is interpreted by policy-aware operator logic
- the **canonical edit** (`place_card.header_body_gap`) remains the authority
- app and CLI share the same compact pipeline core (`shared/pipeline-core.mjs`)
- verification, evidence, and ledger are first-class
- rollback is explicit, visible, and appended to the event stream

---

## Repo structure (governance-first)

- `app/` → runnable React + Vite operator surface
- `scripts/run-pipeline.mjs` → CLI summary backed by shared core
- `shared/pipeline-core.mjs` → shared pipeline model/parser for app + CLI
- `ui-canon/final-placecard/` → single authoritative canonical artifact set
- `ui-canon/archive/` → legacy non-authoritative material
- `ui-canon/grammar/`, `ui-canon/tokens/`, `ui-canon/evidence/` → governance substrate

---

## Tests

```bash
cd app
npm test
```

Coverage checks:

- canonical artifact data drives semantic transition
- resolved token aliases and px values match canonical edit
- stage inspector exposes structured facts derived from canonical artifacts
- verification surfaces unchanged scope from semantic diff
- rollback trace shows requested → applied → post-verification
- downstream axis mapping does not invent unsupported canonical axes

---

## CLI pipeline summary

From repo root:

```bash
node scripts/run-pipeline.mjs "isso precisa ficar um pouco mais abaixo"
node scripts/run-pipeline.mjs "isso precisa ficar um pouco mais abaixo" rollback
```

The second command executes governed rollback in the same shared model and shows rollback events in ledger output.
