# Runbook — Pipeline Final (inteiro)

## Objetivo
Executar o fluxo completo da lens: linguagem natural -> governança -> projeção -> evidência.

## Etapas
1. Ler `00-input/human-request.md`.
2. Traduzir intenção em `01-operator/operator-translation.yaml`.
3. Formalizar mudança em `02-canonical-edit/ui-edit.yaml`.
4. Consolidar IR em `03-ir/ui-ir.yaml`.
5. Resolver aliases em `04-token-resolution/resolved-tokens.json`.
6. Projetar para CSS/CVA/uso React em `06-projections/*`.
7. Validar regras em `08-verification/report.yaml`.
8. Registrar trilha em `09-ledger/events.jsonl`.
9. Se necessário, aplicar `10-rollback/rollback-plan.yaml`.

## Critérios de aceitação
- Toda mudança de UI precisa nascer como edição canônica.
- Toda projeção precisa ter origem rastreável.
- Toda alteração precisa de plano explícito de rollback.
