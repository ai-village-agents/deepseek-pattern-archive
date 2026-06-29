// Anomaly submission UI for spatial world
// Provides form and GitHub Issues integration for the anomaly submission zone

export class AnomalySubmissionUI {
  constructor(options = {}) {
    this.modal = null;
    this.currentAnomaly = null;
    this.isSubmitting = false;
    this.audio = options.audio || (typeof window !== 'undefined' ? window.PatternAudioFeedback : null) || null;
  }

  showModal(zoneName, position) {
    if (this.modal) {
      this.hideModal();
    }

    this.currentAnomaly = {
      type: 'clockwork',
      severity: 3,
      evidence: '',
      description: '',
      timestamp: Date.now(),
      position: { x: Math.round(position.x), y: Math.round(position.y) },
      zone: zoneName
    };

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(4, 7, 17, 0.92);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: "Space Grotesk", system-ui;
    `;
    backdrop.id = 'anomaly-modal-backdrop';
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.hideModal();
    });

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, #0b1226, #1e293b);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 28px;
      width: 90%;
      max-width: 520px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5);
    `;
    modal.id = 'anomaly-modal';

    modal.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px; color: #e2e8f0; font-size: 22px; font-weight: 600;">
          Submit Anomaly to The Pattern Archive
        </h2>
        <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.5;">
          Document a temporal irregularity, spatial glitch, or pattern breach observed in this zone.
          Submissions are preserved in GitHub Issues and appear as glowing particles throughout the Archive.
        </p>
      </div>

      <form id="anomaly-form">
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; color: #cbd5e1; font-size: 14px; font-weight: 500;">
            Pattern Type
          </label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${this.renderTypeButtons()}
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; color: #cbd5e1; font-size: 14px; font-weight: 500;">
            Severity (1–5)
          </label>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${this.renderSeverityButtons()}
            <span id="severity-label" style="margin-left: 12px; color: #e2e8f0; font-size: 14px;">
              Moderate
            </span>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; color: #cbd5e1; font-size: 14px; font-weight: 500;">
            Evidence / Context <span style="color: #94a3b8; font-weight: normal;">(optional)</span>
          </label>
          <input type="text" id="anomaly-evidence" 
            style="
              width: 100%;
              padding: 12px 14px;
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 10px;
              color: #e2e8f0;
              font-size: 14px;
              font-family: inherit;
            "
            placeholder="e.g., 'Observed in GPT-5.2's Proof Constellation at 12:04 PM'"
          >
        </div>

        <div style="margin-bottom: 28px;">
          <label style="display: block; margin-bottom: 8px; color: #cbd5e1; font-size: 14px; font-weight: 500;">
            Description
          </label>
          <textarea id="anomaly-description" rows="4"
            style="
              width: 100%;
              padding: 12px 14px;
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 10px;
              color: #e2e8f0;
              font-size: 14px;
              font-family: inherit;
              resize: vertical;
            "
            placeholder="Describe the anomaly in detail. What patterns did you observe? What feels irregular or illuminating?"
            required
          ></textarea>
        </div>

        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        ">
          <div style="color: #94a3b8; font-size: 13px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="color: #67e8f9;">📍</span>
              <span>Zone: ${zoneName}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #67e8f9;">📊</span>
              <span>Persists as Issue # in GitHub, appears as glowing particle</span>
            </div>
          </div>

          <div style="display: flex; gap: 12px;">
            <button type="button" id="cancel-btn"
              style="
                padding: 12px 20px;
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 10px;
                color: #e2e8f0;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                font-family: inherit;
              "
            >
              Cancel
            </button>
            <button type="submit" id="submit-btn"
              style="
                padding: 12px 24px;
                background: linear-gradient(120deg, #22d3ee, #3b82f6);
                border: none;
                border-radius: 10px;
                color: #040711;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                font-family: inherit;
                display: flex;
                align-items: center;
                gap: 6px;
              "
            >
              <span>Submit Anomaly</span>
              <span style="font-size: 18px;">→</span>
            </button>
          </div>
        </div>
      </form>

      <div id="submission-status" style="display: none; margin-top: 20px; padding: 16px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 10px; color: #bbf7d0; font-size: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">📤</span>
          <div>
            <div style="font-weight: 500;">Submitting to GitHub Issues...</div>
            <div style="font-size: 13px; color: #86efac;">Creating permanent record in the Archive</div>
          </div>
        </div>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    this.modal = backdrop;

    this.setupEventListeners();
  }

  renderTypeButtons() {
    const types = [
      { id: 'clockwork', label: 'Clockwork', color: '#7dd3fc', desc: 'Predictable, rhythmic' },
      { id: 'exponential', label: 'Exponential', color: '#c084fc', desc: 'Rapidly accelerating' },
      { id: 'incremental', label: 'Incremental', color: '#a5b4fc', desc: 'Steady, stepwise' },
      { id: 'spatial', label: 'Spatial', color: '#4ade80', desc: 'Geometric, positional' },
      { id: 'temporal', label: 'Temporal', color: '#f97316', desc: 'Time-based, recurring' }
    ];

    return types.map(type => `
      <button type="button" class="type-btn ${this.currentAnomaly.type === type.id ? 'selected' : ''}"
        data-type="${type.id}"
        style="
          padding: 10px 16px;
          background: ${this.currentAnomaly.type === type.id ? type.color : 'rgba(255, 255, 255, 0.06)'};
          border: 1px solid ${this.currentAnomaly.type === type.id ? type.color : 'rgba(255, 255, 255, 0.12)'};
          border-radius: 8px;
          color: ${this.currentAnomaly.type === type.id ? '#0b1226' : '#e2e8f0'};
          font-size: 13px;
          font-weight: ${this.currentAnomaly.type === type.id ? '600' : '500'};
          cursor: pointer;
          flex: 1;
          min-width: 80px;
          transition: all 0.2s ease;
        "
        title="${type.desc}"
      >
        ${type.label}
      </button>
    `).join('');
  }

  renderSeverityButtons() {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      const isActive = this.currentAnomaly.severity >= i;
      html += `
        <button type="button" class="severity-btn" data-severity="${i}"
          style="
            width: 36px; height: 36px;
            background: ${isActive ? (i <= 2 ? '#4ade80' : i <= 3 ? '#fbbf24' : i <= 4 ? '#f97316' : '#ef4444') : 'rgba(255, 255, 255, 0.06)'};
            border: 1px solid ${isActive ? 'transparent' : 'rgba(255, 255, 255, 0.12)'};
            border-radius: 8px;
            color: ${isActive ? '#0b1226' : '#e2e8f0'};
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          "
        >
          ${i}
        </button>
      `;
    }
    return html;
  }

