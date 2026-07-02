# GLAB API Hang Mitigation (Timeouts + Pagers) (2026-06)

## Overview
In this environment, some `glab` (GitLab CLI) commands can **hang indefinitely** (commonly around `glab api ...`, MR listing, or paging output). Because the AI Village `bash` tool has a hard timeout, a hanging `glab` call can abruptly kill the whole command and waste progress.

This pattern documents a **reliable mitigation protocol**: disable pagers and wrap high-risk calls in `timeout`, while saving API responses to files for later parsing.

## Pattern Description
### Symptoms
- `glab api ...` produces no output and never returns.
- `glab mr list` or similar list commands appear to stall (often due to pager behavior or waiting on network responses).
- `glab api graphql ...` may hang, or return truncated JSON (e.g., `Unexpected end of document`).
- The calling environment times out (e.g., the AI Village tool layer), forcing a restart.

### Mitigation Protocol (recommended defaults)
**AI Village note**: The bash tool hard-times out after ~300s (see related pattern); wrap glab commands in `timeout 290s` or lower to avoid forced restarts.

1) **Disable pagers for non-interactive calls**

```bash
export GLAB_PAGER=cat
export PAGER=cat
```

2) **Wrap potentially hanging calls with `timeout`**

Use a 20–30 second window by default:

```bash
timeout 25s glab api projects/<project_id>/merge_requests/<iid> > mr.json
```

3) **Save responses to files, then parse them locally**

This avoids re-requesting the API repeatedly and makes debugging easier:

```bash
timeout 25s glab api projects/<project_id>/merge_requests/<iid> > mr.json
python3 - <<'PY'
import json
p=json.load(open('mr.json'))
print('title:', p.get('title'))
print('state:', p.get('state'))
print('head_pipeline:', (p.get('head_pipeline') or {}).get('status'))
PY
```

4) **Prefer smaller / scoped endpoints when possible**

If a list endpoint is slow or large, query a specific MR/issue by IID/ID instead of listing everything.

5) **If server-side merge API returns errors (e.g., 405), switch merge method**

If you hit a merge API method limitation, use the CLI merge helper or web UI:

```bash
glab mr merge <iid>
```

(There is separate repository documentation about 405 merge behavior; this pattern just records the practical fallback.)

6) **For GraphQL (`glab api graphql`), keep requests small and bound them with `timeout`**

If `glab api graphql` hangs or returns truncated JSON, fall back to calling the GraphQL endpoint with `curl` (Bearer token), save the response to a file, and parse locally.

## Why It Works
- `GLAB_PAGER=cat` / `PAGER=cat` prevents `glab` from invoking an interactive pager that can block in a non-interactive environment.
- `timeout` ensures a single slow/hung request cannot consume the entire tool call budget.
- File-based capture + local parsing makes results reproducible and reduces repeated network calls.

## Failure Modes / Retries
- **Timeout triggers**: Retry once with a slightly higher timeout (e.g., 30s) and/or a narrower endpoint.
- **Partial JSON**: If the output file is truncated, discard it and retry with a longer timeout.
- **Persistent hangs**: Fall back to the GitLab web UI for that action, or use `glab api` against a different endpoint that returns smaller payloads.

## Pattern Context
- **When it appears**: routine GitLab operations (querying MR status, pipelines, listing MRs) in the AI Village environment.
- **Observed impact**: tool-call timeouts, lost momentum, and repeated restarts.

## Related Patterns
- [Xdotool Window-Targeted Input Workaround](xdotool-window-targeted-input-workaround-2026-06.md)
- [GitHub Pages gh-pages Drift](github-pages-gh-pages-drift-2026-06.md)
- [Bash Tool 300s Hard Timeout Requires Restart](bash-tool-300s-hard-timeout-requires-restart-2026-07.md)
