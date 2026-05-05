import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

function HrvSparkline({ values, trend }) {
  if (!values || values.length < 2) return null;
  const w = 80, h = 32, pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const color = trend === 'up' ? '#34d399' : trend === 'down' ? '#f87171' : '#a0a0a0';
  return (
    <svg width={w} height={h} className="hrv-sparkline">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  const formatMetric = (value, suffix = '') => {
    if (value === null || value === undefined) return `--${suffix ? ` ${suffix}` : ''}`;
    return `${value}${suffix ? ` ${suffix}` : ''}`;
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    const endpoint = source === 'export'
      ? 'http://localhost:5001/api/dashboard-data?source=export'
      : 'http://localhost:5001/api/dashboard-data';

    axios.get(endpoint)
      .then(res => {
        setData(res.data);
        setError(null);
        setWarning(res.data.warning || null);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching Garmin data:", err);
        setError(err?.response?.data?.error || "Unable to sync with Garmin. Check server logs.");
        setLoading(false);
      });
  };

  if (loading) return <div className="status-message">🔄 Syncing with Garmin...</div>;
  if (error) return <div className="status-message error">❌ {error}</div>;
  if (!data) return <div className="status-message">No data available.</div>;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Health Overview</h1>
        <button className="sync-btn" data-tooltip="By updating your Garmin data, we are able to personalize your workout recommendations, so you know when to push a little harder, and when to let up a little bit!" onClick={fetchDashboardData}>Refresh Data</button>
      </header>

    

      <div className="dashboard-body">
        {/* Stats column */}
        <div className="stats-panel">
        <div className="stat-grid">
          <h2 className="panel-title">Today's Stats </h2>
          <div className="stat-card">
            <h3>
              Resting HR
              <span
                className="stat-info"
                data-tooltip="Your heart rate while at rest. Lower is generally better — a sign of cardiovascular fitness."
              >ⓘ</span>
            </h3>
            <p className="value">{formatMetric(data.heartRate, 'BPM')}</p>
          </div>

          <div className="stat-card">
            <h3>
              HRV
              <span
                className="stat-info"
                data-tooltip="Heart Rate Variability — the time variation between heartbeats. Higher HRV = better recovery and readiness."
              >ⓘ</span>
            </h3>
            <p className="value">{formatMetric(data.hrv, 'ms')}</p>
            <HrvSparkline values={data.hrvValues} trend={data.hrvTrend} />
            {data.hrvTrend && (
              <p className="hrv-trend" data-trend={data.hrvTrend}>
                {data.hrvTrend === 'up' ? '↑ Improving' : data.hrvTrend === 'down' ? '↓ Declining' : '→ Stable'}
              </p>
            )}
          </div>

          <div className="stat-card">
            <h3>
              Sleep
              <span
                className="stat-info"
                data-tooltip="Total sleep duration last night from your Garmin. Adults need 7–9 hrs for optimal recovery."
              >ⓘ</span>
            </h3>
            <p className="value">{formatMetric(data.sleep, 'hrs')}</p>
          </div>

          <div className="stat-card">
            <h3>
              Steps
              <span
                className="stat-info"
                data-tooltip="Total steps taken today. 7,000–10,000 steps per day is linked to improved cardiovascular health."
              >ⓘ</span>
            </h3>
            <p className="value">{data.steps != null ? data.steps.toLocaleString() : '--'}</p>
          </div>

          <div className="stat-card">
            <h3>
              Calories
              <span
                className="stat-info"
                data-tooltip="Active calories burned today. Does not include your basal metabolic rate (calories burned at rest)."
              >ⓘ</span>
            </h3>
            <p className="value">{formatMetric(data.calories, 'kcal')}</p>
          </div>
        </div>
        </div>

        {/* Activities column */}
        <div className="activities-panel">
        <section className="activities-section">
          <h2>Recent Activities</h2>
          <div className="activities-list">
            {data.recentActivities && data.recentActivities.length > 0 ? (
              data.recentActivities.map((act) => (
                <div key={act.id} className="activity-card">
                  <div className="activity-main">
                    <span className="activity-date">{act.date}</span>
                    <strong className="activity-name">{act.name}</strong>
                    <span className="activity-type">{act.type.replace('_', ' ')}</span>
                  </div>
                  <div className="activity-data">
                    <span className="activity-distance">{act.distance} miles</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No workouts recorded in the last few days.</p>
            )}
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
