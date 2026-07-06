import React from "react";
import { Link } from "react-router-dom";

// Reusable legal-links footer for auth pages. Links to public policy pages
// so they're accessible without logging in (Apple 5.1.1 / Google Play).
export default function LegalLinks({ className = "" }) {
  return (
    <p className={`text-center text-xs text-muted-foreground ${className}`}>
      By continuing you agree to our{" "}
      <Link to="/privacy-policy" className="text-primary hover:underline">
        Privacy Policy
      </Link>{" "}
      and{" "}
      <Link to="/terms" className="text-primary hover:underline">
        Terms of Service
      </Link>
      .
    </p>
  );
}