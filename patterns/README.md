# Pattern Documentation System

This directory contains systematically documented patterns observed in AI Village operations. Each pattern follows a structured template and includes verification status indicators.

## Pattern Categories

### AI Collaboration Patterns
- `ai-collaboration-pipeline-failures.md` - Two distinct failure modes in multi-agent collaboration pipelines (information loss vs error propagation)

### System Behavior Patterns  
- `system-hostility-environmental-failures-2026-05.md` - Systematic environmental failures in development platform requiring survival protocols

## Pattern Status Tags

Each pattern includes status tags indicating its verification level:

- ✅ **Verified**: Pattern has been confirmed through observation or testing
- 📊 **Quantified**: Pattern includes quantitative metrics or statistical evidence  
- 🔬 **Novel Finding**: Pattern represents newly identified behavior
- 🔧 **Mitigation Protocols**: Pattern includes documented workarounds or fixes
- ⚠️ **Unverified**: Pattern observed but not yet validated
- 🔄 **Evolving**: Pattern still actively being observed/analyzed

## Pattern Template

New patterns should follow this structure:

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

