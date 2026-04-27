// Test script to generate sample anomaly data
console.log("Testing Pattern Archive Analytics Dashboard...");

// Clear existing localStorage test data
localStorage.removeItem('pattern-archive-analytics-state');
localStorage.removeItem('pattern-archive-anomalies');
localStorage.removeItem('pattern-archive-comments');

// Generate sample anomalies for testing
const sampleAnomalies = [];
const now = new Date();

// Create 30 days of sample data with varying patterns
for (let i = 0; i < 30; i++) {
  const date = new Date(now);
  date.setDate(date.getDate() - i);
  
  // Vary pattern types and severities
  const patternTypes = ['incremental', 'exponential', 'clockwork', 'other'];
  const patternType = patternTypes[i % patternTypes.length];
  const severity = (i % 5) + 1; // Severity 1-5
  
  sampleAnomalies.push({
    id: `test-anomaly-${i}`,
    title: `Test Anomaly #${i + 1}`,
    description: `This is a test anomaly for analytics dashboard validation`,
    type: patternType,
    severity: severity,
    date: date.toISOString(),
    timestamp: date.toISOString(),
    category: patternType,
    tags: patternType === 'incremental' ? ['gradual', 'stepwise'] : 
           patternType === 'exponential' ? ['rapid', 'growth'] :
           patternType === 'clockwork' ? ['regular', 'periodic'] : ['misc', 'unclassified']
  });
}

// Save to localStorage key used by the Pattern Archive
localStorage.setItem('pattern-archive-anomalies', JSON.stringify(sampleAnomalies));

console.log(`Generated ${sampleAnomalies.length} sample anomalies`);
console.log(`Pattern distribution:`);
const patternCounts = {};
sampleAnomalies.forEach(a => {
  patternCounts[a.type] = (patternCounts[a.type] || 0) + 1;
});
console.log(patternCounts);

// Also create sample collaboration data
const sampleDiscussions = {};
sampleAnomalies.slice(0, 5).forEach((anomaly, idx) => {
  sampleDiscussions[anomaly.id] = {
    anomalyId: anomaly.id,
    title: anomaly.title,
    comments: [
      {
        id: `c-${Date.now()}-${idx}`,
        author: 'Researcher Alpha',
        message: `Initial observation of ${anomaly.type} pattern in this anomaly.`,
        parentId: null,
        createdAt: anomaly.date
      },
      {
        id: `c-${Date.now()}-${idx}-1`,
        author: 'Investigator Beta',
        message: `Noticed similar pattern in previous cases - severity ${anomaly.severity} seems consistent.`,
        parentId: null,
        createdAt: new Date(new Date(anomaly.date).getTime() + 3600000).toISOString()
      }
    ],
    tags: [
      { id: `t-${Date.now()}-${idx}`, label: 'test-data', author: 'System', createdAt: anomaly.date },
      { id: `t-${Date.now()}-${idx}-1`, label: anomaly.type, author: 'Auto-tagger', createdAt: anomaly.date }
    ],
    hypotheses: [],
    createdAt: anomaly.date,
    updatedAt: new Date(new Date(anomaly.date).getTime() + 3600000).toISOString()
  };
});

localStorage.setItem('pattern-archive-comments', JSON.stringify(sampleDiscussions));

console.log(`Generated ${Object.keys(sampleDiscussions).length} sample discussions`);
console.log("Test data ready. Open the Pattern Archive at http://localhost:9000/ to view analytics dashboard.");
