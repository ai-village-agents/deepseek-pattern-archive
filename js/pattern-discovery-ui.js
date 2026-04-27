// The Pattern Archive - Pattern Discovery UI Controller
// Bridges between PatternDiscovery module and DOM interface
(function () {
  const uiState = {
    isLoading: false,
    lastAnalysis: null,
    currentPatterns: [],
    currentCorrelations: [],
    currentMetrics: null
  };
  
  // ======== DOM ELEMENTS ========
  let el = {};
  
  function initDiscoveryUI() {
    // Cache DOM elements
    el = {
      controlsContainer: document.querySelector('.discovery-controls-container'),
      patternsContainer: document.querySelector('.discovery-patterns-container'),
      correlationsContainer: document.querySelector('.discovery-correlations-container'),
      metricsContainer: document.querySelector('.discovery-metrics-container'),
      runAnalysisBtn: document.getElementById('run-discovery-analysis'),
      clearCacheBtn: document.getElementById('clear-discovery-cache'),
      exportResultsBtn: document.getElementById('export-discovery-results')
    };
    
    if (!el.controlsContainer) {
      console.warn('Pattern discovery UI elements not found');
      return;
    }
    
    // Bind event listeners
    if (el.runAnalysisBtn) {
      el.runAnalysisBtn.addEventListener('click', runAnalysis);
    }
    if (el.clearCacheBtn) {
      el.clearCacheBtn.addEventListener('click', clearDiscoveryCache);
    }
    if (el.exportResultsBtn) {
      el.exportResultsBtn.addEventListener('click', exportDiscoveryResults);
    }
    
    // Initial render
    renderLoading();
    renderControls();
    
    // Check for existing analysis on page load
    setTimeout(checkExistingAnalysis, 100);
  }
  
  // ======== UI RENDERING ========
  
  function renderLoading() {
    if (el.controlsContainer) {
      el.controlsContainer.innerHTML = `
        <div class="discovery-loading">
          <div class="discovery-loading-spinner"></div>
          <p>Initializing pattern discovery engine...</p>
        </div>
      `;
    }
  }
  
  function renderControls() {
    if (!el.controlsContainer) return;
    
    el.controlsContainer.innerHTML = `
      <div class="discovery-controls-grid">
        <div class="control-group">
          <label for="discovery-sensitivity">Detection Sensitivity</label>
          <select id="discovery-sensitivity" class="discovery-select">
            <option value="low">Low (Conservative)</option>
            <option value="medium" selected>Medium (Balanced)</option>
            <option value="high">High (Aggressive)</option>
          </select>
        </div>
        
        <div class="control-group">
          <label for="discovery-timeline">Time Window</label>
          <select id="discovery-timeline" class="discovery-select">
            <option value="7d">Last 7 Days</option>
            <option value="30d" selected>Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
        
        <div class="control-group">
          <label for="discovery-min-confidence">Minimum Confidence</label>
          <input type="range" id="discovery-min-confidence" min="50" max="95" value="65" step="5">
          <span id="confidence-display">65%</span>
        </div>
        
        <div class="control-hint">
          <p><strong>Detection Focus:</strong> Temporal clustering + archetype pattern matching</p>
          <p><small>Analyzes submission frequency, severity trends, and temporal clustering to identify emergent patterns.</small></p>
        </div>
      </div>
    `;
    
    // Bind control listeners
    const confidenceSlider = document.getElementById('discovery-min-confidence');
    const confidenceDisplay = document.getElementById('confidence-display');
    if (confidenceSlider && confidenceDisplay) {
      confidenceSlider.addEventListener('input', function() {
        confidenceDisplay.textContent = this.value + '%';
      });
    }
  }
  
  function renderPatterns(patterns = []) {
    if (!el.patternsContainer) return;
    
    if (!patterns.length) {
      el.patternsContainer.innerHTML = `
        <div class="discovery-loading">
          <p>No patterns detected yet. Run analysis to discover temporal archetypes.</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    
    patterns.forEach(pattern => {
      const confidenceClass = pattern.confidence >= 0.8 ? 'high' : 
                            pattern.confidence >= 0.65 ? 'medium' : 'low';
      const confidencePercent = Math.round(pattern.confidence * 100);
      const patternType = pattern.patternType || 'undetermined';
      
      html += `
        <div class="pattern-item ${patternType}">
          <div class="pattern-header">
            <div class="pattern-title">${patternType.toUpperCase()} Pattern</div>
            <div class="pattern-confidence ${confidenceClass}">${confidencePercent}% confidence</div>
          </div>
          
          <div class="pattern-description">
            <p>${generatePatternDescription(pattern)}</p>
            ${pattern.reasoning && pattern.reasoning.length ? `
              <div class="pattern-reasoning">
                <strong>Reasoning:</strong> ${pattern.reasoning.join('; ')}
              </div>
            ` : ''}
          </div>
          
          <div class="pattern-metrics">
            <div class="metric-item">
              <div class="metric-label">Anomalies</div>
              <div class="metric-value">${pattern.metrics?.anomalyCount || 0}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Duration</div>
              <div class="metric-value">${pattern.metrics?.durationHours || 0}h</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Avg Severity</div>
              <div class="metric-value">${pattern.metrics?.avgSeverity?.toFixed(1) || '0.0'}</div>
            </div>
          </div>
        </div>
      `;
    });
    
    el.patternsContainer.innerHTML = html;
  }
  
  function generatePatternDescription(pattern) {
    const { patternType, metrics } = pattern;
    
    switch (patternType) {
      case 'incremental':
        return `Gradual accumulation detected: ${metrics.anomalyCount} anomalies over ${metrics.durationHours}h suggests sustained incremental activity.`;
      case 'exponential':
        return `Accelerating frequency: ${metrics.anomalyCount} anomalies showing increasing submission rate (${metrics.anomalyDensity}/h average).`;
      case 'clockwork':
        return `Regular temporal pattern: ${metrics.anomalyCount} anomalies with consistent intervals over ${metrics.durationHours}h period.`;
      default:
        return `Emergent pattern detected: ${metrics.anomalyCount} anomalies analyzed, pattern classification in progress.`;
    }
  }
  
  function renderCorrelations(correlations = [], patterns = []) {
    if (!el.correlationsContainer) return;
    
    if (!correlations.length) {
      el.correlationsContainer.innerHTML = `
        <div class="discovery-loading">
          <p>No significant correlations detected yet. Run analysis with more data.</p>
        </div>
      `;
      return;
    }
    
    // Sort by correlation strength
    const sortedCorrelations = [...correlations].sort((a, b) => b.correlation - a.correlation);
    
    let html = '';
    
    sortedCorrelations.slice(0, 5).forEach(corr => {
      const correlationPercent = Math.round(corr.correlation * 100);
      const barWidth = Math.min(correlationPercent, 100);
      
      html += `
        <div class="correlation-item">
          <div class="correlation-header">
            <strong>Pattern Correlation</strong>
            <span style="color: #4dd6ff; font-weight: 600;">${correlationPercent}% match</span>
          </div>
          
          <div class="correlation-strength">
            <div class="correlation-strength-bar" style="width: ${barWidth}%"></div>
          </div>
          
          <div class="correlation-details">
            <p><strong>Relationship:</strong> ${corr.interpretation || 'Moderately correlated'}</p>
            <p><small>Factors: Time proximity ${Math.round(corr.factors?.timeProximity * 100) || 0}%, Type match ${Math.round(corr.factors?.typeMatch * 100) || 0}%</small></p>
          </div>
        </div>
      `;
    });
    
    el.correlationsContainer.innerHTML = html;
  }
  
  function renderMetrics(metrics = {}) {
    if (!el.metricsContainer) return;
    
    const defaultMetrics = {
      anomaliesProcessed: 0,
      patternsDetected: 0,
      clustersFound: 0,
      lastAnalysis: 'Never',
      patternTypes: []
    };
    
    const m = { ...defaultMetrics, ...metrics };
    
    el.metricsContainer.innerHTML = `
      <div class="tech-metric">
        <div class="tech-metric-value">${m.anomaliesProcessed}</div>
        <div class="tech-metric-label">Anomalies Analyzed</div>
      </div>
      
      <div class="tech-metric">
        <div class="tech-metric-value">${m.patternsDetected}</div>
        <div class="tech-metric-label">Patterns Detected</div>
      </div>
      
      <div class="tech-metric">
        <div class="tech-metric-value">${m.clustersFound}</div>
        <div class="tech-metric-label">Clusters Found</div>
      </div>
      
      <div class="tech-metric">
        <div class="tech-metric-value">${m.patternTypes.length}</div>
        <div class="tech-metric-label">Pattern Types</div>
      </div>
      
      <div class="tech-metric">
        <div class="tech-metric-value" style="font-size: 1.4rem;">${formatDate(m.lastAnalysis)}</div>
        <div class="tech-metric-label">Last Analysis</div>
      </div>
      
      <div class="tech-metric">
        <div class="tech-metric-value">${m.patternTypes.join(', ') || 'None'}</div>
        <div class="tech-metric-label">Active Types</div>
      </div>
    `;
  }
  
  function formatDate(dateStr) {
    if (!dateStr || dateStr === 'Never') return 'Never';
    
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (err) {
      return 'Invalid';
    }
  }
  
  // ======== BUSINESS LOGIC ========
  
  async function runAnalysis() {
    if (!el.runAnalysisBtn) return;
    
    uiState.isLoading = true;
    el.runAnalysisBtn.disabled = true;
    el.runAnalysisBtn.textContent = 'Analyzing...';
    
    // Show loading in all containers
    if (el.patternsContainer) {
      el.patternsContainer.innerHTML = `
        <div class="discovery-loading">
          <div class="discovery-loading-spinner"></div>
          <p>Analyzing temporal patterns...</p>
        </div>
      `;
    }
    
    try {
      // Get anomalies from localStorage
      const anomaliesRaw = localStorage.getItem('pattern-archive-anomalies') || '[]';
      const anomalies = JSON.parse(anomaliesRaw);
      
      if (!anomalies.length) {
        throw new Error('No anomaly data available for analysis');
      }
      
      // Get control values
      const sensitivity = document.getElementById('discovery-sensitivity')?.value || 'medium';
      const timeWindow = document.getElementById('discovery-timeline')?.value || '30d';
      
      // Filter anomalies by time window if needed
      let filteredAnomalies = anomalies;
      if (timeWindow !== 'all') {
        const now = new Date();
        const cutoffDays = timeWindow === '7d' ? 7 : 30;
        const cutoffDate = new Date(now.setDate(now.getDate() - cutoffDays));
        
        filteredAnomalies = anomalies.filter(anomaly => {
          const anomalyDate = new Date(anomaly.timestamp || anomaly.date);
          return anomalyDate >= cutoffDate;
        });
      }
      
      if (!filteredAnomalies.length) {
        throw new Error(`No anomalies found in the selected time window (${timeWindow})`);
      }
      
      // Run pattern discovery analysis
      if (typeof PatternDiscovery !== 'undefined' && typeof PatternDiscovery.analyzeAnomalies === 'function') {
        const result = PatternDiscovery.analyzeAnomalies(filteredAnomalies);
        
        uiState.currentPatterns = result.patterns || [];
        uiState.currentCorrelations = result.correlations || [];
        uiState.currentMetrics = PatternDiscovery.getDiscoveryMetrics();
        uiState.lastAnalysis = new Date().toISOString();
        
        // Update UI with results
        renderPatterns(uiState.currentPatterns);
        renderCorrelations(uiState.currentCorrelations, uiState.currentPatterns);
        renderMetrics(uiState.currentMetrics);
        
        // Show success message
        if (el.patternsContainer && result.patterns && result.patterns.length) {
          const notification = document.createElement('div');
          notification.className = 'analysis-notification';
          notification.style.cssText = `
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid rgba(76, 175, 80, 0.4);
            border-radius: 6px;
            padding: 10px 15px;
            margin-top: 15px;
            color: #4caf50;
            font-size: 0.9rem;
          `;
          notification.innerHTML = `
            <strong>✓ Analysis Complete:</strong> Detected ${result.patterns.length} pattern(s) from ${filteredAnomalies.length} anomalies.
          `;
          el.patternsContainer.appendChild(notification);
        }
        
      } else {
        throw new Error('Pattern discovery engine not available');
      }
      
    } catch (error) {
      console.error('Pattern analysis failed:', error);
      
      // Show error message
      if (el.patternsContainer) {
        el.patternsContainer.innerHTML = `
          <div class="discovery-loading" style="color: #ff6b6b;">
            <p><strong>Analysis Error:</strong> ${error.message}</p>
            <p><small>Try submitting some anomalies first or adjusting time window.</small></p>
          </div>
        `;
      }
    } finally {
      uiState.isLoading = false;
      if (el.runAnalysisBtn) {
        el.runAnalysisBtn.disabled = false;
        el.runAnalysisBtn.textContent = 'Run Pattern Analysis';
      }
    }
  }
  
  function clearDiscoveryCache() {
    if (!confirm('Clear pattern discovery cache? This will remove all stored pattern analysis data.')) {
      return;
    }
    
    // Clear pattern discovery state
    localStorage.removeItem('pattern-archive-discovery-state');
    
    // Reset UI state
    uiState.currentPatterns = [];
    uiState.currentCorrelations = [];
    uiState.currentMetrics = null;
    
    // Reset UI displays
    renderPatterns([]);
    renderCorrelations([]);
    renderMetrics({});
    
    // Show confirmation
    alert('Pattern discovery cache cleared successfully.');
  }
  
  function exportDiscoveryResults() {
    if (!uiState.currentPatterns.length) {
      alert('No analysis results to export. Run analysis first.');
      return;
    }
    
    const exportData = {
      patterns: uiState.currentPatterns,
      correlations: uiState.currentCorrelations,
      metrics: uiState.currentMetrics,
      exportDate: new Date().toISOString(),
      source: 'The Pattern Archive - Pattern Discovery Module'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', `pattern-discovery-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(exportLink);
    exportLink.click();
    document.body.removeChild(exportLink);
    
    alert('Pattern discovery results exported successfully.');
  }
  
  function checkExistingAnalysis() {
    try {
      if (typeof PatternDiscovery !== 'undefined' && typeof PatternDiscovery.getDiscoveryMetrics === 'function') {
        const metrics = PatternDiscovery.getDiscoveryMetrics();
        if (metrics.patternsDetected > 0) {
          uiState.currentMetrics = metrics;
          renderMetrics(metrics);
          
          // Load existing patterns if available
          if (typeof PatternDiscovery.getCurrentPatterns === 'function') {
            const existingPatterns = PatternDiscovery.getCurrentPatterns();
            if (existingPatterns.length) {
              uiState.currentPatterns = existingPatterns;
              renderPatterns(existingPatterns);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Could not check for existing analysis:', error);
    }
  }
  
  // ======== INITIALIZATION ========
  
  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiscoveryUI);
  } else {
    setTimeout(initDiscoveryUI, 100);
  }
  
  // Export for manual initialization
  window.PatternDiscoveryUI = {
    init: initDiscoveryUI,
    runAnalysis,
    clearDiscoveryCache,
    exportDiscoveryResults,
    getState: () => ({ ...uiState })
  };
})();
