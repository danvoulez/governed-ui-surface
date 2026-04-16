# EXEMPLO GIGANTE (FINAL INTEIRO): UI Lens como compilador de semântica visual governada

Você pediu um exemplo **grande, completo e de ponta a ponta**. Este repositório agora contém um pacote final que mostra todo o ciclo:

**Linguagem natural -> Operador -> Edição canônica -> UI IR -> Resolução de tokens -> Projeções (Tailwind/CVA/React) -> Verificação -> Ledger -> Rollback.**

---

## 1) Estrutura total

```text
ui-canon/
  tokens/
    primitives.json
    semantic.json
    components.json
    motion.json
  grammar/
    layout.yaml
    components.yaml
    screens.yaml
    policies.yaml

  final-placecard/
    00-input/
      human-request.md
    01-operator/
      operator-translation.yaml
    02-canonical-edit/
      ui-edit.yaml
    03-ir/
      ui-ir.yaml
    04-token-resolution/
      resolved-tokens.json
    05-style-dictionary/
      style-dictionary.config.cjs
    06-projections/
      tailwind.theme.css
      component.variants.ts
      place-card.example.tsx
    07-component-contracts/
      place-card.contract.yaml
    08-verification/
      report.yaml
      semantic-diff.md
    09-ledger/
      events.jsonl
    10-rollback/
      rollback-plan.yaml
    11-runbook/
      pipeline.md
```

---

## 2) O cenário humano (ponto de partida)

Frase original:

> "isso precisa ficar um pouco mais abaixo"

Essa frase **não** vira classe CSS diretamente. Ela vira intenção semântica governada.

---

## 3) Tradução do Operador (NLP -> forma governada)

No arquivo `01-operator/operator-translation.yaml` você encontra:

- classificação da intenção (`vertical_rhythm_adjustment`)
- alvo semântico (`PlaceCard.header_to_body`)
- magnitude (`one_semantic_step`)
- política aplicada (`presentational_low_risk`)
- decisão de auto-apply (`true`, com confiança acima do threshold)

Este é o ponto de quebra entre ambiguidade humana e forma computável.

---

## 4) Edição canônica (single source of truth da mudança)

No arquivo `02-canonical-edit/ui-edit.yaml`:

- `target: place_card.header_body_gap`
- `from: cozy`
- `to: relaxed`
- `semantic_step_delta: +1`
- escopo/blast radius explícito
- proibições explícitas (`dom_structure`, `component_order`, `text_content`)

Sem essa edição canônica, não existe projeção.

---

## 5) UI IR (modelo intermediário de governança)

No `03-ir/ui-ir.yaml` você vê:

- nós de contrato de componente
- eixos semânticos e escalas
- vínculos de política
- invariantes verificáveis
- resolução before/after em `px`

Ou seja: você ganha um "AST semântico" para UI governada.

---

## 6) Tokens resolvidos e validação de alias

No `04-token-resolution/resolved-tokens.json`:

- alias semântico (`{space.6}`)
- valor resolvido (`24px`)
- estado antes/depois
- validação de circular reference (deve ser vazia)

Aqui o sistema prova que a edição é consistente com o cânon de tokens.

---

## 7) Projeções mecânicas (Tailwind v4 + CVA + React)

### Tailwind CSS-first
`06-projections/tailwind.theme.css`:

- `@theme` para tokens e variáveis
- `@custom-variant` para `density` e `surface`
- `@utility` para classes geradas governadas

### CVA tipado
`06-projections/component.variants.ts`:

- `variants`
- `compoundVariants`
- `defaultVariants`
- `VariantProps`
- tipo de edição semântica (`PlaceCardSemanticEdit`)

### Uso em componente React
`06-projections/place-card.example.tsx`:

- consumo dos variants
- `data-density` e `data-surface`
- demo da edição aplicada (`cozy -> relaxed`)

---

## 8) Contratos de componente

No `07-component-contracts/place-card.contract.yaml`:

- eixos aceitos por componente
- defaults
- constraints semânticas
- mutações proibidas em renderização

Contrato explícito evita drift e improviso silencioso.

---

## 9) Verificação formal + evidência

Em `08-verification/`:

- `report.yaml`: checks com status pass/fail e resumo de visual diff
- `semantic-diff.md`: antes/depois humano-legível

Isso gera um plano de prova da alteração, não só geração de arquivo.

---

## 10) Ledger e rollback de verdade

Em `09-ledger/events.jsonl`:

- trilha cronológica de eventos do pipeline

Em `10-rollback/rollback-plan.yaml`:

- passos explícitos para desfazer
- condição de sucesso pós-rollback (`cozy`, `16px`)

---

## 11) Runbook operacional

`11-runbook/pipeline.md` documenta execução e critérios de aceitação para repetir o processo em produção.

---

## 12) Resumo executivo

Este exemplo demonstra exatamente o que você descreveu:

- a UI Lens **não é gerador de JSX final**
- ela é **compilador de semântica visual governada**
- linguagem natural é entrada humana
- mudança canônica é o centro do sistema
- projeções são artefatos derivados
- verificação + ledger + rollback fecham o ciclo

Se quiser, no próximo passo eu posso duplicar este pacote final para mais 3 componentes (`RunBlock`, `ApprovalCard`, `InspectorPane`) e mostrar um **multi-edit transaction** (várias mudanças semânticas no mesmo commit com dependências entre eixos).
