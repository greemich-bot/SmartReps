import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';
import TodaysStats from '../components/TodaysStats';
import RecentActivities from '../components/RecentActivities';
import { Weight } from 'lucide-react';
import WeightTrend from '../components/WeightTrend';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

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
        <TodaysStats data={data} />
        <RecentActivities activities={data.recentActivities} />
      </div>
      <WeightTrend/>
    </div>
    
  );
}

export default Dashboard;
