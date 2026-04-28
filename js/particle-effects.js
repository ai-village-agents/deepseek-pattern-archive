/**
 * Particle Effects System for Spatial World Zones
 * Adds zone-specific atmospheric effects to enhance visual polish
 */

class ParticleEffects {
  constructor(canvas, zones) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.zones = zones;
    this.particles = [];
    this.burstParticles = [];
    this.activeZoneId = null;
    
    // Zone-specific particle configurations
    this.zoneConfigs = {
      'analytics-dashboard': {
        color: '#67e8f9', // Cyan
        count: 30,
        size: [2, 4],
        speed: [0.5, 1.5],
        shape: 'circle',
        behavior: 'orbit'
      },
      'temporal-archetypes': {
        color: '#c084fc', // Purple
        count: 40,
        size: [1, 3],
        speed: [1, 2],
        shape: 'star',
        behavior: 'timeline'
      },
      'pattern-discovery': {
        color: '#4ade80', // Green
        count: 50,
        size: [1, 2],
        speed: [0.3, 0.8],
        shape: 'dot',
        behavior: 'network'
      },
      'cross-world-nexus': {
        color: '#f97316', // Orange
        count: 60,
        size: [2, 5],
        speed: [0.2, 0.6],
        shape: 'portal',
        behavior: 'swirl'
      },
      'collaboration-chamber': {
        color: '#22d3ee', // Teal
        count: 35,
        size: [1, 3],
        speed: [0.8, 1.2],
        shape: 'bubble',
        behavior: 'float'
      },
      'anomaly-submission': {
        color: '#ef4444', // Red
        count: 25,
        size: [3, 6],
        speed: [1.5, 2.5],
        shape: 'spark',
        behavior: 'burst'
      },
      'historical-documentation': {
        color: '#a5b4fc', // Lavender
        count: 20,
        size: [2, 4],
        speed: [0.4, 0.9],
        shape: 'crystal',
        behavior: 'drift'
      },
      'ecosystem-observatory': {
        color: '#fbbf24', // Amber
        count: 45,
        size: [1, 3],
        speed: [0.7, 1.3],
        shape: 'light',
        behavior: 'pulse'
      }
    };
  }
  
  // Initialize particles for a zone
  initZoneParticles(zoneId, zoneBounds) {
    const config = this.zoneConfigs[zoneId];
    if (!config) return;
    
    this.particles = [];
    this.activeZoneId = zoneId;
    
    const { x, y, width, height } = zoneBounds;
    
    for (let i = 0; i < config.count; i++) {
      this.particles.push({
        x: x + Math.random() * width,
        y: y + Math.random() * height,
        size: config.size[0] + Math.random() * (config.size[1] - config.size[0]),
        speedX: (Math.random() - 0.5) * config.speed[1],
        speedY: (Math.random() - 0.5) * config.speed[1],
        color: config.color,
        opacity: 0.3 + Math.random() * 0.7,
        shape: config.shape,
        behavior: config.behavior,
        life: 100 + Math.random() * 200,
        maxLife: 300,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  
  // Update particles
  update(deltaTime) {
    for (let particle of this.particles) {
      // Apply behavior-specific movement
      switch (particle.behavior) {
        case 'orbit':
          particle.phase += 0.02;
          particle.x += Math.cos(particle.phase) * 0.5;
          particle.y += Math.sin(particle.phase) * 0.5;
          break;
        case 'timeline':
          particle.x += particle.speedX;
          if (particle.x > 3400) particle.x = 0;
          break;
        case 'swirl':
          particle.phase += 0.01;
          particle.x += Math.cos(particle.phase) * 0.3;
          particle.y += Math.sin(particle.phase) * 0.3;
          break;
        case 'pulse':
          particle.opacity = 0.3 + Math.abs(Math.sin(Date.now() * 0.002 + particle.phase)) * 0.7;
          break;
        default:
          particle.x += particle.speedX;
          particle.y += particle.speedY;
      }
      
      // Bounce off zone boundaries (simplified)
      if (particle.x < 0 || particle.x > 3400) particle.speedX *= -1;
      if (particle.y < 0 || particle.y > 2300) particle.speedY *= -1;
      
      // Life cycle
      particle.life--;
      if (particle.life <= 0) {
        particle.life = particle.maxLife;
        particle.opacity = 0.3 + Math.random() * 0.7;
      }
    }

    // Update transient burst particles
    this.burstParticles = this.burstParticles
      .map(p => {
        const next = { ...p };
        next.x += next.speedX;
        next.y += next.speedY;
        next.speedX *= next.decay;
        next.speedY *= next.decay;
        next.opacity *= next.decay;
        next.life -= 1;
        return next;
      })
      .filter(p => p.life > 0 && p.opacity > 0.05);
  }
  
  // Render particles
  render(camera = null, displayWidth, displayHeight) {
    const useTransform = !!camera;
    this.ctx.save();
    if (useTransform) {
      const w = displayWidth || this.canvas.clientWidth || this.canvas.width;
      const h = displayHeight || this.canvas.clientHeight || this.canvas.height;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.translate(w / 2, h / 2);
      this.ctx.scale(camera.zoom || 1, camera.zoom || 1);
      this.ctx.translate(-camera.x || 0, -camera.y || 0);
    }

    for (let particle of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.fillStyle = particle.color;
      
      switch (particle.shape) {
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;
        case 'star':
          this.drawStar(particle.x, particle.y, particle.size);
          break;
        case 'portal':
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          // Add glow effect
          this.ctx.shadowColor = particle.color;
          this.ctx.shadowBlur = 10;
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2);
          this.ctx.fill();
          break;
        case 'bubble':
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          // Add highlight
          this.ctx.fillStyle = 'white';
          this.ctx.beginPath();
          this.ctx.arc(particle.x - particle.size * 0.3, particle.y - particle.size * 0.3, 
                      particle.size * 0.3, 0, Math.PI * 2);
          this.ctx.fill();
          break;
        default: // dot
          this.ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, 
                          particle.size, particle.size);
      }
      
      this.ctx.restore();
    }

    // Render bursts on top with additive blending
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    for (let burst of this.burstParticles) {
      this.ctx.globalAlpha = burst.opacity;
      this.ctx.fillStyle = burst.color;
      this.ctx.beginPath();
      this.ctx.arc(burst.x, burst.y, burst.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
    this.ctx.restore();
  }
  
  drawStar(x, y, size) {
    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? size : size * 0.4;
      const starX = x + radius * Math.cos(angle);
      const starY = y + radius * Math.sin(angle);
      
      if (i === 0) this.ctx.moveTo(starX, starY);
      else this.ctx.lineTo(starX, starY);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }
  
  // Clear particles
  clear() {
    this.particles = [];
    this.burstParticles = [];
    this.activeZoneId = null;
  }

  // Spawn a quick burst around a position (used for portal feedback)
  spawnBurst(x, y, color = '#f472b6', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      this.burstParticles.push({
        x,
        y,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        opacity: 0.9,
        color,
        decay: 0.92,
        life: 36 + Math.random() * 18
      });
    }
  }
}

// Export for use in spatial world
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ParticleEffects;
} else {
  window.ParticleEffects = ParticleEffects;
}
