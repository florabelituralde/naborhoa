import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Sidebar from "@/components/Sidebar";
import { LayoutDashboard, ClipboardList, Receipt, Wallet, Megaphone, Vote, FileText, MessageCircle, Calendar, Contact, Trophy, Loader2 } from "lucide-react";

export default function HomeownerLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u.role || u.role !== "homeowner") {
        navigate("/");
        return;
      }
      if (!u.community_id) {
        navigate("/join");
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
    { path: "/home/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/home/requests", label: "My Requests", icon: ClipboardList },
    { path: "/home/invoices", label: "My Bills", icon: Receipt },
    { path: "/home/expenses", label: "Community Finances", icon: Wallet },
    { path: "/home/announcements", label: "Announcements", icon: Megaphone },
    { path: "/home/polls", label: "Polls", icon: Vote },
    { path: "/home/elections", label: "Elections", icon: Trophy },
    { path: "/home/events", label: "Events", icon: Calendar },
    { path: "/home/documents", label: "Documents", icon: FileText },
    { path: "/home/board", label: "Board", icon: Contact },
    { path: "/home/chat", label: "AI Assistant", icon: MessageCircle },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar navItems={navItems} user={user} community={community} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet context={{ user, community }} />
      </main>
    </div>
  );
}