import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Unified mobile top header with a back arrow, shown only on mobile (under md).
// `onBack` overrides the default browser-back behavior when provided.
export default function MobileTopHeader({ title, onBack, backTo }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    if (backTo) return navigate(backTo);
    navigate(-1);
  };

  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center gap-2 h-14 px-2 bg-card/95 backdrop-blur border-b border-border safe-top no-select">
      <button
        onClick={handleBack}
        className="flex items-center justify-center w-10 h-10 rounded-full text-foreground hover:bg-muted transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="font-semibold text-base truncate">{title}</h1>
    </header>
  );
}