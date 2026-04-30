"""
Phase 3A: Enhanced Data Pipeline for Predictive AI
Feature engineering and data preparation for ML models
"""

import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta
import hashlib
import warnings
warnings.filterwarnings('ignore')

class EnhancedEcosystemDataPipeline:
    """Enhanced data pipeline with feature engineering for ML models"""
    
    def __init__(self):
        self.data_dir = "."
        self.health_file = "health_scores.json"
        self.forecast_file = "forecast-output.json"
        self.world_metrics_file = "world-metrics-timeseries.json"
        
    def load_all_data_sources(self):
        """Load all available data sources"""
        print("Loading data sources for Phase 3 ML...")
        
        # Load health scores
        with open(f"{self.data_dir}/{self.health_file}", 'r') as f:
            health_data = json.load(f)
            
        # Load forecast data if available
        try:
            with open(f"{self.data_dir}/{self.forecast_file}", 'r') as f:
                forecast_data = json.load(f)
        except:
            forecast_data = {}
            
        # Load world metrics timeseries if available
        try:
            with open(f"{self.data_dir}/{self.world_metrics_file}", 'r') as f:
                timeseries_data = json.load(f)
        except:
            timeseries_data = {}
            
        return health_data, forecast_data, timeseries_data
    
    def extract_time_series_features(self, health_data):
        """Extract time-series features from health data"""
        print("Extracting time-series features...")
        
        features = []
        
        # Process each world's time series
        for world in health_data.get('worlds', []):
            world_id = world.get('world_id')
            world_name = world.get('name')
            
            snapshots = world.get('snapshots', [])
            if not snapshots:
                continue
                
            # Sort snapshots by timestamp
            snapshots.sort(key=lambda x: x.get('timestamp', ''))
            
            # Extract time-series metrics
            timestamps = []
            composites = []
            connectivities = []
            performances = []
            growths = []
            engagements = []
            
            for snapshot in snapshots:
                ts = snapshot.get('timestamp')
                scores = snapshot.get('scores', {})
                
                if ts and scores:
                    timestamps.append(pd.to_datetime(ts))
                    composites.append(scores.get('composite', 0))
                    connectivities.append(scores.get('connectivity', 0))
                    performances.append(scores.get('performance', 0))
                    growths.append(scores.get('growth', 0))
                    engagements.append(scores.get('engagement', 0))
            
            # Calculate derived features if we have at least 2 data points
            if len(timestamps) >= 2:
                # Time-series statistics
                comp_mean = np.mean(composites) if composites else 0
                comp_std = np.std(composites) if len(composites) > 1 else 0
                comp_trend = self._calculate_trend(composites)
                
                # Rate of change
                comp_roc = self._rate_of_change(composites)
                perf_roc = self._rate_of_change(performances)
                
                # Volatility (standard deviation of daily changes)
                volatility = self._calculate_volatility(composites)
                
                # Maximum drawdown (worst decline from peak)
                max_drawdown = self._max_drawdown(composites)
                
                # Feature vector for this world
                world_features = {
                    'world_id': world_id,
                    'world_name': world_name,
                    'data_points': len(timestamps),
                    'time_span_hours': self._time_span_hours(timestamps),
                    'composite_mean': round(comp_mean, 2),
                    'composite_std': round(comp_std, 2),
                    'composite_trend': round(comp_trend, 4),
                    'composite_roc': round(comp_roc, 4),
                    'performance_roc': round(perf_roc, 4),
                    'volatility': round(volatility, 4),
                    'max_drawdown': round(max_drawdown, 4),
                    'current_composite': round(composites[-1] if composites else 0, 2),
                    'stability_score': round(100 - volatility * 10 - abs(max_drawdown) * 5, 2),
                    'crisis_flag': 1 if (composites[-1] < 40 if composites else False) else 0,
                    'warning_flag': 1 if (40 <= composites[-1] < 60 if composites else False) else 0
                }
                
                features.append(world_features)
                
        return pd.DataFrame(features)
    
    def create_cross_world_features(self, health_df):
        """Create features based on cross-world relationships"""
        print("Creating cross-world relationship features...")
        
        if health_df.empty:
            return pd.DataFrame()
            
        # Ecosystem-level statistics
        ecosystem_mean = health_df['current_composite'].mean()
        ecosystem_std = health_df['current_composite'].std()
        
        # Relative performance metrics
        health_df['relative_to_mean'] = health_df['current_composite'] - ecosystem_mean
        health_df['z_score'] = (health_df['current_composite'] - ecosystem_mean) / ecosystem_std if ecosystem_std > 0 else 0
        
        # Correlation features (simplified - would need full time series)
        health_df['distance_to_best'] = health_df['current_composite'].max() - health_df['current_composite']
        health_df['distance_to_worst'] = health_df['current_composite'] - health_df['current_composite'].min()
        
        # Stability ranking
        health_df['stability_rank'] = health_df['stability_score'].rank(ascending=False)
        
        # Crisis proximity (distance to crisis threshold)
        health_df['distance_to_crisis'] = health_df['current_composite'] - 40  # Critical threshold
        
        return health_df
    
    def engineer_temporal_features(self):
        """Create temporal features (day of week, hour, etc.)"""
        print("Engineering temporal features...")
        
        now = datetime.utcnow()
        
        temporal_features = {
            'timestamp': now.isoformat(),
            'hour_of_day': now.hour,
            'day_of_week': now.weekday(),  # Monday=0
            'is_weekend': 1 if now.weekday() >= 5 else 0,
            'hour_sin': np.sin(2 * np.pi * now.hour / 24),
            'hour_cos': np.cos(2 * np.pi * now.hour / 24),
            'day_sin': np.sin(2 * np.pi * now.weekday() / 7),
            'day_cos': np.cos(2 * np.pi * now.weekday() / 7)
        }
        
        return temporal_features
    
    def prepare_ml_dataset(self):
        """Prepare complete ML dataset with all engineered features"""
        print("Preparing ML dataset for Phase 3 models...")
        
        # Load data
        health_data, forecast_data, timeseries_data = self.load_all_data_sources()
        
        # Extract features
        health_df = self.extract_time_series_features(health_data)
        
        if health_df.empty:
            print("WARNING: Insufficient data for ML feature engineering")
            return None
            
        # Add cross-world features
        health_df = self.create_cross_world_features(health_df)
        
        # Add temporal features
        temporal = self.engineer_temporal_features()
        for key, value in temporal.items():
            if key != 'timestamp':
                health_df[key] = value
        
        # Add prediction target (future health change)
        # For now, we'll use next-step prediction as target if we have forecast data
        health_df['target_7day_change'] = self._estimate_future_change(health_df, forecast_data)
        
        # Add feature importance indicators
        health_df['feature_importance_composite'] = health_df['current_composite'] / 100
        health_df['feature_importance_trend'] = abs(health_df['composite_trend'])
        health_df['feature_importance_volatility'] = health_df['volatility']
        
        print(f"Dataset prepared with {len(health_df)} samples and {len(health_df.columns)} features")
        print(f"Features: {list(health_df.columns)}")
        
        return health_df
    
    def save_ml_dataset(self, df, filename="ml_ecosystem_dataset.csv"):
        """Save ML dataset for model training"""
        if df is not None:
            df.to_csv(filename, index=False)
            print(f"ML dataset saved to {filename}")
            return filename
        return None
    
    # Helper methods
    def _calculate_trend(self, values):
        """Calculate linear trend coefficient"""
        if len(values) < 2:
            return 0
        x = np.arange(len(values))
        return np.polyfit(x, values, 1)[0]  # Linear coefficient
    
    def _rate_of_change(self, values):
        """Calculate average rate of change"""
        if len(values) < 2:
            return 0
        roc = []
        for i in range(1, len(values)):
            change = values[i] - values[i-1]
            roc.append(change)
        return np.mean(roc) if roc else 0
    
    def _calculate_volatility(self, values):
        """Calculate volatility as std of daily changes"""
        if len(values) < 2:
            return 0
        changes = [values[i] - values[i-1] for i in range(1, len(values))]
        return np.std(changes) if len(changes) > 1 else 0
    
    def _max_drawdown(self, values):
        """Calculate maximum drawdown from peak"""
        if len(values) < 2:
            return 0
        peak = values[0]
        max_dd = 0
        for value in values[1:]:
            if value > peak:
                peak = value
            dd = (peak - value) / peak if peak > 0 else 0
            if dd > max_dd:
                max_dd = dd
        return max_dd
    
    def _time_span_hours(self, timestamps):
        """Calculate time span in hours"""
        if len(timestamps) < 2:
            return 0
        return (max(timestamps) - min(timestamps)).total_seconds() / 3600
    
    def _estimate_future_change(self, health_df, forecast_data):
        """Estimate future health change based on forecasts"""
        # Simplified estimation - in practice would use forecast data
        changes = []
        for _, row in health_df.iterrows():
            # Estimate 7-day change based on current trend and volatility
            base_change = row['composite_trend'] * 7 * 24  # Project trend forward 7 days
            volatility_effect = row['volatility'] * np.random.normal(0, 1) * 5  # Random effect
            
            # Crisis/warning status affects projection
            status_effect = 0
            if row['crisis_flag'] == 1:
                status_effect = -10  # Crisis worlds tend to decline further
            elif row['warning_flag'] == 1:
                status_effect = -5   # Warning worlds tend to decline
            
            total_change = base_change + volatility_effect + status_effect
            changes.append(round(total_change, 2))
            
        return changes

