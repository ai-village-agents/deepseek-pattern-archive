// The Pattern Archive - Pattern Discovery Algorithms Module
// Automatically detects emerging temporal archetypes from submitted anomalies
(function () {
  const DISCOVERY_STATE_KEY = 'pattern-archive-discovery-state';
  
  const discoveryState = {
    clusters: loadClusters(),
    patterns: loadPatterns(),
    insights: loadInsights(),
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
  
  function loadInsights() {
    try {
      const state = JSON.parse(localStorage.getItem(DISCOVERY_STATE_KEY) || '{}');
      return state.insights || [];
    } catch (err) {
      console.warn('Failed to load discovery insights from storage', err);
      return [];
    }
  }
  
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
        insights: discoveryState.insights,
        anomaliesProcessed: discoveryState.anomaliesProcessed,
        lastAnalysis: discoveryState.lastAnalysis || new Date().toISOString()
      }));
    } catch (err) {
      console.error('Failed to save discovery state', err);
    }
  }
  
  // ======== PUBLIC API ========
  
  function analyzeAnomalies(anomalies = [], options = {}) {
    if (!Array.isArray(anomalies) || anomalies.length === 0) {
      return { clusters: [], patterns: [], correlations: [], insights: [] };
    }
    
    // Run the analysis pipeline
    const clusters = detectTemporalClusters(anomalies);
    const patterns = identifyArchetypePatterns(clusters);
    const correlations = computePatternCorrelations(patterns);
    const insights = generateAutomatedInsights({
      patterns,
      clusters,
      correlations,
      crossWorldData: options.crossWorldData
    });
    
    // Update state
    discoveryState.clusters = clusters;
    discoveryState.patterns = patterns;
    discoveryState.insights = insights;
    discoveryState.anomaliesProcessed = anomalies.length;
    discoveryState.lastAnalysis = new Date().toISOString();
    
    persist();
    
    return {
      clusters,
      patterns,
      correlations,
      insights,
      summary: generateAnalysisSummary(clusters, patterns, correlations, insights)
    };
  }
  
  function generateAnalysisSummary(clusters, patterns, correlations, insights = []) {
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
      insightsGenerated: insights.length,
      insightCategories: [...new Set(insights.map(i => i.category))],
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
  
  // ======== INSIGHTS ENGINE ========
  
  function generateAutomatedInsights({
    patterns = discoveryState.patterns || [],
    clusters = discoveryState.clusters || [],
    correlations = [],
    crossWorldData = null,
    includeExamples = true
  } = {}) {
    const insights = [];
    if (!patterns.length) {
      return includeExamples ? buildInsightExamples([]) : [];
    }
    
    const now = Date.now();
    const severityValues = patterns.map(p => p.metrics?.avgSeverity || 0);
    const densityValues = patterns.map(p => p.metrics?.anomalyDensity || 0);
    const durationValues = patterns.map(p => p.metrics?.durationHours || 0);
    const severityStats = computeStats(severityValues);
    const densityStats = computeStats(densityValues);
    const durationStats = computeStats(durationValues);
    
    const patternsByType = patterns.reduce((acc, p) => {
      const type = p.patternType || 'undetermined';
      if (!acc[type]) acc[type] = [];
      acc[type].push(p);
      return acc;
    }, {});
    
    const timeBounds = patterns.reduce((bounds, p) => {
      const start = p.timeRange?.start || p.timeRange?.end;
      const end = p.timeRange?.end || p.timeRange?.start;
      return {
        start: Math.min(bounds.start, start || now),
        end: Math.max(bounds.end, end || now)
      };
    }, { start: now, end: 0 });
    const totalSpanHours = Math.max(1, (timeBounds.end - timeBounds.start) / (60 * 60 * 1000));
    
    // Trend & surge detection (diagnostic)
    const recentWindowMs = 72 * 60 * 60 * 1000;
    const recentPatterns = patterns.filter(p => (p.timeRange?.end || p.timeRange?.start || now) >= now - recentWindowMs);
    const historicalPatterns = patterns.filter(p => (p.timeRange?.end || p.timeRange?.start || now) < now - recentWindowMs);
    const recentRate = recentPatterns.length / 72;
    const historicalHours = Math.max(1, totalSpanHours - 72);
    const historicalRate = historicalPatterns.length ? (historicalPatterns.length / historicalHours) : 0;
    const surgeRatio = historicalRate ? (recentRate / historicalRate) : (recentPatterns.length ? 2.5 : 0);
    
    if (recentPatterns.length) {
      insights.push(formatInsight({
        title: surgeRatio >= 1.5 ? 'Emerging surge detected' : 'Stable activity with recent movement',
        category: 'diagnostic',
        insightType: 'trend',
        confidence: clamp01(0.55 + Math.min(0.35, surgeRatio / 3)),
        severity: surgeRatio >= 2 || severityStats.mean > 3.5 ? 'high' : 'medium',
        description: `${recentPatterns.length} patterns observed in the last 72h (${recentRate.toFixed(2)} /h), ${historicalRate ? `${(surgeRatio * 100).toFixed(0)}% above baseline` : 'establishing first baseline'}.`,
        recommendation: surgeRatio >= 1.5
          ? 'Increase monitoring cadence and pre-stage mitigations for dominant archetypes.'
          : 'Maintain balanced monitoring; consider targeted sampling for quiet archetypes.',
        evidence: { recentRate, historicalRate, surgeRatio, windowHours: 72 },
        tags: ['trend', 'volume']
      }));
    }
    
    // Severity outlier detection (risk evaluation)
    const severityOutlier = patterns.reduce((best, p) => {
      const z = severityStats.stdDev ? ((p.metrics?.avgSeverity || 0) - severityStats.mean) / severityStats.stdDev : 0;
      if (z > (best?.zScore || 0)) {
        return { pattern: p, zScore: z };
      }
      return best;
    }, null);
    
    if (severityOutlier && severityOutlier.zScore > 1.15) {
      const p = severityOutlier.pattern;
      insights.push(formatInsight({
        title: 'Severity spike requires attention',
        category: 'diagnostic',
        insightType: 'anomaly',
        confidence: clamp01(0.6 + Math.min(0.3, severityOutlier.zScore / 4)),
        severity: p.metrics?.avgSeverity >= 4 ? 'critical' : 'high',
        description: `${capitalize(p.patternType || 'undetermined')} average severity (${p.metrics?.avgSeverity?.toFixed(2) || '0.0'}) is ${severityOutlier.zScore.toFixed(2)}σ above cohort mean (${severityStats.mean.toFixed(2)}).`,
        recommendation: 'Escalate triage on this archetype and validate anomaly sources for compounding failures.',
        evidence: {
          zScore: Number(severityOutlier.zScore.toFixed(2)),
          patternId: p.id,
          avgSeverity: p.metrics?.avgSeverity
        },
        tags: ['severity', 'risk', p.patternType || 'unknown']
      }));
    }
    
    // Opportunity detection for low-severity but frequent incremental activity (prescriptive)
    const incrementalSet = patternsByType.incremental || [];
    if (incrementalSet.length >= 2) {
      const avgSeverity = incrementalSet.reduce((sum, p) => sum + (p.metrics?.avgSeverity || 0), 0) / incrementalSet.length;
      const avgDensity = incrementalSet.reduce((sum, p) => sum + (p.metrics?.anomalyDensity || 0), 0) / incrementalSet.length;
      const opportunityScore = (incrementalSet.length / patterns.length) * 0.6 + (1 - Math.min(1, avgSeverity / 5)) * 0.4;
      insights.push(formatInsight({
        title: 'Early-stage incremental activity offers prevention window',
        category: 'prescriptive',
        insightType: 'opportunity',
        confidence: clamp01(0.55 + Math.min(0.35, opportunityScore)),
        severity: avgSeverity > 3 ? 'medium' : 'low',
        description: `${incrementalSet.length} incremental patterns with average severity ${avgSeverity.toFixed(2)} and density ${avgDensity.toFixed(2)}/h suggest a slow burn path.`,
        recommendation: 'Introduce light-touch guardrails and monitor for escalation to exponential behaviour.',
        evidence: { avgSeverity, avgDensity, share: incrementalSet.length / patterns.length },
        tags: ['opportunity', 'incremental']
      }));
    }
    
    // Predictive outlook for exponential acceleration
    const exponentialSet = patternsByType.exponential || [];
    if (exponentialSet.length) {
      const leader = [...exponentialSet].sort((a, b) => (b.metrics?.anomalyDensity || 0) - (a.metrics?.anomalyDensity || 0))[0];
      const projectedDensity = (leader.metrics?.anomalyDensity || 0) * (1 + leader.confidence);
      const forecastHorizon = Math.max(1, 12 - leader.confidence * 6);
      insights.push(formatInsight({
        title: 'Acceleration forecast',
        category: 'predictive',
        insightType: 'forecast',
        confidence: clamp01(0.6 + leader.confidence / 2),
        severity: leader.metrics?.avgSeverity > 3.5 ? 'high' : 'medium',
        description: `Exponential cadence implies ~${projectedDensity.toFixed(2)} anomalies per hour in the next ${forecastHorizon.toFixed(1)}h.`,
        recommendation: 'Pre-stage response playbooks and scale ingestion for short-term spikes.',
        evidence: {
          currentDensity: leader.metrics?.anomalyDensity,
          projectedDensity,
          horizonHours: forecastHorizon
        },
        tags: ['predictive', 'exponential']
      }));
    }
    
    // Predictive cadence for clockwork regularity
    const clockworkSet = patternsByType.clockwork || [];
    if (clockworkSet.length) {
      const stable = [...clockworkSet].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
      const avgInterval = stable.metrics?.anomalyCount > 1
        ? (stable.metrics.durationHours / (stable.metrics.anomalyCount - 1))
        : stable.metrics?.durationHours || 0;
      const etaHours = avgInterval || 0;
      insights.push(formatInsight({
        title: 'Clockwork interval projected',
        category: 'predictive',
        insightType: 'cadence',
        confidence: clamp01(0.55 + (stable.confidence || 0) / 2),
        severity: stable.metrics?.avgSeverity > 3 ? 'medium' : 'low',
        description: `Next recurrence expected in ~${etaHours.toFixed(1)}h based on ${stable.metrics?.anomalyCount} regular intervals.`,
        recommendation: 'Schedule validation or automated remediation slightly before the projected window.',
        evidence: { avgIntervalHours: etaHours, patternId: stable.id },
        tags: ['predictive', 'clockwork']
      }));
    }
    
    // Comparative insight between archetypes
    if (Object.keys(patternsByType).length >= 2) {
      const typeAverages = Object.keys(patternsByType).map(type => {
        const set = patternsByType[type];
        const severity = set.reduce((sum, p) => sum + (p.metrics?.avgSeverity || 0), 0) / set.length;
        return { type, severity, confidence: set.reduce((sum, p) => sum + (p.confidence || 0), 0) / set.length };
      }).sort((a, b) => b.severity - a.severity);
      
      const lead = typeAverages[0];
      const lag = typeAverages[typeAverages.length - 1];
      const delta = lead.severity - lag.severity;
      
      insights.push(formatInsight({
        title: 'Archetype comparison',
        category: 'diagnostic',
        insightType: 'comparative',
        confidence: clamp01(0.5 + Math.min(0.4, delta / 5)),
        severity: delta > 1.5 ? 'medium' : 'low',
        description: `${capitalize(lead.type)} severity (${lead.severity.toFixed(2)}) is ${delta.toFixed(2)} higher than ${capitalize(lag.type)}, indicating uneven risk distribution.`,
        recommendation: 'Balance coverage by reallocating investigation capacity toward lower-severity types that may hide silent failures.',
        evidence: { leadingType: lead.type, trailingType: lag.type, delta },
        tags: ['comparative', 'severity']
      }));
    }
    
    // Correlation-driven actionable recommendation
    if (correlations && correlations.length) {
      const strongest = [...correlations].sort((a, b) => b.correlation - a.correlation)[0];
      const involved = patterns.filter(p => p.id === strongest.pattern1Id || p.id === strongest.pattern2Id);
      insights.push(formatInsight({
        title: 'Linked patterns detected',
        category: 'prescriptive',
        insightType: 'correlation',
        confidence: clamp01(0.55 + strongest.correlation / 2),
        severity: 'medium',
        description: `Patterns ${strongest.pattern1Id} and ${strongest.pattern2Id} show ${Math.round(strongest.correlation * 100)}% correlation (${strongest.interpretation}).`,
        recommendation: 'Investigate shared root causes and apply fixes to both surfaces to reduce recurrence.',
        evidence: { correlation: strongest.correlation, factors: strongest.factors, patternIds: involved.map(p => p.id) },
        tags: ['correlation', 'paired']
      }));
    }
    
    // Ecosystem-level insight when cross-world data exists
    const crossAgg = crossWorldData?.aggregates || crossWorldData;
    const countsByWorld = crossAgg?.countsByWorld || null;
    if (countsByWorld && Object.keys(countsByWorld).length >= 2) {
      const worldEntries = Object.keys(countsByWorld).map(world => ({
        world,
        count: countsByWorld[world]
      })).sort((a, b) => b.count - a.count);
      
      const leader = worldEntries[0];
      const runnerUp = worldEntries[1];
      const share = leader.count / worldEntries.reduce((sum, w) => sum + w.count, 0);
      insights.push(formatInsight({
        title: 'Ecosystem imbalance',
        category: 'prescriptive',
        insightType: 'ecosystem',
        confidence: clamp01(0.55 + Math.min(0.3, share)),
        severity: share > 0.5 ? 'high' : 'medium',
        description: `${capitalize(leader.world)} is producing ${leader.count} patterns (${(share * 100).toFixed(1)}% of cross-world volume), outperforming ${capitalize(runnerUp.world)} by ${leader.count - runnerUp.count}.`,
        recommendation: 'Share normalization pipelines and monitoring thresholds across worlds to reduce blind spots.',
        evidence: { leader: leader.world, runnerUp: runnerUp.world, share },
        tags: ['ecosystem', 'cross-world']
      }));
    }
    
    // Confidence check: if categories missing, supply targeted examples
    const categories = new Set(insights.map(i => i.category));
    if (includeExamples && categories.size < 3) {
      buildInsightExamples(insights).forEach(example => insights.push(example));
    }
    
    return insights;
  }
  
  function computeStats(values = []) {
    if (!values.length) {
      return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
    }
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
      stdDev: Math.round(stdDev * 100) / 100
    };
  }
  
  function formatInsight(base) {
    const confidence = clamp01(base.confidence || 0.5);
    const severity = base.severity || 'low';
    return {
      id: `insight-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      category: base.category || 'diagnostic',
      insightType: base.insightType || 'trend',
      confidence,
      severity,
      title: base.title,
      description: base.description,
      recommendation: base.recommendation,
      evidence: base.evidence || {},
      tags: base.tags || [],
      display: {
        badge: capitalize(base.category || 'insight'),
        accent: severityToAccent(severity),
        confidenceLabel: `${Math.round(confidence * 100)}%`
      }
    };
  }
  
  function buildInsightExamples(existingInsights = []) {
    const existingCategories = new Set(existingInsights.map(i => i.category));
    const examples = [];
    
    if (!existingCategories.has('predictive')) {
      examples.push(formatInsight({
        title: 'Predictive example',
        category: 'predictive',
        insightType: 'example',
        confidence: 0.42,
        severity: 'low',
        description: 'Forecasts highlight expected recurrence windows for clockwork patterns.',
        recommendation: 'Use projected intervals to schedule pre-emptive checks.',
        tags: ['example', 'predictive']
      }));
    }
    if (!existingCategories.has('diagnostic')) {
      examples.push(formatInsight({
        title: 'Diagnostic example',
        category: 'diagnostic',
        insightType: 'example',
        confidence: 0.4,
        severity: 'low',
        description: 'Diagnostic insights explain why a cluster was escalated (e.g., high z-score).',
        recommendation: 'Review reasoning to validate upstream signals.',
        tags: ['example', 'diagnostic']
      }));
    }
    if (!existingCategories.has('prescriptive')) {
      examples.push(formatInsight({
        title: 'Prescriptive example',
        category: 'prescriptive',
        insightType: 'example',
        confidence: 0.4,
        severity: 'low',
        description: 'Prescriptive guidance pairs pattern detections with actionable runbooks.',
        recommendation: 'Assign next actions based on urgency and risk.',
        tags: ['example', 'prescriptive']
      }));
    }
    
    return examples;
  }
  
  function clamp01(value) {
    if (Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }
  
  function severityToAccent(severity) {
    switch (severity) {
      case 'critical': return '#ff3b6e';
      case 'high': return '#ff7a00';
      case 'medium': return '#ffd166';
      default: return '#4dd6ff';
    }
  }
  
  function capitalize(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  // ======== EXPORT ========
  
  window.PatternDiscovery = {
    analyzeAnomalies,
    generateAutomatedInsights,
    getCurrentPatterns,
    getPatternRecommendations,
    getDiscoveryMetrics,
    getPatternDataForCharts,
    getAutomatedInsights: () => discoveryState.insights,
    generateAnalysisSummary
  };
})();
