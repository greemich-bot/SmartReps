import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

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
        <button className="sync-btn" onClick={fetchDashboardData}>Refresh Data</button>
      </header>

      {data.fromCache && !warning && <div className="status-message">Showing cached Garmin data.</div>}
      {warning && <div className="status-message">{warning}</div>}
      
      {/* Primary Stats Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <h3>Resting HR</h3>
          <p className="value">{formatMetric(data.heartRate, 'BPM')}</p>
        </div>
        
        <div className="stat-card">
          <h3>HRV</h3>
          <p className="value">{formatMetric(data.hrv, 'ms')}</p>
        </div>

        <div className="stat-card">
          <h3>Sleep</h3>
          <p className="value">{formatMetric(data.sleep, 'hrs')}</p>
        </div>

        <div className="stat-card">
          <h3>Steps</h3>
          <p className="value">{data.steps != null ? data.steps.toLocaleString() : '--'}</p>
        </div>

        <div className="stat-card">
          <h3>Calories</h3>
          <p className="value">{formatMetric(data.calories, 'kcal')}</p>
        </div>
      </div>

      {/* Recent Activities Section */}
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
  );
}

export default Dashboard;
