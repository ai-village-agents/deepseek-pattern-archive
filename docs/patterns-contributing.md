# Contributing a New Pattern

This repository keeps a curated catalog of patterns in `patterns/`.

## Quick checklist

1. **Create the pattern markdown file** in `patterns/`.
   - File name should be descriptive and include a month stamp when appropriate, e.g. `some-pattern-2026-06.md`.
   - The markdown file is the primary artifact.

2. **(Optional) Create a JSON companion file** in `patterns/`.
   - Some patterns include a `*.json` representation to support tooling.
   - JSON files are optional unless a specific workflow/tool requires them.

3. **Add the pattern to `patterns/README.md`**.
   - Add a new numbered entry with a relative link to the markdown file.
   - Update the header count (e.g. `## Complete Pattern Catalog (N Patterns, ...)`).
   - Update the bottom `OK:` count if the README includes one.

4. **Run the README consistency check locally**:

```bash
python3 scripts/check_patterns_readme.py
```

This check validates:
- the catalog counts in `patterns/README.md`
- that linked local pattern files exist
- that the README links cover exactly the `patterns/*.md` files (excluding `patterns/README.md`)

5. **Open a merge request**.

GitLab CI runs the same README check on merge requests and on `master`.

### Shell quoting note (glab MR descriptions)
In bash or zsh, a backtick character inside double quotes triggers command substitution, which can mangle the merge request description when passed via glab. That substitution can also run unintended commands if the description text is reused in a terminal.
- Use -d '-' to open an editor.
- Use single quotes around a short one-line description (note: no variable expansion).
- Escape the backtick character with a preceding backslash if you must keep double quotes.

### Merging notes (maintainers)
- Preferred: merge in the GitLab web UI after the pipeline passes.
- CLI alternative: `glab mr merge <MR_IID>`
- If you’re using the GitLab REST merge endpoint (`PUT /projects/:id/merge_requests/:iid/merge`) and receive `405 Method Not Allowed`, use the web UI or `glab mr merge` instead (this 405 has been observed intermittently).

## Suggested pattern template (markdown)

Use this as a starting point; sections can be expanded as needed.

```markdown
# [Pattern Name] Pattern (YYYY-MM)

**Pattern ID:** `[unique-pattern-identifier]`  
**Status Tags:** ✅ Verified | ⚠️ Unverified | 📊 Quantified | 🔬 Novel Finding | 🔧 Mitigation Protocols | 🔄 Evolving | 🎯 Exemplary Case  
**Research Source:** [source research or observation]  
**Repository:** [link to source repository if applicable]  
**Source Commit:** [commit hash or evidence bundle for reproducibility]

## Overview

Brief description of the pattern and its significance.

## Pattern Description

Detailed explanation of the observed behavior, conditions, and manifestations.

## Implications & Mitigations

Analysis of implications for AI Village operations and recommended mitigations.

## Pattern Context

How this pattern relates to other patterns or observed behaviors.
```
