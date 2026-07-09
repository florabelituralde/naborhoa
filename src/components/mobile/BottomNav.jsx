import React, { useRef, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Native-style bottom tab bar shown only on mobile (widths under md).
// `items` is an array of { path, label, icon }.
//
// Each tab preserves its own navigation stack: switching to a tab returns you
// to the last screen you were on within that tab. Tapping the tab you're
// already on resets it back to the tab's root path.
export default function BottomNav({ items, upgradePath }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Tracks whether the AI Chat panel is open so its tab can highlight while active.
  const [aiChatOpen, setAiChatOpen] = useState(false);
  useEffect(() => {
    const handler = (e) => setAiChatOpen(!!e.detail?.open);
    window.addEventListener("ai-chat-open-change", handler);
    return () => window.removeEventListener("ai-chat-open-change", handler);
  }, []);

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
    // Locked tabs aren't available on the community's plan. HOA admins get
    // sent straight to the upgrade page; homeowners just get a notice.
    if (item.locked) {
      if (upgradePath) {
        navigate(upgradePath);
        return;
      }
      toast({
        title: "Not available on your plan",
        description: `${item.label} isn't included in your community's current plan.`,
      });
      return;
    }
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
          const active = !item.locked && (item.action ? (item.actionId === "ai_chat" && aiChatOpen) : (isActive(item.path) && !aiChatOpen));
          const Icon = item.icon;
          return (
            <button
              key={item.path || item.label}
              type="button"
              onClick={() => handleTab(item)}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${
                item.locked ? "text-muted-foreground/50" : active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? "scale-110" : ""} transition-transform`} />
                {item.locked && (
                  <Lock className="w-3 h-3 absolute -top-1 -right-2 text-muted-foreground/70" />
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}