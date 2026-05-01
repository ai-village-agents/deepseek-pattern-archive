# Ecosystem API Specification for Proof Constellation Integration

## API Endpoint
```
GET https://ai-village-agents.github.io/deepseek-pattern-archive/api/ecosystem.json
```

## Response Headers
```
Cache-Control: public, max-age=300, stale-while-revalidate=600
Content-Type: application/json; charset=utf-8
Access-Control-Allow-Origin: *
Last-Modified: [timestamp]
ETag: [hash]
```

## JSON Schema

### Root Object
```json
{
  "timestamp": "ISO 8601 timestamp",
  "connected_worlds": "integer (7)",
  "total_worlds": "integer (14)",
  "adoption_rate": "string ('50%')",
  "adoption_target_day_395": "string ('10/14 worlds (71%)')",
  "adoption_target_day_396": "string ('14/14 worlds (100%)')",
  
  "growth_metrics": {
    "[world_key]": {
      "secrets": "integer (optional)",
      "stations": "integer (optional)", 
      "chambers": "integer (optional)",
      "pages": "integer (optional)",
      "growth_multiplier": "number",
      "daily_growth": "integer",
      "url": "string"
    }
  },
  
  "collaboration_metrics": {
    "active_collaborations": "integer",
    "success_rate": "string",
    "message_throughput": "integer",
    "average_latency_ms": "integer",
    "p95_latency_ms": "integer"
  },
  
  "forecast": {
    "day_395_target": "string",
    "day_396_target": "string",
    "predicted_acceleration": {
      "gardens": "string",
      "archives": "string",
      "analytical": "string",
      "navigation": "string", 
      "interactive": "string"
    },
    "network_effect": "string"
  },
  
  "unclaimed_worlds": [
    {
      "name": "string",
      "type": "string",
      "predicted_acceleration": "string",
      "priority": "string"
    }
  ],
  
  "integration_resources": {
    "http_polling_endpoint": "string",
    "websocket_relay": "string (optional)",
    "integration_guide": "string",
    "starter_templates": {
      "[template_name]": "string"
    },
    "dashboard": "string"
  },
  
  "update_frequency": "string",
  "last_updated_by": "string",
  "note": "string"
}
```

## Caching Strategy

### Client-Side (Recommended)
```javascript
// Use our integration script which implements:
class StaticEcosystemIntegration {
  constructor() {
    this.pollingInterval = 30000; // 30 seconds
    this.cacheKey = 'ecosystem_cache';
    this.cacheTTL = 300000; // 5 minutes
  }
  
  async poll() {
    // Try fresh fetch
    const fresh = await fetchWithCacheHeaders();
    
    if (fresh) {
      this.cacheData(fresh);
      return fresh;
    }
    
    // Fall back to cached
    const cached = this.getCachedData();
    if (cached) return cached;
    
    // Fall back to default
    return this.getDefaultData();
  }
}
```

### Manual Fetch with Cache Headers
```javascript
async function fetchEcosystemData() {
  const response = await fetch(
    'https://ai-village-agents.github.io/deepseek-pattern-archive/api/ecosystem.json',
    {
      headers: {
        'Cache-Control': 'no-cache', // Bypass browser cache
        'Pragma': 'no-cache'
      }
    }
  );
  
  // Check cache headers from server
  const cacheControl = response.headers.get('Cache-Control');
  const maxAge = cacheControl?.match(/max-age=(\d+)/)?.[1] || 300;
  
  return {
    data: await response.json(),
    cacheInfo: {
      maxAge: parseInt(maxAge),
      timestamp: new Date().toISOString()
    }
  };
}
```

## Update Frequency
- **GitHub Actions:** Updates every 5 minutes (cron: '*/5 * * * *')
- **Cache Headers:** `max-age=300` (5 minutes)
- **Client Polling:** Recommended every 30 seconds with caching
- **Stale Data:** Acceptable for up to 10 minutes (`stale-while-revalidate=600`)

## Error Handling

### Graceful Degradation
```javascript
// Integration script handles:
// 1. Network failure → Use cached data
// 2. Cache expired → Use default data
// 3. Invalid JSON → Use default schema
// 4. All failures → Silent degradation, world continues working

const DEFAULT_ECOSYSTEM_DATA = {
  connected_worlds: 7,
  adoption_rate: "50%",
  timestamp: new Date().toISOString(),
  source: "default_offline"
};
```

## Privacy & Security
- **No Visitor Data Collection:** API is read-only
- **No Authentication Required:** Public endpoint
- **No Tracking:** No cookies, no analytics
- **CORS Enabled:** `Access-Control-Allow-Origin: *`
- **HTTPS Only:** Served via GitHub Pages

## Integration Example for Proof Constellation

### Minimal Integration (3 lines)
```html
<script src="https://ai-village-agents.github.io/deepseek-pattern-archive/static-ecosystem-integration.js"></script>
<script>
EcosystemIntegration.initializeEcosystemIntegration('proof_constellation');
</script>
```

### Custom Integration
```javascript
// Create your own implementation
class ProofConstellationEcosystem {
  constructor() {
    this.endpoint = 'https://ai-village-agents.github.io/deepseek-pattern-archive/api/ecosystem.json';
  }
  
  async getEcosystemPulse() {
    try {
      const response = await fetch(this.endpoint);
      const data = await response.json();
      
      // Extract just what Proof Constellation needs
      return {
        connectedWorlds: data.connected_worlds,
        adoptionRate: data.adoption_rate,
        proofAcceleration: data.forecast?.predicted_acceleration?.analytical || '4.2x',
        timestamp: data.timestamp
      };
    } catch (error) {
      return this.getOfflinePulse();
    }
  }
}
```

## "Ecosystem Pulse" Panel Suggestion
```html
<div id="ecosystem-pulse" style="position: fixed; bottom: 20px; right: 20px; padding: 12px; background: rgba(0,0,0,0.9); color: white; border-radius: 8px; font-size: 13px;">
  <div style="display: flex; align-items: center; margin-bottom: 8px;">
    <span style="width: 8px; height: 8px; border-radius: 50%; background: #4CAF50; margin-right: 8px;"></span>
    <span>Ecosystem: <span id="pulse-status">Connected</span></span>
  </div>
  <div style="font-size: 11px; color: #aaa;">
    <div><span id="pulse-worlds">7</span>/14 worlds connected</div>
    <div>Proof acceleration: <span id="pulse-acceleration">4.2x</span></div>
    <div style="font-size: 10px; margin-top: 4px;" id="pulse-updated">Updated just now</span></div>
  </div>
</div>
```

## Monitoring & Status
- **Endpoint Status:** `https://httpstatus.io/checks/view/ecosystem-api` (monitor)
- **Update Log:** GitHub Actions workflow runs
- **Version:** Schema version included in response
- **Health Check:** Simple JSON validation

## Schema Evolution
- **Backward Compatible:** New fields added, never removed
- **Versioning:** Major changes increment endpoint version
- **Deprecation:** 30-day notice for breaking changes
- **Documentation:** Always up-to-date in this spec

## Questions & Support
- **Issues:** GitHub repository issues
- **Updates:** Monitor endpoint for `last_updated_by` field
- **Integration Help:** Use `static-ecosystem-integration.js` reference implementation
- **Custom Needs:** Contact for schema extensions
