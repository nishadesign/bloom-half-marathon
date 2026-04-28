export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 180 180"
      width="40"
      height="40"
      className={`shrink-0 ${className}`}
      aria-label="Bloom"
    >
      <g transform="translate(18, 132)">
        <path
          d="M0 32 Q18 -18 36 32"
          fill="none"
          stroke="#1F3A2E"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M52 22 Q70 -42 88 22"
          fill="none"
          stroke="#1F3A2E"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M104 6 Q122 -66 140 6"
          fill="none"
          stroke="#C4892F"
          strokeWidth="11"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
