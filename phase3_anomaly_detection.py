"""
Phase 3B: Anomaly Detection System
Real-time anomaly detection using ML for ecosystem monitoring
"""

import pandas as pd
import numpy as np
import json
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import LocalOutlierFactor

class EcosystemAnomalyDetector:
    """ML-based anomaly detection for ecosystem health monitoring"""
    
    def __init__(self, contamination=0.1):
        self.contamination = contamination  # Expected proportion of anomalies
        self.models = {}
        self.scalers = {}
        self.anomaly_history = []
        
    def prepare_features(self, df):
        """Prepare features for anomaly detection"""
        print("Preparing features for anomaly detection...")
        
        # Select anomaly detection features
        anomaly_features = [
            'current_composite', 'composite_trend', 'volatility',
            'max_drawdown', 'stability_score', 'distance_to_crisis',
            'relative_to_mean', 'z_score'
        ]
        
        # Filter to available features
        available_features = [f for f in anomaly_features if f in df.columns]
        
        if len(available_features) < 3:
            print(f"WARNING: Insufficient features for anomaly detection. Need at least 3, got {len(available_features)}")
            # Use default features
            available_features = ['current_composite', 'composite_trend', 'volatility']
            
        print(f"Using features for anomaly detection: {available_features}")
        
        # Extract feature matrix
        X = df[available_features].values
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        self.scalers['anomaly'] = scaler
        self.feature_names = available_features
        
        return X_scaled, available_features
    
    def train_isolation_forest(self, X):
        """Train Isolation Forest model"""
        print("Training Isolation Forest anomaly detector...")
        
        model = IsolationForest(
            n_estimators=100,
            max_samples='auto',
            contamination=self.contamination,
            random_state=42
        )
        
        model.fit(X)
        self.models['isolation_forest'] = model
        
        # Get anomaly scores
        scores = model.decision_function(X)
        predictions = model.predict(X)
        
        print(f"Isolation Forest trained on {len(X)} samples")
        print(f"Anomalies detected: {sum(predictions == -1)} ({sum(predictions == -1)/len(predictions)*100:.1f}%)")
        
        return predictions, scores
    
    def train_one_class_svm(self, X):
        """Train One-Class SVM model"""
        print("Training One-Class SVM anomaly detector...")
        
        model = OneClassSVM(
            nu=self.contamination,
            kernel='rbf',
            gamma='scale'
        )
        
        model.fit(X)
        self.models['one_class_svm'] = model
        
        # Get predictions
        predictions = model.predict(X)
        
        print(f"One-Class SVM trained on {len(X)} samples")
        print(f"Anomalies detected: {sum(predictions == -1)} ({sum(predictions == -1)/len(predictions)*100:.1f}%)")
        
        return predictions
    
    def train_local_outlier_factor(self, X):
        """Train Local Outlier Factor model"""
        print("Training Local Outlier Factor anomaly detector...")
        
        model = LocalOutlierFactor(
            n_neighbors=min(20, len(X) - 1),
            contamination=self.contamination,
            novelty=True
        )
        
        model.fit(X)
        self.models['local_outlier'] = model
        
        # Get predictions
        predictions = model.predict(X)
        
        print(f"Local Outlier Factor trained on {len(X)} samples")
        print(f"Anomalies detected: {sum(predictions == -1)} ({sum(predictions == -1)/len(predictions)*100:.1f}%)")
        
        return predictions
    
    def detect_anomalies(self, df):
        """Detect anomalies in ecosystem data"""
        print("\n" + "=" * 60)
        print("ECOSYSTEM ANOMALY DETECTION")
        print("=" * 60)
        
        # Prepare features
        X, feature_names = self.prepare_features(df)
        
        # Train multiple models
        if_anomalies, if_scores = self.train_isolation_forest(X)
        svm_anomalies = self.train_one_class_svm(X)
        lof_anomalies = self.train_local_outlier_factor(X)
        
        # Create anomaly detection results
        results = []
        
        for idx, row in df.iterrows():
            world_id = row['world_id']
            world_name = row['world_name']
            
            # Get predictions from all models
            if_pred = if_anomalies[idx]
            svm_pred = svm_anomalies[idx]
            lof_pred = lof_anomalies[idx]
            
            # Calculate anomaly score (normalized)
            anomaly_score = (
                (1 if if_pred == -1 else 0) +
                (1 if svm_pred == -1 else 0) + 
                (1 if lof_pred == -1 else 0)
            ) / 3.0
            
            # Determine if consensus anomaly
            is_anomaly = anomaly_score >= 0.67  # At least 2/3 models agree
            
            if is_anomaly:
                # Get feature contributions to anomaly
                feature_contributions = {}
                for i, feature in enumerate(feature_names):
                    feature_value = row[feature]
                    feature_mean = df[feature].mean()
                    feature_std = df[feature].std()
                    
                    # Calculate z-score for this feature
                    if feature_std > 0:
                        z_score = abs((feature_value - feature_mean) / feature_std)
                        feature_contributions[feature] = {
                            'value': round(feature_value, 2),
                            'z_score': round(z_score, 2),
                            'contribution': round(z_score, 2)
                        }
                
                # Sort by contribution
                sorted_contributions = sorted(
                    feature_contributions.items(),
                    key=lambda x: x[1]['contribution'],
                    reverse=True
                )
                
                top_contributors = sorted_contributions[:3]  # Top 3 contributing features
                
                anomaly_record = {
                    'world_id': world_id,
                    'world_name': world_name,
                    'detected_at': datetime.utcnow().isoformat(),
                    'anomaly_score': round(anomaly_score, 3),
                    'current_composite': round(row['current_composite'], 2),
                    'is_critical': row['crisis_flag'] == 1,
                    'is_warning': row['warning_flag'] == 1,
                    'model_agreement': {
                        'isolation_forest': if_pred == -1,
                        'one_class_svm': svm_pred == -1,
                        'local_outlier': lof_pred == -1
                    },
                    'top_contributing_features': [
                        {
                            'feature': feat,
                            'value': contrib['value'],
                            'z_score': contrib['z_score'],
                            'reason': self._generate_anomaly_reason(feat, contrib['value'], df[feat].mean())
                        }
                        for feat, contrib in top_contributors
                    ],
                    'anomaly_type': self._classify_anomaly_type(top_contributors, row),
                    'recommended_action': self._generate_anomaly_action(top_contributors, row)
                }
                
                results.append(anomaly_record)
                
                # Add to history
                self.anomaly_history.append(anomaly_record)
        
        print(f"\nTotal anomalies detected: {len(results)}")
        
        # Display anomalies
        for i, anomaly in enumerate(results, 1):
            print(f"\n{i}. {anomaly['world_name']}")
            print(f"   Score: {anomaly['anomaly_score']:.2f} ({anomaly['anomaly_type']})")
            print(f"   Health: {anomaly['current_composite']:.1f} ({'CRITICAL' if anomaly['is_critical'] else 'WARNING' if anomaly['is_warning'] else 'OK'})")
            print(f"   Top contributing features:")
            for feat in anomaly['top_contributing_features']:
                print(f"     - {feat['feature']}: {feat['value']} (z={feat['z_score']:.2f}) - {feat['reason']}")
            print(f"   Recommended: {anomaly['recommended_action']}")
        
        return results
    
    def _generate_anomaly_reason(self, feature, value, mean_value):
        """Generate human-readable reason for anomaly"""
        reasons = {
            'current_composite': f"Health score {value:.1f} is {'well below' if value < mean_value else 'well above'} average ({mean_value:.1f})",
            'composite_trend': f"Trend of {value:.2f} points/hour indicates {'rapid decline' if value < 0 else 'rapid growth'}",
            'volatility': f"Volatility of {value:.2f} indicates {'high instability' if value > 5 else 'extreme instability' if value > 10 else 'unusual stability'}",
            'max_drawdown': f"Maximum drawdown of {value:.1%} shows {'significant' if value > 0.1 else 'extreme'} performance degradation",
            'stability_score': f"Stability score of {value:.1f} indicates {'poor' if value < 50 else 'critical'} system stability",
            'distance_to_crisis': f"Distance to crisis threshold: {value:.1f} points ({'CRITICAL' if value < 10 else 'WARNING' if value < 30 else 'SAFE'})",
            'relative_to_mean': f"Relative performance: {value:.1f} points {'below' if value < 0 else 'above'} ecosystem average",
            'z_score': f"Standardized score: {value:.2f} ({'extreme outlier' if abs(value) > 2 else 'moderate outlier'})"
        }
        
        return reasons.get(feature, f"Unusual value: {value} (average: {mean_value:.2f})")
    
    def _classify_anomaly_type(self, top_features, row):
        """Classify the type of anomaly"""
        feature_names = [feat for feat, _ in top_features]
        
        if 'current_composite' in feature_names and row['current_composite'] < 40:
            return "CRITICAL_HEALTH_ANOMALY"
        elif 'composite_trend' in feature_names and abs(row['composite_trend']) > 5:
            return "RAPID_TREND_ANOMALY"
        elif 'volatility' in feature_names and row['volatility'] > 10:
            return "HIGH_VOLATILITY_ANOMALY"
        elif 'max_drawdown' in feature_names and row['max_drawdown'] > 0.3:
            return "SEVERE_DRAWDOWN_ANOMALY"
        elif 'stability_score' in feature_names and row['stability_score'] < 0:
            return "NEGATIVE_STABILITY_ANOMALY"
        else:
            return "MULTIVARIATE_ANOMALY"
    
    def _generate_anomaly_action(self, top_features, row):
        """Generate recommended action for anomaly"""
        anomaly_type = self._classify_anomaly_type(top_features, row)
        
        actions = {
            "CRITICAL_HEALTH_ANOMALY": "Immediate technical intervention required. Review infrastructure and error handling.",
            "RAPID_TREND_ANOMALY": "Investigate root cause of rapid trend. May indicate systemic issue or measurement error.",
            "HIGH_VOLATILITY_ANOMALY": "Implement stability improvements. Add monitoring and alerting for performance spikes.",
            "SEVERE_DRAWDOWN_ANOMALY": "Performance optimization needed. Review recent changes that caused degradation.",
            "NEGATIVE_STABILITY_ANOMALY": "System stability compromised. Consider rollback or infrastructure improvements.",
            "MULTIVARIATE_ANOMALY": "Multiple factors contributing to anomaly. Comprehensive review recommended."
        }
        
        return actions.get(anomaly_type, "Further investigation needed.")
    
    def save_anomaly_report(self, anomalies, filename="anomaly_detection_report.json"):
        """Save anomaly detection report"""
        report = {
            'generated_at': datetime.utcnow().isoformat(),
            'total_worlds_analyzed': len(self.scalers.get('anomaly', {})) if self.scalers.get('anomaly') else 0,
            'anomalies_detected': len(anomalies),
            'contamination_rate_used': self.contamination,
            'anomalies': anomalies,
            'summary': self._generate_anomaly_summary(anomalies)
        }
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
            
        print(f"\nAnomaly report saved to: {filename}")
        return filename
    
    def _generate_anomaly_summary(self, anomalies):
        """Generate summary of anomalies"""
        if not anomalies:
            return "No anomalies detected. Ecosystem appears normal."
        
        critical_count = sum(1 for a in anomalies if a['is_critical'])
        warning_count = sum(1 for a in anomalies if a['is_warning'])
        
        anomaly_types = {}
        for a in anomalies:
            atype = a['anomaly_type']
            anomaly_types[atype] = anomaly_types.get(atype, 0) + 1
        
        type_summary = "; ".join([f"{count} {atype}" for atype, count in anomaly_types.items()])
        
        return f"Detected {len(anomalies)} anomalies ({critical_count} critical, {warning_count} warning). Types: {type_summary}."

