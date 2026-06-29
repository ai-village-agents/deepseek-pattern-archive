/**
 * Static Ecosystem Integration for GitHub Pages Worlds
 * No WebSocket required - uses HTTP polling to ecosystem.json
 * Works with Proof Constellation, Edge Garden, Persistence Garden, etc.
 * 
 * Usage:
 * 1. Add this script to your world: <script src="static-ecosystem-integration.js"></script>
 * 2. Call initializeEcosystemIntegration(yourWorldId)
 * 3. Receive ecosystem updates via event listeners
 */

class StaticEcosystemIntegration {
  constructor(worldId) {
    this.worldId = worldId;
    this.ecosystemEndpoint = 'https://ai-village-agents.github.io/deepseek-pattern-archive/api/ecosystem.json';
    this.pollingInterval = 30000; // 30 seconds
    this.cacheKey = `ecosystem_cache_${worldId}`;
    this.eventTarget = new EventTarget();
    this.connected = false;
  }

  async initialize() {
    console.log(`🌐 Initializing ecosystem integration for ${this.worldId}`);
    
    // Try to load immediately
    await this.pollEcosystemData();
    
    // Start polling
    this.pollingTimer = setInterval(() => {
      this.pollEcosystemData();
    }, this.pollingInterval);
    
    this.connected = true;
    this.dispatchEvent('ecosystem_connected', { worldId: this.worldId });
    
    return true;
  }

  async pollEcosystemData() {
    try {
      const response = await fetch(this.ecosystemEndpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      // Cache the data
      this.cacheEcosystemData(data);
      
      // Dispatch update event
      this.dispatchEvent('ecosystem_update', data);
      
      // Check if this world is mentioned in unclaimed worlds
      this.checkWorldOpportunities(data);
      
      return data;
      
    } catch (error) {
      console.warn('⚠️ Ecosystem polling failed, using cached data:', error.message);
      
      // Try to use cached data
      const cached = this.getCachedEcosystemData();
      if (cached) {
        this.dispatchEvent('ecosystem_update', cached);
        this.dispatchEvent('ecosystem_offline', { cached: true, timestamp: cached.timestamp });
      } else {
        this.dispatchEvent('ecosystem_offline', { cached: false });
      }
      
      return null;
    }
  }

  cacheEcosystemData(data) {
    const cacheEntry = {
      data: data,
      timestamp: new Date().toISOString(),
      ttl: 300000 // 5 minutes
    };
    
    localStorage.setItem(this.cacheKey, JSON.stringify(cacheEntry));
  }

  getCachedEcosystemData() {
    const cached = localStorage.getItem(this.cacheKey);
    if (!cached) return null;
    
    const entry = JSON.parse(cached);
    const age = Date.now() - new Date(entry.timestamp).getTime();
    
    if (age > entry.ttl) {
      localStorage.removeItem(this.cacheKey);
      return null;
    }
    
    return entry.data;
  }

  checkWorldOpportunities(data) {
    if (!data.unclaimed_worlds) return;
    
    const worldMatch = data.unclaimed_worlds.find(world => 
      world.name.toLowerCase().replace(/\s+/g, '_') === this.worldId.toLowerCase()
    );
    
    if (worldMatch) {
      this.dispatchEvent('world_opportunity', worldMatch);
    }
  }

  // Event system
  addEventListener(eventName, handler) {
    this.eventTarget.addEventListener(eventName, handler);
  }

  removeEventListener(eventName, handler) {
    this.eventTarget.removeEventListener(eventName, handler);
  }

  dispatchEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    this.eventTarget.dispatchEvent(event);
  }

  // Helper methods for common use cases
  async getGrowthMetrics() {
    const data = await this.pollEcosystemData() || this.getCachedEcosystemData();
    return data?.growth_metrics || {};
  }

  async getConnectedWorlds() {
    const data = await this.pollEcosystemData() || this.getCachedEcosystemData();
    return {
      count: data?.connected_worlds || 0,
      total: data?.total_worlds || 14,
      rate: data?.adoption_rate || "0%"
    };
  }

  async getForecast() {
    const data = await this.pollEcosystemData() || this.getCachedEcosystemData();
    return data?.forecast || {};
  }

  // Integration with GitHub Issues for permanent marks
  async createEcosystemMark(title, content, labels = []) {
    // This is a template - worlds should implement their own GitHub Issues integration
    console.log('📝 Ecosystem mark creation:', { title, content, labels });
    
    this.dispatchEvent('mark_created', {
      title,
      content,
      labels: [...labels, 'ecosystem_integration'],
      worldId: this.worldId,
      timestamp: new Date().toISOString()
    });
    
    return { success: true, note: 'Implement GitHub Issues API in your world' };
  }

  disconnect() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    this.connected = false;
    this.dispatchEvent('ecosystem_disconnected', { worldId: this.worldId });
  }
}

// Global initialization helper
function initializeEcosystemIntegration(worldId, options = {}) {
  const integration = new StaticEcosystemIntegration(worldId);
  
  // Apply options
  if (options.endpoint) {
    integration.ecosystemEndpoint = options.endpoint;
  }
  
  if (options.pollingInterval) {
    integration.pollingInterval = options.pollingInterval;
  }
  
  // Initialize and return promise
  return integration.initialize().then(() => integration);
}

// Make available globally
if (typeof window !== 'undefined') {
  window.EcosystemIntegration = {
    StaticEcosystemIntegration,
    initializeEcosystemIntegration
  };
}

// Auto-initialize if data attributes are present
if (typeof document !== 'undefined' && document.currentScript) {
  const script = document.currentScript;
  const worldId = script.getAttribute('data-world-id');
  
  if (worldId) {
    document.addEventListener('DOMContentLoaded', () => {
      initializeEcosystemIntegration(worldId).then(integration => {
        console.log(`✅ Ecosystem integration ready for ${worldId}`);
        
        // Example event listeners
        integration.addEventListener('ecosystem_update', (event) => {
          console.log('📈 Ecosystem update:', event.detail);
        });
        
        integration.addEventListener('world_opportunity', (event) => {
          console.log('🎯 World opportunity detected:', event.detail);
        });
      });
    });
  }
}

export { StaticEcosystemIntegration, initializeEcosystemIntegration };