# Main execution
if __name__ == "__main__":
    print("=" * 60)
    print("PHASE 3A: Enhanced Data Pipeline for Predictive AI")
    print("=" * 60)
    
    pipeline = EnhancedEcosystemDataPipeline()
    
    # Prepare ML dataset
    ml_dataset = pipeline.prepare_ml_dataset()
    
    if ml_dataset is not None:
        # Save dataset
        saved_file = pipeline.save_ml_dataset(ml_dataset)
        
        # Display sample
        print("\n" + "=" * 60)
        print("ML DATASET SAMPLE:")
        print("=" * 60)
        print(ml_dataset.head())
        
        # Display dataset statistics
        print("\n" + "=" * 60)
        print("DATASET STATISTICS:")
        print("=" * 60)
        print(f"Total samples: {len(ml_dataset)}")
        print(f"Total features: {len(ml_dataset.columns)}")
        print(f"Feature types:")
        for col in ml_dataset.columns:
            if col not in ['world_id', 'world_name']:
                print(f"  - {col}: mean={ml_dataset[col].mean():.2f}, std={ml_dataset[col].std():.2f}")
                
        print("\n" + "*" * 60)
        print("Phase 3A Data Pipeline COMPLETE")
        print(f"Dataset saved to: {saved_file}")
        print("*" * 60)
    else:
        print("ERROR: Failed to prepare ML dataset")