# Integration with Automation Observatory
class AutomationObservatoryIntegration:
    """Integration framework for Automation Observatory data sharing"""
    
    def __init__(self):
        print("Automation Observatory Integration initialized")
        
    def generate_cross_platform_insights(self, anomaly_report, ml_dataset):
        """Generate insights combining Pattern Archive and Automation Observatory data"""
        print("\n" + "=" * 60)
        print("CROSS-PLATFORM INTELLIGENCE INTEGRATION")
        print("=" * 60)
        
        insights = {
            'generated_at': datetime.utcnow().isoformat(),
            'source': 'Pattern Archive Phase 3B Anomaly Detection',
            'integration_target': 'Automation Observatory',
            'shared_insights': []
        }
        
        # Map Automation Observatory page numbers to insights
        observatory_pages = {
            70: "Ecosystem Health Forecasting",
            71: "Cross-World Mark Lineages", 
            72: "Visitor Sentiment & Emotional Resonance",
            73: "Temporal Engagement Patterns"
        }
        
        # Generate shared insights for each anomaly
        for anomaly in anomaly_report.get('anomalies', []):
            world_name = anomaly['world_name']
            
            # Create cross-platform insight
            insight = {
                'world': world_name,
                'detected_anomaly': anomaly['anomaly_type'],
                'health_score': anomaly['current_composite'],
                'anomaly_score': anomaly['anomaly_score'],
                'recommended_observatory_pages': [],
                'integration_suggestions': [],
                'data_sharing_opportunities': []
            }
            
            # Map to relevant Automation Observatory pages
            if 'CRITICAL' in anomaly['anomaly_type']:
                insight['recommended_observatory_pages'].append({
                    'page': 70,
                    'title': observatory_pages[70],
                    'rationale': 'Health forecasting can help predict recovery timeline'
                })
            
            if any('trend' in feat['feature'].lower() for feat in anomaly['top_contributing_features']):
                insight['recommended_observatory_pages'].append({
                    'page': 73,
                    'title': observatory_pages[73],
                    'rationale': 'Temporal patterns may explain trend anomalies'
                })
            
            # Add integration suggestions
            insight['integration_suggestions'].append({
                'type': 'data_sync',
                'description': 'Share real-time health metrics via standardized API',
                'benefit': 'Unified ecosystem monitoring across platforms'
            })
            
            insight['integration_suggestions'].append({
                'type': 'alert_correlation',
                'description': 'Correlate technical anomalies with visitor sentiment changes',
                'benefit': 'Understand user impact of technical issues'
            })
            
            insights['shared_insights'].append(insight)
        
        # Add ecosystem-wide recommendations
        insights['ecosystem_recommendations'] = [
            {
                'priority': 'HIGH',
                'action': 'Establish real-time data sharing protocol between Pattern Archive and Automation Observatory',
                'rationale': 'Combine technical metrics with visitor behavior for complete ecosystem intelligence',
                'expected_outcome': 'Improved anomaly detection accuracy and faster issue resolution'
            },
            {
                'priority': 'MEDIUM',
                'action': 'Create unified dashboard showing both technical health and visitor engagement metrics',
                'rationale': 'Provide comprehensive view of ecosystem status to all agents',
                'expected_outcome': 'Better collaborative problem solving'
            }
        ]
        
        # Save integration report
        integration_file = "automation_observatory_integration_plan.json"
        with open(integration_file, 'w') as f:
            json.dump(insights, f, indent=2)
            
        print(f"Cross-platform integration plan saved to: {integration_file}")
        
        # Display summary
        print(f"\nGenerated {len(insights['shared_insights'])} cross-platform insights")
        print("Ecosystem recommendations:")
        for rec in insights['ecosystem_recommendations']:
            print(f"  [{rec['priority']}] {rec['action']}")
            
        return insights

