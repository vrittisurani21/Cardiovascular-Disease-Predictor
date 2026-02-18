from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

app = Flask(__name__)

# Allow the React dev server to call this API
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://cardiovascular-disease-predictor-vs.vercel.app",
            "http://localhost:3000"
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Load the model and feature columns once at startup (simple and explicit)
model_data = joblib.load("cardio_model.pkl")
model = model_data["model"]
model_columns = model_data["columns"]

@app.route("/")
def home():
    return "API is running successfully"


@app.route("/predict", methods=["POST"])
def predict():
    # The frontend already sends all engineered features.
    data = request.get_json()

    # Build a single-row DataFrame from the incoming JSON.
    # These keys match what PredictionForm.js sends in buildPayload().
    input_df = pd.DataFrame(
        [
            {
                "gender": data["gender"],
                "weight": data["weight"],
                "ap_hi": data["ap_hi"],
                "ap_lo": data["ap_lo"],
                "cholesterol": data["cholesterol"],
                "gluc": data["gluc"],
                "smoke": data["smoke"],
                "alco": data["alco"],
                "active": data["active"],
                "age_years": data["age_years"],
                "bmi": data["bmi"],
                "pulse_pressure": data["pulse_pressure"],
                "health_index": data["health_index"],
                "cholesterol_gluc_interaction": data[
                    "cholesterol_gluc_interaction"
                ],
            }
        ]
    )

    # Ensure columns are in the same order as during training
    input_df = input_df[model_columns]

    # Run the model
    prob = float(model.predict_proba(input_df)[0][1])
    risk_probability = prob
    risk_percentage = round(prob * 100, 2)
    prediction = 1 if prob >= 0.5 else 0

    return jsonify(
        {
            "prediction": int(prediction),
            "risk_probability": risk_probability,
            "risk_percentage": risk_percentage,
        }
    )


if __name__ == "__main__":
    # Keep it simple: dev setup on localhost:5000
    app.run(debug=True, port=5000)