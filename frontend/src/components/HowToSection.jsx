const HOW_TO_STEPS = [
  {
    title: '1. Pick Your Goals',
    description:
      'Open the Goals page and select what you want to focus on, like build muscle, lose weight, or improve endurance.'
  },
  {
    title: '2. Sync Your Garmin Data',
    description:
      'Go to Dashboard and refresh your data so SmartReps can read your latest HRV, sleep, steps, activities, and weight.'
  },
  {
    title: '3. Follow Today\'s Recommendations',
    description:
      'On Exercises, start with the workouts marked as recommended for your current recovery trend.'
  },
  {
    title: '4. Log Progress Regularly',
    description:
      'Track strength maxes and weight updates over time so recommendations and trend views stay useful.'
  }
];

function HowToSection() {
  return (
    <section className="howto-card" aria-label="How to use SmartReps">
      <h2 className="howto-title">How To Use SmartReps</h2>
      <p className="howto-subtitle">A quick guide to get the most out of your dashboard and recommendations.</p>

      <div className="howto-grid">
        {HOW_TO_STEPS.map((step) => (
          <article key={step.title} className="howto-step">
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HowToSection;
