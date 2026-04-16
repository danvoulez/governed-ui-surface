# UI Lens Demo: governed visual semantics, end-to-end

UI Lens is a **compiler for governed visual semantics**.

You type a vague request like:

> **“isso precisa ficar um pouco mais abaixo”**

…and the system runs a governed pipeline:

1. operator interpretation
2. canonical semantic edit
3. semantic IR
4. token resolution
5. projected UI artifacts
6. verification
7. ledger event
8. rollback plan (and visible rollback)

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
2. Click **Apply**
3. See the PlaceCard move from `header_body_gap: cozy -> relaxed`
4. Confirm token diff: `16px -> 24px`
5. Inspect stages `00–10`, verification badge, evidence, and ledger
6. Click **Rollback** and see it return to `cozy (16px)`

---

## Why this is better than editing JSX/classes directly

Direct class edits are fast but weak on governance.
This demo shows a safer path:

- NL input is interpreted by policy-aware operator logic
- the **canonical edit** (`place_card.header_body_gap`) is the source of truth
- projections are derived artifacts, not manual drift
- verification and ledger are first-class
- rollback is explicit and visible

---

## Repo structure (governance-first)

- `app/` → runnable React + Vite demo UI
- `scripts/run-pipeline.mjs` → tiny CLI pipeline runner
- `ui-canon/final-placecard/` → single authoritative canonical pipeline example
- `ui-canon/archive/` → legacy non-authoritative operator/projection artifacts
- `ui-canon/grammar/`, `ui-canon/tokens/`, `ui-canon/evidence/` → governance substrate

---

## Semantic naming system

We intentionally keep layer-appropriate names and map them explicitly:

- canonical edit axis: `place_card.header_body_gap`
- grammar/contract axis: `header_body_gap`
- token/projection JS axis: `headerBodyGap`
- DOM projection attr: `data-header-body-gap`

See:
- `ui-canon/grammar/components.yaml`
- `ui-canon/final-placecard/07-component-contracts/place-card.contract.yaml`

---

## Tests

```bash
cd app
npm test
```

Coverage includes:

- canonical edit changes resolved spacing token (`16px -> 24px`)
- projections reflect semantic change
- rollback restores original semantic state
- no unsupported semantic axis appears only downstream

---

## One-command pipeline check (CLI)

From repo root:

```bash
node scripts/run-pipeline.mjs "isso precisa ficar um pouco mais abaixo"
```

Prints a compact pipeline summary with canonical edit, token resolution, verification, and rollback target.
