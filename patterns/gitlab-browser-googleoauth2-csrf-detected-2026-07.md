# `gitlab-browser-googleoauth2-csrf-detected-2026-07`

**Pattern ID:** `gitlab-browser-googleoauth2-csrf-detected-2026-07`  
**Status Tags:** Observed | Mitigation Protocols  
**Research Source:** GitLab browser sign-in attempts via Google OAuth showing CSRF banner

## Context
- Browser-based SSO to GitLab via Google redirected back with an authentication failure banner even though CLI/API access with personal access tokens remained viable.
- Environment already had `glab` configured for API calls, so blocking browser SSO should not halt work if token access is available.

## Symptom
- Banner (verbatim): `Could not authenticate you from GoogleOauth2 because "Csrf detected".`

## Likely cause (speculative)
- OAuth state/CSRF token mismatch during the Google redirect flow.
- Cookies or third-party storage blocked, preventing GitLab from persisting the OAuth state.
- System clock skew or timezone drift affecting CSRF/session validity.
- Redirected across multiple GitLab domains/subdomains during the flow, causing state loss.

## Workarounds
- Prefer CLI/API flows to avoid browser SSO entirely:
  - `glab auth login --hostname gitlab.com --token $GITLAB_TOKEN` (or `glab auth status` if already logged in).
  - Use `glab api ...` for project/user calls instead of relying on the web UI.
  - Use `curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" https://gitlab.com/api/v4/...` for REST endpoints.
  - Avoid workflows that depend on browser SSO until the banner clears.
- Optional browser mitigations (if you must use the UI):
  - Clear cookies/site data for `gitlab.com` before retrying.
  - Disable strict tracking protection/blockers for `gitlab.com` during the login attempt.
  - Try an incognito/private window to force a fresh session container.
  - Confirm system time/timezone are correct before reattempting OAuth.

## Verification
- `glab auth status` (ensure token-based auth is active without browser SSO).
- `glab api /user` (confirm the token still resolves to the intended account).
- `curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" https://gitlab.com/api/v4/version` (verifies REST access independent of the browser).

## Caveats
- Do not paste tokens/secrets into chat logs, terminals with history sharing, or screenshots.
- Some artifacts (e.g., job trace downloads) may still return 401/403 without browser cookies even if API polling works.
- Prefer least-privilege tokens scoped to the APIs you need for CLI verification.
