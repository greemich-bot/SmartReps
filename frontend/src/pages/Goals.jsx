import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Goals.css';
import MaxLog from '../components/MaxLog';
import WeightTrend from '../components/WeightTrend';

const API = 'http://localhost:5001/api/user-goals';
const SAVE_WARNING = 'If you deselect a goal, it will be removed from your active goals, and you may be unable to view your progress';

const GOALS = [
  { id: 'lose_weight',      label: 'Lose Weight',            description: 'Reduce body fat through cardio and a calorie deficit.' },
  { id: 'build_muscle',     label: 'Build Muscle',           description: 'Increase strength and muscle mass with resistance training.' },
  { id: 'improve_endurance',label: 'Improve Endurance',      description: 'Boost cardiovascular fitness and stamina over time.' },
  { id: 'sleep_better',     label: 'Sleep Better',           description: 'Optimise recovery with consistent, quality sleep habits.' },
  { id: 'flexibility',      label: 'Flexibility & Mobility', description: 'Improve range of motion and reduce injury risk.' },
  { id: 'step_count',       label: 'Hit a Daily Step Goal',  description: 'Stay active throughout the day by reaching a step target.' },
];

function Goals() {
  const [selected, setSelected] = useState([]);
  const [draft, setDraft] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedGoals = GOALS.filter(goal => selected.includes(goal.id));

  useEffect(() => {
    axios.get(API)
      .then(res => {
        const goals = res.data.goalIds || [];
        setSelected(goals);
        setDraft(goals);
      })
      .catch(() => {});
  }, []);

  const toggleDraft = (id) => {
    const next = draft.includes(id) ? draft.filter(g => g !== id) : [...draft, id];
    setDraft(next);
  };

  const openMenu = () => {
    setDraft(selected);
    setIsMenuOpen(true);
  };

  const cancelMenu = () => {
    setDraft(selected);
    setIsMenuOpen(false);
  };

  const saveGoals = async () => {
    const confirmed = window.confirm(SAVE_WARNING);
    if (!confirmed) return;

    setSaving(true);
    try {
      await axios.put(API, { goalIds: draft });
      setSelected(draft);
      setIsMenuOpen(false);
    } catch {
      setDraft(selected);
    }
    setSaving(false);
  };

  return (
    <div className="goals-container">
      <header className="goals-header">
        <h1>My Fitness Goals</h1>
        <p>Use the goals menu to update what you are focusing on.</p>
      </header>

      <div className="goals-toolbar">
        <button className="goals-menu-btn" onClick={openMenu}>Open Goals Menu</button>
      </div>

      {selectedGoals.length > 0 ? (
        <div className="goals-grid">
          {selectedGoals.map(goal => (
            <div
              key={goal.id}
              className="goal-tile readonly selected"
            >
              <span className="goal-label">{goal.label}</span>
              <span className="goal-desc">{goal.description}</span>
              <span className="goal-check">✓</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="goals-summary">No goals selected yet. Use Open Goals Menu to choose your goals.</p>
      )}

      {selected.length > 0 && (
        <p className="goals-summary">{selected.length} goal{selected.length > 1 ? 's' : ''} selected</p>
      )}

      {selected.includes('lose_weight') && <WeightTrend />}
      {selected.includes('build_muscle') && <MaxLog />}

      {isMenuOpen && (
        <div className="goals-menu-overlay" role="dialog" aria-modal="true">
          <div className="goals-menu-card">
            <div className="goals-menu-header">
              <h2>Edit Goals</h2>
              <button className="menu-close-btn" onClick={cancelMenu}>Close</button>
            </div>

            <div className="goals-grid">
              {GOALS.map(goal => (
                <button
                  key={goal.id}
                  className={`goal-tile${draft.includes(goal.id) ? ' selected' : ''}`}
                  onClick={() => toggleDraft(goal.id)}
                >
                  <span className="goal-label">{goal.label}</span>
                  <span className="goal-desc">{goal.description}</span>
                  {draft.includes(goal.id) && <span className="goal-check">✓</span>}
                </button>
              ))}
            </div>

            <div className="goals-menu-actions">
              <button className="menu-cancel-btn" onClick={cancelMenu} disabled={saving}>Cancel</button>
              <button className="menu-save-btn" onClick={saveGoals} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Goals;