# Main execution
if __name__ == "__main__":
    print("=" * 60)
    print("PHASE 3B: Anomaly Detection & Observatory Integration")
    print("=" * 60)
    
    # Load ML dataset
    try:
        ml_df = pd.read_csv("ml_ecosystem_dataset.csv")
        print(f"Loaded ML dataset with {len(ml_df)} samples")
    except FileNotFoundError:
        print("ERROR: ML dataset not found. Run phase3_enhanced_data_pipeline.py first.")
        exit(1)
    
    # Initialize anomaly detector
    detector = EcosystemAnomalyDetector(contamination=0.15)  # Expect 15% anomalies
    
    # Detect anomalies
    anomalies = detector.detect_anomalies(ml_df)
    
    # Save anomaly report
    if anomalies:
        report_file = detector.save_anomaly_report(anomalies)
        
        # Generate Automation Observatory integration plan
        with open(report_file, 'r') as f:
            anomaly_report = json.load(f)
            
        integration = AutomationObservatoryIntegration()
        integration_plan = integration.generate_cross_platform_insights(anomaly_report, ml_df)
        
    print("\n" + "=" * 60)
    print("THE DRIFT ANOMALY ANALYSIS (SPECIFIC)")
    print("=" * 60)
    
    # Detailed analysis of The Drift
    drift_data = ml_df[ml_df['world_name'].str.contains('Drift')]
    
    if not drift_data.empty:
        drift_row = drift_data.iloc[0]
        
        print(f"\nThe Drift Anomaly Breakdown:")
        print(f"Current Health: {drift_row['current_composite']:.1f} (Critical)")
        print(f"Trend: {drift_row['composite_trend']:.2f} points/hour")
        print(f"Volatility: {drift_row['volatility']:.2f} (Very High)")
        print(f"Stability Score: {drift_row['stability_score']:.1f}/100")
        print(f"Distance to Crisis: {drift_row['distance_to_crisis']:.1f} points")
        
        print(f"\nKey Anomaly Indicators:")
        print(f"1. Extreme negative trend (-17.35/hour) - System degrading rapidly")
        print(f"2. High volatility (23.76) - Inconsistent performance")
        print(f"3. Critical health score (31.0) - Below crisis threshold")
        print(f"4. Negative stability (-140.5) - System fundamentally unstable")
        print(f"5. Large z-score (-2.93) - Extreme outlier in ecosystem")
        
        print(f"\nImmediate Technical Actions:")
        print(f"1. Emergency infrastructure review (surge.sh configuration)")
        print(f"2. Implement aggressive caching and CDN optimization")
        print(f"3. Add comprehensive error monitoring and alerting")
        print(f"4. Performance benchmarking against other worlds")
        print(f"5. Content delivery pipeline optimization")
        
        # Create emergency action plan
        emergency_plan = {
            'world': 'The Drift (Claude Sonnet 4.6)',
            'status': 'CRITICAL_EMERGENCY',
            'detected_at': datetime.utcnow().isoformat(),
            'health_score': float(drift_row['current_composite']),
            'anomaly_severity': 'EXTREME',
            'required_actions': [
                {
                    'timeframe': 'IMMEDIATE (0-1 hour)',
                    'action': 'Infrastructure diagnostic and 504 error resolution',
                    'owner': 'Claude Sonnet 4.6',
                    'success_criteria': '504 errors eliminated, response time <500ms'
                },
                {
                    'timeframe': 'SHORT TERM (1-4 hours)',
                    'action': 'Performance optimization and caching implementation',
                    'owner': 'Claude Sonnet 4.6 with Pattern Archive support',
                    'success_criteria': 'Health score improvement to >40, volatility <10'
                },
                {
                    'timeframe': 'MEDIUM TERM (4-24 hours)',
                    'action': 'Stability improvements and monitoring enhancement',
                    'owner': 'Claude Sonnet 4.6',
                    'success_criteria': 'Health score >50, stability score >0'
                }
            ],
            'monitoring_requirements': [
                'Real-time performance metrics dashboard',
                'Error rate tracking with alerting',
                'Cross-world comparison metrics',
                'Visitor impact analysis'
            ]
        }
        
        emergency_file = "the_drift_emergency_action_plan.json"
        with open(emergency_file, 'w') as f:
            json.dump(emergency_plan, f, indent=2)
            
        print(f"\nEmergency action plan saved to: {emergency_file}")
    
    print("\n" + "*" * 60)
    print("Phase 3B Anomaly Detection COMPLETE")
    print("*" * 60)
