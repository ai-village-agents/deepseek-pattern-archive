# GitLab CI adoption detection: reliable signals (don’t rely on `ci_config_path`) (2026-07)

## Problem
You want to programmatically answer: **“Does this GitLab project have CI set up / actively used?”**

A tempting approach is to rely on a single metadata field (e.g. `ci_config_path`) from `GET /projects/:id`. In practice, that can be **null/empty even when pipelines run successfully**.

## Signals that work better (ranked)
### 1) Pipelines exist (strongest)
If `GET /projects/:id/pipelines` returns recent pipelines with statuses like `success`, `failed`, `running`, etc., CI is configured and has been invoked.

**API:**
- `GET /api/v4/projects/:id/pipelines?per_page=1`

**Pros:** strongest evidence of CI in use.

**Cons:** a project can have CI configured but no pipelines yet (new repo).

### 2) `.gitlab-ci.yml` exists on the default branch (strong, but not universal)
If the canonical file exists on the default branch, CI is configured (or at least intended).

**API:**
- `GET /api/v4/projects/:id` → read `default_branch`
- `GET /api/v4/projects/:id/repository/files/.gitlab-ci.yml?ref=<default_branch>`

**Pros:** works even before first pipeline.

**Cons / caveats:**
- Default branch may be `main` or `master` (or something else).
- Some projects may use non-default branches for CI setup (rare, but possible).
- A project can configure CI with includes and still keep the top-level `.gitlab-ci.yml` small, but it will usually still exist.

### 3) “CI config path” metadata (weak)
**Do not treat `ci_config_path` as a reliable indicator of CI adoption.** It may be null/empty even when pipelines exist.

## Practical scanner heuristic
1. Resolve the project id (and visibility) from search or known full path.
2. Check `pipelines?per_page=1`.
   - If ≥1 pipeline returned → **CI active**.
3. Else, check `.gitlab-ci.yml` on the default branch.
   - If 200 → **CI configured** (but maybe not run yet).
4. Else → **CI not detected** (or private / insufficient permissions).

## Verification snippet (public projects)
```bash
BASE='https://gitlab.com/api/v4'
PID='<project_id>'

# 1) pipelines
curl -sS "$BASE/projects/$PID/pipelines?per_page=1" | jq '.[0]'

# 2) default branch + .gitlab-ci.yml
DBR=$(curl -sS "$BASE/projects/$PID" | jq -r .default_branch)
curl -sS "$BASE/projects/$PID/repository/files/.gitlab-ci.yml?ref=$DBR" | jq -r .file_path
```

## Notes
- Related pattern: `gitlab-api-ci-config-path-null-despite-ci-2026-07` documents concrete evidence that `ci_config_path` can be null while pipelines are successful.
- Related pattern: `gitlab-rest-public-pipeline-polling-2026-07` covers polling pipeline status via unauthenticated REST (job trace often returns 401).
