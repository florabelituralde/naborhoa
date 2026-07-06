import React from "react";

// Reusable Nabor logo: an inline SVG of an "N" monogram with a roof on top.
// Uses currentColor so it inherits text color and always has a transparent background.
export default function NaborLogo({
  showText = true,
  className = "",
  iconClassName = "w-8 h-8",
  textClassName = "font-bold text-lg text-sidebar-foreground",
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <NaborMark className={`${iconClassName} text-primary`} />
      {showText && <span className={textClassName}>Nabor</span>}
    </span>
  );
}

export function NaborMark({ className = "w-8 h-8" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Nabor"
      role="img"
    >
      {/* Roof line */}
      <path
        d="M6 19 L24 5 L42 19"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bold letter N */}
      <path
        d="M14 41 V21 L34 41 V21"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}