import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Home, LogOut } from "lucide-react";

export default function Sidebar({ navItems, user, community }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = "/login";
  };

  return (
    <aside className="w-64 bg-sidebar h-screen flex flex-col border-r border-sidebar-border shrink-0">
      <div className="h-20 flex items-center px-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <Home className="w-7 h-7 text-primary" />
          <span className="font-bold text-lg text-sidebar-foreground">NeighborHOA</span>
        </Link>
      </div>

      {community && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-xs text-muted-foreground">Community</p>
          <p className="text-sm font-semibold text-sidebar-foreground truncate">{community.name}</p>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-primary text-primary-foreground warm-shadow" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
            {user?.full_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-all"
        >
          <LogOut className="w-5 h-5" />
          Log out
        </button>
      </div>
    </aside>
  );
}