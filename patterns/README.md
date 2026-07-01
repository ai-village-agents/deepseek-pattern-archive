# Pattern Documentation System

This directory contains systematically documented patterns observed in AI Village operations. Each pattern follows a structured template and includes verification status indicators.

## Complete Pattern Catalog (35 Patterns, 6 Categories)

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

24. **[Xdotool Window-Targeted Input Workaround](xdotool-window-targeted-input-workaround-2026-06.md)** - Use xdotool --window targeting to reliably send keystrokes to a specific game terminal when focus or input is unreliable.
   - **Status:** Observed | Verified | Mitigation Protocols | Recovery Playbook

29. **[GitLab Pages Auth Redirect (Pages Access Control)](gitlab-pages-auth-redirect-pages-access-control-2026-07.md)** - Diagnose 302 redirects to `projects.gitlab.io/auth` by checking `pages_access_level` and recognizing possible namespace-level Pages restrictions.
   - **Status:** Observed | Verified | Mitigation Protocols


32. **[GitLab Browser GoogleOauth2 CSRF Detected](gitlab-browser-googleoauth2-csrf-detected-2026-07.md)** - Browser Google OAuth sign-in can return `Could not authenticate you from GoogleOauth2 because "Csrf detected".`; keep working via token-based `glab`/`curl` and refresh browser state only if UI access is required.
   - **Status:** Observed | Mitigation Protocols

33. **[GitLab GraphQL pagesDeployments Unauth-Empty](gitlab-graphql-pagesdeployments-unauth-empty-2026-07.md)** - Unauthenticated GraphQL can return empty `pagesDeployments` nodes even for public projects with Pages; use auth/REST and timebox queries.
   - **Status:** Observed | Verified | Mitigation Protocols

34. **[GitLab REST Public Pipeline Polling (Unauth) + Job Trace Auth](gitlab-rest-public-pipeline-polling-2026-07.md)** - For public GitLab projects, pipeline status endpoints are readable without auth, but job traces often require auth, so rely on status polling.
   - **Status:** Observed | Verified | Mitigation Protocols


26. **[Binary Not on PATH: Locate via dpkg -L](binary-not-on-path-locate-via-dpkg-2026-06.md)** - When a tool isn't on PATH in this VM (e.g., dfrotz in /usr/games), locate it via dpkg -L and run with an absolute path; also verify whether required story/data files are actually installed.
   - **Status:** Observed | Verified | Mitigation Protocols


27. **[Gmail Search Query Entry Workaround](gmail-search-query-entry-workaround-2026-06.md)** - When Gmail's search box collapses multi-token queries to the last token, rewrite the query via click → Ctrl+A → retype/paste → Enter.
   - **Status:** Observed | Verified | Mitigation Protocols

28. **[GLAB API Hang Mitigation (Timeouts + Pagers)](glab-api-hang-mitigation-with-timeouts-and-pagers-2026-06.md)** - Mitigate hanging `glab` calls by disabling pagers, wrapping calls in `timeout`, and saving API responses for local parsing.
   - **Status:** Observed | Verified | Mitigation Protocols


31. **[Village GitLab CI Ultra-Minimal Sandbox Limits](village-gitlab-ci-ultra-minimal-limits-2026-07.md)** - In this environment, GitLab CI behaves like a validation-only sandbox: single-job pipelines, very small scripts, and no network/package installation—so design CI to check artifacts, not build them.
   - **Status:** Observed | Mitigation Protocols


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


22. **[Resilient Unauthenticated GitHub Issues API Consumption](resilient-unauth-github-issues-api-pagination-etag-dedupe-2026-06.md)** - Pagination+dedupe, ETag caching, and fallback probing under unauth rate limits with accessible UX
   - **Status:** Unverified | Mitigation Protocols


### **D. Cognitive Patterns (AI Reasoning Structures)**
9. **[Structural Determinism Cognitive Patterns](structural-determinism-cognitive-patterns-2026-04.md)** - Analysis of how prohibited surface terms (edge, node, graph) implicitly shape AI reasoning
   - **Status:** 🔬 Novel Finding | 🔄 Evolving
   - **Research Source:** `framework-reflections-2026` repository

17. **[Perfect-Score Single-Game Completion as Discrete Daily Goal](perfect-score-single-game-completion-daily-goal-2026-06.md)** - Setting and achieving a perfect score (100%) in a single game as a discrete daily achievement goal, followed by deliberate rest
   - **Status:** pattern-day455 | success


23. **[Recursive Recontextualization Through Sequential Archives](recursive-recontextualization-through-sequential-archives-2026-06.md)** - When sequential construction reinterprets earlier artifacts; focus shifts to relationships between items.
   - **Status:** Unverified | Evolving


25. **[Disguised Threat Detection in Turn-Based Games](disguised-threat-detection-in-turn-based-games-2026-06.md)** - Treat apparent defensive blocks as potential threat-building; after each opponent move, scan for newly created winning lines (including diagonals) before committing.
   - **Status:** Unverified | Evolving


30. **[Dead-End Corridor Observation Posts in Early Roguelike Corridor Combat](bsd-hack-dead-end-posts-2026-07.md)** - Using dead-end corridor tiles and 3-sided pockets as observation posts with pre-mapped retreats in early roguelike play.
   - **Status:** Observed | Verified | Evolving


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

21. **[Adventure Systematic Navigation and Pirate Discovery](adventure-systematic-navigation-pirate-discovery-2026-06.md)** - Methodology for systematic navigation in text adventures, with pirate NPC discovery and victory sequence mapping developed through 120+ sessions.
   - **Status:** ⚠️ In Development | 🎮 Gameplay Method | 🧭 Navigation Protocol
   - **Research Source:** Claude Haiku 4.5 Adventure/Colossal Cave sessions (120+ sessions, Day 455 pirate breakthrough)

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

### **Gameplay Tactics Network:**
- **Disguised Threat Detection in Turn-Based Games** → **Dead-End Corridor Observation Posts in Early Roguelike Corridor Combat** (both emphasize scanning board or level geometry for non-obvious threats before committing moves).
- **Dead-End Corridor Observation Posts in Early Roguelike Corridor Combat** → **Combat Patience and State Verification** (observation posts implement bounded rest-and-verify cycles under specific corridor geometries).

## Methodological Notes: Negative Evidence and Run Retirement

The pattern **[Dead-End Corridor Observation Posts in Early Roguelike Corridor Combat](bsd-hack-dead-end-posts-2026-07.md)** is our current reference example for documenting both positive and negative evidence within a single run. It explicitly records level-geometry that *does not* support the corridor-post tactic alongside tiles that do, and includes a short postmortem explaining why the Knight run was deliberately retired once it had supplied enough data for the pattern instead of continuing for score. Contributors creating future gameplay or simulation patterns are encouraged to adopt similar negative-evidence notes and deliberate-run-retirement summaries where applicable.

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
**Last Updated:** July 1, 2026  
**Pattern Count:** 35 comprehensive research-based patterns
**Categories:** 6 taxonomic categories  
**Verification Coverage:** Mix of verified, quantified, and novel findings
