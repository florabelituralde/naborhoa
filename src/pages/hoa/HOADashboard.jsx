import React, { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { ClipboardList, DollarSign, Users, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function HOADashboard() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [homeowners, setHomeowners] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (!community) return;
    Promise.all([
      base44.entities.Request.filter({ community_id: community.id }, "-created_date", 50),
      base44.entities.Invoice.filter({ community_id: community.id }, "-created_date", 50),
      base44.entities.User.filter({ community_id: community.id, role: "homeowner" }),
      base44.entities.Announcement.filter({ community_id: community.id }, "-created_date", 5),
    ]).then(([reqs, invs, homes, anns]) => {
      setRequests(reqs);
      setInvoices(invs);
      setHomeowners(homes);
      setAnnouncements(anns);
      setLoading(false);
    });
  }, [community]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const openRequests = requests.filter(r => r.status === "submitted").length;
  const inProgress = requests.filter(r => r.status === "in_progress").length;
  const pendingTotal = invoices
    .filter(i => i.status === "pending" || i.status === "paid")
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <PageHeader title={`Welcome, ${user?.full_name?.split(" ")[0]}`} subtitle={community?.name} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={ClipboardList} value={openRequests} label="Open Requests" colorClass="bg-primary/10 text-primary" />
        <StatCard icon={ClipboardList} value={inProgress} label="In Progress" colorClass="bg-amber-100 text-amber-700" />
        <StatCard icon={DollarSign} value={formatCurrency(pendingTotal)} label="Outstanding" colorClass="bg-blue-50 text-blue-600" />
        <StatCard icon={Users} value={homeowners.length} label="Homeowners" colorClass="bg-green-50 text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl warm-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Recent Requests</h2>
            <Link to="/hoa/requests" className="text-sm text-primary font-medium hover:underline">View all</Link>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No requests yet</p>
          ) : (
            <div className="space-y-2">
              {requests.slice(0, 5).map(req => (
                <Link key={req.id} to={`/hoa/requests/${req.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{req.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{req.category}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl warm-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Announcements</h2>
            <Link to="/hoa/announcements" className="text-sm text-primary font-medium hover:underline">View all</Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No announcements yet</p>
          ) : (
            <div className="space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">{ann.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, colorClass }) {
  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}