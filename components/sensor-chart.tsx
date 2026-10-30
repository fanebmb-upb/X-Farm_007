function makePoints(values: number[]) {
  return values.map((value, index) => `${(index / (values.length - 1)) * 700},${150 - value * 1.3}`).join(" ");
}

export function SensorChart({ values, irrigationIndex = 12 }: { values: number[]; irrigationIndex?: number }) {
  const line = makePoints(values);
  const area = `0,150 ${line} 700,150`;
  const irrigationX = (irrigationIndex / Math.max(values.length - 1, 1)) * 700;

  return (
    <div className="chart-wrap" role="img" aria-label={`Simulated soil moisture over the last 24 hours, ending at ${values[values.length - 1] ?? 0} percent${irrigationIndex >= 0 ? " with an irrigation event in the displayed period" : ""}.`}>
      <svg className="chart" viewBox="0 0 700 180" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="moisture-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#24764f" stopOpacity=".16" />
            <stop offset="100%" stopColor="#24764f" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 55, 90, 125, 150].map((y) => <line key={y} x1="0" x2="700" y1={y} y2={y} className="chart-grid" />)}
        <polygon points={area} fill="url(#moisture-fill)" />
        {irrigationIndex >= 0 && <line x1={irrigationX} x2={irrigationX} y1="14" y2="150" className="chart-event-line" />}
        <polyline points={line} fill="none" className="chart-line" vectorEffect="non-scaling-stroke" />
        {irrigationIndex >= 0 && <circle cx={irrigationX} cy={150 - (values[irrigationIndex] ?? 73) * 1.3} r="4.5" className="chart-point" />}
      </svg>
      <div className="chart-y-labels" aria-hidden="true"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
      <div className="chart-x-labels" aria-hidden="true"><span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span></div>
      {irrigationIndex >= 0 && <span className="irrigation-tag" style={{ left: `${(irrigationIndex / Math.max(values.length - 1, 1)) * 100}%` }}>Irrigation</span>}
    </div>
  );
}
