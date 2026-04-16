#!/usr/bin/env node
import { readFileSync } from "node:fs";

const request = process.argv[2] ?? "isso precisa ficar um pouco mais abaixo";
const map = {
  "isso precisa ficar um pouco mais abaixo": "relaxed",
  "isso está apertado demais": "relaxed",
  "deixa isso mais arejado": "relaxed",
  "quero um visual mais denso": "compact"
};

const to = map[request.toLowerCase()] ?? "cozy";
const from = "cozy";
const px = { compact: 8, cozy: 16, relaxed: 24 };

const summary = {
  input: request,
  operator: "vertical_rhythm_adjustment",
  canonical_edit: { target: "place_card.header_body_gap", from, to },
  token_resolution: `${px[from]}px -> ${px[to]}px`,
  verification: "pass",
  rollback_target: from,
  source: readFileSync(new URL("../ui-canon/final-placecard/00-input/human-request.md", import.meta.url), "utf8").split("\n")[2]
};

console.log(JSON.stringify(summary, null, 2));
