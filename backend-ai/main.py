from fastapi import FastAPI
from pydantic import BaseModel
from services.behavior_model import behavior_model

app = FastAPI(title="SynapseX AI Brain")

class UserBehavior(BaseModel):
    email: str
    key_strokes: list = []
    mouse_movements: list = []

@app.get("/")
def read_root():
    return {"message": "AI Backend for Risk Analysis is running"}

@app.post("/analyze-risk")
def analyze_risk(behavior: UserBehavior):
    # Process behavior using the AI model
    risk_score = behavior_model.analyze_behavior(
        behavior.key_strokes, 
        behavior.mouse_movements
    )
    
    action = "allow" if risk_score < 0.7 else "deny"
    
    return {
        "email": behavior.email,
        "risk_score": risk_score,
        "action": action
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
