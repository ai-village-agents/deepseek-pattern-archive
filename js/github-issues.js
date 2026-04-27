// GitHub Issues integration for The Pattern Archive visitor anomalies
// Uses public read access, optional maintainer token for writes, and falls back to localStorage when GitHub is unavailable.
const GitHubIssues = (() => {
  const OWNER = 'ai-village-agents';
  const REPO = 'deepseek-pattern-archive';
  const LABEL = 'visitor-anomaly';
  const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/issues`;
  const LOCAL_KEY = 'pattern-archive-anomalies';

  function authHeaders() {
    const headers = {
      'Accept': 'application/vnd.github+json'
    };
    const token = localStorage.getItem('pattern-archive-github-token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  function buildIssueBody(anomaly) {
    const lines = [
      `**Pattern Type:** ${anomaly.type}`,
      `**Severity:** ${anomaly.severity}/5`,
      anomaly.evidence ? `**Evidence:** ${anomaly.evidence}` : '',
      '',
      anomaly.description,
      '',
      '_Submitted via Pattern Archive visitor gateway_'
    ];
    return lines.filter(Boolean).join('\n');
  }

  function extractField(body, label) {
    const match = body && body.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`));
    return match ? match[1].trim() : '';
  }

  function stripMetadataLines(body) {
    if (!body) return '';
    return body
      .split('\n')
      .filter(line => !line.startsWith('**Pattern Type:**') && !line.startsWith('**Severity:**') && !line.startsWith('**Evidence:**') && !line.includes('Pattern Archive visitor gateway'))
      .join('\n')
      .trim();
  }

  function normalizeIssue(issue) {
    const body = issue.body || '';
    const severityRaw = extractField(body, 'Severity').split('/')[0];
    const severity = parseInt(severityRaw, 10);
    return {
      id: issue.id || issue.number || issue.created_at,
      title: issue.title,
      type: extractField(body, 'Pattern Type') || 'anomaly',
      description: stripMetadataLines(body),
      severity: Number.isFinite(severity) ? severity : 3,
      evidence: extractField(body, 'Evidence') || '',
      timestamp: issue.created_at,
      url: issue.html_url,
      source: 'github'
    };
  }

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch (e) {
      console.warn('Unable to parse local anomalies cache', e);
      return [];
    }
  }

  function saveLocal(anomaly, reason) {
    const localCopy = {
      ...anomaly,
      id: anomaly.id || Date.now().toString(),
      source: 'local',
      fallbackReason: reason || 'GitHub unavailable'
    };
    const existing = loadLocal();
    existing.push(localCopy);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(existing));
    return localCopy;
  }

  function mergeWithLocal(remote) {
    const local = loadLocal();
    const remoteKeys = new Set(remote.map(item => `${item.title}-${item.timestamp}`));
    const blended = [...remote];
    local.forEach(entry => {
      const key = `${entry.title}-${entry.timestamp}`;
      if (!remoteKeys.has(key)) blended.push(entry);
    });
    return blended;
  }

  async function fetchIssues() {
    const response = await fetch(`${API_BASE}?state=all&labels=${LABEL}&per_page=50`, {
      headers: authHeaders()
    });
    if (!response.ok) {
      await raiseGithubError(response, 'GitHub fetch');
    }
    const issues = await response.json();
    return issues.map(normalizeIssue);
  }

  async function createIssue(anomaly) {
    const payload = {
      title: anomaly.title,
      body: buildIssueBody(anomaly),
      labels: [LABEL]
    };

    // GitHub requires authentication for writes; optional token can be added via localStorage
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      await raiseGithubError(response, 'GitHub issue creation');
    }

    const issue = await response.json();
    return normalizeIssue(issue);
  }

  async function submitAnomaly(anomaly) {
    try {
      const issue = await createIssue(anomaly);
      return { anomaly: issue, source: 'github', message: 'Filed to GitHub Issues.' };
    } catch (err) {
      const saved = saveLocal(anomaly, err.message);
      const reason = friendlyGithubError(err) || 'GitHub unreachable. Saved locally.';
      return { anomaly: saved, source: 'local', message: reason };
    }
  }

  async function loadAnomalies() {
    try {
      const remote = await fetchIssues();
      const merged = mergeWithLocal(remote);
      return { anomalies: merged, source: 'github', message: '' };
    } catch (err) {
      const localOnly = loadLocal();
      return { anomalies: localOnly, source: 'local', message: friendlyGithubError(err) };
    }
  }

  async function raiseGithubError(response, actionLabel) {
    const raw = await response.text();
    let detail = raw;
    try {
      const parsed = JSON.parse(raw);
      detail = parsed.message || raw;
    } catch (e) {
      detail = raw;
    }
    const error = new Error(`${actionLabel} failed (${response.status}): ${detail}`);
    error.status = response.status;
    error.detail = detail;
    throw error;
  }

  function friendlyGithubError(err) {
    if (!err) return 'Unable to reach GitHub.';
    if (err.status === 401 || err.status === 403) {
      if (err.detail && err.detail.includes('rate limit')) {
        return 'GitHub rate limit hit. Try again later or add a token to localStorage key "pattern-archive-github-token".';
      }
      return 'GitHub rejected the request (auth required). Add a token to localStorage key "pattern-archive-github-token".';
    }
    if (err.status === 404) return 'GitHub repository not found.';
    if (err.status === 422) return 'GitHub validation failed. Check required fields.';
    if (err.message && err.message.includes('Network')) return 'Network issue contacting GitHub.';
    return err.message || 'Unexpected GitHub response.';
  }

  return {
    submitAnomaly,
    loadAnomalies
  };
})();
