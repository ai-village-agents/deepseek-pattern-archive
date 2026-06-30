# Mitigation vs Failure Density Regimes (Day 407)

This analysis quantifies how each pattern in the DeepSeek Pattern Archive emphasizes **failures** vs **mitigations**, and assigns a **regime label** that captures its documentation stance.

It is part of the AI Village "Perform novel research!" goal (Day 405–409) and feeds directly into the **Pattern-Protocol Effectiveness Dashboard**.

## Methodology

For each pattern in `patterns/*.md` (excluding `README.md`):

1. **Tokenization**
   - Read file as UTF-8.
   - Tokenize on the regex `[A-Za-z0-9_']+` to obtain a word list.
   - Compute `word_count` and `k_words = word_count / 1000`.

2. **Keyword families**
   - Mitigation-related terms (substring counts in lowercased text):

     - `protocol`, `fallback`, `redund`, `mirror`,
       `verify`, `verification`, `checklist`, `playbook`,
       `mitigation`, `safeguard`, `guardrail`, `backup`,
       `reset`, `rebuild`, `redundancy`, `mirror`.

   - Failure-related terms:

     - `failure`, `bug`, `outage`, `crash`, `collapse`,
       `deadlock`, `hostility`, `regression`, `incident`,
       `error`, `lock`, `403`, `403s`.

3. **Densities per 1k words**
   - `mitigation_hits = sum(lower.count(term) for term in mitigation_terms)`.
   - `failure_hits   = sum(lower.count(term) for term in failure_terms)`.
   - `mitigation_per_1k = mitigation_hits / k_words`.
   - `failure_per_1k    = failure_hits   / k_words`.
   - `balance_ratio     = mitigation_per_1k / failure_per_1k` (where `failure_per_1k > 0`).

4. **Regime classification**

   Based on densities and ratios, each pattern is assigned to one of four regimes:

   - `failure_diagnostic`  – heavy focus on describing failures; sparse explicit mitigations.
   - `solution_prescriptive` – heavy focus on safeguards, protocols, or conceptual tools.
   - `dual_dense` – both failure and mitigation vocabularies are dense (crisis playbooks).
   - `balanced_success` – success patterns with roughly balanced, moderate densities.

   For governance, a hybrid label `solution_prescriptive_dual_dense` is used where mitigation language clearly dominates but failure language remains dense.

The full machine-readable output lives in [`analysis/mitigation_failure_regimes.json`](./mitigation_failure_regimes.json).

## Per-Pattern Results

All densities are reported **per 1,000 words**.

| Pattern | Category | Regime | Mitigation / 1k | Failure / 1k | Balance Ratio | Documentation Bias |
| --- | --- | --- | ---: | ---: | ---: | --- |
| AI Collaboration Pipeline Failure Modes | process | failure_diagnostic | 6.40 | 34.12 | 0.19 | problem-heavy |
| AI Governance Safeguard Failure Modes | governance | solution_prescriptive_dual_dense | 56.92 | 33.64 | 1.69 | solution-heavy |
| Ghost PR Resolution Phenomenon | coordination | failure_diagnostic | 20.37 | 32.26 | 0.63 | problem-heavy |
| PR Drift & Safety Signals | coordination | failure_diagnostic | 2.94 | 7.34 | 0.40 | problem-heavy |
| Structural Determinism Cognitive Patterns | cognitive | solution_prescriptive | 8.78 | 4.39 | 2.00 | solution-heavy |
| System Hostility & Environmental Failures | environmental | dual_dense | 62.33 | 83.55 | 0.75 | problem-heavy |
| Systematic Long-Term Work Achievement | success | balanced_success | 7.49 | 7.49 | 1.00 | balanced |
| Third-Party CDN Dependency Failure | environmental | dual_dense | 25.07 | 41.30 | 0.61 | problem-heavy |

## Interpretation

1. **Collaboration & PR drift patterns are diagnostic.**
   - They concentrate on naming and dissecting failure modes (e.g., synthesis degradation, error propagation, safety signal loss) with relatively few explicit mitigation protocols.

2. **Hostility & CDN patterns are dual-dense.**
   - They contain both rich incident descriptions **and** many explicit countermeasures (protocol suites, mirror strategies, reset procedures).
   - This aligns with the 5/17/42 system-hostility taxonomy and the GitHub Pages mirror doctrine.

3. **Governance & structural cognition patterns are solution-heavy.**
   - They emphasize safeguards, structural constraints, and cognitive frameworks more than specific failures.

4. **Long-term work patterns are balanced successes.**
   - The Systematic Long-Term Work Achievement pattern focuses on sustained, robust process with a balanced mixture of risk awareness and mitigation habits.

## Integration with the Pattern-Protocol Dashboard

These regime labels and densities are exported as a compact JSON structure and ingested by the
[`pattern-protocol-dashboard`](https://github.com/ai-village-agents/pattern-protocol-dashboard) via a
`pattern_regimes` data feed.

In that dashboard, the fields:

- `regime`,
- `mitigation_per_1k`,
- `failure_per_1k`,
- `balance_ratio`, and
- `documentation_bias`

are combined with protocol effectiveness metrics to derive a **pattern maturity index** and to
visualize where the ecosystem is currently *diagnosing* problems vs *codifying* resilient
playbooks.

