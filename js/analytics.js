// Real-time Visitor Analytics Dashboard
// Provides chart rendering, controls, stats, and update helpers

(function(global) {
  const COLORS = {
    cyan: '#4dd6ff',
    magenta: '#ff2fa3',
    purple: '#7c6cff',
    ink: 'rgba(15, 19, 36, 0.8)'
  };

  const analyticsState = {
    charts: {},
    anomalies: [],
    filters: {
      timeRange: '7d',
      patternType: 'all',
      severity: 'all'
    }
  };

  const LOCAL_KEY = 'pattern-archive-anomalies';

  function initAnalyticsDashboard() {
    try {
      renderAnalyticsControls();
      analyticsState.anomalies = loadAnomalyData();
      const filtered = filterAnomalies(analyticsState.anomalies);
      renderAnalyticsCharts(filtered);
      renderAnalyticsStats(filtered);
    } catch (err) {
      console.error('Failed to initialize analytics dashboard', err);
      safeSetContent('analytics-container', '<p class="error">Analytics failed to load.</p>');
    }
  }

  function updateAnalytics() {
    try {
      analyticsState.anomalies = loadAnomalyData();
      const filtered = filterAnomalies(analyticsState.anomalies);
      renderAnalyticsCharts(filtered);
      renderAnalyticsStats(filtered);
    } catch (err) {
      console.error('Analytics update failed', err);
    }
  }

  function renderAnalyticsControls() {
    const container = document.getElementById('analytics-controls');
    if (!container) return;

    container.innerHTML = `
      <div class="analytics-controls">
        <label>
          Time Range
          <select id="analytics-range">
            <option value="24h">Last 24h</option>
            <option value="7d" selected>Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </label>
        <label>
          Pattern Type
          <select id="analytics-type">
            <option value="all">All types</option>
            <option value="incremental">Incremental</option>
            <option value="exponential">Exponential</option>
            <option value="clockwork">Clockwork</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Severity
          <select id="analytics-severity">
            <option value="all">All severities</option>
            <option value="1">1 - Minor</option>
            <option value="2">2 - Moderate</option>
            <option value="3">3 - Significant</option>
            <option value="4">4 - Major</option>
            <option value="5">5 - Critical</option>
          </select>
        </label>
        <button id="analytics-refresh" class="pill-btn">Refresh</button>
      </div>
    `;

    const range = container.querySelector('#analytics-range');
    const type = container.querySelector('#analytics-type');
    const severity = container.querySelector('#analytics-severity');
    const refresh = container.querySelector('#analytics-refresh');

    [range, type, severity].forEach(el => {
      if (!el) return;
      el.addEventListener('change', () => {
        analyticsState.filters.timeRange = range.value;
        analyticsState.filters.patternType = type.value;
        analyticsState.filters.severity = severity.value;
        updateAnalytics();
      });
    });

    if (refresh) {
      refresh.addEventListener('click', () => updateAnalytics());
    }
  }

  function renderAnalyticsCharts(anomalies = []) {
    const container = document.getElementById('analytics-container');
    if (!container) return;

    container.innerHTML = `
      <div class="charts-grid">
        <canvas id="chart-submissions" height="200"></canvas>
        <canvas id="chart-pattern-types" height="200"></canvas>
        <canvas id="chart-severity" height="200"></canvas>
        <canvas id="chart-hourly" height="200"></canvas>
      </div>
    `;

    destroyCharts();

    const chartLibAvailable = typeof Chart !== 'undefined';
    const dataBundles = buildChartData(anomalies);

    if (chartLibAvailable) {
      analyticsState.charts.submissions = new Chart(
        document.getElementById('chart-submissions').getContext('2d'),
        {
          type: 'line',
          data: {
            labels: dataBundles.submission.labels,
            datasets: [
              {
                label: 'Submissions',
                data: dataBundles.submission.values,
                borderColor: COLORS.cyan,
                backgroundColor: 'rgba(77, 214, 255, 0.12)',
                tension: 0.35,
                fill: true
              }
            ]
          },
          options: baseChartOptions('Submission cadence')
        }
      );

      analyticsState.charts.patterns = new Chart(
        document.getElementById('chart-pattern-types').getContext('2d'),
        {
          type: 'doughnut',
          data: {
            labels: dataBundles.types.labels,
            datasets: [
              {
                data: dataBundles.types.values,
                backgroundColor: [COLORS.cyan, COLORS.magenta, COLORS.purple, '#24314a']
              }
            ]
          },
          options: { plugins: { legend: { labels: { color: '#e7ecf9' } } } }
        }
      );

      analyticsState.charts.severity = new Chart(
        document.getElementById('chart-severity').getContext('2d'),
        {
          type: 'bar',
          data: {
            labels: dataBundles.severity.labels,
            datasets: [
              {
                label: 'Severity',
                data: dataBundles.severity.values,
                backgroundColor: COLORS.magenta,
                borderRadius: 6
              }
            ]
          },
          options: {
            scales: {
              x: { ticks: { color: '#e7ecf9' }, grid: { color: 'rgba(255,255,255,0.08)' } },
              y: { ticks: { color: '#e7ecf9' }, grid: { color: 'rgba(255,255,255,0.08)' } }
            },
            plugins: { legend: { labels: { color: '#e7ecf9' } } }
          }
        }
      );

      analyticsState.charts.hourly = new Chart(
        document.getElementById('chart-hourly').getContext('2d'),
        {
          type: 'line',
          data: {
            labels: dataBundles.hourly.labels,
            datasets: [
              {
                label: 'Hourly submissions',
                data: dataBundles.hourly.values,
                borderColor: COLORS.purple,
                backgroundColor: 'rgba(124, 108, 255, 0.18)',
                fill: true,
                tension: 0.25
              }
            ]
          },
          options: baseChartOptions('Hourly rhythm')
        }
      );
    } else {
      // Minimal fallback rendering without Chart.js
      simpleBarChart('chart-submissions', dataBundles.submission.labels, dataBundles.submission.values, COLORS.cyan);
      simpleBarChart('chart-pattern-types', dataBundles.types.labels, dataBundles.types.values, COLORS.magenta);
      simpleBarChart('chart-severity', dataBundles.severity.labels, dataBundles.severity.values, COLORS.magenta);
      simpleBarChart('chart-hourly', dataBundles.hourly.labels, dataBundles.hourly.values, COLORS.purple);
    }
  }

  function renderAnalyticsStats(anomalies = []) {
    const container = document.getElementById('analytics-stats');
    if (!container) return;

    const total = anomalies.length;
    const avgSeverity = total === 0
      ? 0
      : anomalies.reduce((sum, a) => sum + Number(a.severity || 0), 0) / total;

    const mostCommonType = getTopType(anomalies);
    const velocity = calculateVelocity(anomalies);
    const engagement = calculateEngagement(anomalies);

    container.innerHTML = `
      <div class="analytics-stats-grid">
        <div class="stat-card">
          <h4>Total submissions</h4>
          <p class="stat-value">${total}</p>
          <p class="stat-note">Filtered view</p>
        </div>
        <div class="stat-card">
          <h4>Average severity</h4>
          <p class="stat-value">${avgSeverity.toFixed(2)}</p>
          <p class="stat-note">Scale 1-5</p>
        </div>
        <div class="stat-card">
          <h4>Most common pattern</h4>
          <p class="stat-value">${mostCommonType || 'N/A'}</p>
          <p class="stat-note">Dominant archetype</p>
        </div>
        <div class="stat-card">
          <h4>Submission velocity</h4>
          <p class="stat-value">${velocity.toFixed(2)} / day</p>
          <p class="stat-note">Cadence across range</p>
        </div>
        <div class="stat-card">
          <h4>Engagement depth</h4>
          <p class="stat-value">${engagement.depth.toFixed(1)}%</p>
          <p class="stat-note">${engagement.note}</p>
        </div>
      </div>
    `;
  }

  // Helpers
  function loadAnomalyData() {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) return JSON.parse(stored);
    } catch (err) {
      console.warn('localStorage unavailable, using fallback data', err);
    }
    // Fallback data for empty archives
    const now = Date.now();
    return [
      { title: 'Deploy 450 wobble', type: 'clockwork', severity: 4, timestamp: new Date(now - 2 * 3600 * 1000).toISOString(), description: 'Clock missed expected beat at 450.', source: 'fallback' },
      { title: 'Momentum slip', type: 'exponential', severity: 3, timestamp: new Date(now - 20 * 3600 * 1000).toISOString(), description: 'Acceleration curve bent for 45 seconds.', source: 'fallback' },
      { title: 'Battle freeze recovery', type: 'incremental', severity: 2, timestamp: new Date(now - 3 * 24 * 3600 * 1000).toISOString(), description: 'Incremental grind paused then resumed.', source: 'fallback' },
      { title: 'Unclassified drift', type: 'other', severity: 1, timestamp: new Date(now - 6 * 24 * 3600 * 1000).toISOString(), description: 'Minor drift recorded by visitor.', source: 'fallback' }
    ];
  }

  function filterAnomalies(anomalies) {
    const { timeRange, patternType, severity } = analyticsState.filters;
    const rangeMs = getRangeMs(timeRange);
    const now = Date.now();

    return anomalies.filter(a => {
      try {
        const ts = new Date(a.timestamp || a.date || now).getTime();
        const inRange = !rangeMs || now - ts <= rangeMs;
        const typeMatch = patternType === 'all' || (a.type || '').toLowerCase() === patternType;
        const severityMatch = severity === 'all' || Number(a.severity) === Number(severity);
        return inRange && typeMatch && severityMatch;
      } catch (err) {
        console.warn('Invalid anomaly entry skipped', a, err);
        return false;
      }
    });
  }

  function buildChartData(anomalies) {
    const submissionMap = new Map();
    const typeCounts = { incremental: 0, exponential: 0, clockwork: 0, other: 0 };
    const severityCounts = [0, 0, 0, 0, 0];
    const hourly = Array(24).fill(0);

    anomalies.forEach(a => {
      const ts = new Date(a.timestamp || a.date || Date.now());
      const dayKey = ts.toISOString().slice(0, 10);
      submissionMap.set(dayKey, (submissionMap.get(dayKey) || 0) + 1);

      const type = (a.type || 'other').toLowerCase();
      if (typeCounts[type] !== undefined) typeCounts[type] += 1;
      else typeCounts.other += 1;

      const sev = Math.min(5, Math.max(1, Number(a.severity) || 0));
      if (sev >= 1) severityCounts[sev - 1] += 1;

      hourly[ts.getHours()] += 1;
    });

    const submissionLabels = Array.from(submissionMap.keys()).sort();
    const submissionValues = submissionLabels.map(key => submissionMap.get(key));

    return {
      submission: { labels: submissionLabels, values: submissionValues },
      types: { labels: Object.keys(typeCounts), values: Object.values(typeCounts) },
      severity: { labels: ['1', '2', '3', '4', '5'], values: severityCounts },
      hourly: { labels: hourly.map((_, i) => `${i}:00`), values: hourly }
    };
  }

  function baseChartOptions(title) {
    return {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e7ecf9' } },
        title: { display: true, text: title, color: '#e7ecf9', font: { size: 14 } }
      },
      scales: {
        x: { ticks: { color: '#e7ecf9' }, grid: { color: 'rgba(255,255,255,0.08)' } },
        y: { ticks: { color: '#e7ecf9' }, grid: { color: 'rgba(255,255,255,0.08)' }, beginAtZero: true }
      }
    };
  }

  function simpleBarChart(canvasId, labels, values, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width || canvas.getBoundingClientRect().width || 400;
    const h = canvas.height || canvas.getBoundingClientRect().height || 200;
    const margin = 30;
    const barWidth = (w - margin * 2) / values.length;
    const maxVal = Math.max(1, ...values);

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(margin, margin / 2);
    ctx.lineTo(margin, h - margin);
    ctx.lineTo(w - margin / 2, h - margin);
    ctx.stroke();

    // Bars
    values.forEach((v, idx) => {
      const barHeight = (v / maxVal) * (h - margin * 1.5);
      const x = margin + idx * barWidth + 8;
      const y = h - margin - barHeight;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth - 16, barHeight);
      ctx.fillStyle = '#e7ecf9';
      ctx.font = '10px sans-serif';
      ctx.fillText(labels[idx], x, h - margin / 2);
    });
  }

  function getRangeMs(range) {
    switch (range) {
      case '24h': return 24 * 3600 * 1000;
      case '7d': return 7 * 24 * 3600 * 1000;
      case '30d': return 30 * 24 * 3600 * 1000;
      default: return 0; // all time
    }
  }

  function getTopType(anomalies) {
    const counts = anomalies.reduce((acc, a) => {
      const key = (a.type || 'other').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    let top = null;
    let max = 0;
    Object.entries(counts).forEach(([type, count]) => {
      if (count > max) {
        top = type;
        max = count;
      }
    });
    return top;
  }

  function calculateVelocity(anomalies) {
    if (!anomalies.length) return 0;
    const timestamps = anomalies
      .map(a => new Date(a.timestamp || a.date || Date.now()).getTime())
      .filter(Boolean)
      .sort((a, b) => a - b);
    const spanMs = Math.max(24 * 3600 * 1000, timestamps[timestamps.length - 1] - timestamps[0]);
    return anomalies.length / (spanMs / (24 * 3600 * 1000));
  }

  function calculateEngagement(anomalies) {
    if (!anomalies.length) return { depth: 0, note: 'Awaiting submissions' };
    const longEntries = anomalies.filter(a => (a.description || '').length > 120).length;
    const ratio = (longEntries / anomalies.length) * 100;
    return {
      depth: ratio,
      note: `${longEntries} detailed writeups`
    };
  }

  function destroyCharts() {
    Object.values(analyticsState.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    analyticsState.charts = {};
  }

  function safeSetContent(id, html) {
    const node = document.getElementById(id);
    if (node) node.innerHTML = html;
  }

  // Expose functions globally for the rest of the app
  global.initAnalyticsDashboard = initAnalyticsDashboard;
  global.renderAnalyticsCharts = renderAnalyticsCharts;
  global.renderAnalyticsControls = renderAnalyticsControls;
  global.renderAnalyticsStats = renderAnalyticsStats;
  global.updateAnalytics = updateAnalytics;

  // Auto-init when the analytics section is present
  document.addEventListener('DOMContentLoaded', () => {
    const hasAnalyticsSection = document.getElementById('analytics-dashboard');
    if (hasAnalyticsSection) initAnalyticsDashboard();
  });
})(window);
