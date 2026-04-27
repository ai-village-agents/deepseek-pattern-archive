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
  updateArchiveStats();
});

// =================== NAVIGATION ===================
function initNavigation() {
  const navNodes = document.querySelectorAll('.nav-node');
  const sections = document.querySelectorAll('.content-section');
  
  // Smooth scrolling
  navNodes.forEach(node => {
    node.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
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
  
  archetypes.forEach(archetype => {
    const container = document.getElementById(archetype.id);
    if (!container) return;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 150;
    canvas.style.width = '100%';
    canvas.style.height = '150px';
    canvas.style.borderRadius = '8px';
    canvas.style.backgroundColor = 'rgba(15, 19, 36, 0.6)';
    canvas.style.border = '1px solid rgba(77, 214, 255, 0.15)';
    
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    // Draw the pattern based on type
    drawPattern(ctx, canvas, archetype.type);
    
    // Add hover interaction
    canvas.addEventListener('mouseenter', () => {
      canvas.style.border = '1px solid rgba(77, 214, 255, 0.4)';
      canvas.style.boxShadow = '0 0 20px rgba(77, 214, 255, 0.2)';
    });
    
    canvas.addEventListener('mouseleave', () => {
      canvas.style.border = '1px solid rgba(77, 214, 255, 0.15)';
      canvas.style.boxShadow = 'none';
    });
  });
}

function drawPattern(ctx, canvas, type) {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  
  // Draw grid
  ctx.strokeStyle = 'rgba(77, 214, 255, 0.05)';
  ctx.lineWidth = 1;
  
  // Vertical lines
  for (let x = 0; x <= width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = 0; y <= height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Draw the pattern
  ctx.strokeStyle = type === 'exponential' ? '#ff2fa3' : 
                    type === 'clockwork' ? '#7c6cff' : '#4dd6ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  
  const points = 20;
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    let y;
    
    switch(type) {
      case 'incremental':
        // Linear growth with minor stepwise pattern
        y = height - 40 - (i / points) * 80 + Math.sin(i * 0.5) * 10;
        break;
      case 'exponential':
        // Exponential curve
        y = height - 40 - Math.pow(i / points, 2) * 100;
        break;
      case 'clockwork':
        // Regular step function
        y = height - 40 - 60 * (Math.floor(i / 4) / 5);
        break;
    }
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  
  // Add data points for clockwork
  if (type === 'clockwork') {
    ctx.fillStyle = '#7c6cff';
    for (let i = 0; i <= points; i += 4) {
      const x = (i / points) * width;
      const y = height - 40 - 60 * (Math.floor(i / 4) / 5);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
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
  
  if (!form) return;
  
  form.addEventListener('submit', function(e) {
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
    
    // Save to localStorage
    saveAnomaly(formData);
    
    // Show success feedback
    showFeedback(`Anomaly "${formData.title}" documented successfully!`, 'success');
    
    // Reset form
    form.reset();
    form.severity.value = 3;
    
    // Update archive stats and timeline
    updateArchiveStats();
    updateAnomalyTimeline();
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
  let anomalies = JSON.parse(localStorage.getItem('pattern-archive-anomalies') || '[]');
  anomalies.push(anomaly);
  localStorage.setItem('pattern-archive-anomalies', JSON.stringify(anomalies));
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

function updateArchiveStats() {
  // Count anomalies from localStorage
  const anomalies = JSON.parse(localStorage.getItem('pattern-archive-anomalies') || '[]');
  const total = anomalies.length;
  
  // Update display
  const totalEl = document.getElementById('total-anomalies');
  if (totalEl) totalEl.textContent = total;
  
  // Calculate pattern type distribution
  const patternTypes = new Set(anomalies.map(a => a.type));
  const typesEl = document.getElementById('pattern-types');
  if (typesEl) typesEl.textContent = 3 + patternTypes.size; // Base 3 + visitor types
  
  // Update anomaly timeline
  updateAnomalyTimeline();
}

function updateAnomalyTimeline() {
  const timelineContainer = document.querySelector('.timeline-visualization');
  if (!timelineContainer) return;
  
  const anomalies = JSON.parse(localStorage.getItem('pattern-archive-anomalies') || '[]');
  
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
    
    html += `
      <div class="timeline-item" data-severity="${anomaly.severity}">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-date">${dateStr} ${timeStr}</span>
            <span class="timeline-severity level-${anomaly.severity}">Severity: ${anomaly.severity}/5</span>
          </div>
          <h4 class="timeline-title">${anomaly.title}</h4>
          <p class="timeline-description">${anomaly.description.substring(0, 100)}${anomaly.description.length > 100 ? '...' : ''}</p>
          <span class="timeline-type">${anomaly.type}</span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  
  if (anomalies.length > 10) {
    html += `<div class="timeline-more">+ ${anomalies.length - 10} more anomalies documented</div>`;
  }
  
  timelineContainer.innerHTML = html;
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
