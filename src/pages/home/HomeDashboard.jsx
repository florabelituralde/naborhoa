import React, { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { ClipboardList, Receipt, Vote, MessageCircle, Loader2, Plus, ArrowRight, History, RefreshCw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import AnnouncementsWidget from "@/components/widgets/AnnouncementsWidget";
import AIChatWidget from "@/components/widgets/AIChatWidget";
import CommunityCalendar from "@/components/widgets/CommunityCalendar";
import CommunityGallery from "@/components/widgets/CommunityGallery";

export default function HomeDashboard() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [polls, setPolls] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (!community) return;
    Promise.all([
      base44.entities.Request.filter({ community_id: community.id, homeowner_id: user.id }, "-created_date"),
      base44.entities.Invoice.filter({ community_id: community.id, homeowner_id: user.id }, "-created_date"),
      base44.entities.Poll.filter({ community_id: community.id, status: "active" }, "-created_date", 3),
      base44.entities.Announcement.filter({ community_id: community.id }, "-created_date", 3),
      base44.entities.Subscription.filter({ community_id: community.id, homeowner_id: user.id, status: "active" }),
      base44.entities.Event.filter({ community_id: community.id }, "start_time"),
    ]).then(([reqs, invs, activePolls, anns, subs, evs]) => {
      setRequests(reqs);
      setInvoices(invs);
      setPolls(activePolls);
      setAnnouncements(anns);
      setEvents(evs);
      setSubscription(subs.length > 0 ? subs[0] : null);
      setLoading(false);
    });
  }, [community, user]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const openRequests = requests.filter(r => r.status === "submitted" || r.status === "in_progress").length;
  const pendingBills = invoices.filter(i => i.status === "pending" || i.status === "paid");
  const pendingTotal = pendingBills.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <PageHeader title={`Hi, ${user?.full_name?.split(" ")[0]}`} subtitle={community?.name} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={ClipboardList} value={openRequests} label="Active Requests" colorClass="bg-primary/10 text-primary" />
        <StatCard icon={Receipt} value={formatCurrency(pendingTotal)} label="Outstanding Balance" colorClass="bg-amber-100 text-amber-700" />
        <StatCard icon={Vote} value={polls.length} label="Active Polls" colorClass="bg-blue-50 text-blue-600" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/home/requests/new" className="bg-primary text-primary-foreground rounded-2xl p-6 hover:warm-shadow-md transition-all flex items-center gap-4">
          <Plus className="w-8 h-8" />
          <div><p className="font-semibold">New Request</p><p className="text-sm text-primary-foreground/80">Submit a maintenance or repair</p></div>
        </Link>
        <Link to="/home/chat" className="bg-card rounded-2xl warm-shadow p-6 hover:warm-shadow-md transition-all flex items-center gap-4">
          <MessageCircle className="w-8 h-8 text-primary" />
          <div><p className="font-semibold">Ask AI Assistant</p><p className="text-sm text-muted-foreground">Get instant HOA answers</p></div>
        </Link>
        <Link to="/home/invoices" className="bg-card rounded-2xl warm-shadow p-6 hover:warm-shadow-md transition-all flex items-center gap-4">
          <Receipt className="w-8 h-8 text-primary" />
          <div><p className="font-semibold">Pay Bills</p><p className="text-sm text-muted-foreground">View and pay invoices</p></div>
        </Link>
      </div>

      {/* Payment History */}
      <div className="bg-card rounded-2xl warm-shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Payment History</h2>
          <Link to="/home/invoices" className="text-sm text-primary font-medium hover:underline">View all</Link>
        </div>
        {subscription ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 mb-3">
            <RefreshCw className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Auto-Pay Active</p>
              <p className="text-xs text-muted-foreground">{subscription.frequency === "MONTH" ? "Monthly" : "Annual"} • {formatCurrency(subscription.amount || 0)}</p>
            </div>
          </div>
        ) : null}
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No payment history yet</p>
        ) : (
          <div className="space-y-2">
            {invoices.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm capitalize">{inv.type} — {formatCurrency(inv.amount)}</p>
                  <p className="text-xs text-muted-foreground">{inv.description}</p>
                  <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>Due: {formatDate(inv.due_date)}</span>
                    {inv.paid_date && <span>Paid: {formatDate(inv.paid_date)}</span>}
                  </div>
                </div>
                <StatusBadge status={inv.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl warm-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">My Requests</h2>
            <Link to="/home/requests" className="text-sm text-primary font-medium hover:underline">View all</Link>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No requests yet</p>
          ) : (
            <div className="space-y-2">
              {requests.slice(0, 4).map(req => (
                <Link key={req.id} to={`/home/requests/${req.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{req.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(req.created_date)}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <AnnouncementsWidget announcements={announcements} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <CommunityCalendar invoices={invoices} events={events} />
        <AIChatWidget />
      </div>

      {community?.gallery?.length > 0 && (
        <div className="mt-6">
          <CommunityGallery community={community} />
        </div>
      )}
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