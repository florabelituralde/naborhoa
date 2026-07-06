import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Sidebar from "@/components/Sidebar";
import AIChatBubble from "@/components/AIChatBubble";
import NotificationBell from "@/components/NotificationBell";
import BottomNav from "@/components/mobile/BottomNav";
import PageTransition from "@/components/mobile/PageTransition";
import { LayoutDashboard, LayoutGrid, Home, ClipboardList, Wallet, Receipt, Megaphone, Vote, FileText, Calendar, Contact, Trophy, HelpCircle, UserCircle, Sparkles, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { markNavLocks } from "@/lib/planAccess";

export default function HomeownerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        if (!u.role || u.role !== "homeowner") {
          navigate("/");
          return;
        }
        if (!u.community_id) {
          navigate("/join");
          return;
        }
        setUser(u);
        const c = await base44.entities.Community.get(u.community_id).catch(() => null);
        setCommunity(c);
        setLoading(false);
      } catch {
        navigate("/login");
      }
    })();
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Top-level items are the everyday essentials; the rest are grouped into
  // collapsible sections so the sidebar stays focused.
  const navItems = [
    { path: "/home/dashboard", label: "Community", icon: LayoutDashboard },
    ...(user.board_member_status === "approved"
      ? [{ path: "/home/board-hub", label: "Board Hub", icon: LayoutGrid }]
      : []),
    { path: "/home/announcements", label: "Announcements", icon: Megaphone },
    { label: "AI Chat", icon: Sparkles, action: () => window.dispatchEvent(new Event("open-ai-chat")) },
    { path: "/home/account", label: "My Account", icon: UserCircle },

    { path: "/home/invoices", label: "My Bills", icon: Receipt, group: "Finances" },
    { path: "/home/expenses", label: "Community Finances", icon: Wallet, group: "Finances" },

    { path: "/home/polls", label: "Polls", icon: Vote, group: "Get Involved" },
    { path: "/home/elections", label: "Elections", icon: Trophy, group: "Get Involved" },
    { path: "/home/events", label: "Events", icon: Calendar, group: "Get Involved" },

    { path: "/home/documents", label: "Documents", icon: FileText, group: "Resources" },
    { path: "/home/board", label: "Board", icon: Contact, group: "Resources" },
    { path: "/home/help", label: "Help & FAQ", icon: HelpCircle, group: "Resources" },
  ];

  const visibleNav = markNavLocks(navItems, community);

  // Key mobile destinations for the native-style bottom tab bar.
  const bottomNavItems = [
    { path: "/home/dashboard", label: "Home", icon: Home },
    { path: "/home/requests", label: "Requests", icon: ClipboardList },
    { path: "/home/invoices", label: "Bills", icon: Receipt },
    { label: "AI Chat", icon: Sparkles, action: () => window.dispatchEvent(new Event("open-ai-chat")) },
    { path: "/home/account", label: "Account", icon: UserCircle },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar navItems={visibleNav} user={user} community={community} />
      <main className="flex-1 overflow-y-auto no-scrollbar pt-14 md:pt-0 pb-16 md:pb-0 relative">
        <div className="hidden md:block absolute top-4 right-6 z-20">
          <NotificationBell user={user} />
        </div>
        <PageTransition key={location.pathname}>
          <Outlet context={{ user, community }} />
        </PageTransition>
      </main>
      <BottomNav items={bottomNavItems} />
      <AIChatBubble user={user} community={community} hideButton />
    </div>
  );
}