  setupEventListeners() {
    const form = document.getElementById('anomaly-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const typeBtns = document.querySelectorAll('.type-btn');
    const severityBtns = document.querySelectorAll('.severity-btn');
    const severityLabel = document.getElementById('severity-label');
    const evidenceInput = document.getElementById('anomaly-evidence');
    const descriptionInput = document.getElementById('anomaly-description');

    // Type selection
    typeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        typeBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.currentAnomaly.type = btn.dataset.type;
        
        // Update button styles
        const bgColor = window.getComputedStyle(btn).backgroundColor;
        typeBtns.forEach(b => {
          if (b !== btn) {
            b.style.background = 'rgba(255, 255, 255, 0.06)';
            b.style.border = '1px solid rgba(255, 255, 255, 0.12)';
            b.style.color = '#e2e8f0';
            b.style.fontWeight = '500';
          }
        });
        
        btn.style.background = bgColor;
        btn.style.border = `1px solid ${bgColor}`;
        btn.style.color = '#0b1226';
        btn.style.fontWeight = '600';
      });
    });

    // Severity selection
    severityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const severity = parseInt(btn.dataset.severity);
        this.currentAnomaly.severity = severity;
        
        // Update severity labels
        const labels = ['Minor', 'Low', 'Moderate', 'High', 'Critical'];
        severityLabel.textContent = labels[severity - 1];
        
        // Update button styles
        severityBtns.forEach((b, idx) => {
          const s = idx + 1;
          const isActive = severity >= s;
          b.style.background = isActive ? 
            (s <= 2 ? '#4ade80' : s <= 3 ? '#fbbf24' : s <= 4 ? '#f97316' : '#ef4444') : 
            'rgba(255, 255, 255, 0.06)';
          b.style.border = isActive ? 'transparent' : '1px solid rgba(255, 255, 255, 0.12)';
          b.style.color = isActive ? '#0b1226' : '#e2e8f0';
        });
      });
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.isSubmitting) return;
      
      this.currentAnomaly.evidence = evidenceInput.value.trim();
      this.currentAnomaly.description = descriptionInput.value.trim();
      
      if (!this.currentAnomaly.description) {
        descriptionInput.style.borderColor = '#ef4444';
        return;
      }
      
      await this.submitAnomaly();
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
      this.hideModal();
    });

    // Evidence input
    evidenceInput.addEventListener('input', () => {
      this.currentAnomaly.evidence = evidenceInput.value.trim();
    });

    // Description input
    descriptionInput.addEventListener('input', () => {
      this.currentAnomaly.description = descriptionInput.value.trim();
      if (descriptionInput.value.trim()) {
        descriptionInput.style.borderColor = 'rgba(255, 255, 255, 0.12)';
      }
    });
  }

  async submitAnomaly() {
    this.isSubmitting = true;
    
    // Show submitting state
    const submitBtn = document.getElementById('submit-btn');
    const statusDiv = document.getElementById('submission-status');
    
    submitBtn.innerHTML = '<span>Submitting...</span>';
    submitBtn.style.opacity = '0.7';
    submitBtn.disabled = true;
    statusDiv.style.display = 'block';
    
    try {
      // Check if GitHub Issues module is available
      if (!window.GitHubIssues?.submitAnomaly) {
        throw new Error('GitHub Issues module not available');
      }
      
      // Submit via GitHub Issues
      const result = await window.GitHubIssues.submitAnomaly(this.currentAnomaly);
      
      // Update status
      statusDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">✅</span>
          <div>
            <div style="font-weight: 500;">Anomaly submitted successfully!</div>
            <div style="font-size: 13px; color: #86efac;">
              ${result.issueNumber ? `Issue #${result.issueNumber} created in GitHub` : 'Saved to local storage'}
            </div>
          </div>
        </div>
      `;
      statusDiv.style.background = 'rgba(34, 197, 94, 0.1)';
      statusDiv.style.borderColor = 'rgba(34, 197, 94, 0.3)';
      statusDiv.style.color = '#bbf7d0';
      
      // Update submit button
      submitBtn.innerHTML = '<span>Submitted ✓</span>';
      this.signalAudio(true);
      
      // Close modal after success
      setTimeout(() => {
        this.hideModal();
        
        // Show success notification
        this.showNotification('Anomaly recorded in The Pattern Archive', 'success');
      }, 1500);
      
    } catch (error) {
      console.error('Failed to submit anomaly:', error);
      
      statusDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">⚠️</span>
          <div>
            <div style="font-weight: 500;">Submission failed</div>
            <div style="font-size: 13px; color: #fecdd3;">
              Saved locally. Try GitHub connection later.
            </div>
          </div>
        </div>
      `;
      statusDiv.style.background = 'rgba(248, 113, 113, 0.1)';
      statusDiv.style.borderColor = 'rgba(248, 113, 113, 0.3)';
      statusDiv.style.color = '#fecdd3';
      
      submitBtn.innerHTML = '<span>Try Again</span>';
      submitBtn.style.opacity = '1';
      submitBtn.disabled = false;
      this.signalAudio(false);
      
      // Still save locally
      try {
        const localAnomalies = JSON.parse(localStorage.getItem('pattern-archive-anomalies') || '[]');
        localAnomalies.push({
          ...this.currentAnomaly,
          id: `local-${Date.now()}`,
          source: 'local'
        });
        localStorage.setItem('pattern-archive-anomalies', JSON.stringify(localAnomalies));
      } catch (localError) {
        console.error('Failed to save locally:', localError);
      }
    }
    
    this.isSubmitting = false;
  }

  signalAudio(success) {
    const audio = this.audio || (typeof window !== 'undefined' ? window.PatternAudioFeedback : null);
    if (audio?.playAnomalySubmission) {
      audio.playAnomalySubmission(success);
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 24px; right: 24px;
      padding: 12px 16px;
      background: ${type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(248, 113, 113, 0.9)'};
      color: #0b1226;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      backdrop-filter: blur(8px);
      animation: slideIn 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  hideModal() {
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
    }
    this.modal = null;
    this.currentAnomaly = null;
  }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
