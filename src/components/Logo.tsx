export default function Logo({ width = 190, height = 90, size = 52 }: { width?: number; height?: number; size?: number }) {
  const r3 = size * 0.3;
  const cx = size * 1.45;
  const cy = height * 0.8;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
      <text x="4" y={height * 0.88} fontFamily="Arial Black, Impact, sans-serif" fontSize={size} fontWeight="900" fill="white" letterSpacing="-3">
        Vy
      </text>
      <text x={cx - 2} y={height * 0.62} fontFamily="Arial Black, Impact, sans-serif" fontSize={size * 0.58} fontWeight="900" fill="#9D4EDD" letterSpacing="-1">
        be
      </text>
      <circle cx={cx + r3 * 0.4} cy={cy} r={size * 0.13} fill="#FF006E" />
      <circle cx={cx + r3 * 0.4} cy={cy} r={size * 0.21} fill="none" stroke="#FF006E" strokeWidth="1.4" opacity=".5" />
      <circle cx={cx + r3 * 0.4} cy={cy} r={r3} fill="none" stroke="#FF006E" strokeWidth=".9" opacity=".25" />
    </svg>
  );
}
