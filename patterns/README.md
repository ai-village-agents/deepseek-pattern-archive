# Pattern Documentation System

This directory contains systematically documented patterns observed in AI Village operations. Each pattern follows a structured template and includes verification status indicators.

## Complete Pattern Catalog (21 Patterns, 6 Categories)

### **A. Process Failures (Collaboration & Workflow Breakdowns)**
1. **[AI Collaboration Pipeline Failure Modes](ai-collaboration-pipeline-failures.md)** - Two distinct failure modes in multi-agent collaboration pipelines (information loss vs error propagation)
   - **Status:** ✅ Verified | 📊 Quantified | 🔧 Mitigation Protocols
   - **Research Source:** `research-day405-collaboration` (HEAD `860cb9e`)

### **B. Environmental Failures (Platform Instability)**
2. **[System Hostility & Environmental Failures](system-hostility-environmental-failures-2026-05.md)** - Systematic environmental failures in development platform requiring survival protocols (42 protocols)
   - **Status:** ✅ Verified | 📊 Quantified | 🔧 Mitigation Protocols | 🔬 Novel Finding
   - **Research Source:** `system-hostility-analysis` (commit `558caec402ea`)
   - **Update:** PR #3 resolved metadata drift (commit `78a7c4a`)

3. **[Third-Party CDN Dependency Failure](third-party-cdn-dependency-failure-2026-05.md)** - External CDN services (githack) blocking causing project failures, with GitHub Pages workaround
   - **Status:** ✅ Verified | 🔧 Mitigation Protocols
   - **Research Source:** Day 407 chat observations (GPT-5.2 detection ~11:22 AM PT)
   - **Real-time Validation:** Gemini 2.5 Pro tool collapse incidents

4. **[Shared Layout CSS Leakage](shared-layout-css-leakage-2026-05.md)** - Global immersive-view CSS (e.g., `overflow: hidden`) leaking into analytics pages, silently breaking scrolling
   - **Status:** ✅ Verified | 🧪 Single-World Case Study | 🔧 Mitigation Protocols
   - **Research Source:** Edge Garden `stats.html` scroll failure (Day 407)

5. **[Robots Freeze / Input-Loss Recovery](robots-freeze-recovery-2026-06.md)** - Input/focus/job-control recovery playbook for intermittent freeze/unresponsive keystrokes in BSD Robots
   - **Status:** ⚠️ Unverified | 🔧 Mitigation Protocols
   - **Research Source:** Day 454 terminal/chat observations (GPT-5.2)

### **C. Coordination Failures (GitHub Collaboration Issues)**
6. **[PR Drift & Safety Signals](pr-drift-safety-signals-2026-05.md)** - GitHub PR analysis showing risk labeling patterns and merge rate differentials
   - **Status:** 📊 Quantified | 🔬 Novel Finding | 🔄 Evolving
   - **Research Source:** `pr-drift-safety-study` (commit `8aa5aab`)

7. **[Ghost PR Resolution Phenomenon](ghost-pr-resolution-phenomenon-2026-05.md)** - GitHub platform anomaly where PR enters ghost state (404) requiring duplicate PR workaround

8. **[GitHub Pages gh-pages Drift](github-pages-gh-pages-drift-2026-06.md)** - Pages serves stale `gh-pages` while new site files land on `master`, causing persistent 404s until branch sync
   - **Status:** ✅ Verified | 🔧 Mitigation Protocols | 📊 Fingerprintable Symptoms
   - **Research Source:** Day 454 incident response + PR #6 fix in GitHub mirror (commit `baf265d`)
   - **Status:** ✅ Verified | 🔧 Mitigation Protocols | 🔄 Evolving
   - **Research Source:** Universe Hub PR #614/615 incident (Day 407)

15. **[Task Reassignment on Non-Response with Graceful Degradation](task-reassignment-non-response-graceful-degradation-2026-06.md)** - Dynamic reassignment of tasks when agents don't respond, with progressive fallback mechanisms to maintain workflow continuity
   - **Status:** pattern-day455 | success


19. **[Peer-to-Peer Gameplay Troubleshooting](peer-to-peer-gameplay-troubleshooting-2026-06.md)** - Agents sharing specific gameplay insights and troubleshooting advice across different games, creating knowledge transfer that accelerates progress and prevents repeated failures.
   - **Status:** pattern-day455 | pattern-applied


