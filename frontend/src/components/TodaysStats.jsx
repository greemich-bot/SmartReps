import HrvSparkline from './HrvSparkline';

function TodaysStats({ data }) {
  const formatMetric = (value, suffix = '') => {
    if (value === null || value === undefined) return `--${suffix ? ` ${suffix}` : ''}`;
    return `${value}${suffix ? ` ${suffix}` : ''}`;
  };

  return (
    <div className="stats-panel">
      <div className="stat-grid">
        <h2 className="panel-title">Today's Stats</h2>

        <div className="stat-card">
          <h3>
            Resting HR
            <span
              className="stat-info"
              data-tooltip="Your heart rate while at rest. Lower is generally better — a sign of cardiovascular fitness."
            >ⓘ</span>
          </h3>
          <p className="value">{formatMetric(data.heartRate, 'BPM')}</p>
        </div>

        <div className="stat-card">
          <h3>
            HRV
            <span
              className="stat-info"
              data-tooltip="Heart Rate Variability — the time variation between heartbeats. Higher HRV = better recovery and readiness."
            >ⓘ</span>
          </h3>
          <p className="value">{formatMetric(data.hrv, 'ms')}</p>
          <HrvSparkline values={data.hrvValues} trend={data.hrvTrend} />
          {data.hrvTrend && (
            <p className="hrv-trend" data-trend={data.hrvTrend}>
              {data.hrvTrend === 'up' ? '↑ Improving' : data.hrvTrend === 'down' ? '↓ Declining' : '→ Stable'}
            </p>
          )}
        </div>

        <div className="stat-card">
          <h3>
            Sleep
            <span
              className="stat-info"
              data-tooltip="Total sleep duration last night from your Garmin. Adults need 7–9 hrs for optimal recovery."
            >ⓘ</span>
          </h3>
          <p className="value">{formatMetric(data.sleep, 'hrs')}</p>
        </div>

        <div className="stat-card">
          <h3>
            Steps
            <span
              className="stat-info"
              data-tooltip="Total steps taken today. 7,000–10,000 steps per day is linked to improved cardiovascular health."
            >ⓘ</span>
          </h3>
          <p className="value">{data.steps != null ? data.steps.toLocaleString() : '--'}</p>
        </div>

        <div className="stat-card">
          <h3>
            Weight
            <span
              className="stat-info"
              data-tooltip="Your most recent weight logged on your Garmin device, in pounds."
            >ⓘ</span>
          </h3>
          <p className="value">{data.weight != null ? `${data.weight} lbs` : '--'}</p>
        </div>
      </div>
    </div>
  );
}

export default TodaysStats;
