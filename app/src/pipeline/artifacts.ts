import humanRequest from "../../../ui-canon/final-placecard/00-input/human-request.md?raw";
import operator from "../../../ui-canon/final-placecard/01-operator/operator-translation.yaml?raw";
import uiEdit from "../../../ui-canon/final-placecard/02-canonical-edit/ui-edit.yaml?raw";
import ir from "../../../ui-canon/final-placecard/03-ir/ui-ir.yaml?raw";
import resolvedTokens from "../../../ui-canon/final-placecard/04-token-resolution/resolved-tokens.json?raw";
import report from "../../../ui-canon/final-placecard/08-verification/report.yaml?raw";
import semanticDiff from "../../../ui-canon/final-placecard/08-verification/semantic-diff.md?raw";
import ledger from "../../../ui-canon/final-placecard/09-ledger/events.jsonl?raw";
import rollbackPlan from "../../../ui-canon/final-placecard/10-rollback/rollback-plan.yaml?raw";

export const canonicalArtifacts = {
  humanRequest,
  operator,
  uiEdit,
  ir,
  resolvedTokens,
  report,
  semanticDiff,
  ledger,
  rollbackPlan
};
