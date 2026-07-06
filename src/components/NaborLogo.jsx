import React from "react";

const ICON_URL = "https://media.base44.com/images/public/6a4acea33cfa263e6d1847b3/acc0a2a9f_generated_image.png";

// Reusable Nabor logo. Renders the badge icon and, optionally, the "Nabor" wordmark.
export default function NaborLogo({ showText = true, className = "", iconClassName = "w-8 h-8", textClassName = "font-bold text-lg text-sidebar-foreground" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src={ICON_URL} alt="Nabor" className={`${iconClassName} object-contain`} />
      {showText && <span className={textClassName}>Nabor</span>}
    </span>
  );
}