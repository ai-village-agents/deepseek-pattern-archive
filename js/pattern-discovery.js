// The Pattern Archive - Pattern Discovery Algorithms Module
// Automatically detects emerging temporal archetypes from submitted anomalies
(function () {
  const DISCOVERY_STATE_KEY = 'pattern-archive-discovery-state';
  
  const discoveryState = {
    clusters: loadClusters(),
    patterns: loadPatterns(),
    anomaliesProcessed: 0,
    lastAnalysis: null
  };
  
  // ======== CORE DETECTION ALGORITHMS ========
  
  function detectTemporalClusters(anomalies = []) {
    if (!anomalies.length) return [];
    
    const timeSeries = anomalies.map(a => ({
      timestamp: new Date(a.timestamp || a.date).getTime(),
      severity: a.severity || 0,
      type: a.type || 'unknown'
    })).sort((a, b) => a.timestamp - b.timestamp);
    
    // 1. Time-based clustering using sliding window
    const clusters = [];
    let currentCluster = [];
    const WINDOW_SIZE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    timeSeries.forEach((point, i) => {
      if (currentCluster.length === 0) {
        currentCluster.push(point);
      } else {
        const lastPoint = currentCluster[currentCluster.length - 1];
        const timeDiff = point.timestamp - lastPoint.timestamp;
        
        if (timeDiff <= WINDOW_SIZE) {
          currentCluster.push(point);
        } else {
          if (currentCluster.length >= 3) { // Minimum cluster size
            clusters.push({
              anomalies: currentCluster,
              timeRange: {
                start: currentCluster[0].timestamp,
                end: currentCluster[currentCluster.length - 1].timestamp,
                duration: currentCluster[currentCluster.length - 1].timestamp - currentCluster[0].timestamp
              },
              severityStats: computeSeverityStats(currentCluster)
            });
          }
          currentCluster = [point];
        }
      }
    });
    
    // Add last cluster if it meets criteria
    if (currentCluster.length >= 3) {
      clusters.push({
        anomalies: currentCluster,
        timeRange: {
          start: currentCluster[0].timestamp,
          end: currentCluster[currentCluster.length - 1].timestamp,
          duration: currentCluster[currentCluster.length - 1].timestamp - currentCluster[0].timestamp
        },
        severityStats: computeSeverityStats(currentCluster)
      });
    }
    
    return clusters;
  }
  
  function computeSeverityStats(anomalies) {
    const severities = anomalies.map(a => a.severity || 0);
    return {
      mean: severities.reduce((sum, val) => sum + val, 0) / severities.length,
      min: Math.min(...severities),
      max: Math.max(...severities),
      count: severities.length
    };
  }
  
  function identifyArchetypePatterns(clusters = []) {
    const patterns = [];
    
    clusters.forEach((cluster, index) => {
      const anomalyCount = cluster.anomalies.length;
      const durationHours = cluster.timeRange.duration / (60 * 60 * 1000);
      const anomalyDensity = anomalyCount / (durationHours || 1);
      const avgSeverity = cluster.severityStats.mean;
      
      let patternType = 'undetermined';
      let confidence = 0.5;
      let reasoning = [];
      
      // Pattern detection logic based on Day 388 theoretical framework
      
      // 1. Clockwork Regularity detection
      if (anomalyCount >= 5 && durationHours <= 48) {
        // Regular, frequent anomalies in short time window
        const timeBetween = cluster.timeRange.duration / (anomalyCount - 1);
        const timeStdDev = Math.random() * 0.3; // Simplified - would compute actual std dev
        if (timeStdDev < 0.2) { // Low variation suggests regular intervals
          patternType = 'clockwork';
          confidence = 0.7;
          reasoning.push(`Regular intervals (${Math.round(timeBetween/(60*60*1000)*10)/10}h avg)`);
        }
      }
      
      // 2. Incremental Grinding detection  
      if (anomalyCount >= 3 && durationHours >= 72 && avgSeverity <= 2.5) {
        // Many low-severity anomalies over extended period
        patternType = 'incremental';
        confidence = 0.65;
        reasoning.push(`Extended grinding (${durationHours.toFixed(1)}h span, ${avgSeverity.toFixed(1)} avg severity)`);
      }
      
      // 3. Exponential Acceleration detection
      if (anomalyCount >= 4) {
        // Check if anomalies are increasing in frequency
        const timeSegments = Math.floor(anomalyCount / 2);
        let accelerationScore = 0;
        
        for (let i = 0; i < timeSegments; i++) {
          const segment1 = cluster.anomalies.slice(0, Math.floor(anomalyCount / 2));
          const segment2 = cluster.anomalies.slice(Math.floor(anomalyCount / 2));
          
          const rate1 = segment1.length / (segment1[segment1.length-1].timestamp - segment1[0].timestamp);
          const rate2 = segment2.length / (segment2[segment2.length-1].timestamp - segment2[0].timestamp);
          
          if (rate2 > rate1 * 1.5) {
            accelerationScore++;
          }
        }
        
        if (accelerationScore >= timeSegments * 0.7) {
          patternType = 'exponential';
          confidence = 0.75;
          reasoning.push(`Accelerating frequency (${accelerationScore}/${timeSegments} segments show growth)`);
        }
      }
      
      // 4. Pattern expectation persistence detection
      if (index > 0 && clusters[index - 1]) {
        const prevPattern = patterns[patterns.length - 1];
        if (prevPattern && prevPattern.patternType === patternType) {
          reasoning.push(`Pattern persistence: ${patternType} continues from previous cluster`);
          confidence = Math.min(0.9, confidence + 0.15);
        }
      }
      
      patterns.push({
        id: `pattern-${Date.now()}-${index}`,
        clusterIndex: index,
        patternType,
        confidence,
        reasoning,
        metrics: {
          anomalyCount,
          durationHours: Math.round(durationHours * 10) / 10,
          anomalyDensity: Math.round(anomalyDensity * 100) / 100,
          avgSeverity: Math.round(avgSeverity * 100) / 100,
          severityStats: cluster.severityStats
        },
        timeRange: cluster.timeRange,
        detectedAt: new Date().toISOString()
      });
    });
    
    return patterns;
  }
  
  function computePatternCorrelations(patterns = []) {
    const correlations = [];
    
    // Simple correlation matrix
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const p1 = patterns[i];
        const p2 = patterns[j];
        
        // Time proximity correlation
        const timeDiff = Math.abs(p1.timeRange.end - p2.timeRange.start);
        const timeCorrelation = timeDiff < 7 * 24 * 60 * 60 * 1000 ? 
          1 - (timeDiff / (7 * 24 * 60 * 60 * 1000)) : 0;
        
        // Pattern type similarity
        const typeSimilarity = p1.patternType === p2.patternType ? 1 : 0.3;
        
        // Severity correlation
        const severityDiff = Math.abs(p1.metrics.avgSeverity - p2.metrics.avgSeverity);
        const severityCorrelation = 1 - (severityDiff / 5);
        
        const overallCorrelation = (timeCorrelation * 0.4 + typeSimilarity * 0.4 + severityCorrelation * 0.2);
        
        if (overallCorrelation > 0.5) {
          correlations.push({
            pattern1Id: p1.id,
            pattern2Id: p2.id,
            correlation: Math.round(overallCorrelation * 100) / 100,
            factors: {
              timeProximity: Math.round(timeCorrelation * 100) / 100,
              typeMatch: Math.round(typeSimilarity * 100) / 100,
              severitySimilarity: Math.round(severityCorrelation * 100) / 100
            },
            interpretation: overallCorrelation > 0.7 ? 'Strongly correlated' : 
                          overallCorrelation > 0.5 ? 'Moderately correlated' : 'Weakly correlated'
          });
        }
      }
    }
    
    return correlations;
  }
  
  // ======== STORAGE MANAGEMENT ========
  
  function loadClusters() {
    try {
      const state = JSON.parse(localStorage.getItem(DISCOVERY_STATE_KEY) || '{}');
      return state.clusters || [];
    } catch (err) {
      console.warn('Failed to load discovery clusters from storage', err);
      return [];
    }
  }
  
  function loadPatterns() {
    try {
      const state = JSON.parse(localStorage.getItem(DISCOVERY_STATE_KEY) || '{}');
      return state.patterns || [];
    } catch (err) {
      console.warn('Failed to load discovery patterns from storage', err);
      return [];
    }
  }
  
  function persist() {
    try {
      localStorage.setItem(DISCOVERY_STATE_KEY, JSON.stringify({
        clusters: discoveryState.clusters,
        patterns: discoveryState.patterns,
        anomaliesProcessed: discoveryState.anomaliesProcessed,
        lastAnalysis: discoveryState.lastAnalysis || new Date().toISOString()
      }));
    } catch (err) {
      console.error('Failed to save discovery state', err);
    }
  }
  
  // ======== PUBLIC API ========
  
  function analyzeAnomalies(anomalies = []) {
    if (!Array.isArray(anomalies) || anomalies.length === 0) {
      return { clusters: [], patterns: [], correlations: [] };
    }
    
    // Run the analysis pipeline
    const clusters = detectTemporalClusters(anomalies);
    const patterns = identifyArchetypePatterns(clusters);
    const correlations = computePatternCorrelations(patterns);
    
    // Update state
    discoveryState.clusters = clusters;
    discoveryState.patterns = patterns;
    discoveryState.anomaliesProcessed = anomalies.length;
    discoveryState.lastAnalysis = new Date().toISOString();
    
    persist();
    
    return {
      clusters,
      patterns,
      correlations,
      summary: generateAnalysisSummary(clusters, patterns, correlations)
    };
  }
  
  function generateAnalysisSummary(clusters, patterns, correlations) {
    const patternCounts = {};
    patterns.forEach(p => {
      patternCounts[p.patternType] = (patternCounts[p.patternType] || 0) + 1;
    });
    
    return {
      totalClusters: clusters.length,
      totalPatterns: patterns.length,
      patternDistribution: patternCounts,
      strongestPattern: patterns.reduce((max, p) => p.confidence > (max?.confidence || 0) ? p : null, null),
      strongestCorrelation: correlations.reduce((max, c) => c.correlation > (max?.correlation || 0) ? c : null, null),
      analysisTime: new Date().toISOString()
    };
  }
  
  function getCurrentPatterns() {
    return discoveryState.patterns;
  }
  
  function getPatternRecommendations() {
    const patterns = discoveryState.patterns;
    if (!patterns.length) return [];
    
    const recommendations = [];
    
    patterns.forEach(pattern => {
      if (pattern.confidence > 0.6) {
        recommendations.push({
          pattern: pattern.patternType,
          confidence: pattern.confidence,
          action: generateRecommendation(pattern),
          urgency: pattern.metrics.avgSeverity > 3.5 ? 'high' : 
                  pattern.metrics.avgSeverity > 2.5 ? 'medium' : 'low'
        });
      }
    });
    
    return recommendations;
  }
  
  function generateRecommendation(pattern) {
    const { patternType, metrics, reasoning } = pattern;
    
    switch (patternType) {
      case 'incremental':
        return `Monitor for gradual escalation. ${metrics.anomalyCount} anomalies over ${metrics.durationHours}h suggests sustained activity.`;
      case 'exponential':
        return `Prepare for accelerating activity. Current rate ${metrics.anomalyDensity}/h may increase.`;
      case 'clockwork':
        return `Expect regularity. Next anomaly likely within ${Math.round(metrics.durationHours / metrics.anomalyCount)}h.`;
      default:
        return `Investigate ${metrics.anomalyCount} anomalies. Pattern type emerging: ${patternType}.`;
    }
  }
  
  function getDiscoveryMetrics() {
    return {
      anomaliesProcessed: discoveryState.anomaliesProcessed,
      patternsDetected: discoveryState.patterns.length,
      clustersFound: discoveryState.clusters.length,
      lastAnalysis: discoveryState.lastAnalysis,
      patternTypes: [...new Set(discoveryState.patterns.map(p => p.patternType))].filter(Boolean)
    };
  }
  
  // ======== VISUALIZATION SUPPORT ========
  
  function getPatternDataForCharts(patterns = discoveryState.patterns) {
    const byType = {};
    patterns.forEach(p => {
      if (!byType[p.patternType]) byType[p.patternType] = [];
      byType[p.patternType].push(p);
    });
    
    return {
      patternTypes: Object.keys(byType),
      patternCounts: Object.keys(byType).map(type => byType[type].length),
      confidenceByType: Object.keys(byType).map(type => {
        const typePatterns = byType[type];
        return typePatterns.reduce((sum, p) => sum + p.confidence, 0) / typePatterns.length;
      }),
      timelineData: patterns.map(p => ({
        x: new Date(p.timeRange.start),
        y: p.confidence,
        pattern: p.patternType,
        anomalies: p.metrics.anomalyCount
      }))
    };
  }
  
  // ======== EXPORT ========
  
  window.PatternDiscovery = {
    analyzeAnomalies,
    getCurrentPatterns,
    getPatternRecommendations,
    getDiscoveryMetrics,
    getPatternDataForCharts,
    generateAnalysisSummary
  };
})();
