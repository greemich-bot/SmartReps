import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch from your Node.js backend on port 5001
    fetch('http://localhost:5001/api/activities')
      .then((res) => {
        if (!res.ok) throw new Error('Backend connection failed');
        return res.json();
      })
      .then((data) => {
        // Some libraries wrap the array in an object: data.activities
        const activityList = Array.isArray(data) ? data : data.activities || [];
        setActivities(activityList);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Format data for the chart (Last 7 activities)
  const chartData = activities
    .slice(0, 7)
    .map((act) => ({
      name: new Date(act.startTimeLocal).toLocaleDateString([], { weekday: 'short' }),
      miles: parseFloat((act.distance / 1609.34).toFixed(2)),
    }))
    .reverse();

  if (loading) return <div style={{ padding: '20px' }}>Syncing Garmin data...</div>;
  if (error) return <div style={{ padding: '20px', color: '#ff4b4b' }}>Error: {error}</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Fitness Overview</h1>
        <p style={{ color: '#aaa' }}>Live data from your Garmin Connect account.</p>
      </header>

      {/* Chart Section */}
      <section style={{ 
        background: '#1a1a1a', 
        padding: '20px', 
        borderRadius: '15px', 
        marginBottom: '30px',
        border: '1px solid #333'
      }}>
        <h2 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Weekly Distance (Miles)</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#2a2a2a' }}
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
              />
              <Bar dataKey="miles" fill="#646cff" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent Activities List */}
      <section>
        <h2 style={{ marginBottom: '20px' }}>Recent Activities</h2>
        <div style={{ display: 'grid', gap: '15px' }}>
          {activities.map((activity) => (
            <div 
              key={activity.activityId} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '20px', 
                background: '#1a1a1a', 
                borderRadius: '12px',
                border: '1px solid #333'
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#fff' }}>
                  {activity.activityName || activity.activityType.typeKey.replace('_', ' ')}
                </h3>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>
                  {new Date(activity.startTimeLocal).toLocaleString()}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#646cff' }}>
                  {(activity.distance / 1609.34).toFixed(2)} mi
                </div>
                <div style={{ color: '#aaa', fontSize: '0.8rem' }}>
                  {Math.floor(activity.duration / 60)} min • {activity.calories} cal
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
