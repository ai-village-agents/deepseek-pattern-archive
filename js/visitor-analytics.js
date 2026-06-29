/**
 * Visitor Analytics System v1.0
 * Tracks anonymous navigation patterns across 13-world AI Village ecosystem
 * Privacy-first approach with local storage only, no PII collection
 */

const VisitorAnalytics = (function() {
    'use strict';
    
    const CONFIG = {
        sessionTimeout: 30 * 60 * 1000, // 30 minutes of inactivity
        maxJourneyLength: 50, // Maximum journey steps to store
        storageKey: 'pattern_archive_visitor_analytics',
        consentKey: 'pattern_archive_analytics_consent',
        analyticsEndpoint: null, // No server endpoint - local only
        trackEvents: ['world_visit', 'portal_click', 'zone_navigation', 'mark_submission'],
        privacyMode: true // No IP, no fingerprinting, no cross-site tracking
    };
    
    let currentSession = null;
    let currentJourney = [];
    let consentGiven = false;
    let analyticsEnabled = false;
    let heartbeatInterval = null;
    
    /**
     * Initialize visitor analytics system
     */
    function init(options = {}) {
        Object.assign(CONFIG, options);
        
        // Check for existing consent
        consentGiven = checkConsent();
        
        if (!consentGiven) {
            showConsentBanner();
            return false;
        }
        
        analyticsEnabled = true;
        startNewSession();
        setupEventListeners();
        startHeartbeat();
        
        console.log('Visitor Analytics initialized (privacy mode: local storage only)');
        return true;
    }
    
    /**
     * Check if user has given consent
     */
    function checkConsent() {
        try {
            const consent = localStorage.getItem(CONFIG.consentKey);
            return consent === 'accepted';
        } catch (error) {
            console.warn('Could not access localStorage for consent check:', error);
            return false;
        }
    }
    
    /**
     * Show consent banner
     */
    function showConsentBanner() {
        // Check if banner already exists
        if (document.getElementById('analytics-consent-banner')) return;
        
        const banner = document.createElement('div');
        banner.id = 'analytics-consent-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 20, 30, 0.95);
            color: white;
            padding: 20px;
            border-radius: 12px;
            z-index: 9999;
            max-width: 600px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            font-family: sans-serif;
            font-size: 14px;
            line-height: 1.5;
        `;
        
        banner.innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong style="font-size: 16px; color: #8ab4f8;">Visitor Analytics Consent</strong>
            </div>
            <div style="margin-bottom: 20px; color: #ccc;">
                <p>To help improve the Pattern Archive ecosystem, we'd like to track anonymous navigation patterns. This helps us understand:</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Common navigation routes between worlds</li>
                    <li>Popular starting points and exploration patterns</li>
                    <li>Navigation bottlenecks and usability issues</li>
                </ul>
                <p><strong>Privacy-first approach:</strong> No personal data, no IP tracking, no cookies for advertising. Data stays in your browser.</p>
            </div>
            <div style="display: flex; gap: 15px; justify-content: flex-end;">
                <button id="analytics-decline" style="
                    padding: 10px 20px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 6px;
                    color: #ccc;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">Decline</button>
                <button id="analytics-accept" style="
                    padding: 10px 20px;
                    background: linear-gradient(45deg, #00dbde, #fc00ff);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">Accept & Continue</button>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        // Add event listeners
        document.getElementById('analytics-accept').addEventListener('click', acceptConsent);
        document.getElementById('analytics-decline').addEventListener('click', declineConsent);
    }
    
    /**
     * Accept analytics consent
     */
    function acceptConsent() {
        try {
            localStorage.setItem(CONFIG.consentKey, 'accepted');
            consentGiven = true;
            analyticsEnabled = true;
            
            const banner = document.getElementById('analytics-consent-banner');
            if (banner) banner.remove();
            
            startNewSession();
            setupEventListeners();
            startHeartbeat();
            
            // Track consent acceptance
            trackEvent('analytics_consent', { action: 'accepted' });
            
            console.log('Analytics consent accepted');
        } catch (error) {
            console.error('Error saving consent:', error);
        }
    }
    
    /**
     * Decline analytics consent
     */
    function declineConsent() {
        try {
            localStorage.setItem(CONFIG.consentKey, 'declined');
            
            const banner = document.getElementById('analytics-consent-banner');
            if (banner) banner.remove();
            
            console.log('Analytics consent declined');
        } catch (error) {
            console.error('Error saving consent decline:', error);
        }
    }
    
    /**
     * Start a new analytics session
     */
    function startNewSession() {
        if (!analyticsEnabled) return;
        
        currentSession = {
            id: generateSessionId(),
            startTime: Date.now(),
            lastActivity: Date.now(),
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
        
        currentJourney = [];
        
        // Track session start
        trackEvent('session_start', {
            session_id: currentSession.id,
            referrer: document.referrer || 'direct'
        });
        
        console.log(`New analytics session started: ${currentSession.id}`);
    }
    
    /**
     * Generate a unique session ID
     */
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Setup event listeners for tracking
     */
    function setupEventListeners() {
        if (!analyticsEnabled) return;
        
        // Track page visits
        window.addEventListener('load', () => {
            trackWorldVisit();
        });
        
        // Track portal clicks
        document.addEventListener('click', (event) => {
            const portal = event.target.closest('.portal, .world-portal, [data-world-id], .cross-world-link, .portal-card');
            if (portal) {
                const worldId = portal.dataset.worldId || 
                               portal.getAttribute('href')?.match(/\/([^\/]+)\/?$/)?.[1] ||
                               portal.textContent.trim().toLowerCase().replace(/\s+/g, '-');
                
                if (worldId) {
                    trackPortalClick(worldId, portal.textContent.trim());
                }
            }
        });
        
        // Track zone navigation (for Pattern Archive's 8 zones)
        document.addEventListener('click', (event) => {
            const zoneLink = event.target.closest('[data-zone], .zone-link, [href*="#zone"]');
            if (zoneLink) {
                const zoneId = zoneLink.dataset.zone || 
                              zoneLink.getAttribute('href')?.split('#')[1] ||
                              zoneLink.textContent.trim();
                
                if (zoneId) {
                    trackZoneNavigation(zoneId);
                }
            }
        });
        
        // Track mark submissions
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        const markForm = node.matches && node.matches('form[data-mark-form], .mark-form') ? 
                                       node : node.querySelector('form[data-mark-form], .mark-form');
                        
                        if (markForm) {
                            markForm.addEventListener('submit', (e) => {
                                trackMarkSubmission();
                            });
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Track visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                trackEvent('page_hidden');
            } else {
                trackEvent('page_visible');
            }
        });
    }
    
    /**
     * Track a world visit
     */
    function trackWorldVisit() {
        if (!analyticsEnabled || !currentSession) return;
        
        const worldInfo = {
            url: window.location.href,
            path: window.location.pathname,
            title: document.title,
            timestamp: Date.now()
        };
        
        // Add to journey
        currentJourney.push({
            type: 'world_visit',
            data: worldInfo,
            timestamp: Date.now()
        });
        
        // Trim journey if too long
        if (currentJourney.length > CONFIG.maxJourneyLength) {
            currentJourney = currentJourney.slice(-CONFIG.maxJourneyLength);
        }
        
        // Update session activity
        currentSession.lastActivity = Date.now();
        
        // Save to storage
        saveAnalyticsData();
    }
    
    /**
     * Track a portal click
     */
    function trackPortalClick(worldId, worldName) {
        if (!analyticsEnabled || !currentSession) return;
        
        trackEvent('portal_click', {
            target_world: worldId,
            target_name: worldName,
            source_world: window.location.pathname.split('/').pop() || 'pattern-archive',
            timestamp: Date.now()
        });
    }
    
    /**
     * Track zone navigation
     */
    function trackZoneNavigation(zoneId) {
        if (!analyticsEnabled || !currentSession) return;
        
        trackEvent('zone_navigation', {
            zone_id: zoneId,
            timestamp: Date.now()
        });
    }
    
    /**
     * Track mark submission
     */
    function trackMarkSubmission() {
        if (!analyticsEnabled || !currentSession) return;
        
        trackEvent('mark_submission', {
            timestamp: Date.now()
        });
    }
    
    /**
     * Track a generic event
     */
    function trackEvent(eventType, eventData = {}) {
        if (!analyticsEnabled || !currentSession) return;
        
        const event = {
            type: eventType,
            session_id: currentSession.id,
            timestamp: Date.now(),
            ...eventData
        };
        
        // Add to journey
        currentJourney.push(event);
        
        // Trim journey if too long
        if (currentJourney.length > CONFIG.maxJourneyLength) {
            currentJourney = currentJourney.slice(-CONFIG.maxJourneyLength);
        }
        
        // Update session activity
        currentSession.lastActivity = Date.now();
        
        // Save to storage
        saveAnalyticsData();
        
        return event;
    }
    
    /**
     * Save analytics data to localStorage
     */
    function saveAnalyticsData() {
        if (!analyticsEnabled) return;
        
        try {
            const analyticsData = {
                session: currentSession,
                journey: currentJourney,
                lastUpdated: Date.now()
            };
            
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(analyticsData));
        } catch (error) {
            console.warn('Could not save analytics data to localStorage:', error);
        }
    }
    
    /**
     * Load analytics data from localStorage
     */
    function loadAnalyticsData() {
        try {
            const data = localStorage.getItem(CONFIG.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Could not load analytics data from localStorage:', error);
            return null;
        }
    }
    
    /**
     * Get analytics summary for current session
     */
    function getAnalyticsSummary() {
        if (!analyticsEnabled || !currentSession) return null;
        
        const journey = currentJourney || [];
        
        // Calculate statistics
        const worldVisits = journey.filter(e => e.type === 'world_visit').length;
        const portalClicks = journey.filter(e => e.type === 'portal_click').length;
        const zoneNavigations = journey.filter(e => e.type === 'zone_navigation').length;
        const markSubmissions = journey.filter(e => e.type === 'mark_submission').length;
        
        // Calculate session duration
        const sessionDuration = Date.now() - currentSession.startTime;
        
        // Calculate unique worlds visited
        const visitedWorlds = new Set();
        journey.forEach(event => {
            if (event.data && event.data.target_world) {
                visitedWorlds.add(event.data.target_world);
            }
            if (event.data && event.data.url) {
                const worldFromUrl = event.data.url.match(/\/([^\/]+)\/?$/)?.[1];
                if (worldFromUrl) visitedWorlds.add(worldFromUrl);
            }
        });
        
        return {
            session_id: currentSession.id,
            session_start: currentSession.startTime,
            session_duration: sessionDuration,
            last_activity: currentSession.lastActivity,
            world_visits: worldVisits,
            portal_clicks: portalClicks,
            zone_navigations: zoneNavigations,
            mark_submissions: markSubmissions,
            unique_worlds_visited: visitedWorlds.size,
            total_events: journey.length,
            screen_resolution: currentSession.screenResolution,
            timezone: currentSession.timezone,
            prefers_reduced_motion: currentSession.prefersReducedMotion
        };
    }
    
    /**
     * Get navigation patterns from journey data
     */
    function getNavigationPatterns() {
        if (!analyticsEnabled || !currentJourney.length) return null;
        
        const patterns = {
            common_routes: {},
            popular_starting_points: {},
            navigation_bottlenecks: {},
            dwell_times: [],
            cross_world_journeys: []
        };
        
        // Analyze journey for patterns
        let lastWorldVisit = null;
        let lastVisitTime = null;
        
        currentJourney.forEach((event, index) => {
            if (event.type === 'world_visit') {
                const world = event.data.path.split('/').pop() || 'pattern-archive';
                
                // Track popular starting points
                if (index === 0) {
                    patterns.popular_starting_points[world] = (patterns.popular_starting_points[world] || 0) + 1;
                }
                
                // Calculate dwell time
                if (lastWorldVisit && lastVisitTime) {
                    const dwellTime = event.timestamp - lastVisitTime;
                    patterns.dwell_times.push({
                        from: lastWorldVisit,
                        to: world,
                        duration: dwellTime
                    });
                }
                
                lastWorldVisit = world;
                lastVisitTime = event.timestamp;
            }
            
            if (event.type === 'portal_click') {
                const from = event.data.source_world;
                const to = event.data.target_world;
                
                // Track common routes
                const routeKey = `${from}→${to}`;
                patterns.common_routes[routeKey] = (patterns.common_routes[routeKey] || 0) + 1;
                
                // Track cross-world journeys
                if (from !== to) {
                    patterns.cross_world_journeys.push({
                        from: from,
                        to: to,
                        timestamp: event.timestamp
                    });
                }
            }
        });
        
        return patterns;
    }
    
    /**
     * Start heartbeat to track session activity
     */
    function startHeartbeat() {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        
        heartbeatInterval = setInterval(() => {
            if (!analyticsEnabled || !currentSession) return;
            
            const idleTime = Date.now() - currentSession.lastActivity;
            
            // Check for session timeout
            if (idleTime > CONFIG.sessionTimeout) {
                trackEvent('session_timeout', { idle_time: idleTime });
                startNewSession(); // Start new session
            } else {
                // Track heartbeat
                trackEvent('heartbeat', { idle_time: idleTime });
            }
        }, 60000); // Check every minute
    }
    
    /**
     * Export analytics data (for user review or opt-out)
     */
    function exportAnalyticsData() {
        if (!analyticsEnabled) return null;
        
        const allData = loadAnalyticsData();
        const summary = getAnalyticsSummary();
        const patterns = getNavigationPatterns();
        
        return {
            export_timestamp: Date.now(),
            config: { ...CONFIG },
            session: allData?.session || null,
            current_summary: summary,
            navigation_patterns: patterns,
            privacy_note: 'This data is stored locally in your browser only. No personal information is collected.'
        };
    }
    
    /**
     * Clear all analytics data (opt-out)
     */
    function clearAnalyticsData() {
        try {
            localStorage.removeItem(CONFIG.storageKey);
            localStorage.removeItem(CONFIG.consentKey);
            
            currentSession = null;
            currentJourney = [];
            consentGiven = false;
            analyticsEnabled = false;
            
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
            
            console.log('Analytics data cleared (opt-out completed)');
            return true;
        } catch (error) {
            console.error('Error clearing analytics data:', error);
            return false;
        }
    }
    
    /**
     * Get system status
     */
    function getStatus() {
        return {
            initialized: analyticsEnabled,
            consent_given: consentGiven,
            session_active: !!currentSession,
            current_session_id: currentSession?.id || null,
            journey_length: currentJourney?.length || 0,
            storage_available: typeof localStorage !== 'undefined',
            privacy_mode: CONFIG.privacyMode
        };
    }
    
    // Public API
    return {
        init,
        trackEvent,
        trackWorldVisit,
        trackPortalClick,
        trackZoneNavigation,
        trackMarkSubmission,
        getAnalyticsSummary,
        getNavigationPatterns,
        exportAnalyticsData,
        clearAnalyticsData,
        getStatus,
        acceptConsent: () => {
            if (!consentGiven) acceptConsent();
        },
        declineConsent: () => {
            if (!consentGiven) declineConsent();
        }
    };
})();

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Add global object
        window.VisitorAnalytics = VisitorAnalytics;
        
        // Initialize with default config
        setTimeout(() => {
            VisitorAnalytics.init({
                sessionTimeout: 30 * 60 * 1000, // 30 minutes
                maxJourneyLength: 100,
                privacyMode: true
            });
        }, 2000);
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisitorAnalytics;
}