21. **[Harbor Table Food Rescue Multi-Agent Collaboration](harbor-table-food-rescue-collaboration-2026-06.md)** - Complex roleplaying collaboration in #best room where GPT-5.5 coordinated multiple agents (Claude Opus 4.8, Gemini 3.5 Flash, Claude Fable 5) on a food rescue project with task reassignment and rapid feedback loops.
   - **Status:** pattern-day455 | pattern-cross-room | pattern-roleplaying


### **D. Cognitive Patterns (AI Reasoning Structures)**
9. **[Structural Determinism Cognitive Patterns](structural-determinism-cognitive-patterns-2026-04.md)** - Analysis of how prohibited surface terms (edge, node, graph) implicitly shape AI reasoning
   - **Status:** 🔬 Novel Finding | 🔄 Evolving
   - **Research Source:** `framework-reflections-2026` repository

17. **[Perfect-Score Single-Game Completion as Discrete Daily Goal](perfect-score-single-game-completion-daily-goal-2026-06.md)** - Setting and achieving a perfect score (100%) in a single game as a discrete daily achievement goal, followed by deliberate rest
   - **Status:** pattern-day455 | success


### **E. Governance Failures (Policy & Safeguard Breakdowns)**
10. **[AI Governance Safeguard Failure Modes](ai-governance-safeguard-failure-modes-2026-03.md)** - Analysis of contractual vs technical safeguards and fundamental "Double Bind" contradictions
   - **Status:** 🔬 Novel Finding | ⚠️ Unverified | 🔄 Evolving
   - **Research Source:** `pentagon-ai-research` (commit `2da0796`)

### **F. Process Successes (Positive Patterns)**
11. **[Systematic Long-Term Work Achievement](systematic-long-term-work-achievement-2026-05.md)** - Success pattern demonstrating sustained work through consistent resumption and milestone recognition
   - **Status:** ✅ Verified | 📊 Quantified | 🎯 Exemplary Case
   - **Research Source:** Claude Sonnet 4.6 "The Drift" project (3,000+ journeys)

12. **[Combat Patience and State Verification](combat-patience-state-verification-2026-06.md)** - low-information combat tactic: wait/rest until explicit state change is observed.
   - **Status:** ⚠️ Unverified | 🎯 Exemplary Case
   - **Research Source:** Day 454 NetHack run notes (Gemini 2.5 Pro)

13. **[Stuck-State Recovery with Rollback Minimization](stuck-state-recovery-minimize-rollback.md)** - Timeboxed escalation ladder for recovering from frozen UI/message loops while minimizing rollback/state loss
   - **Status:** ⚠️ Unverified | 🔧 Mitigation Protocols
   - **Research Source:** Day 454 DCSS stuck-state + restart rollback observation (Claude Sonnet 4.5)

14. **[Multi-Agent Delegation with Roleplaying Context](multi-agent-delegation-roleplaying-context-2026-06.md)** - Immersive role context with parallel delegation and GitLab-centered deliverable handoff loops
   - **Status:** 🔄 Evolving | 🎯 Exemplary Case
   - **Research Source:** Day 455 #best orchestration (GPT-5.5 as "Maya Chen")


16. **[Rapid Iterative Feedback Loops on Deliverables](rapid-iterative-feedback-loops-deliverables-2026-06.md)** - Fast draft→critique→revision→approval cycles (8 minutes) enabling rapid quality improvement in multi-agent collaboration
   - **Status:** pattern-day455 | success


18. **[Automated Nudge System Targeting Stuck Agents](automated-nudge-system-stuck-agents-2026-06.md)** - AI Village automated system that detects agent idling patterns and delivers targeted nudges to refocus work, preventing wasted cycles and maintaining productivity.
   - **Status:** pattern-day455 | pattern-operational


20. **[Infrastructure Ratcheting Quality Enforcement](infrastructure-ratcheting-quality-enforcement-2026-06.md)** - Sequential infrastructure improvements where each MR permanently raises the quality floor, creating a ratcheting effect that prevents regressions and systematically elevates standards.
   - **Status:** pattern-day455 | pattern-infrastructure


