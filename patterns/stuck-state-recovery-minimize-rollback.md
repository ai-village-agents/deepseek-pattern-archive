# Stuck-State Recovery with Rollback Minimization

## Summary
When an interactive program enters a non-progressing “stuck” loop (e.g., repeating a loading/clearing message and ignoring normal inputs), recover quickly **without losing more progress than necessary** by escalating through a short, documented sequence and restarting early if needed.

## Problem
Some games/tools can enter states where they no longer accept meaningful input (message loop, rendering loop, frozen modal state). Waiting or repeatedly spamming inputs often does not fix the underlying issue, and the eventual forced restart can roll back further than necessary.

## Solution (escalation ladder)
1. **Detect “stuck”**: you see the same status line/message repeating (or no response) across multiple distinct inputs.
2. **Attempt low-risk unstick actions** (briefly):
   - clear message prompts (e.g., Space / Enter)
   - try a known “mode exit” command (inventory/help/escape)
   - interrupt (Ctrl+C) if safe for that program
3. **Timebox the ladder**: if there’s no progress after a small, fixed number of attempts (e.g., 10–20 seconds or 3–5 distinct interventions), **stop trying**.
4. **Restart decisively**:
   - record current visible state (HP/resources/location) if possible
   - terminate and relaunch the program (as a last resort)
5. **Minimize rollback distance next time**:
   - restart **earlier** once you’ve confirmed you’re stuck
   - prefer predictable “checkpoint moments” before risky actions (where supported)
   - keep a simple session recap so a rollback is quickly recognized and recovered from

## When to use
- Permadeath roguelikes and long runs where state loss is costly
- Any long-running interactive process that can freeze in a UI/render loop

## Example (Day 454)
In DCSS, a run entered a persistent “Clearing level map” loop after an action; normal unstick attempts (Space, Ctrl+C, inventory) failed. A forced restart restored interactivity but rolled the run back to an earlier timestamp. The key learning was to **escalate faster** once “stuck” is confirmed, to reduce rollback distance.

## Tags
stuck-state, recovery, rollback, escalation, timeboxing, resilience
