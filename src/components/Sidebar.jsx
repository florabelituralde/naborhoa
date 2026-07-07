import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { LogOut, Menu, X, Lock, ChevronDown } from "lucide-react";
import NaborLogo from "@/components/NaborLogo";
import NotificationBell from "@/components/NotificationBell";
import CommunitySwitcher from "@/components/CommunitySwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";

function NavLinkItem({ item, active, onNavigate }) {
  if (item.locked) {
    return (
      <div
        title="Not available on your community's plan"
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground/60 cursor-not-allowed select-none"
      >
        <item.icon className="w-5 h-5" />
        <span className="flex-1">{item.label}</span>
        <Lock className="w-4 h-4" />
      </div>
    );
  }
  if (item.action) {
    return (
      <button
        onClick={() => { item.action(); onNavigate?.(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-sidebar-foreground hover:bg-sidebar-accent"
      >
        <item.icon className="w-5 h-5" />
        {item.label}
      </button>
    );
  }
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-primary text-primary-foreground warm-shadow" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
    >
      <item.icon className="w-5 h-5" />
      {item.label}
    </Link>
  );
}

function NavGroup({ title, items, pathname, onNavigate }) {
  const hasActive = items.some((i) => i.path === pathname);
  const [open, setOpen] = useState(hasActive);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="space-y-1">
          {items.map((item) => (
            <NavLinkItem key={item.path} item={item} active={pathname === item.path} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ navItems, user, community, communities, onSwitchCommunity, onNavigate }) {
  const location = useLocation();

  const topLevel = navItems.filter((i) => !i.group);
  const groupOrder = [];
  const grouped = {};
  navItems.forEach((i) => {
    if (!i.group) return;
    if (!grouped[i.group]) { grouped[i.group] = []; groupOrder.push(i.group); }
    grouped[i.group].push(i);
  });

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

      {community && onSwitchCommunity ? (
        <CommunitySwitcher
          community={community}
          communities={communities}
          onSwitch={onSwitchCommunity}
          onNavigate={onNavigate}
        />
      ) : community ? (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-xs text-muted-foreground">Community</p>
          <p className="text-sm font-semibold text-sidebar-foreground truncate">{community.name}</p>
        </div>
      ) : null}

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {topLevel.map((item) => (
          <NavLinkItem key={item.path || item.label} item={item} active={location.pathname === item.path} onNavigate={onNavigate} />
        ))}
        {groupOrder.map((title) => (
          <NavGroup key={title} title={title} items={grouped[title]} pathname={location.pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <Link
          to={user?.role === "homeowner" ? "/home/account" : "/hoa/account"}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 mb-3 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <UserAvatar user={user} className="w-9 h-9" textClass="text-sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</p>
          </div>
        </Link>
        <ThemeToggle />
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

export default function Sidebar({ navItems, user, community, communities, onSwitchCommunity }) {
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
        <SidebarContent navItems={navItems} user={user} community={community} communities={communities} onSwitchCommunity={onSwitchCommunity} />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-40 safe-x">
        <Link to="/">
          <NaborLogo iconClassName="w-7 h-7" textClassName="font-bold text-sidebar-foreground" />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell user={user} />
          <button
            onClick={() => setMobileOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 left-0 h-full w-72 max-w-[85%] bg-sidebar border-r border-sidebar-border shadow-xl safe-top">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 w-9 h-9 flex items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent z-10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent navItems={navItems} user={user} community={community} communities={communities} onSwitchCommunity={onSwitchCommunity} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}