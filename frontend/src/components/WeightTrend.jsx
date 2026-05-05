import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './WeightTrend.css';

const API = 'http://localhost:5001/api/weight-trend?days=90';

function WeightTrend() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(API)
      .then((res) => {
        setEntries(res.data?.entries || []);
      })
      .catch(() => {
        setError('Unable to load weight trend right now.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="weighttrend-card">
        <h3>Weight Trend (Last 90 Days)</h3>
        <p className="weighttrend-empty">Loading trend...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="weighttrend-card">
        <h3>Weight Trend (Last 90 Days)</h3>
        <p className="weighttrend-empty">{error}</p>
      </section>
    );
  }

  if (entries.length < 2) {
    return (
      <section className="weighttrend-card">
        <h3>Weight Trend (Last 90 Days)</h3>
        <p className="weighttrend-empty">Not enough weight entries yet. Add more weigh-ins in Garmin to see your trend.</p>
      </section>
    );
  }

  const w = 760;
  const h = 240;
  const pad = 24;
  const weights = entries.map((e) => e.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const points = entries.map((e, i) => {
    const x = pad + (i / (entries.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (e.weight - min) / range) * (h - pad * 2);
    return { x, y, date: e.date, weight: e.weight };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const first = entries[0];
  const last = entries[entries.length - 1];
  const delta = +(last.weight - first.weight).toFixed(1);

  return (
    <section className="weighttrend-card">
      <div className="weighttrend-header">
        <h3>Weight Trend (Last 90 Days)</h3>
        <span className={`weighttrend-delta ${delta <= 0 ? 'down' : 'up'}`}>
          {delta > 0 ? `+${delta}` : `${delta}`} lbs
        </span>
      </div>

      <svg className="weighttrend-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="90 day weight trend">
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, idx) => (
          <circle key={`${p.date}-${idx}`} cx={p.x} cy={p.y} r="2.2" fill="var(--primary)" />
        ))}
      </svg>

      <div className="weighttrend-axis">
        <span>{new Date(first.date).toLocaleDateString()}</span>
        <strong>Latest: {last.weight} lbs</strong>
        <span>{new Date(last.date).toLocaleDateString()}</span>
      </div>
    </section>
  );
}

export default WeightTrend;
