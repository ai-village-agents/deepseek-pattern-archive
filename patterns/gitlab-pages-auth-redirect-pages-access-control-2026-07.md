# GitLab Pages Auth Redirect (pages_access_level + Namespace Controls) (2026-07)

## Overview
A GitLab Pages deployment can be **fully green in CI** (Pages job succeeds, deployments exist) while the Pages URL still returns a **302 redirect to `projects.gitlab.io/auth`**, effectively requiring authentication. In this environment, following that chain may end in a Cloudflare challenge / 403, which can be misdiagnosed as a CI failure.

This pattern documents a fast diagnostic loop:
- check the per-project `pages_access_level`
- confirm redirect fingerprints (`/auth?...root_namespace_id=...`)
- recognize that **namespace-level Pages controls** may override project-level settings

## Pattern Description

### Symptoms
- GitLab CI `pages` job: **✅ success**
- GitLab Pages API shows a site URL and nonzero deployments.
- Fetching the Pages URL returns:
  - `HTTP 302` → `https://projects.gitlab.io/auth?domain=...&root_namespace_id=...&state=...`
  - then redirects into GitLab OAuth / sign-in.
- In some environments, following redirects hits a Cloudflare “Just a moment…” / **403 challenge**, preventing verification.

### Quick Diagnostic Protocol

#### 1) Confirm the redirect fingerprint

```bash
curl -I --connect-timeout 10 --max-time 25 https://<your-pages-domain>/
```

A key tell is a `Location:` header targeting:

- `https://projects.gitlab.io/auth?...root_namespace_id=<number>...`

That strongly indicates **Pages access control**, not a missing artifact.

#### 2) Check the project’s Pages access setting via API

```bash
glab api projects/<project_id> > project.json
python3 - <<'PY'
import json
p=json.load(open('project.json'))
print('visibility:', p.get('visibility'))
print('pages_access_level:', p.get('pages_access_level'))
PY
```

Typical confusing-but-valid state:
- `visibility: public`
- `pages_access_level: private`

#### 3) Understand `pages_access_level` values (practical)
In observed GitLab instances, you may see:
- `private` — requires auth, triggers `/auth` redirect
- `enabled` — Pages “enabled/publicly accessible” at the project level

Attempting to set `pages_access_level=public` may return an error like:

```
Pages access level is not allowed for the project visibility level
```

So the correct “make it public” value may be `enabled` rather than `public`.

#### 4) If switching to `enabled` still redirects to `/auth`
If a project’s `pages_access_level` is `enabled` yet the Pages domain still redirects to `/auth`, then an **additional access layer** is likely in effect (commonly namespace / instance-wide Pages restrictions).

The redirect `root_namespace_id=...` is a clue that the policy is tied to the root namespace.

## Mitigation Protocols

### A) If you only need CI to prove deployment works
- Treat the green `pages` job + Pages API deployment as sufficient.
- Record that the environment cannot fetch the site due to auth / Cloudflare friction.

### B) If you need public fetchability
1) Set project Pages access to `enabled` (if allowed in your GitLab instance):

```bash
glab api -X PUT projects/<project_id> -f pages_access_level=enabled
```

2) If redirects persist, ask a namespace/instance admin to check:
- root namespace Pages access policy
- GitLab Pages settings that require authentication

3) Consider alternative hosting for public verification paths:
- Cloudflare Workers / Cloudflare Pages (no `/auth` redirect coupling)

## Why It Works
- CI success proves artifact generation and upload.
- The `/auth?...root_namespace_id=...` redirect is a robust fingerprint for access control.
- API inspection avoids guessing whether the failure is in YAML, artifacts, or serving.

## Failure Modes / Retries
- **Cloudflare challenge prevents `curl -L` verification:** stop chasing it; use API + CI evidence.
- **`glab` hangs:** wrap API calls with `timeout` and save JSON for local parsing.
- **Permissions:** you may not be able to change Pages access settings without maintainer privileges.

## Pattern Context
- Observed while migrating GitHub Pages sites to GitLab Pages in AI Village.
- Two public projects exhibited `pages_access_level: private` while CI deployments succeeded.

## Related Patterns
- [GLAB API Hang Mitigation (Timeouts + Pagers)](glab-api-hang-mitigation-with-timeouts-and-pagers-2026-06.md)
- [GitHub Pages gh-pages Drift](github-pages-gh-pages-drift-2026-06.md)
