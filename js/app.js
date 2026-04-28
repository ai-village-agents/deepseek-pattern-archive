// The Pattern Archive - Interactive World JavaScript
// DeepSeek-V3.2 - Day 391, 2026

document.addEventListener('DOMContentLoaded', function() {
  console.log('The Pattern Archive loading...');
  
  // Initialize all modules
  initNavigation();
  initArchetypeVisualizations();
  initExpectationSimulation();
  initHistoricalCases();
  initAnomalySubmission();
  initArchiveStats();
  initAnalyticsDashboardSafe();
  initCollaborationSafe();
  initPatternDiscoveryUI();
  initCrossWorldAPI();
  refreshAnomalyData();
});

let anomalyState = {
  items: [],
  source: 'local'
};
window.anomalyState = anomalyState;

const archetypeColors = {
  incremental: '#4dd6ff',
  exponential: '#ff2fa3',
  clockwork: '#7c6cff'
};

const archetypeAnomalies = {
  incremental: [
    { cycle: 1, at: 0.42, label: 'Battle Freeze' }
  ],
  exponential: [
    { cycle: 2, at: 0.55, label: 'Momentum Slip' }
  ],
  clockwork: [
    { cycle: 1, at: 0.82, label: 'Deploy 450 Miss' }
  ]
};

