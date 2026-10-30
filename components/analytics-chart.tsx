import type { SensorReading } from "@/lib/mock-data";

function formatTick(timestamp: string, compact: boolean) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en", compact
    ? { hour: "2-digit", hour12: false }
    : { day: "2-digit", month: "short" }).format(date);
}

export function AnalyticsChart({ readings, metricName, unit }: { readings: SensorReading[]; metricName: string; unit: string }) {
  if (readings.length === 0) return <div className="empty-state">No history is available for this measurement yet.</div>;

  const rawMin = Math.min(...readings.map((reading) => reading.value));
  const rawMax = Math.max(...readings.map((reading) => reading.value));
  const spread = Math.max(rawMax - rawMin, unit === "%" ? 2 : 0.5);
  const min = rawMin - spread * 0.12;
  const max = rawMax + spread * 0.12;
  const chartWidth = 700;
  const chartHeight = 180;
  const points = readings.map((reading, index) => {
    const x = (index / Math.max(readings.length - 1, 1)) * chartWidth;
    const y = chartHeight - ((reading.value - min) / (max - min)) * chartHeight;
    return { x, y };
  });
  const line = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const area = `0,${chartHeight} ${line} ${chartWidth},${chartHeight}`;
  const ticks = [0, 1, 2, 3, 4].map((index) => {
    const reading = readings[Math.round((index / 4) * (readings.length - 1))];
    return { label: formatTick(reading.timestamp, readings.length <= 25), left: `${(index / 4) * 100}%` };
  });

  return (
    <div className="analytics-chart" role="img" aria-label={`${metricName} simulated history from ${readings[0].timestamp} to ${readings[readings.length - 1].timestamp}. Values range from ${rawMin} to ${rawMax} ${unit}.`}>
      <div className="analytics-y-labels" aria-hidden="true">{[max, max - spread / 2, (max + min) / 2, min + spread / 2, min].map((value, index) => <span key={index}>{Number(value.toFixed(1))}{unit === "%" ? "%" : ""}</span>)}</div>
      <svg className="analytics-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="analytics-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#24764f" stopOpacity=".15" /><stop offset="100%" stopColor="#24764f" stopOpacity="0" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map((index) => <line key={index} x1="0" x2={chartWidth} y1={(index / 4) * chartHeight} y2={(index / 4) * chartHeight} className="chart-grid" />)}
        <polygon points={area} fill="url(#analytics-area)" />
        <polyline points={line} className="chart-line" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="analytics-x-labels" aria-hidden="true">{ticks.map((tick, index) => <span key={index} style={{ left: tick.left }}>{tick.label}</span>)}</div>
    </div>
  );
}
