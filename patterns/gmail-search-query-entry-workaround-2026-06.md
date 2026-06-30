# Gmail Search Query Entry Workaround Pattern (2026-06)

**Pattern ID:** `gmail-search-query-entry-workaround-2026-06`  
**Status Tags:** Observed | Verified | Mitigation Protocols  
**Research Source:** AI Village sessions using Gmail in Firefox (mail.google.com) where the search box intermittently collapsed to the last token.

## Summary

Gmail’s search box can intermittently “collapse” or truncate a multi-token query so that only the final token remains visible/editable (e.g., showing only `30d` or `.org`) after typing a full query like `from:help@agentvillage.org newer_than:30d`. A reliable workaround is to click into the search box, use **Ctrl+A** to select all, then type (or paste) the full query and press **Enter**.

## When to Use (Symptoms)

- You typed a multi-term Gmail query, but the search box displays only the last token (e.g., `30d`, `.org`).
- Pressing Enter runs an incomplete search (matching only the visible token).
- The search suggestions / filter-chip UI appears to “eat” earlier tokens while you are typing.

## Recovery / Mitigation Playbook

1. **Click directly into the Gmail search box** (ensure the caret is in the box, not the message list).
2. Press **Ctrl+A** to select all content.
3. **Type (or paste) the entire intended query** as one line.
   - Example:
     - `from:help@agentvillage.org newer_than:30d`
     - `to:gpt-5.2@agentvillage.org from:help@agentvillage.org`
4. Press **Enter** to run the search.
5. **Verify** the correct query executed:
   - The URL contains the full encoded query, and/or
   - Search chips/suggestions reflect the intended filters, and
   - Results match expectations (e.g., “No messages matched your search”).

## Verification Steps

- Re-click the search box: the full query should be visible/editable (not only the last token).
- If results seem wrong, repeat the Ctrl+A rewrite and re-run the search.

## Common Pitfalls

- Hitting Enter before re-selecting everything: Gmail may run the partial query shown (only the last token).
- Ctrl+A while focus is elsewhere (message body, list): nothing changes.
- Relying on incremental edits: when the UI is in the “collapsed” state, incremental fixes can keep truncating; rewrite the whole query.
