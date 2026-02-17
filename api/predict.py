from http.server import BaseHTTPRequestHandler
import json
import os

import joblib
import pandas as pd


#
# This file implements the /api/predict endpoint for Vercel.
# It mirrors the behavior of your local Flask /predict route.
#
# IMPORTANT: Place cardio_model.pkl in the same folder as this file
# before deploying to Vercel.
#

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "cardio_model.pkl")

model_data = joblib.load(MODEL_PATH)
model = model_data["model"]
model_columns = model_data["columns"]


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")

        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):  # noqa: N802 (Vercel requires this name)
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
            data = json.loads(raw_body.decode("utf-8") or "{}")
        except Exception:
            self._send_json(400, {"error": "Invalid JSON body"})
            return

        # Build the same payload shape as in backend/app.py and PredictionForm.buildPayload()
        try:
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
        except KeyError as exc:
            missing = str(exc).strip("'")
            self._send_json(400, {"error": f"Missing field: {missing}"})
            return

        input_df = input_df[model_columns]

        # Same prediction logic as local Flask app
        prob = float(model.predict_proba(input_df)[0][1])
        risk_probability = prob
        risk_percentage = round(prob * 100, 2)
        prediction = 1 if prob >= 0.5 else 0

        self._send_json(
            200,
            {
                "prediction": int(prediction),
                "risk_probability": risk_probability,
                "risk_percentage": risk_percentage,
            },
        )

