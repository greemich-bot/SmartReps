function RecentActivities({ activities }) {
  return (
    <div className="activities-panel">
      <section className="activities-section">
        <h2>Recent Activities</h2>
        <div className="activities-list">
          {activities && activities.length > 0 ? (
            activities.map((act) => (
              <div key={act.id} className="activity-card">
                <div className="activity-main">
                  <span className="activity-date">{act.date}</span>
                  <strong className="activity-name">{act.name}</strong>
                  <span className="activity-type">{act.type.replace('_', ' ')}</span>
                </div>
                <div className="activity-data">
                  <span className="activity-distance">{act.distance} miles</span>
                </div>
              </div>
            ))
          ) : (
            <p className="no-data">No workouts recorded in the last few days.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default RecentActivities;