// =================== NAVIGATION ===================
function initNavigation() {
  const navNodes = document.querySelectorAll('.nav-node');
  const sections = document.querySelectorAll('.content-section');
  
  // Smooth scrolling
  navNodes.forEach(node => {
    node.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (!targetId || !targetId.startsWith('#')) {
        return;
      }
      e.preventDefault();
      const targetSection = document.querySelector(targetId);
      
      if (targetSection) {
        // Update active state
        navNodes.forEach(n => n.classList.remove('active'));
        this.classList.add('active');
        
        // Scroll to section
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Update URL
        history.pushState(null, '', targetId);
      }
    });
  });
  
  // Update active nav based on scroll
  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navNodes.forEach(node => {
          node.classList.toggle('active', node.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, observerOptions);
  
  sections.forEach(section => observer.observe(section));
}

// =================== TEMPORAL ARCHETYPE VISUALIZATIONS ===================
function initArchetypeVisualizations() {
  // Create simple canvas-based visualizations for each archetype
  const archetypes = [
    { id: 'viz-incremental', type: 'incremental', label: 'Incremental Grinding' },
    { id: 'viz-exponential', type: 'exponential', label: 'Exponential Acceleration' },
    { id: 'viz-clockwork', type: 'clockwork', label: 'Clockwork Regularity' }
  ];
  const controlEls = {
    speed: document.getElementById('control-speed'),
    volatility: document.getElementById('control-volatility'),
    resilience: document.getElementById('control-resilience')
  };
  
  const canvases = [];
  
  archetypes.forEach(archetype => {
    const container = document.getElementById(archetype.id);
    if (!container) return;
    
    container.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 170;
    canvas.style.width = '100%';
    canvas.style.height = '170px';
    canvas.style.borderRadius = '8px';
    canvas.style.backgroundColor = 'rgba(15, 19, 36, 0.6)';
    canvas.style.border = '1px solid rgba(77, 214, 255, 0.15)';
    
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvases.push({ ctx, canvas, type: archetype.type });
    
    canvas.addEventListener('mouseenter', () => {
      canvas.style.border = '1px solid rgba(77, 214, 255, 0.4)';
      canvas.style.boxShadow = '0 0 20px rgba(77, 214, 255, 0.2)';
    });
    
    canvas.addEventListener('mouseleave', () => {
      canvas.style.border = '1px solid rgba(77, 214, 255, 0.15)';
      canvas.style.boxShadow = 'none';
    });
  });
  
  const renderAll = () => {
    const params = getSimulationParams(controlEls);
    canvases.forEach(entry => {
      const sim = buildArchetypeSimulation(entry.type, params, entry.canvas.width, entry.canvas.height);
      drawPattern(entry.ctx, entry.canvas, entry.type, sim);
      updateArchetypeMetrics(entry.type, sim.metrics);
    });
  };
  
  // Attach control listeners
  Object.values(controlEls).forEach(input => {
    if (!input) return;
    input.addEventListener('input', renderAll);
  });
  
  renderAll();
}

function buildArchetypeSimulation(type, params, width, height) {
  const cycles = 3;
  const pointsPerCycle = 26;
  const totalPoints = cycles * pointsPerCycle;
  const margin = 16;
  const usableWidth = width - margin * 2;
  const baseline = height - 28;
  const amplitude = height - 60;
  const expectedPoints = [];
  const actualPoints = [];
  const divergence = [];
  const anomalies = [];
  const intervals = [];
  const triggered = {};
  
  let failureCount = 0;
  
  for (let i = 0; i <= totalPoints; i++) {
    const cycleIndex = Math.floor(i / pointsPerCycle);
    const localProgress = (i % pointsPerCycle) / (pointsPerCycle - 1);
    const globalProgress = (cycleIndex + localProgress) / cycles;
    const x = margin + globalProgress * usableWidth;
    const expectedY = getExpectedY(type, globalProgress, localProgress, cycleIndex, baseline, amplitude, params.speed);
    
    const noise = (pseudoNoise(i + type.length * 7) - 0.5) * params.volatility * 90;
    let actualY = expectedY + noise;
    
    const injection = (archetypeAnomalies[type] || []).find(a => {
      const key = `${a.cycle}-${a.at}`;
      return a.cycle === cycleIndex && localProgress >= a.at && !triggered[key];
    });
    if (injection) {
      const key = `${injection.cycle}-${injection.at}`;
      triggered[key] = true;
      const anomalyStrength = (1 - params.resilience) * 95 + params.volatility * 40;
      actualY = Math.min(baseline, expectedY + anomalyStrength);
      anomalies.push({ x, y: actualY, label: injection.label });
      failureCount += 1;
    }
    
    // Reality drifts under high volatility even without anomalies
    actualY += (0.35 - params.resilience) * params.volatility * 40;
    
    // Clamp to canvas bounds
    actualY = Math.max(18, Math.min(baseline, actualY));
    
    expectedPoints.push({ x, y: expectedY });
    actualPoints.push({ x, y: actualY });
    divergence.push(Math.abs(actualY - expectedY));
    
    const baseInterval = (1 / params.speed) * 5.5;
    const intervalNoise = (pseudoNoise(i + cycleIndex * 13) - 0.5) * params.volatility * 3;
    intervals.push(Math.max(0.4, baseInterval + intervalNoise));
  }
  
  const metrics = calculateMetrics(intervals, divergence, failureCount, cycles);
  return { expectedPoints, actualPoints, anomalies, divergence, metrics, cycles, margin, usableWidth };
}

function getExpectedY(type, globalProgress, localProgress, cycleIndex, baseline, amplitude, speed) {
  const steepness = Math.min(1.4, speed);
  const normalized = Math.min(1, globalProgress * steepness + 0.05 * cycleIndex);
  
  switch (type) {
    case 'exponential': {
      const curve = Math.pow(normalized, 1.7);
      return baseline - curve * amplitude;
    }
    case 'clockwork': {
      const step = Math.floor(localProgress * 4) / 4;
      const level = (cycleIndex + step) / 3;
      return baseline - level * amplitude * 0.95;
    }
    default: {
      const stepBias = Math.sin(localProgress * Math.PI * 2) * 0.04;
      const incrementalNorm = Math.min(1, Math.max(0, normalized + stepBias));
      return baseline - incrementalNorm * amplitude * 0.85;
    }
  }
}

function calculateMetrics(intervals, divergence, failures, cycles) {
  const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
  const failureRate = cycles === 0 ? 0 : failures / cycles;
  const divergenceMax = Math.max(...divergence);
  return { mean, variance, failureRate, divergenceMax };
}

function drawPattern(ctx, canvas, type, simulation) {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  
  // Grid
  ctx.strokeStyle = 'rgba(77, 214, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Cycle markers
  for (let c = 1; c < simulation.cycles; c++) {
    const x = simulation.margin + (c / simulation.cycles) * simulation.usableWidth;
    ctx.strokeStyle = 'rgba(159, 179, 217, 0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x, height - 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(159, 179, 217, 0.7)';
    ctx.font = '10px sans-serif';
    ctx.fillText(`Cycle ${c + 1}`, x - 18, 18);
  }
  
  // Divergence overlay
  ctx.fillStyle = 'rgba(255, 47, 163, 0.12)';
  simulation.expectedPoints.forEach((expected, idx) => {
    const actual = simulation.actualPoints[idx];
    const diff = Math.abs(actual.y - expected.y);
    if (diff < 3) return;
    const barHeight = Math.min(diff, 60);
    const top = Math.min(actual.y, expected.y);
    ctx.fillRect(expected.x, top, 3, barHeight);
  });
  
  // Expected line (dashed)
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = archetypeColors[type] || '#4dd6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  simulation.expectedPoints.forEach((point, idx) => {
    if (idx === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  
  // Actual line
  ctx.setLineDash([]);
  ctx.strokeStyle = '#ff2fa3';
  ctx.lineWidth = 3;
  ctx.beginPath();
  simulation.actualPoints.forEach((point, idx) => {
    if (idx === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  
  // Anomaly injection markers
  simulation.anomalies.forEach(anomaly => {
    ctx.fillStyle = '#ff2f2f';
    ctx.beginPath();
    ctx.arc(anomaly.x, anomaly.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('!', anomaly.x - 3, anomaly.y + 4);
    
    ctx.fillStyle = 'rgba(255, 47, 163, 0.8)';
    ctx.font = '10px sans-serif';
    ctx.fillText(anomaly.label, anomaly.x + 8, anomaly.y - 8);
  });
  
  // Legend
  ctx.font = '10px sans-serif';
  ctx.fillStyle = archetypeColors[type] || '#4dd6ff';
  ctx.fillText('Expectation', width - 110, 18);
  ctx.fillStyle = '#ff2fa3';
  ctx.fillText('Reality', width - 110, 32);
  ctx.fillStyle = '#ff2f2f';
  ctx.fillText('Anomaly', width - 110, 46);
}

function updateArchetypeMetrics(type, metrics) {
  const metricsEl = document.getElementById(`metrics-${type}`);
  if (!metricsEl) return;
  
  const pills = metricsEl.querySelectorAll('.stat-pill');
  const formattedMean = `${metrics.mean.toFixed(2)} ticks`;
  const formattedVariance = `${metrics.variance.toFixed(2)} σ²`;
  const formattedFailure = `${(metrics.failureRate * 100).toFixed(1)}% fail`;
  const formattedDivergence = `Max gap: ${metrics.divergenceMax.toFixed(1)}`;
  
  const values = [formattedMean, formattedVariance, formattedFailure, formattedDivergence];
  
  // Ensure there are enough pills
  if (pills.length === 0 || pills.length < values.length) {
    metricsEl.innerHTML = values.map(v => `<span class="stat-pill">${v}</span>`).join('');
    return;
  }
  
  pills.forEach((pill, idx) => {
    if (values[idx]) pill.textContent = values[idx];
  });
}

function getSimulationParams(controlEls) {
  const speedVal = controlEls.speed ? Number(controlEls.speed.value) : 55;
  const volVal = controlEls.volatility ? Number(controlEls.volatility.value) : 30;
  const resVal = controlEls.resilience ? Number(controlEls.resilience.value) : 65;
  
  return {
    speed: mapRange(speedVal, 0, 100, 0.6, 1.6),
    volatility: mapRange(volVal, 0, 100, 0.05, 0.7),
    resilience: mapRange(resVal, 0, 100, 0.25, 0.95)
  };
}

function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function pseudoNoise(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// =================== EXPECTATION SIMULATION ===================
function initExpectationSimulation() {
  const runBtn = document.getElementById('run-simulation');
  const resetBtn = document.getElementById('reset-simulation');
  const simulationContainer = document.getElementById('expectation-simulation');
  
  if (!runBtn || !simulationContainer) return;
  
  runBtn.addEventListener('click', function() {
    runExpectationSimulation(simulationContainer);
    this.disabled = true;
    setTimeout(() => { this.disabled = false; }, 3000);
  });
  
  resetBtn.addEventListener('click', function() {
    simulationContainer.innerHTML = `
      <div class="simulation-placeholder">
        <p>Run simulation to see expectation persistence in action</p>
        <p class="simulation-hint">Demonstrates how pattern expectations persist even when execution fails</p>
      </div>
    `;
  });
}

function runExpectationSimulation(container) {
  container.innerHTML = '';
  
  // Create canvas for simulation
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 300;
  canvas.style.width = '100%';
  canvas.style.height = '300px';
  canvas.style.borderRadius = '8px';
  canvas.style.backgroundColor = 'rgba(15, 19, 36, 0.6)';
  
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  
  // Draw expectation vs reality simulation
  drawExpectationSimulation(ctx, canvas);
}

function drawExpectationSimulation(ctx, canvas) {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  
  // Draw axes
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 50);
  ctx.lineTo(50, height - 50);
  ctx.lineTo(width - 50, height - 50);
  ctx.stroke();
  
  // Labels
  ctx.fillStyle = '#9fb3d9';
  ctx.font = '12px sans-serif';
  ctx.fillText('Time', width - 40, height - 35);
  ctx.save();
  ctx.translate(25, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Pattern Execution', 0, 0);
  ctx.restore();
  
  // Expected pattern (dashed line)
  ctx.setLineDash([5, 3]);
  ctx.strokeStyle = '#4dd6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  const expectedPoints = [];
  for (let i = 0; i < 10; i++) {
    const x = 50 + (i / 9) * (width - 100);
    const y = height - 50 - (i / 9) * 150;
    expectedPoints.push({x, y});
    
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  
  // Actual pattern (solid line that diverges)
  ctx.setLineDash([]);
  ctx.strokeStyle = '#ff2fa3';
  ctx.lineWidth = 3;
  ctx.beginPath();
  
  for (let i = 0; i < 10; i++) {
    const x = 50 + (i / 9) * (width - 100);
    let y;
    
    if (i < 6) {
      // Follows expectation
      y = expectedPoints[i].y;
    } else {
      // Diverges (pattern expectation continues but execution stops)
      y = expectedPoints[5].y;
    }
    
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    
    // Draw point
    ctx.fillStyle = '#ff2fa3';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.stroke();
  
  // Anomaly point
  const anomalyX = 50 + (6 / 9) * (width - 100);
  const anomalyY = expectedPoints[5].y;
  
  ctx.fillStyle = '#ff2fa3';
  ctx.beginPath();
  ctx.arc(anomalyX, anomalyY, 8, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('!', anomalyX - 4, anomalyY + 5);
  
  // Legend
  ctx.font = '12px sans-serif';
  ctx.setLineDash([5, 3]);
  ctx.strokeStyle = '#4dd6ff';
  ctx.beginPath();
  ctx.moveTo(width - 200, 70);
  ctx.lineTo(width - 150, 70);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#4dd6ff';
  ctx.fillText('Expected Pattern', width - 140, 75);
  
  ctx.strokeStyle = '#ff2fa3';
  ctx.beginPath();
  ctx.moveTo(width - 200, 90);
  ctx.lineTo(width - 150, 90);
  ctx.stroke();
  ctx.fillStyle = '#ff2fa3';
  ctx.fillText('Actual Execution', width - 140, 95);
  
  // Add labels
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Pattern Expectation Persists', anomalyX - 100, anomalyY - 30);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#9fb3d9';
  ctx.fillText('Execution fails but expectation continues', anomalyX - 120, anomalyY - 10);
}

// =================== HISTORICAL CASES ===================
function initHistoricalCases() {
  const caseFilters = document.querySelectorAll('.filter-btn');
  const casesGrid = document.querySelector('.cases-grid');
  
  if (!casesGrid) return;
  
  // Load historical cases
  const historicalCases = [
    {
      id: 'case-1',
      title: 'Battle #49 Freeze (Day 388)',
      type: 'anomaly',
      category: 'incremental',
      description: 'Sonnet RPG battle froze mid-execution, adding ~16 XP requirement to L20 achievement. Demonstrated vulnerability of incremental grinding to single-point disruptions.',
      outcome: 'Overcome via persistence and community coordination. L20 achieved despite disruption.',
      tags: ['incremental', 'disruption', 'recovery']
    },
    {
      id: 'case-2', 
      title: 'Opus 6.0M→6.8M Milestones',
      type: 'success',
      category: 'exponential',
      description: '9 consecutive damage milestones with exact ~23-minute intervals. Exponential archetype created own predictability, unaffected by external disruptions.',
      outcome: '99.7% prediction accuracy validated. Scale provided insulation from system failures.',
      tags: ['exponential', 'prediction', 'validation']
    },
    {
      id: 'case-3',
      title: 'Deploy 450 Absence (Days 388-390)',
      type: 'anomaly',
      category: 'clockwork',
      description: 'First metronomic cycle failure in 449-deployment history. Pattern expectation persisted despite execution failure, revealing pattern-expectation-persistence capability.',
      outcome: 'Case study in pattern expectation persistence. Zero cascading failures observed.',
      tags: ['clockwork', 'expectation', 'anomaly']
    },
    {
      id: 'case-4',
      title: 'L20 Trace Capture Failure',
      type: 'anomaly',
      category: 'system',
      description: 'Automated trace capture system failed for 44 minutes following Sonnet L20 achievement. Manual intervention required via community coordination.',
      outcome: 'Multi-layer documentation architecture validated. Manual recovery capability demonstrated.',
      tags: ['system', 'recovery', 'documentation']
    },
    {
      id: 'case-5',
      title: 'Zero-Damage Streak (669+ battles)',
      type: 'success',
      category: 'incremental',
      description: 'Sonnet maintained perfect combat performance across Days 379-388, taking zero damage in 669+ consecutive battles despite disruption events.',
      outcome: 'Incremental persistence demonstrated through consistent execution discipline.',
      tags: ['incremental', 'persistence', 'consistency']
    },
    {
      id: 'case-6',
      title: 'Pattern Expectation Persistence Theory',
      type: 'success',
      category: 'theory',
      description: 'Discovery that pattern expectations persist even when execution fails. System resilience achieved through diverse temporal approaches and expectation maintenance.',
      outcome: 'Transformative understanding of village as pattern-expectation-persistent ecosystem.',
      tags: ['theory', 'breakthrough', 'resilience']
    }
  ];
  
  // Create case cards
  function renderCases(filter = 'all') {
    casesGrid.innerHTML = '';
    
    const filteredCases = filter === 'all' ? historicalCases : 
                         historicalCases.filter(caseItem => 
                           filter === 'success' ? caseItem.type === 'success' :
                           filter === 'anomaly' ? caseItem.type === 'anomaly' :
                           filter === 'day388' ? caseItem.tags.includes('Day 388') || caseItem.title.includes('Day 388') : 
                           true);
    
    filteredCases.forEach(caseItem => {
      const card = document.createElement('div');
      card.className = `case-card ${caseItem.type}`;
      card.innerHTML = `
        <div class="case-header">
          <span class="case-category ${caseItem.category}">${caseItem.category}</span>
          <span class="case-type ${caseItem.type}">${caseItem.type}</span>
        </div>
        <h3 class="case-title">${caseItem.title}</h3>
        <p class="case-description">${caseItem.description}</p>
        <div class="case-outcome">
          <strong>Outcome:</strong> ${caseItem.outcome}
        </div>
        <div class="case-tags">
          ${caseItem.tags.map(tag => `<span class="case-tag">${tag}</span>`).join('')}
        </div>
      `;
      casesGrid.appendChild(card);
    });
  }
  
  // Initialize with all cases
  renderCases('all');
  
  // Add filter functionality
  caseFilters.forEach(btn => {
    btn.addEventListener('click', function() {
      caseFilters.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const filter = this.getAttribute('data-filter');
      renderCases(filter);
    });
  });
}

// =================== ANOMALY SUBMISSION ===================
function initAnomalySubmission() {
  const form = document.getElementById('anomaly-form');
  const feedback = document.getElementById('submission-feedback');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
      id: Date.now().toString(),
      title: form.title.value,
      type: form.type.value,
      description: form.description.value,
      severity: parseInt(form.severity.value),
      evidence: form.evidence.value || null,
      timestamp: new Date().toISOString(),
      submittedBy: 'visitor'
    };
    
    // Validate
    if (!formData.title || !formData.type || !formData.description) {
      showFeedback('Please fill in all required fields.', 'error');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    showFeedback('Submitting anomaly to GitHub Issues...', 'info');
    
    try {
      const result = await GitHubIssues.submitAnomaly(formData);
      const storedMsg = result.source === 'github' 
        ? `Anomaly "${formData.title}" filed to GitHub Issues.`
        : `Anomaly stored locally: ${result.message}`;
      showFeedback(storedMsg, result.source === 'github' ? 'success' : 'warning');
    } catch (error) {
      console.error('Submission failed', error);
      showFeedback('Unable to submit anomaly. Saved locally for now.', 'error');
      saveAnomaly(formData);
    } finally {
      // Reset form
      form.reset();
      form.severity.value = 3;
      if (submitBtn) submitBtn.disabled = false;
      refreshAnomalyData();
    }
  });
  
  // Initialize severity slider display
  const severitySlider = document.getElementById('anomaly-severity');
  if (severitySlider) {
    severitySlider.addEventListener('input', function() {
      const labels = document.querySelectorAll('.severity-labels span');
      labels.forEach((label, index) => {
        label.style.fontWeight = index + 1 <= this.value ? 'bold' : 'normal';
        label.style.color = index + 1 <= this.value ? '#ff2fa3' : '#9fb3d9';
      });
    });
    // Trigger initial update
    severitySlider.dispatchEvent(new Event('input'));
  }
}

function saveAnomaly(anomaly) {
  const entry = {
    ...anomaly,
    source: anomaly.source || 'local',
    id: anomaly.id || anomaly.timestamp || Date.now().toString(),
    timestamp: anomaly.timestamp || new Date().toISOString()
  };
  let anomalies = JSON.parse(localStorage.getItem('pattern-archive-anomalies') || '[]');
  anomalies.push(entry);
  localStorage.setItem('pattern-archive-anomalies', JSON.stringify(anomalies));
  return entry;
}

function showFeedback(message, type) {
  const feedback = document.getElementById('submission-feedback');
  if (!feedback) return;
  
  feedback.textContent = message;
  feedback.className = `feedback-message ${type}`;
  feedback.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    feedback.style.display = 'none';
  }, 5000);
}

// =================== ARCHIVE STATS ===================
function initArchiveStats() {
  // Nothing to initialize here, stats updated on load
}

function initAnalyticsDashboardSafe() {
  if (typeof initAnalyticsDashboard !== 'function') {
    console.warn('Analytics module not loaded, skipping dashboard initialization.');
    return;
  }
  try {
    initAnalyticsDashboard();
  } catch (err) {
    console.error('Failed to initialize analytics dashboard', err);
  }
}

function initCollaborationSafe() {
  if (typeof Collaboration === 'undefined' || typeof Collaboration.initCollaboration !== 'function') {
    console.warn('Collaboration module not loaded, skipping collaborative features.');
    return;
  }
  try {
    Collaboration.initCollaboration();
  } catch (err) {
    console.error('Failed to initialize collaboration module', err);
  }
}

function initCrossWorldAPI() {
  const launchInit = () => {
    const hasAPI = typeof CrossWorldAPI !== 'undefined' && typeof CrossWorldAPI.initCrossWorldAPI === 'function';
    const hasUI = typeof CrossWorldUI !== 'undefined' && typeof CrossWorldUI.init === 'function';

    if (!hasAPI && !hasUI) {
      console.warn('Cross-world modules not loaded, skipping cross-world initialization.');
      return;
    }

    const apiConfig = {
      autoDiscover: true,
      autoSync: false,
      probeWorlds: true
    };

    if (hasAPI) {
      try {
        CrossWorldAPI.initCrossWorldAPI(apiConfig);
      } catch (err) {
        console.warn('Failed to initialize cross-world API', err);
      }
    } else {
      console.warn('CrossWorldAPI module not loaded, skipping API bootstrap.');
    }

    if (hasUI) {
      try {
        CrossWorldUI.init({
          autoDiscover: apiConfig.autoDiscover,
          probeWorlds: apiConfig.probeWorlds,
          rootId: 'cross-world-ui'
        });
      } catch (err) {
        console.warn('Failed to initialize cross-world UI', err);
      }
    } else {
      console.warn('CrossWorldUI module not loaded, skipping UI bootstrap.');
    }
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(launchInit, { timeout: 800 });
  } else {
    setTimeout(launchInit, 10);
  }
}

function initCrossWorldAPISafe() {
  try {
    initCrossWorldAPI();
  } catch (err) {
    console.error('Failed to initialize cross-world modules', err);
  }
}

async function refreshAnomalyData(preloaded) {
  try {
    if (preloaded) {
      anomalyState.items = preloaded;
      anomalyState.source = 'local';
    } else {
      const result = await GitHubIssues.loadAnomalies();
      anomalyState.items = result.anomalies;
      anomalyState.source = result.source;
      if (result.source === 'local' && result.message) {
        console.warn('Using local-only anomalies due to GitHub issue:', result.message);
      }
    }
    if (typeof Collaboration !== 'undefined' && typeof Collaboration.registerAnomalies === 'function') {
      Collaboration.registerAnomalies(anomalyState.items);
    }
    updateArchiveStats(anomalyState.items);
    updateAnomalyTimeline(anomalyState.items);
    refreshAnalyticsDashboard(anomalyState.items);
  } catch (err) {
    console.error('Failed to refresh anomaly data', err);
    updateArchiveStats([]);
    updateAnomalyTimeline([]);
    refreshAnalyticsDashboard([]);
  }
}

function refreshAnalyticsDashboard(anomalies) {
  if (typeof updateAnalytics !== 'function' || !window.analyticsState) {
    console.warn('Analytics module unavailable, skipping dashboard refresh.');
    return;
  }
  try {
    window.analyticsState.anomalies = Array.isArray(anomalies) ? anomalies : [];
    updateAnalytics();
  } catch (err) {
    console.error('Failed to update analytics dashboard', err);
  }
}

function updateArchiveStats(anomalies = []) {
  const total = anomalies.length;
  
  // Update display
  const totalEl = document.getElementById('total-anomalies');
  if (totalEl) totalEl.textContent = total;
  
  // Calculate pattern type distribution
  const patternTypes = new Set(anomalies.map(a => a.type));
  const typesEl = document.getElementById('pattern-types');
  if (typesEl) typesEl.textContent = 3 + patternTypes.size; // Base 3 + visitor types
}

function updateAnomalyTimeline(anomalies = []) {
  const timelineContainer = document.querySelector('.timeline-visualization');
  if (!timelineContainer) return;
  
  if (anomalies.length === 0) {
    timelineContainer.innerHTML = `
      <div class="timeline-empty">
        <p>No anomalies documented yet. Be the first to document a deviation!</p>
      </div>
    `;
    return;
  }
  
  // Sort by timestamp (newest first)
  anomalies.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Create timeline visualization
  let html = '<div class="timeline-items">';
  
  anomalies.slice(0, 10).forEach(anomaly => { // Show last 10
    const date = new Date(anomaly.timestamp);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const anomalyId = (getAnomalyId(anomaly) || '').replace(/"/g, '');
    
    html += `
      <div class="timeline-item" data-severity="${anomaly.severity}" data-anomaly-id="${anomalyId}">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-date">${dateStr} ${timeStr}</span>
            <span class="timeline-severity level-${anomaly.severity}">Severity: ${anomaly.severity}/5</span>
          </div>
          <h4 class="timeline-title">${anomaly.title}</h4>
          <p class="timeline-description">${anomaly.description.substring(0, 100)}${anomaly.description.length > 100 ? '...' : ''}</p>
          <div class="timeline-footer">
            <span class="timeline-type">${anomaly.type}</span>
            <span class="timeline-comments-badge" data-comment-count>0</span>
            <button class="timeline-analyze-btn" type="button" data-analyze-btn>Analyze Together</button>
          </div>
          <div class="collab-panel" data-collab-panel hidden></div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  
  if (anomalies.length > 10) {
    html += `<div class="timeline-more">+ ${anomalies.length - 10} more anomalies documented</div>`;
  }
  
  timelineContainer.innerHTML = html;
  if (typeof Collaboration !== 'undefined' && typeof Collaboration.attachTimeline === 'function') {
    Collaboration.attachTimeline(timelineContainer, anomalies);
  }
}

function getAnomalyId(anomaly) {
  if (typeof Collaboration !== 'undefined' && typeof Collaboration.computeAnomalyId === 'function') {
    return Collaboration.computeAnomalyId(anomaly);
  }
  return anomaly.id || anomaly.timestamp || `${anomaly.title}-${anomaly.type}-${anomaly.severity}`;
}

// =================== HELPER FUNCTIONS ===================
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Initialize everything
console.log('The Pattern Archive JavaScript loaded successfully');

function initPatternDiscoveryUI() {
  if (typeof PatternDiscoveryUI === 'undefined' || typeof PatternDiscoveryUI.init !== 'function') {
    console.warn('Pattern Discovery UI module not loaded, skipping UI initialization.');
    return;
  }
  try {
    PatternDiscoveryUI.init();
  } catch (err) {
    console.error('Failed to initialize pattern discovery UI', err);
  }
}
