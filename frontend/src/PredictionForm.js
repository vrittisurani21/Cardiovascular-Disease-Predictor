import React, { useState } from "react";
import "./PredictionForm.css";

// In production (Vercel) the API is at /api; in dev it's the Flask server on port 5000
const API_BASE =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");
const API_URL = API_BASE ? `${API_BASE.replace(/\/$/, "")}` : "/api";

function PredictionForm() {
  const [formData, setFormData] = useState({
    gender: "",
    weight: "",
    height: "",
    ap_hi: "",
    ap_lo: "",
    cholesterol: "",
    gluc: "",
    smoke: "",
    alco: "",
    active: "",
    age_years: "",
  });

  const [prediction, setPrediction] = useState(null);
  const [riskPercentage, setRiskPercentage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
    setPrediction(null);
    setRiskPercentage(null);
  };

  const buildPayload = () => {
    const w = Number(formData.weight);
    const h = Number(formData.height) / 100; // height in meters for BMI
    const ap_hi = Number(formData.ap_hi);
    const ap_lo = Number(formData.ap_lo);
    const active = Number(formData.active);
    const smoke = Number(formData.smoke);
    const alco = Number(formData.alco);
    const cholesterol = Number(formData.cholesterol);
    const gluc = Number(formData.gluc);

    const bmi = h > 0 ? w / (h * h) : 0;
    const pulse_pressure = ap_hi - ap_lo;
    const health_index = active * 1 - smoke * 0.5 - alco * 0.5;
    const cholesterol_gluc_interaction = cholesterol * gluc;

    return {
      gender: Number(formData.gender),
      weight: w,
      ap_hi,
      ap_lo,
      cholesterol,
      gluc,
      smoke,
      alco,
      active,
      age_years: Number(formData.age_years),
      bmi: Math.round(bmi * 100) / 100,
      pulse_pressure,
      health_index,
      cholesterol_gluc_interaction,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setPrediction(null);
    setRiskPercentage(null);
    setLoading(true);

    try {
      const payload = buildPayload();
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error || `Request failed (${response.status})`);
        return;
      }

      if (result.prediction === undefined) {
        setError("Invalid response from server");
        return;
      }

      setPrediction(result.prediction);
      if (result.risk_percentage !== undefined && result.risk_percentage !== null) {
        // backend sends 0..100
        setRiskPercentage(Number(result.risk_percentage));
      } else if (result.risk_probability !== undefined && result.risk_probability !== null) {
        // fallback if backend sends 0..1
        setRiskPercentage(Number(result.risk_probability) * 100);
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot reach server. Is Flask running on port 5000?"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const getRiskLabel = (pct) => {
    if (pct === null || Number.isNaN(pct)) return null;
    if (pct < 33) return "Low";
    if (pct < 66) return "Medium";
    return "High";
  };

  return (
    <div className="prediction-form-wrapper">
      <div className="prediction-form-card">
        <header className="form-header">
          <h1>Cardiovascular Disease Risk</h1>
          <p>Enter your health metrics to get a prediction from our ML model.</p>
        </header>

        <form onSubmit={handleSubmit} className="prediction-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                <option value="0">Male</option>
                <option value="1">Female</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="age_years">Age (years)</label>
              <input
                id="age_years"
                type="number"
                name="age_years"
                min="1"
                max="120"
                placeholder="e.g. 45"
                value={formData.age_years}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="weight">Weight (kg)</label>
              <input
                id="weight"
                type="number"
                name="weight"
                min="20"
                max="300"
                step="0.1"
                placeholder="e.g. 70"
                value={formData.weight}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="height">Height (cm)</label>
              <input
                id="height"
                type="number"
                name="height"
                min="100"
                max="250"
                placeholder="e.g. 170"
                value={formData.height}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ap_hi">Systolic BP (ap_hi)</label>
              <input
                id="ap_hi"
                type="number"
                name="ap_hi"
                min="60"
                max="250"
                placeholder="e.g. 120"
                value={formData.ap_hi}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ap_lo">Diastolic BP (ap_lo)</label>
              <input
                id="ap_lo"
                type="number"
                name="ap_lo"
                min="40"
                max="180"
                placeholder="e.g. 80"
                value={formData.ap_lo}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="cholesterol">Cholesterol (1–3)</label>
              <select
                id="cholesterol"
                name="cholesterol"
                value={formData.cholesterol}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                <option value="1">Normal</option>
                <option value="2">Above normal</option>
                <option value="3">Well above normal</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="gluc">Glucose (1–3)</label>
              <select
                id="gluc"
                name="gluc"
                value={formData.gluc}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                <option value="1">Normal</option>
                <option value="2">Above normal</option>
                <option value="3">Well above normal</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="smoke">Smoker</label>
              <select
                id="smoke"
                name="smoke"
                value={formData.smoke}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="alco">Alcohol intake</label>
              <select
                id="alco"
                name="alco"
                value={formData.alco}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="active">Physically active</label>
              <select
                id="active"
                name="active"
                value={formData.active}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Predicting…" : "Predict"}
          </button>
        </form>

        {prediction !== null && (
          <div className={`result-card result-${prediction === 1 ? "positive" : "negative"}`}>
            <span className="result-label">Prediction</span>
            <span className="result-value">
              {riskPercentage !== null
                ? `${getRiskLabel(riskPercentage)} cardiovascular disease risk`
                : prediction === 1
                ? "Cardiovascular disease risk detected"
                : "No cardiovascular disease risk detected"}
            </span>
            {riskPercentage !== null && (
              <p className="result-disclaimer">
                Estimated risk probability: <strong>{riskPercentage.toFixed(1)}%</strong>
              </p>
            )}
            <p className="result-disclaimer">
              This is a model prediction, not a medical diagnosis. Please consult a healthcare provider.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PredictionForm;
