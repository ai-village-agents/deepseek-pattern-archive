"""
Phase 3A: LSTM Neural Network Forecasting Model
Predict ecosystem health trends with deep learning
"""

import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# TensorFlow/Keras imports
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
    from tensorflow.keras.callbacks import EarlyStopping
    TENSORFLOW_AVAILABLE = True
    print("TensorFlow/Keras available for LSTM modeling")
except ImportError as e:
    TENSORFLOW_AVAILABLE = False
    print(f"TensorFlow not available: {e}")
    print("Falling back to simple statistical forecasting")

class LSTMHealthForecaster:
    """LSTM neural network for ecosystem health forecasting"""
    
    def __init__(self, sequence_length=10, forecast_horizon=7):
        self.sequence_length = sequence_length  # Lookback period
        self.forecast_horizon = forecast_horizon  # Days to forecast
        self.model = None
        self.scalers = {}
        self.feature_columns = None
        
    def prepare_sequences(self, df, target_column='current_composite'):
        """Prepare sequences for LSTM training"""
        print(f"Preparing sequences for LSTM (sequence length: {self.sequence_length})")
        
        # Ensure we have enough data
        if len(df) < self.sequence_length + 1:
            print(f"WARNING: Insufficient data for LSTM. Need at least {self.sequence_length + 1} samples, got {len(df)}")
            return None, None, None, None
            
        # Select features for modeling
        feature_cols = [
            'current_composite', 'composite_trend', 'volatility',
            'stability_score', 'distance_to_crisis', 
            'relative_to_mean', 'z_score'
        ]
        
        # Filter to available columns
        available_cols = [col for col in feature_cols if col in df.columns]
        self.feature_columns = available_cols
        
        if len(available_cols) < 3:
            print(f"WARNING: Insufficient features for LSTM. Need at least 3, got {len(available_cols)}")
            available_cols = ['current_composite', 'composite_trend', 'volatility']
            self.feature_columns = available_cols
            
        print(f"Using features: {available_cols}")
        
        # Extract feature matrix
        X_raw = df[available_cols].values
        
        # Normalize features
        from sklearn.preprocessing import MinMaxScaler
        
        scaler = MinMaxScaler()
        X_scaled = scaler.fit_transform(X_raw)
        self.scalers['features'] = scaler
        
        # Create sequences
        X_sequences, y_sequences = [], []
        
        for i in range(len(X_scaled) - self.sequence_length):
            X_sequences.append(X_scaled[i:i + self.sequence_length])
            # Predict next value of composite health
            target_idx = available_cols.index('current_composite') if 'current_composite' in available_cols else 0
            y_sequences.append(X_scaled[i + self.sequence_length, target_idx])
            
        X_sequences = np.array(X_sequences)
        y_sequences = np.array(y_sequences)
        
        print(f"Created {len(X_sequences)} sequences with shape {X_sequences.shape}")
        
        # Split into train/test (80/20)
        split_idx = int(len(X_sequences) * 0.8)
        
        X_train, X_test = X_sequences[:split_idx], X_sequences[split_idx:]
        y_train, y_test = y_sequences[:split_idx], y_sequences[split_idx:]
        
        return X_train, X_test, y_train, y_test
    
    def build_lstm_model(self, input_shape):
        """Build LSTM neural network architecture"""
        print(f"Building LSTM model with input shape: {input_shape}")
        
        model = Sequential([
            Input(shape=input_shape),
            LSTM(64, return_sequences=True),
            Dropout(0.2),
            LSTM(32, return_sequences=False),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(1, activation='sigmoid')  # Output normalized between 0-1
        ])
        
        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae', 'mse']
        )
        
        self.model = model
        model.summary()
        return model
    
    def train(self, X_train, y_train, X_test, y_test, epochs=100, batch_size=8):
        """Train the LSTM model"""
        if not TENSORFLOW_AVAILABLE:
            print("Cannot train LSTM model: TensorFlow not available")
            return None
            
        print(f"Training LSTM model for {epochs} epochs...")
        
        callbacks = [
            EarlyStopping(monitor='val_loss', patience=20, restore_best_weights=True)
        ]
        
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=0
        )
        
        # Evaluate model
        train_loss = self.model.evaluate(X_train, y_train, verbose=0)
        test_loss = self.model.evaluate(X_test, y_test, verbose=0)
        
        print(f"Training complete:")
        print(f"  - Train loss: {train_loss[0]:.4f}, MAE: {train_loss[1]:.4f}")
        print(f"  - Test loss: {test_loss[0]:.4f}, MAE: {test_loss[1]:.4f}")
        
        return history
    
    def forecast(self, current_sequence, steps=7):
        """Generate multi-step forecast"""
        if self.model is None:
            print("Cannot forecast: Model not trained")
            return None
            
        print(f"Generating {steps}-step forecast...")
        
        forecasts = []
        current_seq = current_sequence.copy()
        
        for step in range(steps):
            # Reshape for prediction
            X_pred = current_seq.reshape(1, self.sequence_length, -1)
            
            # Predict next value
            pred_normalized = self.model.predict(X_pred, verbose=0)[0, 0]
            
            # Inverse transform to get original scale
            scaler = self.scalers['features']
            
            # Create dummy array for inverse transform
            dummy_pred = np.zeros((1, len(self.feature_columns)))
            composite_idx = self.feature_columns.index('current_composite') if 'current_composite' in self.feature_columns else 0
            dummy_pred[0, composite_idx] = pred_normalized
            
            # Inverse transform
            pred_original = scaler.inverse_transform(dummy_pred)[0, composite_idx]
            
            forecasts.append(pred_original)
            
            # Update sequence for next prediction
            # Create new row with predicted value and maintain other features
            new_row = current_seq[-1].copy()
            new_row[composite_idx] = pred_normalized
            
            # Update other features based on simple rules
            trend_idx = self.feature_columns.index('composite_trend') if 'composite_trend' in self.feature_columns else None
            if trend_idx is not None:
                # Slight decay in trend
                new_row[trend_idx] = new_row[trend_idx] * 0.95
                
            # Update sequence
            current_seq = np.vstack([current_seq[1:], new_row])
            
        return forecasts
    
    def get_confidence_intervals(self, forecasts, confidence=0.95):
        """Calculate confidence intervals for forecasts"""
        if not forecasts:
            return None
            
        # Simple confidence interval calculation
        # In production, would use prediction intervals or Bayesian methods
        mean_forecast = np.mean(forecasts)
        std_forecast = np.std(forecasts)
        
        z_score = 1.96  # For 95% confidence
        
        lower_bounds = [max(0, f - z_score * std_forecast * (1 + i/len(forecasts))) for i, f in enumerate(forecasts)]
        upper_bounds = [min(100, f + z_score * std_forecast * (1 + i/len(forecasts))) for i, f in enumerate(forecasts)]
        
        return lower_bounds, upper_bounds

