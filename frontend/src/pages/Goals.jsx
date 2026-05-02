import { useState, useEffect } from 'react';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. Fetch goals from MongoDB on load
  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/goals');
      const data = await response.json();
      setGoals(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    }
  };

  // 2. Save a new goal to MongoDB
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;

    try {
      const response = await fetch('http://localhost:5001/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newGoalText }),
      });
      const savedGoal = await response.json();
      setGoals([savedGoal, ...goals]); // Add to top of list
      setNewGoalText(''); // Clear input
    } catch (err) {
      console.error("Failed to save goal:", err);
    }
  };

  // 3. Delete a goal from MongoDB
  const handleDeleteGoal = async (id) => {
    try {
      await fetch(`http://localhost:5001/api/goals/${id}`, { method: 'DELETE' });
      setGoals(goals.filter(goal => goal._id !== id));
    } catch (err) {
      console.error("Failed to delete goal:", err);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>Set Fitness Goals</h1>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>What are you working toward this week?</p>

      {/* Input Form */}
      <form onSubmit={handleAddGoal} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <input 
          type="text" 
          placeholder="e.g. Run 15 miles total" 
          value={newGoalText}
          onChange={(e) => setNewGoalText(e.target.value)}
          style={{ 
            flex: 1, 
            padding: '12px', 
            borderRadius: '8px', 
            border: '1px solid #333', 
            backgroundColor: '#1a1a1a', 
            color: 'white' 
          }}
        />
        <button 
          type="submit" 
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#646cff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Add Goal
        </button>
      </form>

      {/* Goals List */}
      {loading ? (
        <p>Loading your goals...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {goals.length === 0 && <p style={{ color: '#555' }}>No goals set yet. Start by adding one above!</p>}
          {goals.map((goal) => (
            <div 
              key={goal._id} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '15px', 
                backgroundColor: '#1a1a1a', 
                borderRadius: '8px', 
                border: '1px solid #333' 
              }}
            >
              <span>{goal.text}</span>
              <button 
                onClick={() => handleDeleteGoal(goal._id)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#ff4b4b', 
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
