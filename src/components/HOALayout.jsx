import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Sidebar from "@/components/Sidebar";
import { LayoutDashboard, ClipboardList, Receipt, Wallet, Megaphone, Vote, FileText, Users, Calendar, Contact, Trophy, Loader2 } from "lucide-react";

export default function HOALayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [community, setCommunity] = useState(null);
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
      setLoading(false);
    }).catch(() => navigate("/login"));
  }, []);

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
    { path: "/hoa/invoices", label: "Invoices", icon: Receipt },
    { path: "/hoa/expenses", label: "Expenses", icon: Wallet },
    { path: "/hoa/announcements", label: "Announcements", icon: Megaphone },
    { path: "/hoa/polls", label: "Polls", icon: Vote },
    { path: "/hoa/elections", label: "Elections", icon: Trophy },
    { path: "/hoa/events", label: "Events", icon: Calendar },
    { path: "/hoa/documents", label: "Documents", icon: FileText },
  ];
  if (user.role === "hoa_admin") {
    navItems.push({ path: "/hoa/community", label: "Community", icon: Users });
    navItems.push({ path: "/hoa/board", label: "Board", icon: Contact });
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar navItems={navItems} user={user} community={community} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet context={{ user, community }} />
      </main>
    </div>
  );
}