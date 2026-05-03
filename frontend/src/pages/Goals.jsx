import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Goals.css';

const API = 'http://localhost:5001/api/user-goals';

const GOALS = [
  { id: 'lose_weight',      label: 'Lose Weight',            icon: '⚖️',  description: 'Reduce body fat through cardio and a calorie deficit.' },
  { id: 'build_muscle',     label: 'Build Muscle',           icon: '💪',  description: 'Increase strength and muscle mass with resistance training.' },
  { id: 'improve_endurance',label: 'Improve Endurance',     icon: '🏃',  description: 'Boost cardiovascular fitness and stamina over time.' },
  { id: 'sleep_better',     label: 'Sleep Better',           icon: '😴',  description: 'Optimise recovery with consistent, quality sleep habits.' },
  { id: 'flexibility',      label: 'Flexibility & Mobility', icon: '🧘',  description: 'Improve range of motion and reduce injury risk.' },
  { id: 'step_count',       label: 'Hit a Daily Step Goal',  icon: '👟',  description: 'Stay active throughout the day by reaching a step target.' },
];

function Goals() {
  const [selected, setSelected] = useState(() => {
    try { return JSON.parse(localStorage.getItem('smartreps_goals') || '[]'); }
    catch { return []; }
  });
  const [saving, setSaving] = useState(false);

  // Load from MongoDB on mount
  useEffect(() => {
    axios.get(API)
      .then(res => {
        const ids = res.data.goalIds || [];
        setSelected(ids);
        localStorage.setItem('smartreps_goals', JSON.stringify(ids));
      })
      .catch(() => { /* keep localStorage values on error */ });
  }, []);

  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter(g => g !== id)
      : [...selected, id];

    setSelected(next);
    localStorage.setItem('smartreps_goals', JSON.stringify(next));

    setSaving(true);
    axios.put(API, { goalIds: next })
      .catch(() => { /* silent — localStorage already updated */ })
      .finally(() => setSaving(false));
  };

  return (
    <div className="goals-container">
      <header className="goals-header">
        <h1>My Fitness Goals</h1>
        <p>Select the goals you want to focus on.</p>
      </header>

      <div className="goals-grid">
        {GOALS.map(goal => (
          <button
            key={goal.id}
            className={`goal-tile${selected.includes(goal.id) ? ' selected' : ''}`}
            onClick={() => toggle(goal.id)}
          >
            <span className="goal-icon">{goal.icon}</span>
            <span className="goal-label">{goal.label}</span>
            <span className="goal-desc">{goal.description}</span>
            {selected.includes(goal.id) && <span className="goal-check">✓</span>}
          </button>
        ))}
      </div>

      <p className="goals-summary">
        {saving ? 'Saving…' : selected.length > 0 ? `${selected.length} goal${selected.length > 1 ? 's' : ''} selected` : ''}
      </p>
    </div>
  );
}

export default Goals;