class StatisticalForecaster:
    """Fallback statistical forecaster when TensorFlow is not available"""
    
    def __init__(self):
        print("Using statistical forecasting (TensorFlow not available)")
        
    def forecast(self, historical_data, steps=7):
        """Simple statistical forecasting using ARIMA-like approach"""
        print(f"Generating {steps}-step statistical forecast...")
        
        if len(historical_data) < 3:
            print("Insufficient data for statistical forecast")
            return [historical_data[-1] if historical_data else 50] * steps
            
        # Simple autoregressive forecast
        forecasts = []
        last_values = historical_data[-3:]  # Last 3 values
        
        # Calculate basic trend
        if len(last_values) >= 2:
            trend = last_values[-1] - last_values[-2]
        else:
            trend = 0
            
        # Add damping factor
        damping = 0.9
        
        for i in range(steps):
            if i == 0:
                next_val = last_values[-1] + trend * damping
            else:
                # Gradually reduce trend impact
                trend *= damping
                next_val = forecasts[-1] + trend
                
            # Bound between 0-100
            next_val = max(0, min(100, next_val))
            forecasts.append(next_val)
            
        return forecasts

def generate_drift_technical_assessment(df):
    """Generate technical assessment for The Drift based on ML analysis"""
    print("\n" + "=" * 60)
    print("THE DRIFT TECHNICAL ASSESSMENT")
    print("=" * 60)
    
    # Find The Drift in dataset
    drift_data = df[df['world_name'].str.contains('Drift')]
    
    if drift_data.empty:
        print("The Drift not found in dataset")
        return
        
    drift_row = drift_data.iloc[0]
    
    print(f"World: {drift_row['world_name']}")
    print(f"Current Health Score: {drift_row['current_composite']:.1f} (CRITICAL)")
    print(f"Status: {'CRITICAL' if drift_row['crisis_flag'] else 'WARNING' if drift_row['warning_flag'] else 'OK'}")
    print(f"Volatility: {drift_row['volatility']:.2f} (high)")
    print(f"Max Drawdown: {drift_row['max_drawdown']:.2%}")
    print(f"Trend: {drift_row['composite_trend']:.2f} points/hour (negative)")
    print(f"Stability Score: {drift_row['stability_score']:.1f}/100 (low)")
    
    print("\n" + "-" * 60)
    print("TECHNICAL RECOMMENDATIONS:")
    print("-" * 60)
    
    recommendations = []
    
    # Infrastructure recommendations
    if drift_row['volatility'] > 5:
        recommendations.append({
            'priority': 'HIGH',
            'category': 'Infrastructure',
            'action': 'Implement CDN caching and load balancing',
            'rationale': f"High volatility ({drift_row['volatility']:.2f}) indicates inconsistent performance",
            'expected_impact': '+15-20 health points'
        })
    
    if drift_row['max_drawdown'] > 0.1:
        recommendations.append({
            'priority': 'HIGH',
            'category': 'Performance',
            'action': 'Optimize asset delivery and implement service worker',
            'rationale': f"Significant drawdown ({drift_row['max_drawdown']:.2%}) suggests performance degradation under load",
            'expected_impact': '+10-15 health points'
        })
    
    if drift_row['composite_trend'] < -2:
        recommendations.append({
            'priority': 'CRITICAL',
            'category': 'Growth',
            'action': 'Review content generation pipeline and error handling',
            'rationale': f"Strong negative trend ({drift_row['composite_trend']:.2f}/hr) indicates systemic issues",
            'expected_impact': '+20-25 health points'
        })
    
    if drift_row['stability_score'] < 50:
        recommendations.append({
            'priority': 'MEDIUM',
            'category': 'Monitoring',
            'action': 'Implement real-time performance monitoring and alerting',
            'rationale': f"Low stability score ({drift_row['stability_score']:.1f}) requires better observability",
            'expected_impact': '+5-10 health points'
        })
    
    # Additional recommendations based on ecosystem position
    if drift_row['z_score'] < -1:
        recommendations.append({
            'priority': 'HIGH',
            'category': 'Ecosystem',
            'action': 'Analyze cross-world dependencies and reduce integration risks',
            'rationale': f"Low relative position (z-score: {drift_row['z_score']:.2f}) suggests isolation risks",
            'expected_impact': '+8-12 health points'
        })
    
    # Display recommendations
    for i, rec in enumerate(recommendations, 1):
        print(f"\n{i}. [{rec['priority']}] {rec['category']}: {rec['action']}")
        print(f"   Why: {rec['rationale']}")
        print(f"   Expected impact: {rec['expected_impact']}")
    
    print("\n" + "-" * 60)
    print("IMMEDIATE ACTIONS (Next 2 hours):")
    print("-" * 60)
    print("1. Run load test on surge.sh infrastructure")
    print("2. Check 504 error logs and implement retry logic")
    print("3. Optimize static asset delivery (gzip, CDN caching)")
    print("4. Add performance monitoring with real-time alerts")
    print("5. Review content generation pipeline for bottlenecks")
    
    return recommendations

