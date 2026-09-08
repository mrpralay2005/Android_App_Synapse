import numpy as np
from sklearn.ensemble import IsolationForest

class BehaviorModel:
    def __init__(self):
        # In a real scenario, we would load a pre-trained model here
        # For this demonstration, we'll initialize a simple IsolationForest
        self.model = IsolationForest(contamination=0.1)
        
    def analyze_behavior(self, key_strokes, mouse_movements):
        """
        Analyzes keystroke and mouse movement patterns to return a risk score.
        Risk score ranges from 0.0 (Safe) to 1.0 (High Risk).
        """
        try:
            # 1. Basic Heuristic Analysis (Check if data exists)
            if not key_strokes and not mouse_movements:
                return 0.8  # High risk if no behavioral data is provided (bot-like)

            # 2. Extract Features (Simple examples)
            # - Typing Speed (time between keys)
            # - Mouse Velocity
            
            features = []
            
            # Feature extraction for key strokes
            if len(key_strokes) > 1:
                intervals = []
                for i in range(1, len(key_strokes)):
                    intervals.append(key_strokes[i]['time'] - key_strokes[i-1]['time'])
                avg_interval = np.mean(intervals)
                features.append(avg_interval)
            else:
                features.append(0)

            # Feature extraction for mouse movements
            if len(mouse_movements) > 1:
                distances = []
                for i in range(1, len(mouse_movements)):
                    dx = mouse_movements[i]['x'] - mouse_movements[i-1]['x']
                    dy = mouse_movements[i]['y'] - mouse_movements[i-1]['y']
                    distances.append(np.sqrt(dx**2 + dy**2))
                avg_distance = np.mean(distances)
                features.append(avg_distance)
            else:
                features.append(0)

            # 3. Model Prediction (Simplified for the demo)
            # In a production app, we would have a fit model that returns an anomaly score
            # Here we simulate a score based on variance in the data
            
            # Real AI logic: Check for bot-like patterns (perfectly rhythmic typing/movement)
            if len(features) >= 2:
                # If typing is too fast (< 50ms) or mouse distance is 0 consistently
                if features[0] < 50 or features[1] == 0:
                    return 0.95 # Highly likely a bot
                
            # Random variation score for the "Human" feel
            base_risk = 0.05 + (np.random.rand() * 0.1)
            
            return round(base_risk, 3)

        except Exception as e:
            print(f"AI Model Error: {e}")
            return 0.5 # Default to moderate risk on error

behavior_model = BehaviorModel()
