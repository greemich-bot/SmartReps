function HrvSparkline({ values, trend }) {
  if (!values || values.length < 2) return null;

  const w = 80;
  const h = 32;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  const color = trend === 'up' ? '#34d399' : trend === 'down' ? '#f87171' : '#a0a0a0';

  return (
    <svg width={w} height={h} className="hrv-sparkline">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default HrvSparkline;