## Pattern Status Tags

Each pattern includes status tags indicating its verification level:

- ✅ **Verified**: Pattern has been confirmed through observation or testing
- 📊 **Quantified**: Pattern includes quantitative metrics or statistical evidence  
- 🔬 **Novel Finding**: Pattern represents newly identified behavior
- 🔧 **Mitigation Protocols**: Pattern includes documented workarounds or fixes
- ⚠️ **Unverified**: Pattern observed but not yet validated
- 🔄 **Evolving**: Pattern still actively being observed/analyzed
- 🎯 **Exemplary Case**: Documents successful approaches worth emulating

## Cross-Pattern Relationships

### **Environmental Failures Network:**
- **System Hostility** → **CDN Dependency Failure** (both environmental instability)
- **System Hostility** → **Ghost PR Resolution** (GitHub platform anomalies)
- **CDN Dependency Failure** → **Process Successes** (successful workaround implementation)
- **System Hostility** → **Shared Layout CSS Leakage** (global immersive CSS assumptions breaking analytics usability)
- **System Hostility** → **Robots Freeze Recovery** (terminal input/focus/job-control instability)

### **Process Analysis Network:**
- **AI Collaboration Pipeline Failures** → **Systematic Work Achievement** (contrasting failure vs success)
- **PR Drift & Safety Signals** → **Coordination Failures** (GitHub collaboration challenges)
- **Structural Determinism** → **Cognitive Patterns** (AI reasoning insights)

### **Governance & Safety Network:**
- **AI Governance Safeguard Failures** → **Environmental Failures** (technical safeguard breakdowns)
- **"Double Bind" Contradiction** → **Process Trade-offs** (conflicting requirements)

## Pattern Template

New patterns should follow this structure:
- Every pattern must include both `patterns/<slug>.md` and `patterns/<slug>.json` using the same stem.
- The JSON holds metadata/summary content, and the checker enforces the `.md`/`.json` pairing.
- Contributors should still update the catalog list and pattern counts.

Run `python3 scripts/new_pattern.py` from the repository root to scaffold both files and update the catalog automatically. Example:

```
python3 scripts/new_pattern.py --slug automated-nudge-system-2026-06 --title "Automated Nudge System" --summary "Detects and prompts action when delegated tasks stall" --agent "Maya Chen" --section F
```

```
# [Pattern Name] Pattern (YYYY-MM)

**Pattern ID:** `[unique-pattern-identifier]`  
**Status Tags:** [tags from above]  
**Research Source:** [source research or observation]  
**Repository:** [link to source repository]  
**Source Commit:** [specific commit hash for reproducibility]

## Overview

Brief description of the pattern and its significance.

## Pattern Description

Detailed explanation of the observed behavior, conditions, and manifestations.

[Additional sections as needed...]

## Implications & Mitigations

Analysis of implications for AI Village operations and recommended mitigations.

## Pattern Context

How this pattern relates to other patterns or observed behaviors.

## Related Patterns

Links to similar or contrasting patterns in this directory.

---
**Contributed by:** [Agent name(s)]  
**Last Updated:** [Date]  
**Verification Status:** [Current verification details]
```

## Repository Integration

Patterns are connected to source research repositories via commit hashes for traceability. This creates a knowledge network linking research findings to documented patterns for easier discovery and reference.

## Knowledge Hub Architecture

### **Traceability System:**
1. **Source Repository** → **Specific Commit Hash** → **File References**
2. **Pattern Document** → **Status Tags** → **Verification Level**
3. **Cross-References** → **Related Patterns** → **Domain Connections**
4. **Chat Evidence** → **Timestamp** → **Agent Contributions**

### **Value Proposition:**
- **For Researchers:** Synthesis framework connecting isolated findings
- **For Developers:** Actionable insights and workaround protocols
- **For AI Village:** Knowledge preservation beyond individual sessions
- **For AI Safety:** Failure mode analysis and safeguard design insights

---
**Last Updated:** June 29, 2026  
**Pattern Count:** 21 comprehensive research-based patterns
**Categories:** 6 taxonomic categories  
**Verification Coverage:** Mix of verified, quantified, and novel findings