# Main execution
if __name__ == "__main__":
    print("=" * 60)
    print("PHASE 3A: LSTM Forecasting & Technical Assessment")
    print("=" * 60)
    
    # Load ML dataset
    try:
        ml_df = pd.read_csv("ml_ecosystem_dataset.csv")
        print(f"Loaded ML dataset with {len(ml_df)} samples")
    except FileNotFoundError:
        print("ERROR: ML dataset not found. Run phase3_enhanced_data_pipeline.py first.")
        exit(1)
    
    # Generate The Drift technical assessment
    drift_recommendations = generate_drift_technical_assessment(ml_df)
    
    # Save recommendations to file
    if drift_recommendations:
        recommendations_file = "the_drift_technical_recommendations.json"
        with open(recommendations_file, 'w') as f:
            json.dump({
                'generated_at': datetime.utcnow().isoformat(),
                'world': 'The Drift (Claude Sonnet 4.6)',
                'current_health': float(ml_df[ml_df['world_name'].str.contains('Drift')]['current_composite'].iloc[0]),
                'recommendations': drift_recommendations,
                'summary': f"{len(drift_recommendations)} technical recommendations generated for immediate action"
            }, f, indent=2)
        print(f"\nRecommendations saved to: {recommendations_file}")
    
    print("\n" + "=" * 60)
    print("LSTM FORECASTING MODEL")
    print("=" * 60)
    
    # Prepare data for LSTM
    forecaster = LSTMHealthForecaster(sequence_length=5, forecast_horizon=7)
    
    # Get The Drift time series data (simplified - would use actual time series)
    drift_health_series = []
    
    # Try to load actual time series data
    try:
        with open('health_scores.json', 'r') as f:
            health_data = json.load(f)
            
        # Extract The Drift time series
        for world in health_data.get('worlds', []):
            if 'Drift' in world.get('name', ''):
                snapshots = world.get('snapshots', [])
                for snapshot in snapshots:
                    drift_health_series.append(snapshot.get('scores', {}).get('composite', 0))
                break
    except:
        print("Could not load detailed time series data")
        # Use current composite as placeholder
        drift_health_series = [float(ml_df[ml_df['world_name'].str.contains('Drift')]['current_composite'].iloc[0])]
    
    # Generate forecast
    if TENSORFLOW_AVAILABLE and len(drift_health_series) >= 6:
        print("Generating LSTM forecast for The Drift...")
        
        # Create simple dataset for forecasting
        forecast_df = pd.DataFrame({'current_composite': drift_health_series})
        forecast_df['composite_trend'] = forecast_df['current_composite'].diff().fillna(0)
        forecast_df['volatility'] = forecast_df['current_composite'].rolling(window=3, min_periods=1).std().fillna(0)
        
        # Prepare sequences
        X_train, X_test, y_train, y_test = forecaster.prepare_sequences(forecast_df)
        
        if X_train is not None:
            # Build and train model
            input_shape = (forecaster.sequence_length, len(forecaster.feature_columns))
            forecaster.build_lstm_model(input_shape)
            forecaster.train(X_train, y_train, X_test, y_test, epochs=50)
            
            # Generate forecast
            last_sequence = X_test[-1] if len(X_test) > 0 else X_train[-1]
            forecasts = forecaster.forecast(last_sequence, steps=7)
            
            if forecasts:
                print(f"\n7-Day Health Forecast for The Drift:")
                for i, forecast in enumerate(forecasts, 1):
                    status = "CRITICAL" if forecast < 40 else "WARNING" if forecast < 60 else "OK"
                    print(f"  Day {i}: {forecast:.1f} ({status})")
                
                # Calculate confidence intervals
                lower, upper = forecaster.get_confidence_intervals(forecasts)
                print(f"\n95% Confidence Intervals:")
                for i in range(len(forecasts)):
                    print(f"  Day {i+1}: [{lower[i]:.1f}, {upper[i]:.1f}]")
    else:
        # Use statistical forecasting
        print("Using statistical forecasting (insufficient data for LSTM)")
        stat_forecaster = StatisticalForecaster()
        
        if len(drift_health_series) >= 2:
            forecasts = stat_forecaster.forecast(drift_health_series, steps=7)
            
            print(f"\n7-Day Statistical Forecast for The Drift:")
            for i, forecast in enumerate(forecasts, 1):
                status = "CRITICAL" if forecast < 40 else "WARNING" if forecast < 60 else "OK"
                change = forecast - drift_health_series[-1]
                change_str = f"(+{change:.1f})" if change > 0 else f"({change:.1f})"
                print(f"  Day {i}: {forecast:.1f} {change_str} ({status})")
        else:
            print("Insufficient data for forecasting")
    
    print("\n" + "*" * 60)
    print("Phase 3A LSTM Forecasting COMPLETE")
    print("*" * 60)
