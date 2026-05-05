const ABOUT_SECTIONS = [
  {
    title: '1. Goal-Based Workout Library',
    body:
      'Each goal has a curated set of workouts. When you choose goals on the Goals page, SmartReps only shows workouts from those goal categories.'
  },
  {
    title: '2. HRV-Based Daily Prioritization',
    body:
      'SmartReps reads your HRV trend from Garmin data and highlights workouts by intensity:',
    bullets: [
      'Improving HRV: high-intensity workouts are prioritized.',
      'Declining HRV: low-intensity recovery workouts are prioritized.',
      'Stable HRV: medium-intensity workouts are prioritized.'
    ]
  },
  {
    title: '3. Progress Signals on Goals',
    body:
      'Some goals unlock additional tracking components. For example, Build Muscle can display strength max logs, and Lose Weight can show your 90-day weight trend.'
  },
  {
    title: '4. Data Sources',
    body:
      'Recommendations use Garmin metrics such as HRV, sleep, steps, activities, and weight where available. If Garmin sync is temporarily unavailable, SmartReps uses cached data when possible.'
  }
];

function AboutSection({ title, body, bullets }) {
  return (
    <section className="about-section">
      <h2>{title}</h2>
      <p>{body}</p>
      {Array.isArray(bullets) && bullets.length > 0 && (
        <ul className="about-list">
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AboutSections() {
  return ABOUT_SECTIONS.map((section) => (
    <AboutSection
      key={section.title}
      title={section.title}
      body={section.body}
      bullets={section.bullets}
    />
  ));
}

export default AboutSection;