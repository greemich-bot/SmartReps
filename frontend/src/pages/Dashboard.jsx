import React, { useState, useEffect } from 'react';
import '../index.css';

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5001/api/health-metrics')
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => console.error("Error fetching health metrics:", err));
  }, []);

  if (loading) return <div className="loading">Syncing Health Data...</div>;

  const healthData = [
    { label: 'Weight', value: metrics.weight, unit: 'lbs', icon: '⚖️' },
    { label: 'Readiness', value: metrics.readiness, unit: '%', icon: '⚡' },
    { label: 'Heart Rate', value: metrics.heartRate, unit: 'bpm', icon: '❤️' },
    { label: 'HRV', value: metrics.hrv, unit: 'ms', icon: '📈' }
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Health Overview</h1>
        <p>Live data synced from your Garmin account.</p>
      </header>

      <div className="bento-grid">
        {healthData.map((item) => (
          <div key={item.label} className="card card-small metric-card">
            <div className="metric-header">
              <span className="metric-icon">{item.icon}</span>
              <span className="metric-label">{item.label}</span>
            </div>
            <div className="metric-body">
              <span className="metric-value">{item.value}</span>
              <span className="metric-unit">{item.unit}</span>
            </div>
          </div>
        ))}

        {/* Placeholder for your existing Chart */}
        <section className="card card-large">
          <h2>Weekly Trend</h2>
          <div className="chart-area">
            {/* You can re-insert your BarChart here */}
            <p>Trend data visualization loading...</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
