import { useState, useEffect } from 'react';

export default function Exercises() {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5001/api/activities')
      .then(res => res.json())
      .then(data => {
        const activities = Array.isArray(data) ? data : data.activities || [];
        generateRecommendation(activities[0]); // Look at the most recent activity
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const generateRecommendation = (lastActivity) => {
    if (!lastActivity) {
      setSuggestion({
        title: "Fresh Start!",
        desc: "No recent data found. Let's kick things off with a 20-minute light jog.",
        type: "Cardio"
      });
      return;
    }

    const type = lastActivity.activityType.typeKey;
    const distanceMiles = lastActivity.distance / 1609.34;

    if (type.includes('running') && distanceMiles > 5) {
      setSuggestion({
        title: "Deep Recovery Stretch",
        desc: "You crushed a long run! Focus on your hamstrings and hip flexors today.",
        type: "Recovery"
      });
    } else if (type.includes('cycling')) {
      setSuggestion({
        title: "Upper Body Strength",
        desc: "Your legs did the work recently. Time to focus on chest and back.",
        type: "Strength"
      });
    } else {
      setSuggestion({
        title: "Core Stability",
        desc: "A strong core supports every activity. Try a 15-minute plank and leg-raise circuit.",
        type: "Core"
      });
    }
  };

  if (loading) return <div>Analyzing your Garmin data...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '10px' }}>Personalized Suggestions</h1>
      <p style={{ color: '#aaa', marginBottom: '30px' }}>Based on your recent Garmin performance.</p>

      {suggestion ? (
        <div style={{ 
          background: '#1a1a1a', 
          padding: '40px', 
          borderRadius: '20px', 
          border: '2px solid #646cff',
          boxShadow: '0 10px 30px rgba(100, 108, 255, 0.2)'
        }}>
          <span style={{ 
            backgroundColor: '#646cff', 
            padding: '5px 15px', 
            borderRadius: '20px', 
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>
            {suggestion.type.toUpperCase()}
          </span>
          <h2 style={{ marginTop: '15px', color: '#fff' }}>{suggestion.title}</h2>
          <p style={{ color: '#ccc', lineHeight: '1.6', fontSize: '1.1rem' }}>{suggestion.desc}</p>
          
          <button style={{ 
            marginTop: '25px',
            padding: '12px 30px',
            borderRadius: '10px',
            backgroundColor: '#fff',
            color: '#000',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer'
          }}>
            Start Workout
          </button>
        </div>
      ) : (
        <p>Go for a move first to get a suggestion!</p>
      )}
    </div>
  );
}
