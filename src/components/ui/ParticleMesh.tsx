const NODES = [
  { x: 20, y: 40 }, { x: 90, y: 15 }, { x: 150, y: 55 }, { x: 60, y: 100 },
  { x: 190, y: 110 }, { x: 130, y: 140 }, { x: 230, y: 40 }, { x: 260, y: 130 },
  { x: 10, y: 150 }, { x: 200, y: 10 },
];

const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [0, 3], [2, 4], [4, 5], [3, 5], [1, 6], [6, 4], [6, 9],
  [4, 7], [5, 7], [3, 8], [8, 0],
];

export function ParticleMesh({ className = "", color = "#7dffb3" }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 270 160"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          x1={NODES[a].x}
          y1={NODES[a].y}
          x2={NODES[b].x}
          y2={NODES[b].y}
          stroke={color}
          strokeOpacity={0.18}
          strokeWidth={1}
        />
      ))}
      {NODES.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={i % 3 === 0 ? 2.4 : 1.6}
          fill={color}
          fillOpacity={0.55}
          className="animate-pulse"
          style={{ animationDuration: `${2.4 + (i % 4) * 0.5}s`, animationDelay: `${(i % 5) * 0.2}s` }}
        />
      ))}
    </svg>
  );
}
