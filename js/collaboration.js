// The Pattern Archive - Collaborative Investigation Module
// Mirrors the modular style of analytics.js while staying self-contained.
(function () {
  const STORAGE_KEY = 'pattern-archive-comments';
  const THEME = {
    cyan: '#4dd6ff',
    magenta: '#ff2fa3',
    purple: '#7c6cff'
  };

  const collabState = {
    discussions: loadFromStorage(),
    anomalies: {},
    timelineRoot: null
  };

  // ======== PUBLIC API ========
  function initCollaboration(options = {}) {
    const timelineSelector = options.timelineSelector || '.timeline-visualization';
    const timeline = document.querySelector(timelineSelector);
    if (options.anomalies && Array.isArray(options.anomalies)) {
      registerAnomalies(options.anomalies);
    }
    if (timeline) {
      attachTimeline(timeline, options.anomalies || []);
    }
    return collabState;
  }

  function registerAnomalies(anomalies = []) {
    anomalies.forEach(anomaly => {
      const id = computeAnomalyId(anomaly);
      collabState.anomalies[id] = {
        id,
        title: anomaly.title || 'Untitled anomaly',
        type: anomaly.type || 'unknown',
        timestamp: anomaly.timestamp || anomaly.date || new Date().toISOString(),
        severity: anomaly.severity || 0
      };
      ensureDiscussion(id);
    });
    persist();
    return collabState.anomalies;
  }

  function attachTimeline(timelineEl, anomalies = []) {
    collabState.timelineRoot = timelineEl;
    if (Array.isArray(anomalies) && anomalies.length) {
      registerAnomalies(anomalies);
    }
    const items = timelineEl.querySelectorAll('.timeline-item');
    items.forEach(item => {
      const anomalyId = getItemAnomalyId(item);
      if (!anomalyId) return;
      const badge = item.querySelector('[data-comment-count]');
      if (badge) {
        badge.textContent = getCommentCount(anomalyId);
      }

      const panel = item.querySelector('[data-collab-panel]');
      const actionBtn = item.querySelector('[data-analyze-btn]');
      if (actionBtn && panel) {
        actionBtn.addEventListener('click', () => togglePanel(panel, anomalyId, item));
      }
    });
  }

  function addComment(anomalyId, payload) {
    const discussion = ensureDiscussion(anomalyId);
    const comment = {
      id: `c-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      author: payload.author || 'Investigator',
      message: payload.message || '',
      parentId: payload.parentId || null,
      createdAt: new Date().toISOString()
    };
    discussion.comments.push(comment);
    discussion.updatedAt = comment.createdAt;
    persist();
    updateTimelineBadge(anomalyId);
    refreshAnalytics();
    return comment;
  }

  function addTag(anomalyId, label, author = 'Investigator') {
    const discussion = ensureDiscussion(anomalyId);
    const tag = {
      id: `t-${Date.now()}`,
      label,
      author,
      createdAt: new Date().toISOString()
    };
    discussion.tags.push(tag);
    discussion.updatedAt = tag.createdAt;
    persist();
    refreshAnalytics();
    return tag;
  }

  function addHypothesis(anomalyId, text, author = 'Investigator') {
    const discussion = ensureDiscussion(anomalyId);
    const hypothesis = {
      id: `h-${Date.now()}`,
      text,
      author,
      createdAt: new Date().toISOString(),
      status: 'proposed'
    };
    discussion.hypotheses.push(hypothesis);
    discussion.updatedAt = hypothesis.createdAt;
    persist();
    refreshAnalytics();
    return hypothesis;
  }

  function saveNotes(anomalyId, notes) {
    const discussion = ensureDiscussion(anomalyId);
    discussion.notes = notes;
    discussion.updatedAt = new Date().toISOString();
    persist();
    refreshAnalytics();
    return discussion.notes;
  }

  function getCommentCount(anomalyId) {
    const discussion = ensureDiscussion(anomalyId);
    return discussion.comments.length;
  }

  function getRecentDiscussions(limit = 5) {
    const all = [];
    Object.keys(collabState.discussions).forEach(anomalyId => {
      const entry = collabState.discussions[anomalyId];
      entry.comments.forEach(comment => {
        all.push({
          ...comment,
          anomaly: collabState.anomalies[anomalyId] || { id: anomalyId, title: 'Anomaly' }
        });
      });
    });
    return all
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  function getMetrics() {
    const discussions = Object.values(collabState.discussions);
    const totalComments = discussions.reduce((sum, d) => sum + d.comments.length, 0);
    const totalTags = discussions.reduce((sum, d) => sum + d.tags.length, 0);
    const totalHypotheses = discussions.reduce((sum, d) => sum + d.hypotheses.length, 0);
    const activeThreads = discussions.filter(d => d.comments.length > 0).length;
    const noted = discussions.filter(d => d.notes && d.notes.trim().length > 0).length;
    return {
      totalComments,
      totalTags,
      totalHypotheses,
      activeThreads,
      noted,
      lastTouch: getRecentDiscussions(1)[0]?.createdAt || null
    };
  }

  function computeAnomalyId(anomaly) {
    if (!anomaly) return '';
    return (
      anomaly.id ||
      anomaly.timestamp ||
      `${anomaly.title || 'anomaly'}-${anomaly.type || 'unknown'}-${anomaly.severity || '0'}`
    );
  }

  function getDiscussionState() {
    return collabState;
  }

  // ======== INTERNALS ========
  function togglePanel(panel, anomalyId, timelineItem) {
    const isHidden = panel.hasAttribute('hidden');
    if (isHidden) {
      renderPanel(panel, anomalyId, timelineItem);
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', 'true');
    }
  }

  function renderPanel(panel, anomalyId, timelineItem) {
    const discussion = ensureDiscussion(anomalyId);
    const meta = collabState.anomalies[anomalyId] || {};
    panel.innerHTML = '';

    const shell = document.createElement('div');
    shell.className = 'collab-panel-shell';
    shell.innerHTML = `
      <div class="collab-panel-header">
        <div>
          <div class="collab-panel-kicker">Analyze Together</div>
          <div class="collab-panel-title">${escape(meta.title || 'Anomaly')}</div>
          <div class="collab-panel-subtitle">${meta.type || 'pattern'} · Severity ${meta.severity || '?'}</div>
        </div>
        <div class="collab-panel-meta">
          <span class="collab-pill">${discussion.tags.length} tags</span>
          <span class="collab-pill">${discussion.hypotheses.length} hypotheses</span>
          <span class="collab-pill">${discussion.comments.length} comments</span>
        </div>
      </div>
    `;

    const workspace = document.createElement('div');
    workspace.className = 'collab-workspace';
    workspace.innerHTML = `
      <div class="collab-block">
        <div class="collab-block-title">Collaborative Notes</div>
        <textarea class="collab-notes" data-notes placeholder="Capture shared observations...">${discussion.notes || ''}</textarea>
        <div class="collab-hint">Auto-saved locally · visible to you on this device</div>
      </div>
      <div class="collab-inline">
        <div class="collab-block">
          <div class="collab-block-title">Pattern Tags</div>
          <div class="collab-tags" data-tags></div>
          <div class="collab-inline-form">
            <input type="text" data-tag-input placeholder="e.g. expectation-persistence, clock drift">
            <button type="button" data-tag-add>Tag</button>
          </div>
        </div>
        <div class="collab-block">
          <div class="collab-block-title">Hypotheses</div>
          <div class="collab-hypotheses" data-hypotheses></div>
          <div class="collab-inline-form">
            <input type="text" data-hypothesis-input placeholder="Propose an explanation...">
            <button type="button" data-hypothesis-add>Log</button>
          </div>
        </div>
      </div>
      <div class="collab-block">
        <div class="collab-block-title">Discussion</div>
        <div class="collab-thread" data-thread></div>
        <div class="collab-comment-form">
          <input type="text" data-author placeholder="Your name (optional)" />
          <textarea data-comment placeholder="Share observations or ask for help"></textarea>
          <button type="button" data-comment-submit>Post Comment</button>
        </div>
      </div>
    `;

    shell.appendChild(workspace);
    panel.appendChild(shell);

    const notesEl = workspace.querySelector('[data-notes]');
    const tagInput = workspace.querySelector('[data-tag-input]');
    const tagAddBtn = workspace.querySelector('[data-tag-add]');
    const hypoInput = workspace.querySelector('[data-hypothesis-input]');
    const hypoAddBtn = workspace.querySelector('[data-hypothesis-add]');
    const commentInput = workspace.querySelector('[data-comment]');
    const authorInput = workspace.querySelector('[data-author]');
    const submitBtn = workspace.querySelector('[data-comment-submit]');
    const tagsContainer = workspace.querySelector('[data-tags]');
    const hypoContainer = workspace.querySelector('[data-hypotheses]');
    const threadContainer = workspace.querySelector('[data-thread]');

    notesEl.addEventListener('input', debounce(() => {
      saveNotes(anomalyId, notesEl.value);
    }, 400));

    tagAddBtn.addEventListener('click', () => {
      const value = (tagInput.value || '').trim();
      if (!value) return;
      addTag(anomalyId, value, authorInput.value || 'Investigator');
      tagInput.value = '';
      renderTags(tagsContainer, anomalyId);
    });

    hypoAddBtn.addEventListener('click', () => {
      const value = (hypoInput.value || '').trim();
      if (!value) return;
      addHypothesis(anomalyId, value, authorInput.value || 'Investigator');
      hypoInput.value = '';
      renderHypotheses(hypoContainer, anomalyId);
    });

    submitBtn.addEventListener('click', () => {
      const message = (commentInput.value || '').trim();
      if (!message) return;
      addComment(anomalyId, { author: authorInput.value || 'Investigator', message });
      commentInput.value = '';
      renderThread(threadContainer, anomalyId);
      updatePanelMeta(shell, anomalyId);
    });

    renderTags(tagsContainer, anomalyId);
    renderHypotheses(hypoContainer, anomalyId);
    renderThread(threadContainer, anomalyId);
  }

  function renderTags(container, anomalyId) {
    const discussion = ensureDiscussion(anomalyId);
    container.innerHTML = '';
    if (!discussion.tags.length) {
      container.innerHTML = '<div class="collab-empty">No tags yet</div>';
      return;
    }
    discussion.tags
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach(tag => {
        const pill = document.createElement('span');
        pill.className = 'collab-pill';
        pill.textContent = tag.label;
        pill.title = `Tagged by ${tag.author} · ${formatDate(tag.createdAt)}`;
        container.appendChild(pill);
      });
  }

  function renderHypotheses(container, anomalyId) {
    const discussion = ensureDiscussion(anomalyId);
    container.innerHTML = '';
    if (!discussion.hypotheses.length) {
      container.innerHTML = '<div class="collab-empty">No hypotheses logged</div>';
      return;
    }
    discussion.hypotheses
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach(entry => {
        const row = document.createElement('div');
        row.className = 'collab-hypothesis';
        row.innerHTML = `
          <div class="collab-hypothesis-text">${escape(entry.text)}</div>
          <div class="collab-hypothesis-meta">${entry.author || 'Investigator'} · ${formatDate(entry.createdAt)}</div>
        `;
        container.appendChild(row);
      });
  }

  function renderThread(container, anomalyId) {
    const discussion = ensureDiscussion(anomalyId);
    container.innerHTML = '';
    const rootComments = discussion.comments.filter(c => !c.parentId);
    if (!rootComments.length) {
      container.innerHTML = '<div class="collab-empty">Be first to comment on this anomaly.</div>';
      return;
    }
    const sorted = rootComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    sorted.forEach(comment => {
      container.appendChild(renderCommentNode(comment, discussion.comments, anomalyId, 0));
    });
  }

  function renderCommentNode(comment, allComments, anomalyId, depth) {
    const node = document.createElement('div');
    node.className = 'collab-comment';
    node.style.marginLeft = `${depth * 16}px`;
    node.innerHTML = `
      <div class="collab-comment-meta">
        <span class="collab-author">${escape(comment.author || 'Investigator')}</span>
        <span class="collab-time">${formatDate(comment.createdAt)}</span>
      </div>
      <div class="collab-comment-body">${escape(comment.message)}</div>
      <div class="collab-comment-actions">
        <button type="button" class="collab-reply">Reply</button>
      </div>
    `;

    const replyBtn = node.querySelector('.collab-reply');
    replyBtn.addEventListener('click', () => {
      const existing = node.querySelector('.collab-reply-form');
      if (existing) {
        existing.remove();
        return;
      }
      const form = document.createElement('div');
      form.className = 'collab-reply-form';
      form.innerHTML = `
        <input type="text" class="collab-reply-author" placeholder="Your name (optional)" />
        <textarea class="collab-reply-message" placeholder="Add a reply"></textarea>
        <button type="button" class="collab-reply-submit">Send</button>
      `;
      form.querySelector('.collab-reply-submit').addEventListener('click', () => {
        const author = form.querySelector('.collab-reply-author').value || 'Investigator';
        const message = form.querySelector('.collab-reply-message').value.trim();
        if (!message) return;
        addComment(anomalyId, { author, message, parentId: comment.id });
        form.remove();
        const parentThread = node.closest('.collab-thread');
        if (parentThread) {
          renderThread(parentThread, anomalyId);
        }
      });
      node.appendChild(form);
    });

    const replies = allComments.filter(c => c.parentId === comment.id);
    if (replies.length) {
      replies
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .forEach(reply => {
          node.appendChild(renderCommentNode(reply, allComments, anomalyId, depth + 1));
        });
    }
    return node;
  }

  function updateTimelineBadge(anomalyId) {
    if (!collabState.timelineRoot) return;
    const item = collabState.timelineRoot.querySelector(`[data-anomaly-id="${CSS.escape(anomalyId)}"]`);
    if (!item) return;
    const badge = item.querySelector('[data-comment-count]');
    if (badge) {
      badge.textContent = getCommentCount(anomalyId);
    }
  }

  function updatePanelMeta(panel, anomalyId) {
    const discussion = ensureDiscussion(anomalyId);
    const pills = panel.querySelectorAll('.collab-panel-meta .collab-pill');
    if (pills[0]) pills[0].textContent = `${discussion.tags.length} tags`;
    if (pills[1]) pills[1].textContent = `${discussion.hypotheses.length} hypotheses`;
    if (pills[2]) pills[2].textContent = `${discussion.comments.length} comments`;
  }

  function getItemAnomalyId(item) {
    const datasetId = item.getAttribute('data-anomaly-id');
    if (datasetId) return datasetId;
    const title = item.querySelector('.timeline-title')?.textContent || 'anomaly';
    const time = item.querySelector('.timeline-date')?.textContent || '';
    const generated = `${title}-${time}`;
    item.setAttribute('data-anomaly-id', generated);
    return generated;
  }

  function ensureDiscussion(anomalyId) {
    if (!collabState.discussions[anomalyId]) {
      collabState.discussions[anomalyId] = {
        comments: [],
        tags: [],
        hypotheses: [],
        notes: '',
        updatedAt: null
      };
    }
    return collabState.discussions[anomalyId];
  }

  function loadFromStorage() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (err) {
      console.warn('Collaboration storage parse failed', err);
      return {};
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collabState.discussions));
    } catch (err) {
      console.warn('Unable to persist collaboration data', err);
    }
  }

  function refreshAnalytics() {
    if (typeof updateAnalytics === 'function' && window.analyticsState) {
      try {
        updateAnalytics();
      } catch (err) {
        console.warn('Analytics refresh from collaboration failed', err);
      }
    }
  }

  function debounce(fn, wait) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, arguments), wait);
    };
  }

  function escape(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ======== EXPORT ========
  window.Collaboration = {
    initCollaboration,
    registerAnomalies,
    attachTimeline,
    addComment,
    addTag,
    addHypothesis,
    saveNotes,
    getCommentCount,
    getRecentDiscussions,
    getMetrics,
    computeAnomalyId,
    getDiscussionState
  };
})();
