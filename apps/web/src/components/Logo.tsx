export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 60"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* First 'C' - left side */}
      <path
        d="M 20 10 Q 5 10 5 30 Q 5 50 20 50"
        stroke="currentColor"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Second 'C' - right side */}
      <path
        d="M 50 10 Q 35 10 35 30 Q 35 50 50 50"
        stroke="currentColor"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

