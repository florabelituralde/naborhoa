import React from "react";

// Canonical Apple Inc. logo (Font Awesome Brands) used for "Sign in with Apple" buttons.
// Native 384x512 viewBox ensures the full silhouette (body + leaf) always renders.
export default function AppleIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 384 512"
      fill="currentColor"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25-.2 43-15.2 76-15.2 31.8 0 48.3 15.2 76.4 15.2 48.2-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.9-90.4zM266.1 95.1c24.8-28.9 22.7-57.6 22-67.4-22.2 1.3-47.9 14.9-62.6 31.6-16.4 18.4-26.2 41.4-24.1 67.4 24 1.7 46.1-10.6 64.7-31.6z" />
    </svg>
  );
}