import React from "react";
import { Link, useLocation } from "react-router-dom";

// Native-style bottom tab bar shown only on mobile (widths under md).
// `items` is an array of { path, label, icon }.
export default function BottomNav({ items }) {
  const location = useLocation();

  const isActive = (path) => {
    if (location.pathname === path) return true;
    // Highlight parent tab for nested routes (e.g. /home/requests/123).
    return location.pathname.startsWith(path + "/");
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur border-t border-border safe-bottom no-select">
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "scale-110" : ""} transition-transform`} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}