import React, { useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Native-style bottom tab bar shown only on mobile (widths under md).
// `items` is an array of { path, label, icon }.
//
// Each tab preserves its own navigation stack: switching to a tab returns you
// to the last screen you were on within that tab. Tapping the tab you're
// already on resets it back to the tab's root path.
export default function BottomNav({ items }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Remembers the last-visited path within each tab root.
  const stacksRef = useRef({});

  const rootFor = (path) =>
    items.find((it) => location.pathname === it.path || location.pathname.startsWith(it.path + "/"))?.path || path;

  const isActive = (path) => {
    if (location.pathname === path) return true;
    // Highlight parent tab for nested routes (e.g. /home/requests/123).
    return location.pathname.startsWith(path + "/");
  };

  // Record the current location under whichever tab it belongs to.
  useEffect(() => {
    const activeRoot = items.find(
      (it) => location.pathname === it.path || location.pathname.startsWith(it.path + "/")
    )?.path;
    if (activeRoot) {
      stacksRef.current[activeRoot] = location.pathname + location.search;
    }
  }, [location.pathname, location.search, items]);

  const handleTab = (item) => {
    // Action tabs (e.g. AI Chat) run a callback instead of navigating.
    if (item.action) {
      item.action();
      return;
    }
    if (isActive(item.path)) {
      // Re-tapping the current tab: reset to its root.
      if (location.pathname !== item.path) {
        navigate(item.path);
      }
      return;
    }
    // Switching tabs: restore the tab's remembered screen, or its root.
    const remembered = stacksRef.current[item.path];
    navigate(remembered || item.path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur border-t border-border safe-bottom no-select">
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const active = !item.action && isActive(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path || item.label}
              type="button"
              onClick={() => handleTab(item)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "scale-110" : ""} transition-transform`} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}