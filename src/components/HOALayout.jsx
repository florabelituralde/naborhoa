import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Sidebar from "@/components/Sidebar";
import { LayoutDashboard, UserCircle, ClipboardList, ListChecks, Receipt, Wallet, Megaphone, Vote, FileText, Users, Calendar, Contact, Trophy, HelpCircle, Loader2 } from "lucide-react";
import { markNavLocks } from "@/lib/planAccess";

export default function HOALayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [community, setCommunity] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u.role || (u.role !== "hoa_admin" && u.role !== "hoa_staff")) {
        navigate("/");
        return;
      }
      if (!u.community_id) {
        navigate("/onboarding");
        return;
      }
      setUser(u);
      base44.entities.Community.get(u.community_id).then(c => setCommunity(c)).catch(() => {});
      // Admins can own multiple communities; load them for the switcher.
      if (u.role === "hoa_admin") {
        base44.functions.invoke("get-my-communities", {})
          .then(r => setCommunities(r.data?.communities || []))
          .catch(() => {});
      }
      setLoading(false);
    }).catch(() => navigate("/login"));
  }, []);

  // Switch the active community, then hard-reload so every page picks up the change.
  const handleSwitchCommunity = async (communityId) => {
    await base44.auth.updateMe({ community_id: communityId });
    window.location.href = "/hoa/dashboard";
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const navItems = [
    { path: "/hoa/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/hoa/requests", label: "Requests", icon: ClipboardList },
    { path: "/hoa/request-types", label: "Request Types", icon: ListChecks },
    { path: "/hoa/invoices", label: "Invoices", icon: Receipt },
    { path: "/hoa/expenses", label: "Expenses", icon: Wallet },
    { path: "/hoa/announcements", label: "Announcements", icon: Megaphone },
    { path: "/hoa/polls", label: "Polls", icon: Vote },
    { path: "/hoa/elections", label: "Elections", icon: Trophy },
    { path: "/hoa/events", label: "Events", icon: Calendar },
    { path: "/hoa/documents", label: "Documents", icon: FileText },
    { path: "/hoa/help", label: "Help & FAQ", icon: HelpCircle },
  ];
  if (user.role === "hoa_admin") {
    navItems.splice(1, 0, { path: "/hoa/account", label: "My Account", icon: UserCircle });
    navItems.push({ path: "/hoa/community", label: "Community", icon: Users });
    navItems.push({ path: "/hoa/board", label: "Board", icon: Contact });
  }

  const visibleNav = markNavLocks(navItems, community);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar navItems={visibleNav} user={user} community={community} communities={communities} onSwitchCommunity={handleSwitchCommunity} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet context={{ user, community }} />
      </main>
    </div>
  );
}