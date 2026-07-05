import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { LogOut, Menu, X } from "lucide-react";
import NaborLogo from "@/components/NaborLogo";

function SidebarContent({ navItems, user, community, onNavigate }) {
  const location = useLocation();

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = "/login";
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-20 flex items-center px-6 border-b border-sidebar-border">
        <Link to="/" onClick={onNavigate}>
          <NaborLogo iconClassName="w-8 h-8" />
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
              onClick={onNavigate}
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
    </div>
  );
}

export default function Sidebar({ navItems, user, community }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-sidebar h-screen flex-col border-r border-sidebar-border shrink-0">
        <SidebarContent navItems={navItems} user={user} community={community} />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-40">
        <Link to="/">
          <NaborLogo iconClassName="w-7 h-7" textClassName="font-bold text-sidebar-foreground" />
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 left-0 h-full w-72 max-w-[85%] bg-sidebar border-r border-sidebar-border shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 w-9 h-9 flex items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent z-10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent navItems={navItems} user={user} community={community} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}