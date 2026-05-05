import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './WeightTrend.css';

const BASE = 'http://localhost:5001';

function WeightTrend() {
  const [garminEntries, setGarminEntries] = useState([]);
  const [manualEntries, setManualEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), weightLbs: '' });
  const [saving, setSaving] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [status, setStatus] = useState('');

  const fetchManual = () =>
    axios.get(`${BASE}/api/weight-log`).then((res) => setManualEntries(res.data?.entries || []));

  useEffect(() => {
    Promise.allSettled([
      axios.get(`${BASE}/api/weight-trend?days=90`),
      axios.get(`${BASE}/api/weight-log`)
    ]).then(([garminRes, manualRes]) => {
      if (garminRes.status === 'fulfilled') setGarminEntries(garminRes.value.data?.entries || []);
      else setError('Unable to load Garmin weight trend.');
      if (manualRes.status === 'fulfilled') setManualEntries(manualRes.value.data?.entries || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.weightLbs) return;
    setSaving(true);
    setStatus('');
    try {
      await axios.post(`${BASE}/api/weight-log`, { date: form.date, weightLbs: form.weightLbs });
      await fetchManual();
      setForm((f) => ({ ...f, weightLbs: '' }));
      setStatus('Saved.');
    } catch {
      setStatus('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async () => {
    if (!manualEntries.length) return;
    setReverting(true);
    setStatus('');
    try {
      await axios.delete(`${BASE}/api/weight-log/latest`);
      await fetchManual();
      setStatus('Last entry removed.');
    } catch {
      setStatus('Failed to remove entry.');
    } finally {
      setReverting(false);
    }
  };

  // Merge garmin + manual entries, sorted by date
  const allEntries = [
    ...garminEntries.map((e) => ({ date: e.date, weight: e.weight, source: 'garmin' })),
    ...manualEntries.map((e) => ({ date: e.date, weight: e.weightLbs, source: 'manual' }))
  ].sort((a, b) => a.date.localeCompare(b.date));

  const showChart = allEntries.length >= 2;

  let chartEl = null;
  if (showChart) {
    const w = 760;
    const h = 240;
    const pad = 24;
    const weights = allEntries.map((e) => e.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = max - min || 1;

    const points = allEntries.map((e, i) => ({
      x: pad + (i / (allEntries.length - 1)) * (w - pad * 2),
      y: pad + (1 - (e.weight - min) / range) * (h - pad * 2),
      date: e.date,
      weight: e.weight,
      source: e.source
    }));

    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
    const first = allEntries[0];
    const last = allEntries[allEntries.length - 1];
    const delta = +(last.weight - first.weight).toFixed(1);

    chartEl = (
      <>
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
            <circle
              key={`${p.date}-${idx}`}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill={p.source === 'manual' ? '#34d399' : 'var(--primary)'}
              stroke={p.source === 'manual' ? '#34d399' : 'var(--primary)'}
            />
          ))}
        </svg>

        <div className="weighttrend-axis">
          <span>{new Date(first.date).toLocaleDateString()}</span>
          <div className="weighttrend-legend">
            <span className="legend-dot garmin" /> Garmin
            <span className="legend-dot manual" /> Manual
          </div>
          <span>{new Date(last.date).toLocaleDateString()}</span>
        </div>
      </>
    );
  } else if (!loading) {
    chartEl = (
      <p className="weighttrend-empty">
        Log at least 2 weight entries to see your trend chart.
      </p>
    );
  }

  return (
    <section className="weighttrend-card">
      {!showChart && <h3>Weight Trend (Last 90 Days)</h3>}
      {loading && <p className="weighttrend-empty">Loading trend...</p>}
      {error && <p className="weighttrend-empty">{error}</p>}
      {chartEl}

      <div className="weightlog-form-section">
        <h4 className="weightlog-form-title">Log Weight Manually</h4>
        <form className="weightlog-form" onSubmit={handleSave}>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
          <input
            type="number"
            placeholder="Weight (lbs)"
            value={form.weightLbs}
            min="50"
            max="1500"
            step="0.1"
            onChange={(e) => setForm((f) => ({ ...f, weightLbs: e.target.value }))}
            required
          />
          <button type="submit" disabled={saving} className="weightlog-btn save">
            {saving ? 'Saving...' : 'Save'}
          </button>
          {manualEntries.length > 0 && (
            <button
              type="button"
              disabled={reverting}
              className="weightlog-btn revert"
              onClick={handleRevert}
            >
              {reverting ? 'Removing...' : 'Remove Last'}
            </button>
          )}
        </form>
        {status && <p className="weightlog-status">{status}</p>}
      </div>

      {manualEntries.length > 0 && (
        <div className="weightlog-list">
          <h4 className="weightlog-list-title">Manual Entries</h4>
          <div className="weightlog-entries">
            {[...manualEntries].reverse().slice(0, 8).map((e) => (
              <div key={e.id} className="weightlog-entry">
                <span className="weightlog-entry-date">
                  {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="weightlog-entry-val">{e.weightLbs} lbs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default WeightTrend;
