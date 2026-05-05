import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Exercises.css';

const WORKOUTS_BY_GOAL = {
  lose_weight: [
    { name: 'HIIT Intervals',       duration: '20 min', intensity: 'High',   desc: 'Alternating 40s work / 20s rest bursts to torch calories.' },
    { name: 'Brisk Walk / Jog',     duration: '30 min', intensity: 'Low',    desc: 'Steady-state cardio in the fat-burning zone.' },
    { name: 'Jump Rope Circuit',    duration: '15 min', intensity: 'High',   desc: 'Rope skipping intervals for full-body calorie burn.' },
    { name: 'Cycling',              duration: '45 min', intensity: 'Medium', desc: 'Low-impact cardio that\'s easy on the joints.' },
  ],
  build_muscle: [
    { name: 'Push / Pull / Legs',   duration: '50 min', intensity: 'High',   desc: 'Classic split targeting chest, back, and legs on separate days.' },
    { name: 'Dumbbell Full Body',   duration: '40 min', intensity: 'Medium', desc: 'Compound moves — squat, press, row — for overall strength.' },
    { name: 'Progressive Overload', duration: '45 min', intensity: 'High',   desc: 'Barbell lifts with planned weight increases each session.' },
    { name: 'Resistance Bands',     duration: '30 min', intensity: 'Medium', desc: 'Portable strength work with constant muscle tension.' },
  ],
  improve_endurance: [
    { name: 'Zone 2 Run',           duration: '40 min', intensity: 'Low',    desc: 'Conversational-pace run to build aerobic base.' },
    { name: 'Tempo Run',            duration: '30 min', intensity: 'High',   desc: 'Comfortably hard pace that lifts your lactate threshold.' },
    { name: 'Rowing Machine',       duration: '25 min', intensity: 'Medium', desc: 'Full-body low-impact cardio with strong VO₂ max benefits.' },
    { name: 'Stair Climber',        duration: '20 min', intensity: 'Medium', desc: 'Incline cardio that doubles as leg conditioning.' },
  ],
  sleep_better: [
    { name: 'Evening Yoga Flow',    duration: '20 min', intensity: 'Low',    desc: 'Gentle poses to calm the nervous system before bed.' },
    { name: 'Breathing Exercises',  duration: '10 min', intensity: 'Low',    desc: '4-7-8 and box breathing to lower cortisol levels.' },
    { name: 'Light Walk',           duration: '20 min', intensity: 'Low',    desc: 'A slow post-dinner stroll to aid digestion and wind down.' },
    { name: 'Progressive Relaxation', duration: '15 min', intensity: 'Low', desc: 'Systematic muscle tensing and release for deep relaxation.' },
  ],
  flexibility: [
    { name: 'Dynamic Warm-Up',      duration: '10 min', intensity: 'Low',    desc: 'Leg swings, hip circles, and arm crosses to prep joints.' },
    { name: 'Full Body Stretch',    duration: '20 min', intensity: 'Low',    desc: 'Hold major muscle groups 30–60 s to increase range of motion.' },
    { name: 'Pilates Core Flow',    duration: '30 min', intensity: 'Low',    desc: 'Controlled movements that build stability and flexibility together.' },
    { name: 'Foam Rolling',         duration: '15 min', intensity: 'Low',    desc: 'Self-myofascial release to reduce tightness and soreness.' },
  ],
  step_count: [
    { name: 'Morning Walk',         duration: '20 min', intensity: 'Low',    desc: 'Start the day with a brisk walk to hit your step target early.' },
    { name: 'Lunch Break Walk',     duration: '15 min', intensity: 'Low',    desc: 'A quick midday loop to break up sitting time.' },
    { name: 'Treadmill Desk Walk',  duration: '60 min', intensity: 'Low',    desc: 'Slow treadmill walking while working for passive step accumulation.' },
    { name: 'Evening Stroll',       duration: '25 min', intensity: 'Low',    desc: 'Wind down the day while closing out your step count.' },
  ],
};

const GOAL_LABELS = {
  lose_weight: 'Lose Weight',
  build_muscle: 'Build Muscle',
  improve_endurance: 'Improve Endurance',
  sleep_better: 'Sleep Better',
  flexibility: 'Flexibility & Mobility',
  step_count: 'Hit a Daily Step Goal',
};

const INTENSITY_COLOR = { Low: 'intensity-low', Medium: 'intensity-med', High: 'intensity-high' };

// Map HRV trend → recommended intensity to star
function recommendedIntensity(hrvTrend) {
  if (hrvTrend === 'up')   return 'High';
  if (hrvTrend === 'down') return 'Low';
  if (hrvTrend === 'stable') return 'Medium';
  return null;
}

function Exercises() {
  const [goals, setGoals]       = useState([]);
  const [hrvTrend, setHrvTrend] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('http://localhost:5001/api/user-goals'),
      axios.get('http://localhost:5001/api/dashboard-data').catch(() => ({ data: {} })),
    ]).then(([goalsRes, dashRes]) => {
      setGoals(goalsRes.data.goalIds || []);
      setHrvTrend(dashRes.data.hrvTrend || null);
    }).catch(() => setGoals([])).finally(() => setLoading(false));
  }, []);

  const activeGoals = goals.filter(g => WORKOUTS_BY_GOAL[g]);

  if (loading) return <div className="exercises-container"><p style={{color:'var(--text-muted)'}}>Loading workouts…</p></div>;

  return (
    <div className="exercises-container">
      <header className="exercises-header">
        <h1>Suggested Workouts</h1>
        <p>{activeGoals.length === 0 ? 'Select goals on the Goals page to see personalised suggestions.' : 'Based on your selected goals.'}</p>
      </header>

      {hrvTrend && (
        <div className="hrv-rec-banner">
          {hrvTrend === 'up'     && 'HRV trend: improving. Great day to push hard. High-intensity workouts are highlighted.'}
          {hrvTrend === 'down'   && 'HRV trend: declining. Prioritize recovery today. Easy workouts are highlighted.'}
          {hrvTrend === 'stable' && 'HRV trend: stable. Moderate effort is ideal. Medium-intensity workouts are highlighted.'}
        </div>
      )}

      {activeGoals.length === 0 ? (
        <div className="exercises-empty">No goals selected yet. Head to the Goals page to get started.</div>
      ) : (
        activeGoals.map(goalId => (
          <section key={goalId} className="goal-section">
            <h2 className="goal-section-title">{GOAL_LABELS[goalId]}</h2>
            <div className="workout-grid">
              {WORKOUTS_BY_GOAL[goalId].map(w => {
                const starred = recommendedIntensity(hrvTrend) === w.intensity;
                return (
                  <div key={w.name} className={`workout-tile${starred ? ' workout-starred' : ''}`}>
                    <div className="workout-top">
                      <span className="workout-name">
                        {starred && <span className="star-badge" title="Recommended based on your HRV">Recommended</span>}
                        {w.name}
                      </span>
                      <span className={`workout-intensity ${INTENSITY_COLOR[w.intensity]}`}>{w.intensity}</span>
                    </div>
                    <p className="workout-desc">{w.desc}</p>
                    <span className="workout-duration">Duration: {w.duration}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export default Exercises;

